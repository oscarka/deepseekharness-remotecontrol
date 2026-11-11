export function compareSemver(a, b) {
  const pa = String(a || '')
    .trim()
    .replace(/^v/i, '')
    .split(/[.-]/)
    .map(x => Number(x) || 0);
  const pb = String(b || '')
    .trim()
    .replace(/^v/i, '')
    .split(/[.-]/)
    .map(x => Number(x) || 0);
  for (let i = 0; i < 3; i += 1) {
    if ((pa[i] || 0) !== (pb[i] || 0)) {
      return (pa[i] || 0) < (pb[i] || 0) ? -1 : 1;
    }
  }
  return 0;
}
