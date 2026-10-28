import { invoiceMoney, invoiceQuantity, invoiceDate, invoiceAddress, invoiceAmountInWords } from './invoiceFormat';

test('prints exact Indian currency grouping and preserves four-decimal unit rates', () => {
  expect(invoiceMoney('99999999999999.99')).toBe('₹9,99,99,99,99,99,999.99');
  expect(invoiceMoney('850.1250', { rate: true })).toBe('₹850.125');
  expect(invoiceMoney('850.0000', { rate: true })).toBe('₹850');
  expect(invoiceMoney('-0.25')).toBe('−₹0.25');
  expect(invoiceQuantity('12.5000')).toBe('12.5');
  expect(invoiceQuantity('12.0000')).toBe('12');
  expect(invoiceMoney(null)).toBe('—');
});

test.each([
  ['0.00', 'Zero Rupees Only'],
  ['1.01', 'One Rupee and One Paisa Only'],
  ['10200.50', 'Ten Thousand Two Hundred Rupees and Fifty Paise Only'],
  ['12345678.99', 'One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight Rupees and Ninety Nine Paise Only'],
  ['-1.25', 'Minus One Rupee and Twenty Five Paise Only'],
])('amount in words matches the stored total %s', (value, expected) => {
  expect(invoiceAmountInWords(value)).toBe(expected);
});

test('dates keep the saved calendar date and addresses support existing snapshot shapes', () => {
  expect(invoiceDate('2026-10-28T00:00:00.000Z')).toBe('28 Oct 2026');
  expect(invoiceDate(null)).toBe('—');
  expect(invoiceAddress({address: 'Main Road', city: 'Patna', state: 'Bihar', pinCode: '800001'})).toEqual(['Main Road', 'Patna, Bihar – 800001']);
  expect(invoiceAddress({billingAddress: {line1: 'Warehouse 1'}, city: 'Patna'})).toEqual(['Warehouse 1', 'Patna']);
  expect(invoiceAddress({billing: {line1: 'Current first line', street: 'Old line', line2: 'Second line'}, city: 'Pune', pin_code: '411001'}, 'billing')).toEqual(['Current first line', 'Second line', 'Pune – 411001']);
  expect(invoiceAddress({city: 'Patna'})).toEqual(['Patna']);
  expect(invoiceAddress(null)).toEqual([]);
});
