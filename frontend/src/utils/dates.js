export function fmt (d) {
  return d
    ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : '\u2014';
}

export function fmtDate (d) {
  return d
    ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '\u2014';
}

export function fmtShort (d) {
  if (!d) return '\u2014';
  const date = new Date(d);
  const now = new Date();
  const diff = now - date;
  if (diff < 60 * 1000) return 'Just now';
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
