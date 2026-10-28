import {ledgerMoney,ledgerBalance,ledgerToday} from './ledgerMoney';
test('ledger decimal formatting preserves paise on large values',()=>{expect(ledgerMoney('9999999999999999.99')).toBe('₹9,99,99,99,99,99,99,999.99');expect(ledgerMoney('-0.10')).toBe('-₹0.1');});
test('customer and supplier balances use correct Dr/Cr directions',()=>{expect(ledgerBalance('100.00','customer')).toBe('₹100 Dr');expect(ledgerBalance('-100.00','customer')).toBe('₹100 Cr');expect(ledgerBalance('100.00','supplier')).toBe('₹100 Cr');expect(ledgerBalance('-100.00','supplier')).toBe('₹100 Dr');});
test('the default date uses India time around midnight',()=>{jest.useFakeTimers().setSystemTime(new Date('2026-10-27T20:00:00Z'));expect(ledgerToday()).toBe('2026-10-28');jest.useRealTimers();});
