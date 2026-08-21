import { getStateSnapshot, withState } from "./localStore";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function listFor(key) {
  return clone(getStateSnapshot()[key] || []);
}

function crudFor(key) {
  return {
    list: () => listFor(key),
    create: (payload) =>
      withState((state) => {
        const item = { id: `${key}-${Date.now()}`, ...payload };
        state[key].push(item);
        return clone(item);
      }),
    update: (id, payload) =>
      withState((state) => {
        const index = state[key].findIndex((item) => item.id === id);
        state[key][index] = { ...state[key][index], ...payload };
        return clone(state[key][index]);
      }),
    remove: (id) =>
      withState((state) => {
        state[key] = state[key].filter((item) => item.id !== id);
        return { ok: true };
      }),
  };
}

function inventoryList(key) {
  return listFor("inventory")[key] || [];
}

function updateInventory(key, id, payload) {
  return withState((state) => {
    const index = state.inventory[key].findIndex((item) => item.id === id);
    state.inventory[key][index] = { ...state.inventory[key][index], ...payload };
    return clone(state.inventory[key][index]);
  });
}

export const resources = {
  companies: {
    ...crudFor("companies"),
    activate: (companyId) => withState((state) => {
      state.session.activeCompanyId = companyId;
      return clone(state.companies.find((company) => company.id === companyId) || null);
    }),
  },
  accountGroups: crudFor("accountGroups"),
  ledgers: {
    ...crudFor("ledgers"),
    list: (search = "") =>
      listFor("ledgers").filter((ledger) => ledger.name.toLowerCase().includes(search.toLowerCase())),
    get: (id) => listFor("ledgers").find((ledger) => ledger.id === id) || null,
  },
  vouchers: {
    ...crudFor("vouchers"),
    list: () => listFor("vouchers"),
    get: (id) => listFor("vouchers").find((voucher) => voucher.id === id) || null,
  },
  invoices: {
    ...crudFor("invoices"),
    list: () => listFor("invoices"),
    get: (id) => listFor("invoices").find((invoice) => invoice.id === id) || null,
    pdf: async () => new Blob(["Demo invoice PDF"], { type: "application/pdf" }),
  },
  inventory: {
    stockGroups: {
      ...crudFor("inventory"),
      list: () => inventoryList("stockGroups"),
      create: (payload) => withState((state) => {
        const item = { id: `sg-${Date.now()}`, ...payload };
        state.inventory.stockGroups.push(item);
        return clone(item);
      }),
      update: (id, payload) => updateInventory("stockGroups", id, payload),
      remove: (id) => withState((state) => {
        state.inventory.stockGroups = state.inventory.stockGroups.filter((item) => item.id !== id);
        return { ok: true };
      }),
    },
    units: {
      list: () => inventoryList("units"),
      create: (payload) => withState((state) => {
        const item = { id: `uom-${Date.now()}`, ...payload };
        state.inventory.units.push(item);
        return clone(item);
      }),
      update: (id, payload) => updateInventory("units", id, payload),
      remove: (id) => withState((state) => {
        state.inventory.units = state.inventory.units.filter((item) => item.id !== id);
        return { ok: true };
      }),
    },
    hsnSac: {
      list: (search = "") => inventoryList("hsnSac").filter((entry) => `${entry.code} ${entry.description}`.toLowerCase().includes(search.toLowerCase())),
      create: (payload) => withState((state) => {
        const item = { id: `hsn-${Date.now()}`, ...payload };
        state.inventory.hsnSac.push(item);
        return clone(item);
      }),
      update: (id, payload) => updateInventory("hsnSac", id, payload),
      remove: (id) => withState((state) => {
        state.inventory.hsnSac = state.inventory.hsnSac.filter((item) => item.id !== id);
        return { ok: true };
      }),
    },
    items: {
      list: (search = "") => inventoryList("items").filter((item) => item.name.toLowerCase().includes(search.toLowerCase())),
      get: (id) => inventoryList("items").find((item) => item.id === id) || null,
      create: (payload) => withState((state) => {
        const item = { id: `item-${Date.now()}`, currentQty: 0, lowStockLevelQty: 0, ...payload };
        state.inventory.items.push(item);
        return clone(item);
      }),
      update: (id, payload) => updateInventory("items", id, payload),
      remove: (id) => withState((state) => {
        state.inventory.items = state.inventory.items.filter((item) => item.id !== id);
        return { ok: true };
      }),
    },
    movements: {
      list: () => inventoryList("movements"),
      create: (payload) => withState((state) => {
        const item = { id: `move-${Date.now()}`, createdAt: new Date().toISOString(), ...payload };
        state.inventory.movements.push(item);
        return clone(item);
      }),
    },
    summary: () => inventoryList("items").map((item) => ({
      ...item,
      stockGroup: item.stockGroup || "General",
      unit: item.unit || item.unitName || "ea",
      currentValuePaisa: Number(item.currentValuePaisa || (item.currentQty || 0) * (item.purchaseRatePaisa || 0)),
      isLowStock: Number(item.currentQty || 0) <= Number(item.lowStockLevelQty || 0),
    })),
    lowStock: () => inventoryList("items").filter((item) => item.currentQty <= item.lowStockLevelQty),
  },
  gst: {
    getSetting: () => getStateSnapshot().inventory.gstSetting,
    updateSetting: (payload) =>
      withState((state) => {
        state.inventory.gstSetting = { ...state.inventory.gstSetting, ...payload };
        return clone(state.inventory.gstSetting);
      }),
  },
  users: crudFor("users"),
  dashboard: () => ({
    totalSalesPaisa: 240000,
    totalPurchasesPaisa: 70000,
    cashBalancePaisa: 125000,
    bankBalancePaisa: 500000,
    receivablesPaisa: 18000,
    payablesPaisa: 9000,
    gstPayablePaisa: 1800,
    netProfitPaisa: 170000,
    monthlySalesPurchases: [
      { month: "Apr", salesPaisa: 100000, purchasePaisa: 35000 },
      { month: "May", salesPaisa: 140000, purchasePaisa: 40000 },
      { month: "Jun", salesPaisa: 160000, purchasePaisa: 45000 },
    ],
    lowStockItems: inventoryList("items").filter((item) => item.currentQty <= item.lowStockLevelQty),
    recentVouchers: listFor("vouchers").slice(-5).reverse(),
  }),
  reports: {
    get: (reportName) => ({ reportName, rows: [] }),
    export: async () => new Blob(["Demo report export"], { type: "application/octet-stream" }),
  },
  backup: {
    list: () => [],
    create: () => ({ id: `backup-${Date.now()}`, createdAt: new Date().toISOString() }),
    restore: () => ({ ok: true }),
  },
};
