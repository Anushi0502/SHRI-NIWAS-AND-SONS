export function paiseToMoney(paise) {
  return Number(paise || 0) / 100;
}

export function moneyToPaise(value) {
  const amount = Number(value || 0);
  return Math.round(amount * 100);
}

export function formatMoney(paise, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(paiseToMoney(paise));
}

export function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-CA").format(date);
}
