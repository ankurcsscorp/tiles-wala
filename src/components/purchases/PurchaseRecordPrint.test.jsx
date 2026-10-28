import {render,screen,within} from '@testing-library/react';
import PurchaseRecordPrint from './PurchaseRecordPrint';
const purchase={id:1,status:'posted',invoice_layout:'SIMPLE_LAYOUT',supplier_document_type:'GST_TAX_INVOICE',invoice_number:'PUR-1',invoice_date:'2026-10-24',supplier_invoice_number:'SUP-9',store_name_snapshot:'Original Store',supplier_details_snapshot:{name:'Original Supplier',gstin:'10JNEPD0678B1ZL',billingAddress:{line1:'Original Address'}},supplier_current_details:{name:'Renamed Supplier'},subtotal:'200.00',total:'236.00',tax_total:'36.00',cgst_total:'18.00',sgst_total:'18.00',igst_total:'0.00',paid_amount:'100.00',outstanding_balance:'136.00',items:[{id:1,product_name:'Tile',quantity:'2',unit_name:'Box',unit_price:'100.00',taxable_value:'200.00',tax_rate:'18.0000',cgst_amount:'18.00',sgst_amount:'18.00',igst_amount:'0.00',line_total:'236.00',product_snapshot:{hsnCode:'6907'}}]};
test('simple purchase prints five product columns and separate supplier GST disclosures from snapshots',()=>{
 render(<PurchaseRecordPrint purchase={purchase}/>);
 const table=screen.getByRole('table',{name:'Purchase products'});expect(within(table).getAllByRole('columnheader')).toHaveLength(5);expect(within(table).queryByRole('columnheader',{name:'GST rate'})).not.toBeInTheDocument();
 expect(screen.getByRole('table',{name:'Supplier GST disclosures'})).toBeInTheDocument();expect(screen.getByText('6907')).toBeInTheDocument();expect(screen.getByText('Original Supplier')).toBeInTheDocument();expect(screen.queryByText('Renamed Supplier')).not.toBeInTheDocument();expect(screen.getByText('₹136')).toBeInTheDocument();expect(screen.getByText('Supplier document: GST Tax Invoice')).toBeInTheDocument();
});
test('no-GST purchase records do not print GST collection amounts',()=>{
 render(<PurchaseRecordPrint purchase={{...purchase,supplier_document_type:'NON_GST_COMMERCIAL',tax_total:'0',total:'200.00',supplier_details_snapshot:{name:'Unregistered Supplier'}}}/>);
 expect(screen.queryByRole('table',{name:'Supplier GST disclosures'})).not.toBeInTheDocument();expect(screen.queryByText('Total GST')).not.toBeInTheDocument();expect(within(screen.getByRole('table')).getAllByRole('columnheader')).toHaveLength(5);
});
test('detailed purchases retain the detailed item table and historical purchases use their existing print renderer',()=>{
 const view=render(<PurchaseRecordPrint purchase={{...purchase,invoice_layout:'STANDARD_GST_LAYOUT'}}/>);expect(within(screen.getByRole('table',{name:'Purchase products'})).getByRole('columnheader',{name:'HSN'})).toBeInTheDocument();
 view.rerender(<PurchaseRecordPrint purchase={{...purchase,invoice_layout:null}}/>);expect(screen.queryByRole('article')).not.toBeInTheDocument();
});

test('detailed purchases keep a readable eight-column product table with a complete separate GST breakup',()=>{
 render(<PurchaseRecordPrint purchase={{...purchase,invoice_layout:'STANDARD_GST_LAYOUT'}}/>);
 expect(within(screen.getByRole('table',{name:'Purchase products'})).getAllByRole('columnheader')).toHaveLength(8);
 const taxes=within(screen.getByRole('table',{name:'Supplier GST disclosures'}));
 for(const name of ['HSN','Taxable','GST rate','CGST','SGST','IGST'])expect(taxes.getByRole('columnheader',{name})).toBeInTheDocument();
 expect(screen.getByText('Two Hundred Thirty Six Rupees Only')).toBeInTheDocument();
 expect(screen.getByText('Internal purchase record')).toBeInTheDocument();expect(screen.queryByText('Original for recipient')).not.toBeInTheDocument();
});

test('purchase totals disclose saved adjustments and returns and print allocated payments',()=>{
 render(<PurchaseRecordPrint purchase={{...purchase,due_date:'2026-11-10',freight_amount:'50.00',returned_total:'20.00',outstanding_balance:'166.00',total:'286.00',payments:[{id:2,payment_number:'PAY-2',payment_date:'2026-10-28',payment_method:'bank_transfer',reference:'BANK-REF',allocated_amount:'100.00'}]}}/>);
 expect(screen.getByText('Freight')).toBeInTheDocument();expect(screen.getByText('₹50')).toBeInTheDocument();expect(screen.getByText('Return credit')).toBeInTheDocument();
 expect(screen.getByText('10 Nov 2026')).toBeInTheDocument();expect(screen.getByRole('table',{name:'Supplier payments'})).toHaveTextContent('BANK-REF');
 expect(screen.getByText('Prepared by')).toBeInTheDocument();expect(screen.getByText('Checked / approved by')).toBeInTheDocument();
});

test('missing historical supplier snapshots do not use live supplier details; drafts are clearly marked',()=>{
 const view=render(<PurchaseRecordPrint purchase={{...purchase,supplier_details_snapshot:null}}/>);
 expect(screen.getByText('Historical supplier details unavailable')).toBeInTheDocument();expect(screen.queryByText('Renamed Supplier')).not.toBeInTheDocument();
 view.rerender(<PurchaseRecordPrint purchase={{...purchase,status:'draft',supplier_details_snapshot:null}}/>);
 expect(screen.getByText('DRAFT PURCHASE RECORD')).toBeInTheDocument();expect(screen.getByText('Renamed Supplier')).toBeInTheDocument();
});

test('purchase records do not present the store receiving account as supplier payment instructions',()=>{
 render(<PurchaseRecordPrint purchase={{...purchase,payment_details_snapshot:{accountName:'Store Receiving Account',upiId:'store@bank'}}}/>);
 expect(screen.queryByText('Store Receiving Account')).not.toBeInTheDocument();expect(screen.queryByText('store@bank')).not.toBeInTheDocument();expect(screen.queryByRole('region',{name:'Payment details'})).not.toBeInTheDocument();
});
