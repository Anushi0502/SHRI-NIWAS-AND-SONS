import { formatDate, formatMoney } from "../utils/format";

export default function DataTable({ columns, rows, emptyText = "No records found." }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-slate-500">
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={row.id ?? index} className="hover:bg-slate-50/80">
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3 text-sm text-slate-700">
                      {column.render
                        ? column.render(row)
                        : column.type === "money"
                          ? formatMoney(row[column.key], row.currency)
                          : column.type === "date"
                            ? formatDate(row[column.key])
                            : String(row[column.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
