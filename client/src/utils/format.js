export function paiseToMoney(paise) {
  return Number(paise || 0) / 100;
}

export function moneyToPaise(value) {
  const amount = Number(value || 0);
  return Math.round(amount * 100);
}

export function formatMoney(paise, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(paiseToMoney(paise));
}

export function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatDateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-CA").format(date);
}
