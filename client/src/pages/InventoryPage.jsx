import { useEffect, useMemo, useState } from "react";
import EntityManager from "../components/EntityManager";
import ChartPanel from "../components/ChartPanel";
import DataTable from "../components/DataTable";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import { resources } from "../api/resources";
import { useAuth } from "../context/AuthContext";
import { useCompany } from "../context/CompanyContext";
import { formatDateInput, formatMoney } from "../utils/format";

function optionalId(value) {
  return value ? Number(value) : undefined;
}

function moneyInputToPaisa(value) {
  return Math.round(Number(value || 0) * 100);
}

export default function InventoryPage() {
  const { hasRole } = useAuth();
  const { activeCompany } = useCompany();
  const canModify = hasRole("ADMIN", "ACCOUNTANT");
  const [summary, setSummary] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [stockGroups, setStockGroups] = useState([]);
  const [units, setUnits] = useState([]);
  const [hsnSac, setHsnSac] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("summary");

  useEffect(() => {
    let mounted = true;
    async function loadInventory() {
      if (!activeCompany) {
        setSummary([]);
        setLowStock([]);
        setStockGroups([]);
        setUnits([]);
        setHsnSac([]);
        setItems([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [summaryData, lowStockData, groupsData, unitsData, hsnData, itemData] = await Promise.all([
          resources.inventory.summary(),
          resources.inventory.lowStock(),
          resources.inventory.stockGroups.list(),
          resources.inventory.units.list(),
          resources.inventory.hsnSac.list(),
          resources.inventory.items.list(),
        ]);

        if (mounted) {
          setSummary(summaryData);
          setLowStock(lowStockData);
          setStockGroups(groupsData);
          setUnits(unitsData);
          setHsnSac(hsnData);
          setItems(itemData);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadInventory();
    return () => {
      mounted = false;
    };
  }, [activeCompany?.id]);

  const stockValuePaisa = useMemo(
    () => summary.reduce((sum, row) => sum + Number(row.currentValuePaisa || 0), 0),
    [summary],
  );

  const totalQty = useMemo(
    () => summary.reduce((sum, row) => sum + Number(row.currentQty || 0), 0),
    [summary],
  );

  const stockGroupOptions = useMemo(
    () => stockGroups.map((group) => ({ label: group.name, value: group.id })),
    [stockGroups],
  );
  const unitOptions = useMemo(
    () => units.map((unit) => ({ label: `${unit.name} (${unit.symbol})`, value: unit.id })),
    [units],
  );
  const hsnOptions = useMemo(
    () => hsnSac.map((code) => ({ label: `${code.code} - ${code.description}`, value: code.id })),
    [hsnSac],
  );
  const itemOptions = useMemo(
    () => items.map((item) => ({ label: `${item.name} (${item.sku})`, value: item.id })),
    [items],
  );

  if (!activeCompany) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-soft">
        Select an active company to manage inventory.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        subtitle="Items, stock groups, units, tax codes, and stock movement tracking."
      />

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-soft">
        {[
          { key: "summary", label: "Summary" },
          { key: "groups", label: "Stock Groups" },
          { key: "units", label: "Units" },
          { key: "hsn", label: "Tax Codes" },
          { key: "items", label: "Items" },
          { key: "movements", label: "Movements" },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`rounded-xl px-4 py-2 text-sm font-medium ${
              tab === item.key ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "summary" ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Tracked Items" value={String(summary.length)} />
            <StatCard label="Low Stock Items" value={String(lowStock.length)} tone={lowStock.length ? "warning" : "accent"} />
            <StatCard label="Stock Quantity" value={Number(totalQty).toFixed(2)} />
            <StatCard label="Stock Value" value={formatMoney(stockValuePaisa)} tone="accent" />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <ChartPanel title="Low Stock Alerts" subtitle="Items at or below the reorder threshold">
              <DataTable
                columns={[
                  { key: "name", label: "Item" },
                  { key: "sku", label: "SKU" },
                  { key: "currentQty", label: "Current Qty" },
                  { key: "lowStockLevelQty", label: "Reorder Qty" },
                  { key: "stockGroup", label: "Group" },
                ]}
                rows={lowStock}
                emptyText="No low stock alerts."
              />
            </ChartPanel>

            <ChartPanel title="Stock Summary" subtitle="Current quantities and values for all items">
              <DataTable
                columns={[
                  { key: "name", label: "Item" },
                  { key: "sku", label: "SKU" },
                  { key: "stockGroup", label: "Group" },
                  { key: "unit", label: "Unit" },
                  { key: "currentQty", label: "Qty" },
                  { key: "currentValuePaisa", label: "Value", type: "money" },
                ]}
                rows={summary.slice(0, 10)}
                emptyText={loading ? "Loading stock summary..." : "No stock summary rows."}
              />
            </ChartPanel>
          </div>
        </div>
      ) : null}

      {tab === "groups" ? (
        <EntityManager
          title="Stock Group"
          subtitle="Organize items in nested stock categories."
          columns={[
            { key: "name", label: "Name" },
            { key: "parentName", label: "Parent" },
          ]}
          fields={[
            { name: "name", label: "Group Name", required: true },
            { name: "parentName", label: "Parent Name" },
          ]}
          loadData={() => resources.inventory.stockGroups.list()}
          createRecord={(payload) => resources.inventory.stockGroups.create(payload)}
          updateRecord={(id, payload) => resources.inventory.stockGroups.update(id, payload)}
          deleteRecord={(id) => resources.inventory.stockGroups.remove(id)}
          canCreate={canModify}
          canEdit={canModify}
          canDelete={canModify}
        />
      ) : null}

      {tab === "units" ? (
        <EntityManager
          title="Unit"
          subtitle="Create units of measurement for stock items."
          columns={[
            { key: "name", label: "Name" },
            { key: "symbol", label: "Symbol" },
            { key: "decimalPlaces", label: "Decimals" },
          ]}
          fields={[
            { name: "name", label: "Unit Name", required: true },
            { name: "symbol", label: "Symbol", required: true },
            { name: "decimalPlaces", label: "Decimal Places", type: "number", defaultValue: 2 },
          ]}
          loadData={() => resources.inventory.units.list()}
          createRecord={(payload) => resources.inventory.units.create(payload)}
          updateRecord={(id, payload) => resources.inventory.units.update(id, payload)}
          deleteRecord={(id) => resources.inventory.units.remove(id)}
          canCreate={canModify}
          canEdit={canModify}
          canDelete={canModify}
          transformPayload={(values) => ({
            ...values,
            decimalPlaces: Number(values.decimalPlaces || 0),
          })}
        />
      ) : null}

      {tab === "hsn" ? (
        <EntityManager
          title="Tax Codes"
          subtitle="Map sales tax rates to goods and services."
          columns={[
            { key: "code", label: "Code" },
            { key: "description", label: "Description" },
            { key: "itemType", label: "Type" },
            { key: "gstRate", label: "Sales Tax %" },
            { key: "cessRate", label: "Local Tax %" },
            { key: "applicableFrom", label: "Applicable From", type: "date" },
          ]}
          fields={[
            { name: "code", label: "Code", required: true },
            { name: "description", label: "Description", required: true },
            {
              name: "itemType",
              label: "Goods / Service",
              type: "select",
              required: true,
              options: [
                { label: "Goods", value: "GOODS" },
                { label: "Service", value: "SERVICE" },
              ],
            },
            { name: "gstRate", label: "Sales Tax Rate", type: "number", step: "0.01", defaultValue: 0 },
            { name: "cessRate", label: "Local Tax Rate", type: "number", step: "0.01", defaultValue: 0 },
            { name: "applicableFrom", label: "Applicable From", type: "date", required: true, defaultValue: formatDateInput(new Date()) },
          ]}
          loadData={(search) => resources.inventory.hsnSac.list(search)}
          createRecord={(payload) => resources.inventory.hsnSac.create(payload)}
          updateRecord={(id, payload) => resources.inventory.hsnSac.update(id, payload)}
          deleteRecord={(id) => resources.inventory.hsnSac.remove(id)}
          canCreate={canModify}
          canEdit={canModify}
          canDelete={canModify}
          transformPayload={(values) => ({
            ...values,
            gstRate: Number(values.gstRate || 0),
            cessRate: Number(values.cessRate || 0),
          })}
        />
      ) : null}

      {tab === "items" ? (
        <EntityManager
          title="Item"
          subtitle="Manage stock items, rates, and opening balances."
          columns={[
            { key: "name", label: "Name" },
            { key: "sku", label: "SKU" },
            { key: "stockGroup", label: "Group", render: (row) => row.stockGroup?.name || "" },
            { key: "unit", label: "Unit", render: (row) => row.unit?.symbol || "" },
            { key: "hsnSac", label: "Tax Code", render: (row) => row.hsnSac?.code || "" },
            { key: "currentQty", label: "Current Qty" },
            { key: "currentValuePaisa", label: "Value", type: "money" },
            { key: "isLowStock", label: "Low Stock", render: (row) => (row.isLowStock ? "Yes" : "No") },
          ]}
          fields={[
            { name: "stockGroupId", label: "Stock Group", type: "select", options: stockGroupOptions },
            { name: "unitId", label: "Unit", type: "select", options: unitOptions },
            { name: "hsnSacId", label: "Tax Code", type: "select", options: hsnOptions },
            { name: "name", label: "Item Name", required: true },
            { name: "sku", label: "SKU", required: true },
            { name: "barcode", label: "Barcode" },
            { name: "openingStockQty", label: "Opening Stock Qty", type: "number", step: "0.01", defaultValue: 0 },
            { name: "openingStockValuePaisa", label: "Opening Stock Value (USD)", type: "number", step: "0.01", defaultValue: 0 },
            { name: "lowStockLevelQty", label: "Low Stock Level", type: "number", step: "0.01", defaultValue: 0 },
            { name: "purchaseRatePaisa", label: "Purchase Rate (USD)", type: "number", step: "0.01", defaultValue: 0 },
            { name: "salesRatePaisa", label: "Sales Rate (USD)", type: "number", step: "0.01", defaultValue: 0 },
            { name: "isGoods", label: "Goods Item", type: "checkbox" },
          ]}
          loadData={(search) => resources.inventory.items.list(search)}
          createRecord={(payload) => resources.inventory.items.create(payload)}
          updateRecord={(id, payload) => resources.inventory.items.update(id, payload)}
          deleteRecord={(id) => resources.inventory.items.remove(id)}
          canCreate={canModify}
          canEdit={canModify}
          canDelete={canModify}
          transformPayload={(values) => ({
            ...values,
            stockGroupId: optionalId(values.stockGroupId),
            unitId: optionalId(values.unitId),
            hsnSacId: optionalId(values.hsnSacId),
            openingStockQty: Number(values.openingStockQty || 0),
            openingStockValuePaisa: moneyInputToPaisa(values.openingStockValuePaisa),
            lowStockLevelQty: Number(values.lowStockLevelQty || 0),
            purchaseRatePaisa: moneyInputToPaisa(values.purchaseRatePaisa),
            salesRatePaisa: moneyInputToPaisa(values.salesRatePaisa),
            isGoods: Boolean(values.isGoods),
          })}
        />
      ) : null}

      {tab === "movements" ? (
        <EntityManager
          title="Stock Movement"
          subtitle="Record opening, purchase inward, sales outward, and adjustments."
          columns={[
            { key: "movementDate", label: "Date", type: "date" },
            { key: "item", label: "Item", render: (row) => row.item?.name || "" },
            { key: "movementType", label: "Type" },
            { key: "quantity", label: "Qty" },
            { key: "ratePaisa", label: "Rate", type: "money" },
            { key: "amountPaisa", label: "Amount", type: "money" },
          ]}
          fields={[
            { name: "itemId", label: "Item", type: "select", options: itemOptions, required: true },
            {
              name: "movementType",
              label: "Movement Type",
              type: "select",
              required: true,
              options: [
                { label: "Opening", value: "OPENING" },
                { label: "Purchase Inward", value: "PURCHASE_INWARD" },
                { label: "Sales Outward", value: "SALES_OUTWARD" },
                { label: "Adjustment", value: "ADJUSTMENT" },
              ],
            },
            { name: "movementDate", label: "Movement Date", type: "date", required: true, defaultValue: formatDateInput(new Date()) },
            { name: "quantity", label: "Quantity", type: "number", step: "0.01", required: true },
            { name: "ratePaisa", label: "Rate (USD)", type: "number", step: "0.01", defaultValue: 0 },
            { name: "amountPaisa", label: "Amount (USD)", type: "number", step: "0.01", defaultValue: 0 },
            { name: "notes", label: "Notes", type: "textarea", fullWidth: true, rows: 3 },
          ]}
          loadData={() => resources.inventory.movements.list()}
          createRecord={(payload) => resources.inventory.movements.create(payload)}
          updateRecord={() => Promise.resolve()}
          deleteRecord={() => Promise.resolve()}
          canCreate={canModify}
          canEdit={false}
          canDelete={false}
          transformPayload={(values) => ({
            ...values,
            itemId: Number(values.itemId),
            quantity: Number(values.quantity || 0),
            ratePaisa: moneyInputToPaisa(values.ratePaisa),
            amountPaisa: moneyInputToPaisa(values.amountPaisa),
          })}
        />
      ) : null}
    </div>
  );
}
