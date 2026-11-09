import {render,screen,within} from '@testing-library/react';
import PurchaseRecordPrint from './PurchaseRecordPrint';
const purchase={id:1,status:'posted',invoice_layout:'SIMPLE_LAYOUT',supplier_document_type:'GST_TAX_INVOICE',invoice_number:'PUR-1',invoice_date:'2026-10-24',supplier_invoice_number:'SUP-9',store_name_snapshot:'Original Store',supplier_details_snapshot:{name:'Original Supplier',gstin:'10JNEPD0678B1ZL',billingAddress:{line1:'Original Address'}},supplier_current_details:{name:'Renamed Supplier'},subtotal:'200.00',total:'236.00',tax_total:'36.00',cgst_total:'18.00',sgst_total:'18.00',igst_total:'0.00',paid_amount:'100.00',outstanding_balance:'136.00',items:[{id:1,product_name:'Tile',quantity:'2',unit_name:'Box',unit_price:'100.00',taxable_value:'200.00',tax_rate:'18.0000',cgst_amount:'18.00',sgst_amount:'18.00',igst_amount:'0.00',line_total:'236.00',product_snapshot:{hsnCode:'6907'}}]};
test('purchase record prints seven bounded columns, supplier details and GST totals from snapshots',()=>{
 render(<PurchaseRecordPrint purchase={purchase}/>);
 const table=screen.getByRole('table',{name:'Purchase products'});expect(within(table).getAllByRole('columnheader')).toHaveLength(7);expect(within(table).getByRole('columnheader',{name:'HSN'})).toBeInTheDocument();
 expect(screen.getByText('6907')).toBeInTheDocument();expect(screen.getByText('Original Supplier')).toBeInTheDocument();expect(screen.queryByText('Renamed Supplier')).not.toBeInTheDocument();expect(screen.getByText('₹136.00')).toBeInTheDocument();expect(screen.getByText(/Supplier document: GST Tax Invoice/)).toBeInTheDocument();
});
test('no-GST purchase records do not print GST collection amounts',()=>{
 render(<PurchaseRecordPrint purchase={{...purchase,supplier_document_type:'NON_GST_COMMERCIAL',tax_total:'0',total:'200.00',supplier_details_snapshot:{name:'Unregistered Supplier'}}}/>);
 expect(screen.queryByText('GST')).not.toBeInTheDocument();expect(within(screen.getByRole('table',{name:'Purchase products'})).getAllByRole('columnheader')).toHaveLength(7);
});
test('detailed and historical purchases use the same seven-column print renderer',()=>{
 const view=render(<PurchaseRecordPrint purchase={{...purchase,invoice_layout:'STANDARD_GST_LAYOUT'}}/>);expect(within(screen.getByRole('table',{name:'Purchase products'})).getByRole('columnheader',{name:'HSN'})).toBeInTheDocument();
 view.rerender(<PurchaseRecordPrint purchase={{...purchase,invoice_layout:null}}/>);expect(within(screen.getByRole('table',{name:'Purchase products'})).getAllByRole('columnheader')).toHaveLength(7);
});

test('detailed purchases keep a readable eight-column product table with a complete separate GST breakup',()=>{
 render(<PurchaseRecordPrint purchase={{...purchase,invoice_layout:'STANDARD_GST_LAYOUT'}}/>);
 expect(within(screen.getByRole('table',{name:'Purchase products'})).getAllByRole('columnheader')).toHaveLength(7);
 expect(screen.getByText('GST breakup')).toBeInTheDocument();
 expect(screen.getByText('INTERNAL PURCHASE RECORD')).toBeInTheDocument();expect(screen.queryByText('Original for recipient')).not.toBeInTheDocument();
});

test('purchase totals disclose charges, dates, paid and outstanding amounts',()=>{
 render(<PurchaseRecordPrint purchase={{...purchase,due_date:'2026-11-10',freight_amount:'50.00',returned_total:'20.00',outstanding_balance:'166.00',total:'286.00',payments:[{id:2,payment_number:'PAY-2',payment_date:'2026-10-28',payment_method:'bank_transfer',reference:'BANK-REF',allocated_amount:'100.00'}]}}/>);
 expect(screen.getByText('Freight')).toBeInTheDocument();expect(screen.getByText('₹50.00')).toBeInTheDocument();
 expect(screen.getAllByText('24 Oct 2026').length).toBeGreaterThan(0);expect(screen.getByText('Amount Paid')).toBeInTheDocument();expect(screen.getByText('Outstanding')).toBeInTheDocument();
});

test('missing historical supplier snapshots do not use live supplier details; drafts are clearly marked',()=>{
 const view=render(<PurchaseRecordPrint purchase={{...purchase,supplier_details_snapshot:null}}/>);
 expect(screen.getByText('Supplier details unavailable')).toBeInTheDocument();expect(screen.queryByText('Renamed Supplier')).not.toBeInTheDocument();
 view.rerender(<PurchaseRecordPrint purchase={{...purchase,status:'draft',supplier_details_snapshot:null}}/>);
 expect(screen.getByText('DRAFT PURCHASE RECORD')).toBeInTheDocument();expect(screen.getByText('Renamed Supplier')).toBeInTheDocument();
});

test('purchase records do not present the store receiving account as supplier payment instructions',()=>{
 render(<PurchaseRecordPrint purchase={{...purchase,payment_details_snapshot:{accountName:'Store Receiving Account',upiId:'store@bank'}}}/>);
 expect(screen.queryByText('Store Receiving Account')).not.toBeInTheDocument();expect(screen.queryByText('store@bank')).not.toBeInTheDocument();expect(screen.queryByRole('region',{name:'Payment details'})).not.toBeInTheDocument();
});

test('formats nested store addresses, Indian currency, dates and trimmed quantities without object text',()=>{
 render(<PurchaseRecordPrint purchase={{...purchase,store_address_snapshot:{address:{line1:'42 Market Road',line2:'Unit 3'},city:'Kolkata',state:'West Bengal',pinCode:'700001'},invoice_date:'2026-11-06',subtotal:'56400.00',items:[{...purchase.items[0],quantity:'100.0000',unit_name:'BOX',unit_price:'564.00',product_name:'Large format floor tile'}]}}/>);
 expect(screen.getByText('42 Market Road')).toBeInTheDocument();expect(screen.getByText('Kolkata, West Bengal – 700001')).toBeInTheDocument();expect(screen.getAllByText('06 Nov 2026').length).toBeGreaterThan(0);expect(screen.getByText('100 BOX')).toBeInTheDocument();expect(screen.getByText('₹564.00')).toBeInTheDocument();expect(document.body.textContent).not.toContain('[object Object]');
});

test('missing store address, HSN and supplier GSTIN render safely',()=>{
 render(<PurchaseRecordPrint purchase={{...purchase,store_address_snapshot:null,supplier_details_snapshot:{name:'Supplier'},items:[{...purchase.items[0],product_snapshot:{},quantity:'1'}]}}/>);
 expect(screen.getByText('Supplier',{exact:true})).toBeInTheDocument();expect(screen.getAllByText('—').length).toBeGreaterThan(0);expect(document.body.textContent).not.toMatch(/undefined|null|\[object Object\]/);
});

test('long product descriptions stay inside their column across a 20-item purchase',()=>{
 const items=Array.from({length:20},(_,index)=>({...purchase.items[0],id:index+1,product_name:`Floor tile ${index+1}`,description:`Polished vitrified floor tile with a deliberately long description ${'for indoor residential installation '.repeat(5)}`}));
 render(<PurchaseRecordPrint purchase={{...purchase,items}}/>);
 const table=screen.getByRole('table',{name:'Purchase products'});expect(within(table).getAllByRole('row')).toHaveLength(21);expect(within(table).getAllByRole('columnheader')).toHaveLength(7);expect(within(table).getByText('Floor tile 20')).toBeInTheDocument();expect(document.body.textContent).not.toContain('[object Object]');
});
