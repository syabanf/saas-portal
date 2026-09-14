/** True when the timestamp falls in the current calendar month. */
export function isThisMonth(iso: string | null, now: number = Date.now()): boolean {
  if (!iso) return false
  const d = new Date(iso)
  const n = new Date(now)
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth()
}
