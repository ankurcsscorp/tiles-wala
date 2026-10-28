import {allocationTotals,oldestFirstAllocation} from './paymentAllocation';

test('oldest date and then numeric invoice ID determine allocation order',()=>{
 const invoices=[{id:'2',invoice_date:'2026-10-20',outstanding:'100'},
  {id:'11',invoice_date:'2026-10-01',outstanding:'50.05'},
  {id:'3',invoice_date:'2026-10-01',outstanding:'20.10'}];
 expect(oldestFirstAllocation(invoices,'25.11')).toEqual({'3':'20.10','11':'5.01'});
 expect(invoices[0].id).toBe('2');
});
test('zero/paid invoices are skipped and excess money remains outside allocations',()=>{
 expect(oldestFirstAllocation([{id:1,invoice_date:'2026-10-01',outstanding:'0'},{id:2,invoice_date:'2026-10-02',outstanding:'10.01'}],'100')).toEqual({'2':'10.01'});
 expect(oldestFirstAllocation([],'100')).toEqual({});
});
test('cent amounts and large values avoid floating point errors',()=>{
 const invoices=[{id:1,invoice_date:'2026-10-01',outstanding:'99999999999999.98'},{id:2,invoice_date:'2026-10-02',outstanding:'1.00'}];
 expect(oldestFirstAllocation(invoices,'99999999999999.99')).toEqual({'1':'99999999999999.98','2':'0.01'});
});
test('invalid, negative and blank payment amounts do not produce a preview',()=>{
 for(const amount of ['',null,'-1','abc','1.001'])expect(oldestFirstAllocation([{id:1,invoice_date:'2026-10-01',outstanding:'10'}],amount)).toEqual({});
});
test('exact cent totals do not reject fully allocated decimal payments',()=>{
 expect(allocationTotals('0.30',{'1':'0.10','2':'0.20'})).toEqual({allocated:'0.30',unallocated:'0.00',exceeds:false});
 expect(allocationTotals('0.29',{'1':'0.10','2':'0.20'}).exceeds).toBe(true);
 expect(allocationTotals('100',{'1':'33.33'}).unallocated).toBe('66.67');
});
