export function compareVersions(left, right) {
  const a = String(left || '').split('.').map(Number)
  const b = String(right || '').split('.').map(Number)
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] || 0) - (b[i] || 0)
    if (diff) return Math.sign(diff)
  }
  return 0
}
