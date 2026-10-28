import { render, screen, within } from '@testing-library/react';
import SalesInvoicePrint from '../sales/SalesInvoicePrint';
import PurchaseRecordPrint from '../purchases/PurchaseRecordPrint';

const invoice = { status: 'posted', invoice_layout: 'SIMPLE_LAYOUT', invoice_type: 'NON_GST', document_type: 'NON_GST_COMMERCIAL', supplier_document_type: 'NON_GST_COMMERCIAL', invoice_number: 'PRINT-1', store_name_snapshot: 'Saved Store', total: '200.00', amount_received: '0.00', outstanding_balance: '200.00', supplier_details_snapshot: {name: 'Saved Supplier'}, items: [] };

test.each([
  ['sales', SalesInvoicePrint, 'invoice', 'Printable sales invoice'],
  ['purchase', PurchaseRecordPrint, 'purchase', 'Printable purchase record'],
])('%s print sheet is independent of tall screen containers and is removed on navigation', (_, Component, prop, label) => {
  const view = render(<div style={{minHeight: '100vh', paddingBottom: '200px'}}><div>Screen controls</div><Component {...{[prop]: invoice}} /></div>);
  const sheet = screen.getByRole('article', {name: label});
  expect(sheet.parentElement).toBe(document.body);
  expect(within(view.container).queryByRole('article')).not.toBeInTheDocument();
  expect(sheet).toHaveTextContent('PRINT-1');
  view.unmount();
  expect(document.querySelector('.invoice-document')).toBeNull();
});

test('payment changes update the isolated print sheet without duplicating it', () => {
  const view = render(<SalesInvoicePrint invoice={invoice} />);
  expect(screen.getByRole('img', {name: 'Payment status: DUE'})).toBeInTheDocument();
  view.rerender(<SalesInvoicePrint invoice={{...invoice, amount_received: '200.00', outstanding_balance: '0.00'}} />);
  expect(screen.getByRole('img', {name: 'Payment status: PAID'})).toBeInTheDocument();
  expect(document.querySelectorAll('body > .invoice-document')).toHaveLength(1);
});
