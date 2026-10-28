// Trim decimal padding as text so large amounts and small quantities stay exact.
export function compactDecimal(value) {
  if (value == null) return value;
  const text = String(value);
  if (!/^[+-]?\d+\.\d+$/.test(text)) return text;
  return text.replace(/0+$/, '').replace(/\.$/, '');
}

export function formatNumber(value, fallback = '—') {
  return value == null || value === '' ? fallback : compactDecimal(value);
}

export const formatMoney = value => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2,
}).format(Number(value || 0));
