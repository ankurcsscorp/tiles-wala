import {render,screen,within} from '@testing-library/react';
import PurchaseRecordPrint from './PurchaseRecordPrint';
const purchase={id:1,status:'posted',invoice_layout:'SIMPLE_LAYOUT',supplier_document_type:'GST_TAX_INVOICE',invoice_number:'PUR-1',invoice_date:'2026-10-24',supplier_invoice_number:'SUP-9',store_name_snapshot:'Original Store',supplier_details_snapshot:{name:'Original Supplier',gstin:'10JNEPD0678B1ZL',billingAddress:{line1:'Original Address'}},supplier_current_details:{name:'Renamed Supplier'},subtotal:'200.00',total:'236.00',tax_total:'36.00',cgst_total:'18.00',sgst_total:'18.00',igst_total:'0.00',paid_amount:'100.00',outstanding_balance:'136.00',items:[{id:1,product_name:'Tile',quantity:'2',unit_name:'Box',unit_price:'100.00',taxable_value:'200.00',tax_rate:'18.0000',cgst_amount:'18.00',sgst_amount:'18.00',igst_amount:'0.00',line_total:'236.00',product_snapshot:{hsnCode:'6907'}}]};
test('simple purchase prints five product columns and separate supplier GST disclosures from snapshots',()=>{
 render(<PurchaseRecordPrint purchase={purchase}/>);
 const table=screen.getByRole('table',{name:'Purchase products'});expect(within(table).getAllByRole('columnheader')).toHaveLength(5);expect(within(table).queryByRole('columnheader',{name:'GST rate'})).not.toBeInTheDocument();
 expect(screen.getByRole('table',{name:'Supplier GST disclosures'})).toBeInTheDocument();expect(screen.getByText('6907')).toBeInTheDocument();expect(screen.getByText('Original Supplier')).toBeInTheDocument();expect(screen.queryByText('Renamed Supplier')).not.toBeInTheDocument();expect(screen.getByText('₹136.00')).toBeInTheDocument();expect(screen.getByText('Supplier document: GST Tax Invoice')).toBeInTheDocument();
});
test('no-GST purchase records do not print GST collection amounts',()=>{
 render(<PurchaseRecordPrint purchase={{...purchase,supplier_document_type:'NON_GST_COMMERCIAL',tax_total:'0',total:'200.00',supplier_details_snapshot:{name:'Unregistered Supplier'}}}/>);
 expect(screen.queryByRole('table',{name:'Supplier GST disclosures'})).not.toBeInTheDocument();expect(screen.queryByText('Total GST')).not.toBeInTheDocument();expect(within(screen.getByRole('table')).getAllByRole('columnheader')).toHaveLength(5);
});
test('detailed purchases retain the detailed item table and historical purchases use their existing print renderer',()=>{
 const view=render(<PurchaseRecordPrint purchase={{...purchase,invoice_layout:'STANDARD_GST_LAYOUT'}}/>);expect(within(screen.getByRole('table',{name:'Purchase products'})).getByRole('columnheader',{name:'HSN'})).toBeInTheDocument();
 view.rerender(<PurchaseRecordPrint purchase={{...purchase,invoice_layout:null}}/>);expect(screen.queryByRole('article')).not.toBeInTheDocument();
});
