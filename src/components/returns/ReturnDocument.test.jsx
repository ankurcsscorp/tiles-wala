import {render,screen,within} from '@testing-library/react';
import ReturnDocument from './ReturnDocument';
const record={return_number:'SR-1',return_date:'2026-10-27',status:'posted',party_name:'Buyer',store_name:'Store',original_invoice_number:'INV-OLD',original_invoice_date:'2026-10-20',total:'118',tax_adjustment:'18',amounts:{subtotal:'100'},adjusted_amount:'100',unapplied_credit:'18',effective_refund_amount:'0',allocations:[],refunds:[],document_snapshot:{store:{name:'Original Store',gstin:'10JNEPD0678B1ZL',address:{street:'Old address'}},party:{name:'Original Buyer'},invoice:{documentType:'GST_TAX_INVOICE',layout:'SIMPLE_LAYOUT'}},items:[{id:1,product_name:'Original Tile',sku:'T1',unit_name:'Box',quantity:'1',unit_price:'100',line_total:'118',taxable_adjustment:'100',tax_rate:'18',tax_adjustment:'18',cgst_adjustment:'9',sgst_adjustment:'9',igst_adjustment:'0',return_snapshot:{product:{hsnCode:'6907'},taxBreakupKnown:true}}]};
test('GST return print uses saved store, party, rate, tax and invoice reference',()=>{
 render(<ReturnDocument record={record} kind="sales"/>);const doc=within(screen.getByRole('article',{name:'Printable return document'}));expect(doc.getByText('Original Store')).toBeInTheDocument();expect(doc.getByText('Original Buyer')).toBeInTheDocument();expect(doc.getByText('SALES RETURN / CREDIT NOTE')).toBeInTheDocument();expect(doc.getByText('INV-OLD')).toBeInTheDocument();expect(doc.getByText('18%')).toBeInTheDocument();expect(doc.getAllByText('₹9')).toHaveLength(2);expect(doc.getByText('6907')).toBeInTheDocument();
});
test('Simple non-tax return prints five monetary product columns without GST disclosures',()=>{
 render(<ReturnDocument record={{...record,tax_adjustment:'0',document_snapshot:{...record.document_snapshot,invoice:{documentType:'NON_GST_COMMERCIAL',layout:'SIMPLE_LAYOUT'}}}} kind="sales"/>);expect(screen.getByText('SALES RETURN / COMMERCIAL CREDIT NOTE')).toBeInTheDocument();expect(screen.queryByRole('columnheader',{name:'HSN'})).not.toBeInTheDocument();expect(screen.queryByRole('columnheader',{name:'GST rate'})).not.toBeInTheDocument();expect(screen.queryByText(/GSTIN:/)).not.toBeInTheDocument();
});
test('purchase return is an internal record with supplier-note status and no automatic statutory debit-note claim',()=>{
 render(<ReturnDocument record={record} kind="purchase"/>);expect(screen.getByText('PURCHASE RETURN RECORD')).toBeInTheDocument();expect(screen.getByText(/Supplier credit note: Pending receipt/)).toBeInTheDocument();expect(screen.queryByRole('heading',{name:/DEBIT NOTE/})).not.toBeInTheDocument();
});
test('unknown historical GST breakup is shown as unavailable',()=>{
 render(<ReturnDocument record={{...record,items:[{...record.items[0],return_snapshot:{taxBreakupKnown:false}}]}} kind="sales"/>);expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3);
});
test('legacy GST originals retain their GST note title even when return tax is zero',()=>{
 render(<ReturnDocument record={{...record,tax_adjustment:'0',document_snapshot:{...record.document_snapshot,invoice:{invoiceType:'GST'}}}} kind="sales"/>);
 expect(screen.getByText('SALES RETURN / CREDIT NOTE')).toBeInTheDocument();expect(screen.getByRole('columnheader',{name:'HSN'})).toBeInTheDocument();
});
test('a mixed multi-bill return prints every source and keeps GST and commercial items separate',()=>{
 const first={...record.document_snapshot,invoice:{...record.document_snapshot.invoice,id:1,number:'GST-OLD',date:'2026-10-20'}},second={store:{name:'Original Store'},party:{name:'Original Buyer'},invoice:{id:2,number:'SIMPLE-OLD',date:'2026-10-21',documentType:'NON_GST_COMMERCIAL'}};
 render(<ReturnDocument kind="sales" record={{...record,original_invoice_number:'GST-OLD, SIMPLE-OLD',total:'168',document_snapshot:{...first,invoices:[first,second]},items:[{...record.items[0],original_invoice_id:1},{...record.items[0],id:2,original_invoice_id:2,product_name:'Non GST Tile',line_total:'50',taxable_adjustment:'50',tax_adjustment:'0',tax_rate:'0'}]}}/>);
 expect(screen.getByText('SALES RETURN STATEMENT')).toBeInTheDocument();
 const gst=within(screen.getByRole('region',{name:'Returned items from GST-OLD'})),commercial=within(screen.getByRole('region',{name:'Returned items from SIMPLE-OLD'}));
 expect(gst.getByRole('columnheader',{name:'CGST'})).toBeInTheDocument();expect(commercial.queryByRole('columnheader',{name:'CGST'})).not.toBeInTheDocument();expect(gst.getByText('Return amount for GST-OLD:')).toHaveTextContent('₹118');expect(commercial.getByText('Return amount for SIMPLE-OLD:')).toHaveTextContent('₹50');
 expect(screen.getByText('Return total')).toHaveTextContent('₹168');
});
