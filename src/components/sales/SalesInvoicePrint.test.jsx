import {render,screen,within} from '@testing-library/react';
import SalesInvoicePrint from './SalesInvoicePrint';
const invoice={status:'posted',invoice_type:'NON_GST',invoice_number:'A-1',store_name_snapshot:'Original Store',store_phone_snapshot:'9999999999',store_tax_id_snapshot:'hidden-store-gstin',customer_name_snapshot:'Original Customer',customer_tax_id_snapshot:'hidden-customer-gstin',total:'8500.00',amount_received:'500.00',outstanding_balance:'8000.00',items:[{id:1,product_name:'Tiles',quantity:'10',unit_name:'Box',unit_price:'850.00',line_total:'8500.00',tax_rate:'0.0000',product_snapshot:{hsnCode:'hidden-hsn'}}]};
test('printed bill reflects payment updates using the centered stamp component',()=>{
 const {rerender}=render(<SalesInvoicePrint invoice={{...invoice,amount_received:'0'}}/>);
 let sheet=within(screen.getByRole('article',{name:'Printable sales invoice'}));
 expect(sheet.getByRole('img',{name:'Payment status: DUE'})).toBeInTheDocument();
 rerender(<SalesInvoicePrint invoice={invoice}/>);
 expect(sheet.getByRole('img',{name:'Payment status: PARTIALLY PAID'})).toBeInTheDocument();
 rerender(<SalesInvoicePrint invoice={{...invoice,amount_received:'8500',outstanding_balance:'0'}}/>);
 expect(sheet.getByRole('img',{name:'Payment status: PAID'})).toBeInTheDocument();
});
test('Non-GST printing uses saved invoice type with exactly five product columns',()=>{
 render(<SalesInvoicePrint invoice={invoice}/>);
 const table=screen.getByRole('table');expect(within(table).getAllByRole('columnheader')).toHaveLength(5);
 expect(screen.getByText('Original Store')).toBeInTheDocument();expect(screen.getByText('Original Customer')).toBeInTheDocument();
 expect(screen.queryByText(/GST|HSN|Tax|hidden/)).not.toBeInTheDocument();expect(screen.getByText('INVOICE')).toBeInTheDocument();expect(screen.getByText('₹8,000.00')).toBeInTheDocument();
});
test('GST printing retains tax details',()=>{
 render(<SalesInvoicePrint invoice={{...invoice,invoice_type:'GST',store_tax_id_snapshot:'10JNEPD0678B1ZL',tax_total:'1530.00',cgst_total:'765.00',sgst_total:'765.00'}}/>);
 expect(screen.getByText('TAX INVOICE')).toBeInTheDocument();expect(screen.getByRole('columnheader',{name:'HSN'})).toBeInTheDocument();expect(screen.getByText('CGST')).toBeInTheDocument();expect(screen.getByText('SGST')).toBeInTheDocument();
});
test('ambiguous historical zero-tax documents use a neutral title',()=>{
 render(<SalesInvoicePrint invoice={{...invoice,invoice_type:null,tax_total:'0.00'}}/>);expect(screen.getByText('INVOICE')).toBeInTheDocument();expect(screen.queryByText('TAX INVOICE')).not.toBeInTheDocument();
});

test('GST format does not claim a tax-invoice title without a valid saved store GSTIN',()=>{
 render(<SalesInvoicePrint invoice={{...invoice,invoice_type:'GST',store_tax_id_snapshot:null}}/>);expect(screen.getByText('INVOICE')).toBeInTheDocument();expect(screen.queryByText('TAX INVOICE')).not.toBeInTheDocument();
});
test('Simple Layout GST print retains HSN and tax disclosures from the saved invoice',()=>{
 render(<SalesInvoicePrint invoice={{...invoice,invoice_type:'GST',invoice_layout:'SIMPLE_LAYOUT',document_type:'GST_TAX_INVOICE',store_tax_id_snapshot:'10JNEPD0678B1ZL',tax_total:'1530.00',cgst_total:'765.00',sgst_total:'765.00'}}/>);
 expect(screen.getByText('TAX INVOICE')).toBeInTheDocument();expect(screen.getByRole('columnheader',{name:'HSN'})).toBeInTheDocument();expect(screen.getByText('CGST')).toBeInTheDocument();
});
test('composition Bill of Supply prints its title, registration and declaration without tax collection columns',()=>{
 render(<SalesInvoicePrint invoice={{...invoice,invoice_type:null,document_type:'BILL_OF_SUPPLY',registration_category_snapshot:'COMPOSITION',store_tax_id_snapshot:'10JNEPD0678B1ZL',place_of_supply_state:'Bihar'}}/>);
 expect(screen.getByText('BILL OF SUPPLY')).toBeInTheDocument();expect(screen.getByText('10JNEPD0678B1ZL')).toBeInTheDocument();expect(screen.getByText(/Composition taxable person/)).toBeInTheDocument();expect(screen.getByRole('columnheader',{name:'HSN'})).toBeInTheDocument();expect(screen.queryByRole('columnheader',{name:'Tax'})).not.toBeInTheDocument();expect(screen.queryByText('Tax summary')).not.toBeInTheDocument();
});
test('saved tax document takes precedence over conflicting legacy type when printing',()=>{
 render(<SalesInvoicePrint invoice={{...invoice,invoice_type:'NON_GST',document_type:'GST_TAX_INVOICE',invoice_layout:'SIMPLE_LAYOUT',store_tax_id_snapshot:'10JNEPD0678B1ZL',tax_total:'459.00'}}/>);
 expect(screen.getByText('TAX INVOICE')).toBeInTheDocument();expect(screen.getByRole('columnheader',{name:'HSN'})).toBeInTheDocument();expect(screen.getByText('Tax summary')).toBeInTheDocument();
});
