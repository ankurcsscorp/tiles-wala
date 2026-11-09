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
 expect(screen.queryByText(/GST|HSN|Tax|hidden/)).not.toBeInTheDocument();expect(screen.getByText('INVOICE')).toBeInTheDocument();expect(screen.getByText('₹8,000')).toBeInTheDocument();
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
test('prints only populated transport details compactly in Ship To',()=>{
 render(<SalesInvoicePrint invoice={{...invoice,transport_mode_snapshot:'TOTO',vehicle_number:'BR31AB1234',driver_name:'Ramesh Kumar',driver_contact_number:'9876543210'}}/>);
 expect(screen.queryByText('Self Pickup')).not.toBeInTheDocument();
 expect(screen.getByRole('article')).toHaveTextContent('Transport: Toto');expect(screen.getByRole('article')).toHaveTextContent('Vehicle: BR31AB1234');expect(screen.getByRole('article')).toHaveTextContent('Driver: Ramesh Kumar');expect(screen.getByRole('article')).toHaveTextContent('Contact: 9876543210');
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

test('the invoice prints saved addresses, full rate precision, amount in words and signature areas',()=>{
 render(<SalesInvoicePrint invoice={{...invoice,invoice_date:'2026-10-28',due_date:'2026-11-10',store_address_snapshot:{address:'Saved Store Road',city:'Patna',pinCode:'800001'},customer_address_snapshot:{billing:{line1:'Saved Billing Road'},shipping:{line1:'Saved Shipping Road'}},items:[{...invoice.items[0],quantity:'10.5000',unit_price:'850.1250'}],terms_snapshot:'Saved terms',invoice_footer_snapshot:'Saved footer'}}/>);
 expect(screen.getByText('28 Oct 2026')).toBeInTheDocument();expect(screen.getByText('10 Nov 2026')).toBeInTheDocument();
 expect(screen.getByText('Saved Store Road')).toBeInTheDocument();expect(screen.getByText('Saved Billing Road')).toBeInTheDocument();expect(screen.getByText('Saved Shipping Road')).toBeInTheDocument();
 expect(screen.getByText('₹850.125')).toBeInTheDocument();expect(screen.getByText('10.5')).toBeInTheDocument();
 expect(screen.getByText('Eight Thousand Five Hundred Rupees Only')).toBeInTheDocument();
 expect(screen.getByRole('region',{name:'Signature section'})).toBeInTheDocument();
 expect(screen.getByText('Saved terms')).toBeInTheDocument();expect(screen.getByText('Saved footer')).toBeInTheDocument();
 expect(screen.queryByText(/Previous balance|Current balance|Bank account|UPI ID/)).not.toBeInTheDocument();
});

test('return credits and allocated payments explain the invoice balance',()=>{
 render(<SalesInvoicePrint invoice={{...invoice,return_credit:'1000.00',outstanding_balance:'7000.00',payments:[{id:1,payment_date:'2026-10-28',payment_method:'upi',reference:'TX-1',allocated_amount:'500.00'}]}}/>);
 expect(screen.getByText('Return credit')).toBeInTheDocument();expect(screen.getByText('₹1,000')).toBeInTheDocument();
 expect(screen.getByRole('table',{name:'Payments received'})).toHaveTextContent('TX-1');
 expect(screen.getByText('₹7,000')).toBeInTheDocument();
});

test('drafts cannot be mistaken for finalized sales documents and reversals retain their label',()=>{
 const view=render(<SalesInvoicePrint invoice={{...invoice,status:'draft'}}/>);expect(screen.queryByRole('article')).not.toBeInTheDocument();
 view.rerender(<SalesInvoicePrint invoice={{...invoice,status:'reversed'}}/>);expect(screen.getByText('REVERSED INVOICE')).toBeInTheDocument();expect(screen.queryByRole('img',{name:/Payment status/})).not.toBeInTheDocument();
});

test('sales invoices print their saved bank, UPI and terms beside the signature area',()=>{
 render(<SalesInvoicePrint invoice={{...invoice,terms_snapshot:'1. Saved condition\n2. Another condition',payment_details_snapshot:{accountName:'Saved Account Holder',accountNumber:'001234567890',ifscCode:'ABCD0123456',bankName:'Saved Bank',branch:'Main Branch',upiId:'saved@bank'},invoice_payment_details:{accountName:'Changed live details'}}}/>);
 const payment=within(screen.getByRole('region',{name:'Payment details'}));
 for(const value of ['Saved Account Holder','001234567890','ABCD0123456','Saved Bank','Main Branch','saved@bank'])expect(payment.getByText(value)).toBeInTheDocument();
 expect(screen.getByText(/1. Saved condition/)).toBeInTheDocument();expect(screen.getByText('Authorized signatory')).toBeInTheDocument();
 expect(screen.queryByText('Changed live details')).not.toBeInTheDocument();expect(screen.queryByText('Payment QR Code')).not.toBeInTheDocument();
 expect(screen.queryByRole('img',{name:/QR/i})).not.toBeInTheDocument();
});

test('UPI can print without a bank account and old invoices do not adopt current payment settings',()=>{
 const view=render(<SalesInvoicePrint invoice={{...invoice,payment_details_snapshot:{upiId:'saved@bank'}}}/>);
 expect(screen.getByText('saved@bank')).toBeInTheDocument();expect(screen.queryByText('Bank Details')).not.toBeInTheDocument();
 view.rerender(<SalesInvoicePrint invoice={{...invoice,payment_details_snapshot:null,invoice_payment_details:{upiId:'live@bank'}}}/>);
 expect(screen.queryByRole('region',{name:'Payment details'})).not.toBeInTheDocument();expect(screen.queryByText('live@bank')).not.toBeInTheDocument();
});
