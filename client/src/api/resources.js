import { http } from "./http";

export const resources = {
  companies: {
    list: () => http.get("/companies").then((res) => res.data.companies),
    create: (payload) => http.post("/companies", payload).then((res) => res.data.company),
    update: (id, payload) => http.put(`/companies/${id}`, payload).then((res) => res.data.company),
    remove: (id) => http.delete(`/companies/${id}`).then((res) => res.data),
    activate: (companyId) => http.post("/companies/activate", { companyId }).then((res) => res.data.company),
  },
  accountGroups: {
    list: () => http.get("/account-groups").then((res) => res.data.groups),
    create: (payload) => http.post("/account-groups", payload).then((res) => res.data.group),
    update: (id, payload) => http.put(`/account-groups/${id}`, payload).then((res) => res.data.group),
    remove: (id) => http.delete(`/account-groups/${id}`).then((res) => res.data),
  },
  ledgers: {
    list: (search = "") => http.get("/ledgers", { params: { search } }).then((res) => res.data.ledgers),
    get: (id) => http.get(`/ledgers/${id}`).then((res) => res.data.ledger),
    create: (payload) => http.post("/ledgers", payload).then((res) => res.data.ledger),
    update: (id, payload) => http.put(`/ledgers/${id}`, payload).then((res) => res.data.ledger),
    remove: (id) => http.delete(`/ledgers/${id}`).then((res) => res.data),
  },
  vouchers: {
    list: (params = {}) => http.get("/vouchers", { params }).then((res) => res.data.vouchers),
    get: (id) => http.get(`/vouchers/${id}`).then((res) => res.data.voucher),
    create: (payload) => http.post("/vouchers", payload).then((res) => res.data.voucher),
    update: (id, payload) => http.put(`/vouchers/${id}`, payload).then((res) => res.data.voucher),
    remove: (id) => http.delete(`/vouchers/${id}`).then((res) => res.data),
  },
  invoices: {
    list: (params = {}) => http.get("/invoices", { params }).then((res) => res.data.invoices),
    get: (id) => http.get(`/invoices/${id}`).then((res) => res.data.invoice),
    create: (payload) => http.post("/invoices", payload).then((res) => res.data.invoice),
    update: (id, payload) => http.put(`/invoices/${id}`, payload).then((res) => res.data.invoice),
    remove: (id) => http.delete(`/invoices/${id}`).then((res) => res.data),
    pdf: (id) => http.get(`/invoices/${id}/pdf`, { responseType: "blob" }),
  },
  inventory: {
    stockGroups: {
      list: () => http.get("/inventory/stock-groups").then((res) => res.data.stockGroups),
      create: (payload) => http.post("/inventory/stock-groups", payload).then((res) => res.data.stockGroup),
      update: (id, payload) => http.put(`/inventory/stock-groups/${id}`, payload).then((res) => res.data.stockGroup),
      remove: (id) => http.delete(`/inventory/stock-groups/${id}`).then((res) => res.data),
    },
    units: {
      list: () => http.get("/inventory/units").then((res) => res.data.units),
      create: (payload) => http.post("/inventory/units", payload).then((res) => res.data.unit),
      update: (id, payload) => http.put(`/inventory/units/${id}`, payload).then((res) => res.data.unit),
      remove: (id) => http.delete(`/inventory/units/${id}`).then((res) => res.data),
    },
    hsnSac: {
      list: (search = "") => http.get("/inventory/hsn-sac", { params: { search } }).then((res) => res.data.hsnSacs),
      create: (payload) => http.post("/inventory/hsn-sac", payload).then((res) => res.data.hsnSac),
      update: (id, payload) => http.put(`/inventory/hsn-sac/${id}`, payload).then((res) => res.data.hsnSac),
      remove: (id) => http.delete(`/inventory/hsn-sac/${id}`).then((res) => res.data),
    },
    items: {
      list: (search = "") => http.get("/inventory/items", { params: { search } }).then((res) => res.data.items),
      get: (id) => http.get(`/inventory/items/${id}`).then((res) => res.data.item),
      create: (payload) => http.post("/inventory/items", payload).then((res) => res.data.item),
      update: (id, payload) => http.put(`/inventory/items/${id}`, payload).then((res) => res.data.item),
      remove: (id) => http.delete(`/inventory/items/${id}`).then((res) => res.data),
    },
    movements: {
      list: (params = {}) => http.get("/inventory/movements", { params }).then((res) => res.data.movements),
      create: (payload) => http.post("/inventory/movements", payload).then((res) => res.data.movement),
    },
    summary: () => http.get("/inventory/summary").then((res) => res.data.summary),
    lowStock: () => http.get("/inventory/alerts/low-stock").then((res) => res.data.items),
  },
  gst: {
    getSetting: () => http.get("/gst/setting").then((res) => res.data.gstSetting),
    updateSetting: (payload) => http.put("/gst/setting", payload).then((res) => res.data.gstSetting),
  },
  users: {
    list: () => http.get("/users").then((res) => res.data.users),
    create: (payload) => http.post("/users", payload).then((res) => res.data.user),
    update: (id, payload) => http.put(`/users/${id}`, payload).then((res) => res.data.user),
    remove: (id) => http.delete(`/users/${id}`).then((res) => res.data),
  },
  dashboard: () => http.get("/dashboard").then((res) => res.data.dashboard),
  reports: {
    get: (reportName, params = {}) => http.get(`/reports/${reportName}`, { params }).then((res) => res.data.data),
    export: (reportName, format, params = {}) =>
      http.get(`/reports/${reportName}/export/${format}`, { params, responseType: "blob" }),
  },
  backup: {
    list: () => http.get("/backup").then((res) => res.data.backups),
    create: () => http.post("/backup/create").then((res) => res.data.backup),
    restore: (payload) => http.post("/backup/restore", payload).then((res) => res.data),
  },
};
