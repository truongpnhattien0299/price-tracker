const vnd = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
})

/** Money arrives as a Decimal string; Number() here is display-only. */
export function formatMoney(value: string | number, currency = "VND") {
  const n = Number(value)
  if (currency === "VND") return vnd.format(n)
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency }).format(n)
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) {
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", ...opts }).format(
    new Date(iso),
  )
}
