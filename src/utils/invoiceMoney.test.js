import {nonGstTotal,nonGstLineTotal} from './invoiceMoney';
test('sums multiple quantity times rate lines without GST',()=>{
 expect(nonGstTotal([{quantity:'10',unitPrice:'850'},{quantity:'5',unitPrice:'600'},{quantity:'2',unitPrice:'450'}])).toBe('12400.00');
});
test('rounds half paise up per line and preserves decimal precision',()=>{
 expect(nonGstLineTotal({quantity:'1',unitPrice:'1.005'})).toBe('1.01');
 expect(nonGstTotal([{quantity:'0.1',unitPrice:'0.2'},{quantity:'3',unitPrice:'0.1'}])).toBe('0.32');
 expect(nonGstLineTotal({quantity:'99999999999999',unitPrice:'1.0001'})).toBe('100009999999999.00');
});
test('simple GST totals keep tax separate from quantity times rate',()=>{
 const {simpleInvoiceTotals}=require('./invoiceMoney');
 expect(simpleInvoiceTotals([{quantity:'2',unitPrice:'100',taxRate:'18'}])).toEqual({subtotal:'200.00',tax:'36.00',total:'236.00'});
 expect(simpleInvoiceTotals([{quantity:'1',unitPrice:'1.005',taxRate:'18'}])).toEqual({subtotal:'1.01',tax:'0.18',total:'1.19'});
 expect(simpleInvoiceTotals([{quantity:'2',unitPrice:'100',taxRate:'18'}],false).total).toBe('200.00');
});
test('purchase GST breakup rounds each line like PostgreSQL and never loses an odd paise',()=>{
 const {purchaseTaxBreakup}=require('./invoiceMoney');
 const lines=[{quantity:'1',unitPrice:'1',taxRate:'1'},{quantity:'1',unitPrice:'1',taxRate:'1'}];
 expect(purchaseTaxBreakup(lines,'INTRA_STATE')).toEqual({cgst:'0.02',sgst:'0.00',igst:'0.00'});
 expect(purchaseTaxBreakup(lines,'INTER_STATE')).toEqual({cgst:'0.00',sgst:'0.00',igst:'0.02'});
 expect(purchaseTaxBreakup([{quantity:'2',unitPrice:'100',discountAmount:'10',taxRate:'18'}],'INTRA_STATE')).toEqual({cgst:'17.10',sgst:'17.10',igst:'0.00'});
});
test('detailed sales distribute invoice discount before calculating GST and balance due',()=>{
 const {salesInvoiceTotals}=require('./invoiceMoney');
 expect(salesInvoiceTotals([{quantity:'3',unitPrice:'850',discountAmount:'0',taxRate:'18'}],'550','100','0')).toEqual({subtotal:'2550.00',discount:'0.00',taxable:'2000.00',tax:'360.00',total:'2460.00'});
 expect(salesInvoiceTotals([{quantity:'1',unitPrice:'0.05',taxRate:'18'},{quantity:'1',unitPrice:'0.05',taxRate:'18'}],'0.01','0','-0.01').total).toBe('0.10');
});
