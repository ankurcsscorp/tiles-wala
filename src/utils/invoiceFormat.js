// Format stored decimal strings without converting money to floating point.
const decimal = value => String(value ?? '').trim().match(/^(-?)(\d+)(?:\.(\d+))?$/);
const grouped = whole => new Intl.NumberFormat('en-IN').format(window.BigInt(whole));

export function invoiceMoney(value, { rate = false } = {}) {
  const match = decimal(value);
  if (!match) return '—';
  const fraction = (match[3] || '').slice(0, rate ? 4 : 2).replace(/0+$/, '');
  return `${match[1] ? '−' : ''}₹${grouped(match[2])}${fraction ? `.${fraction}` : ''}`;
}

export function invoiceQuantity(value) {
  const match = decimal(value);
  if (!match) return '—';
  const fraction = (match[3] || '').replace(/0+$/, '');
  return `${match[1]}${match[2]}${fraction ? `.${fraction}` : ''}`;
}

export function invoiceDate(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return match && months[Number(match[2]) - 1] ? `${match[3]} ${months[Number(match[2]) - 1]} ${match[1]}` : '—';
}

export function invoiceAddress(snapshot, kind) {
  if (!snapshot) return [];
  let address = kind ? snapshot[kind] : snapshot.address ?? snapshot.billingAddress ?? snapshot;
  if (typeof address === 'string') address = { line1: address };
  if (!address || typeof address !== 'object') return [];
  const locality = [address.city || snapshot.city, address.state || snapshot.state].filter(Boolean).join(', ');
  const region = [locality, address.pinCode || address.pin_code || snapshot.pinCode || snapshot.pin_code].filter(Boolean).join(' – ');
  return [address.line1 || address.street || (typeof address.address === 'string' ? address.address : ''), address.line2, region]
    .map(value => String(value || '').trim()).filter(Boolean);
}

const units = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
function words(number) {
  if (number < 20n) return units[Number(number)];
  if (number < 100n) return `${tens[Number(number / 10n)]}${number % 10n ? ` ${words(number % 10n)}` : ''}`;
  for (const [size, label] of [[10000000n, 'Crore'], [100000n, 'Lakh'], [1000n, 'Thousand'], [100n, 'Hundred']]) {
    if (number >= size) return `${words(number / size)} ${label}${number % size ? ` ${words(number % size)}` : ''}`;
  }
}

export function invoiceAmountInWords(value) {
  const match = decimal(value);
  if (!match) return '—';
  const rupees = window.BigInt(match[2]);
  const paise = window.BigInt((match[3] || '').padEnd(2, '0').slice(0, 2));
  return `${match[1] ? 'Minus ' : ''}${words(rupees)} ${rupees === 1n ? 'Rupee' : 'Rupees'}${paise ? ` and ${words(paise)} ${paise === 1n ? 'Paisa' : 'Paise'}` : ''} Only`;
}
