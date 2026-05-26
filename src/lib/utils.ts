export function fmt(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount)
}
export function fmtDate(date: string | Date) {
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(date))
}
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}
export function generateMT5Login(): string {
  return Math.floor(10000000 + Math.random() * 89999999).toString()
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}
export function generateMT5Login(): string {
  return Math.floor(10000000 + Math.random() * 89999999).toString()
}
