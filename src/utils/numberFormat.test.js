import { compactDecimal, formatNumber, formatMoney } from './numberFormat';

test.each([
  ['1.0000', '1'], ['1.2500', '1.25'], ['0.0000', '0'],
  ['0.00010000', '0.0001'], ['-10.5000', '-10.5'],
  ['9999999999999999.9900', '9999999999999999.99'],
])('removes padding without losing precision: %s', (value, expected) => {
  expect(compactDecimal(value)).toBe(expected);
  expect(formatNumber(value)).toBe(expected);
});

test('preserves empty inputs, labels, and identifiers', () => {
  expect(compactDecimal('')).toBe('');
  expect(compactDecimal('00123')).toBe('00123');
  expect(formatNumber(null)).toBe('—');
  expect(formatNumber('Not configured')).toBe('Not configured');
  expect(formatMoney('1.000')).toBe('₹1');
  expect(formatMoney('1.500')).toBe('₹1.5');
  expect(formatMoney('1.25')).toBe('₹1.25');
});
