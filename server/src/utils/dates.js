import dayjs from "dayjs";

export function toDate(value) {
  const parsed = dayjs(value);
  if (!parsed.isValid()) {
    throw new Error(`Invalid date value: ${value}`);
  }
  return parsed.toDate();
}

export function formatDate(value) {
  return dayjs(value).format("YYYY-MM-DD");
}

export function currentFinancialYear(date = new Date()) {
  const d = dayjs(date);
  const start = d.month() >= 3 ? d.startOf("year").month(3).date(1) : d.subtract(1, "year").startOf("year").month(3).date(1);
  const end = start.add(1, "year").subtract(1, "day");
  return {
    startDate: start.toDate(),
    endDate: end.toDate(),
    label: `${start.format("YYYY-MM-DD")} to ${end.format("YYYY-MM-DD")}`,
  };
}
