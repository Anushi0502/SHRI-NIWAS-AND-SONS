const STORAGE_KEY = "global-creative-services-demo-state";

const demoUsers = [
  { id: "u1", name: "Admin User", email: "admin@globalcreative.local", password: "Admin@12345", role: "ADMIN" },
  { id: "u2", name: "Accountant User", email: "accountant@globalcreative.local", password: "Accountant@12345", role: "ACCOUNTANT" },
  { id: "u3", name: "Viewer User", email: "viewer@globalcreative.local", password: "Viewer@12345", role: "VIEWER" },
];

function nowIso() {
  return new Date().toISOString();
}

function createSeedState() {
  const companyId = "c1";
  const ledgerId = "l1";
  return {
    session: { userId: null, activeCompanyId: companyId, token: null },
    users: demoUsers,
    companies: [
      {
        id: companyId,
        name: "Global Creative Services",
        address: "",
        phone: "",
        email: "",
        gstin: "",
        pan: "",
        state: "New York",
        financialYearStart: "2026-01-01",
        financialYearEnd: "2026-12-31",
        currency: "USD",
        isActive: true,
      },
    ],
    accountGroups: [{ id: "ag1", name: "Capital", nature: "Capital" }],
    ledgers: [{ id: ledgerId, name: "Cash", group: "Cash-in-Hand", openingBalancePaisa: 0, balanceType: "Dr" }],
    vouchers: [],
    invoices: [],
    inventory: {
      stockGroups: [{ id: "sg1", name: "General" }],
      units: [{ id: "uom1", name: "Nos" }],
      hsnSac: [{ id: "hsn1", code: "1000", description: "General Goods" }],
      items: [{ id: "item1", name: "Sample Item", sku: "SKU-1", currentQty: 12, lowStockLevelQty: 5 }],
      movements: [],
      gstSetting: { id: "gst1", salesTaxRate: 8.875, taxRegion: "NYC" },
    },
  };
}

function loadState() {
  if (typeof window === "undefined") return createSeedState();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seed = createSeedState();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }
  return JSON.parse(raw);
}

function saveState(state) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function nextId(prefix, items) {
  return `${prefix}${items.length + 1}`;
}

export function withState(mutator) {
  const state = loadState();
  const result = mutator(state);
  saveState(state);
  return result;
}

function currentUser(state) {
  return state.users.find((user) => user.id === state.session.userId) || null;
}

function activeCompanyId(state) {
  return state.session.activeCompanyId || state.companies[0]?.id || null;
}

function companyFilter(items, companyId) {
  return items.filter((item) => !item.companyId || item.companyId === companyId);
}

function deriveDashboard(state) {
  const companyId = activeCompanyId(state);
  const vouchers = companyFilter(state.vouchers, companyId);
  const invoices = companyFilter(state.invoices, companyId);
  const items = companyFilter(state.inventory.items, companyId);
  const sales = invoices.reduce((sum, invoice) => sum + (invoice.totalPaisa || 0), 0);
  const purchases = vouchers.filter((v) => v.voucherType === "Purchase").reduce((sum, v) => sum + (v.totalDebitPaisa || 0), 0);
  return {
    totalSalesPaisa: sales,
    totalPurchasesPaisa: purchases,
    cashBalancePaisa: 125000,
    bankBalancePaisa: 500000,
    receivablesPaisa: 18000,
    payablesPaisa: 9000,
    gstPayablePaisa: 1800,
    netProfitPaisa: sales - purchases,
    monthlySalesPurchases: [
      { month: "Apr", salesPaisa: 100000, purchasePaisa: 35000 },
      { month: "May", salesPaisa: 140000, purchasePaisa: 40000 },
      { month: "Jun", salesPaisa: 160000, purchasePaisa: 45000 },
    ],
    lowStockItems: items.filter((item) => item.currentQty <= item.lowStockLevelQty),
    recentVouchers: vouchers.slice(-5).reverse(),
  };
}

export async function login(payload) {
  return withState((state) => {
    const user = state.users.find((entry) => entry.email === payload.email && entry.password === payload.password);
    if (!user) {
      throw new Error("Invalid email or password");
    }
    state.session.userId = user.id;
    state.session.token = `demo-${user.id}`;
    return { user: clone({ ...user, password: undefined, activeCompanyId: activeCompanyId(state) }), accessToken: state.session.token };
  });
}

export async function refreshSession() {
  const state = loadState();
  const user = currentUser(state);
  if (!user) throw new Error("No active session");
  return { user: clone({ ...user, password: undefined, activeCompanyId: activeCompanyId(state) }), accessToken: state.session.token };
}

export async function logout() {
  return withState((state) => {
    state.session.userId = null;
    state.session.token = null;
    return { ok: true };
  });
}

export async function me() {
  const state = loadState();
  const user = currentUser(state);
  if (!user) throw new Error("Not signed in");
  return { user: clone({ ...user, password: undefined, activeCompanyId: activeCompanyId(state) }) };
}

export async function setActiveCompany(companyId) {
  return withState((state) => {
    state.session.activeCompanyId = companyId;
    const user = currentUser(state);
    return { user: clone({ ...user, password: undefined, activeCompanyId: companyId }) };
  });
}

function crudCollection(key) {
  return {
    list: () => clone(loadState()[key]),
    create: (payload) => withState((state) => {
      const item = { id: nextId(key.slice(0, 1), state[key]), ...payload };
      state[key].push(item);
      return clone(item);
    }),
    update: (id, payload) => withState((state) => {
      const index = state[key].findIndex((item) => item.id === id);
      state[key][index] = { ...state[key][index], ...payload };
      return clone(state[key][index]);
    }),
    remove: (id) => withState((state) => {
      state[key] = state[key].filter((item) => item.id !== id);
      return { ok: true };
    }),
  };
}

export const localApi = {
  companies: {
    ...crudCollection("companies"),
    activate: (companyId) => setActiveCompany(companyId),
  },
  accountGroups: crudCollection("accountGroups"),
  ledgers: {
    ...crudCollection("ledgers"),
    get: (id) => clone(loadState().ledgers.find((item) => item.id === id)),
  },
  vouchers: {
    ...crudCollection("vouchers"),
    list: () => clone(loadState().vouchers),
    get: (id) => clone(loadState().vouchers.find((item) => item.id === id)),
  },
  invoices: {
    ...crudCollection("invoices"),
    list: () => clone(loadState().invoices),
    get: (id) => clone(loadState().invoices.find((item) => item.id === id)),
    pdf: async () => new Blob(["Demo invoice PDF"], { type: "application/pdf" }),
  },
  inventory: {
    stockGroups: crudCollection("inventory").list,
  },
};

export function getDashboard() {
  return clone(deriveDashboard(loadState()));
}

export function getStateSnapshot() {
  return clone(loadState());
}

export function resetDemoState() {
  const state = createSeedState();
  saveState(state);
  return clone(state);
}
