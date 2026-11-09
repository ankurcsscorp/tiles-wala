import React from 'react';
import InvoicePaymentStamp from './InvoicePaymentStamp';
import { gstValidationError } from '../../utils/gstValidator';
import { invoiceAddress, invoiceDate, invoiceMoney, invoiceQuantity } from '../../utils/invoiceFormat';
import { InvoiceDocument, InvoiceHeader, InvoiceDetails, InvoiceDetail, InvoiceAmountWords, InvoiceTotalRow, InvoiceSalesFooter } from '../invoices/InvoiceDocument';

const text = value => String(value ?? '').trim();
const money = invoiceMoney;
const nonGstDocument = invoice => invoice.document_type ? invoice.document_type === 'NON_GST_COMMERCIAL' : invoice.invoice_type === 'NON_GST';
const addMoney = (left, right) => {
  const cents = value => {
    const match = String(value ?? '0').match(/^(-?)(\d+)(?:\.(\d+))?$/);
    return match ? (window.BigInt(match[2]) * 100n + window.BigInt((match[3] || '').padEnd(2, '0').slice(0, 2))) * (match[1] ? -1n : 1n) : 0n;
  };
  const total = cents(left) + cents(right), absolute = total < 0n ? -total : total;
  return `${total < 0n ? '-' : ''}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`;
};

export function SalesInvoiceHeader({ invoice }) {
  const nonGst = nonGstDocument(invoice);
  const billOfSupply = invoice.document_type === 'BILL_OF_SUPPLY';
  const taxInvoice = !nonGst && !billOfSupply && !gstValidationError(invoice.store_tax_id_snapshot) && (invoice.document_type ? invoice.document_type === 'GST_TAX_INVOICE' : invoice.invoice_type === 'GST' || Number(invoice.tax_total) > 0);
  return <InvoiceHeader name={text(invoice.store_name_snapshot) || text(invoice.current_store_name)} address={invoice.store_address_snapshot}
    phone={invoice.store_phone_snapshot} email={invoice.store_email_snapshot} logo={invoice.store_logo_snapshot}
    gstin={!nonGst ? invoice.store_tax_id_snapshot : null}
    title={invoice.status === 'reversed' ? 'REVERSED INVOICE' : billOfSupply ? 'BILL OF SUPPLY' : taxInvoice ? 'TAX INVOICE' : 'INVOICE'} />;
}

export default function SalesInvoicePrint({ invoice }) {
  if (!invoice || !['posted', 'reversed'].includes(invoice.status)) return null;
  const nonGst = nonGstDocument(invoice);
  const billOfSupply = invoice.document_type === 'BILL_OF_SUPPLY';
  const billingAddress = invoiceAddress(invoice.customer_address_snapshot, 'billing');
  const shippingAddress = invoiceAddress(invoice.customer_address_snapshot, 'shipping');
  const transportMode=invoice.transport_mode_snapshot||invoice.dealer_order_transport_mode;
  const transportModeName={SELF:'Self Pickup',TOTO:'Toto',THELA:'CNG Auto',PICKUP:'Pickup'}[transportMode]||transportMode;
  const hasTransport=Boolean(invoice.vehicle_number||invoice.driver_name||invoice.driver_contact_number||transportModeName);
  const interState = invoice.tax_jurisdiction_snapshot === 'inter_state';
  const items = invoice.items || [];
  const widths = nonGst ? [50, 12, 10, 14, 14] : billOfSupply ? [4, 34, 8, 9, 11, 8, 13, 13] : [4, 30, 8, 8, 10, 8, 11, 9, 12];

  return <InvoiceDocument className="invoice-print-sheet" label="Printable sales invoice">
    <InvoicePaymentStamp invoice={invoice} />
    <SalesInvoiceHeader invoice={invoice} />
    {billOfSupply && invoice.registration_category_snapshot === 'COMPOSITION' && <p className="invoice-document-disclosure">Composition taxable person, not eligible to collect tax on supplies.</p>}
    <section className={`invoice-document-parties${shippingAddress.length||hasTransport ? ' has-shipping' : ''}`}>
      <div><h2>Bill to</h2><strong className="invoice-document-party-name">{text(invoice.customer_name_snapshot) || 'Walk-in customer'}</strong>
        {billingAddress.map((line, index) => <div key={index}>{line}</div>)}
        {invoice.customer_mobile_snapshot && <div>Phone: {invoice.customer_mobile_snapshot}</div>}
        {!nonGst && invoice.customer_tax_id_snapshot && <div><b>GSTIN:</b> {invoice.customer_tax_id_snapshot}</div>}
      </div>
      {(shippingAddress.length > 0||hasTransport) && <div className="invoice-document-ship"><h2>Ship to</h2>{shippingAddress.map((line, index) => <div key={index}>{line}</div>)}{hasTransport&&<div className="invoice-document-transport">{transportModeName&&<span><b>Transport:</b> {transportModeName}</span>}{invoice.vehicle_number&&<span><b>Vehicle:</b> {invoice.vehicle_number}</span>}{invoice.driver_name&&<span><b>Driver:</b> {invoice.driver_name}</span>}{invoice.driver_contact_number&&<span><b>Contact:</b> {invoice.driver_contact_number}</span>}</div>}</div>}
      <div><h2>Invoice details</h2><InvoiceDetails>
        <InvoiceDetail label="Invoice no.">{text(invoice.invoice_number)}</InvoiceDetail>
        <InvoiceDetail label="Invoice date">{invoiceDate(invoice.invoice_date)}</InvoiceDetail>
        {invoice.due_date && <InvoiceDetail label="Due date">{invoiceDate(invoice.due_date)}</InvoiceDetail>}
        {invoice.salesperson_name_snapshot && <InvoiceDetail label="Salesperson">{invoice.salesperson_name_snapshot}</InvoiceDetail>}
        {invoice.referred_by_name_snapshot && <InvoiceDetail label="Referred by">{invoice.referred_by_name_snapshot}</InvoiceDetail>}
        {invoice.place_of_supply_state && <InvoiceDetail label="Place of supply">{invoice.place_of_supply_state}</InvoiceDetail>}
      </InvoiceDetails></div>
    </section>

    <table className="invoice-document-items" aria-label="Sales products">
      <colgroup>{widths.map((width, index) => <col key={index} style={{ width: `${width}%` }} />)}</colgroup>
      <thead><tr>{!nonGst && <th className="invoice-cell-center">#</th>}<th className="invoice-cell-product">Product / description</th>{!nonGst && <th className="invoice-cell-center">HSN</th>}<th>Qty</th>{nonGst && <th className="invoice-cell-center">Unit</th>}<th>Rate</th>{!nonGst && <><th>Discount</th><th>{billOfSupply ? 'Value' : 'Taxable'}</th>{!billOfSupply && <th>Tax</th>}</>}<th>Total</th></tr></thead>
      <tbody>{items.map((line, index) => <tr key={line.id || index}>
        {!nonGst && <td className="invoice-cell-center">{index + 1}</td>}
        <td className="invoice-cell-product"><strong>{text(line.product_name_snapshot || line.product_name)}</strong>
          <span className="invoice-document-product-meta">
            {line.sku && <small>SKU: {line.sku}</small>}
            {line.product_snapshot?.tileSize && <small>{line.product_snapshot.tileSize}</small>}
            {line.description && line.description !== line.product_snapshot?.tileSize && <small>{line.description}</small>}
          </span>
        </td>
        {!nonGst && <td className="invoice-cell-center">{text(line.product_snapshot?.hsnCode) || '—'}</td>}
        <td>{invoiceQuantity(line.quantity)}{!nonGst && <small>{text(line.unit_name || line.unit_code) || '—'}</small>}</td>
        {nonGst && <td className="invoice-cell-center">{text(line.unit_name || line.unit_code) || '—'}</td>}
        <td>{money(line.unit_price, { rate: true })}</td>
        {!nonGst && <><td>{money(addMoney(line.discount_amount, line.invoice_discount_amount))}</td>
          <td>{money(line.taxable_value)}</td>{!billOfSupply && <td>{money(line.tax_amount)}<small>{invoiceQuantity(line.tax_rate)}% {interState ? 'IGST' : 'GST'}</small></td>}</>}
        <td><strong>{money(line.line_total)}</strong></td>
      </tr>)}</tbody>
    </table>
    <div className="invoice-document-item-count">{items.length} {items.length === 1 ? 'item' : 'items'}</div>

    <section className="invoice-document-summary">
      <div><InvoiceAmountWords total={invoice.total} />
        {!nonGst && !billOfSupply && <div className="invoice-document-tax"><h2>Tax summary</h2>
          <InvoiceTotalRow label="Taxable amount" value={invoice.taxable_total} />
          {interState ? <InvoiceTotalRow label="IGST" value={invoice.igst_total} /> : <><InvoiceTotalRow label="CGST" value={invoice.cgst_total} /><InvoiceTotalRow label="SGST" value={invoice.sgst_total} /></>}
          <InvoiceTotalRow label="Total tax" value={invoice.tax_total} />
        </div>}
      </div>
      <div className="invoice-document-totals">
        {!nonGst && <><InvoiceTotalRow label="Subtotal" value={invoice.subtotal} /><InvoiceTotalRow label="Discounts" value={invoice.discount_total} />
          <InvoiceTotalRow label="Round-off" value={invoice.round_off} /></>}
        <InvoiceTotalRow label={`Additional charges / transport${invoice.dealer_order_transport_mode ? ` · ${{SELF:'Self Pickup',TOTO:'Toto',THELA:'CNG AUTO',PICKUP:'Pickup'}[invoice.dealer_order_transport_mode]||invoice.dealer_order_transport_mode}` : ''}`} value={invoice.additional_charges} />
        <InvoiceTotalRow label="Grand Total" value={invoice.total} emphasis />
        <InvoiceTotalRow label="Amount received" value={invoice.amount_received} />
        {Number(invoice.return_credit) > 0 && <InvoiceTotalRow label="Return credit" value={invoice.return_credit} />}
        <InvoiceTotalRow label="Outstanding balance" value={invoice.outstanding_balance} />
      </div>
    </section>

    {billOfSupply && items.some(line => line.product_snapshot?.classificationReference) && <section className="invoice-document-section"><h2>Supply classification</h2>{items.filter(line => line.product_snapshot?.classificationReference).map((line, index) => <p key={line.id || index}>{line.product_name}: {line.product_snapshot.classificationReference}</p>)}</section>}
    {(invoice.payments || []).length > 0 && <section className="invoice-document-section"><h2>Payments received</h2>
      <table className="invoice-document-items" aria-label="Payments received"><colgroup><col style={{width:'20%'}}/><col style={{width:'20%'}}/><col style={{width:'35%'}}/><col style={{width:'25%'}}/></colgroup><thead><tr><th className="invoice-cell-product">Date</th><th className="invoice-cell-product">Method</th><th className="invoice-cell-product">Reference</th><th>Amount allocated</th></tr></thead><tbody>
        {invoice.payments.map((payment, index) => <tr key={payment.id || index}><td className="invoice-cell-product">{invoiceDate(payment.payment_date)}</td><td className="invoice-cell-product">{text(payment.payment_method) || '—'}</td><td className="invoice-cell-product">{text(payment.reference) || '—'}</td><td>{money(payment.allocated_amount)}</td></tr>)}
      </tbody></table>
    </section>}
    {invoice.notes && <section className="invoice-document-section"><h2>Notes</h2><p className="invoice-document-multiline">{invoice.notes}</p></section>}
    <InvoiceSalesFooter terms={invoice.terms_snapshot} paymentDetails={invoice.payment_details_snapshot} name={invoice.store_name_snapshot}/>
    {invoice.invoice_footer_snapshot && <footer className="invoice-document-footer">{invoice.invoice_footer_snapshot}</footer>}
  </InvoiceDocument>;
}
