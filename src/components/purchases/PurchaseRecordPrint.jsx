import React from 'react';
import { invoiceAddress, invoiceDate, invoiceQuantity } from '../../utils/invoiceFormat';
import { InvoiceDocument } from '../invoices/InvoiceDocument';

const clean = value => typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
const money = value => {
  const match = String(value ?? '').trim().match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if (!match) return '—';
  const whole = new Intl.NumberFormat('en-IN').format(window.BigInt(match[2]));
  const fraction = (match[3] || '').padEnd(2, '0').slice(0, 2);
  return `${match[1] ? '−' : ''}₹${whole}.${fraction}`;
};
const TotalRow = ({ label, value, emphasis = false }) => <div className={emphasis ? 'purchase-record-grand' : ''}><span>{label}</span><strong>{money(value)}</strong></div>;

export default function PurchaseRecordPrint({ purchase }) {
  if (!purchase) return null;
  const supplier = purchase.supplier_details_snapshot || (purchase.status === 'draft' ? purchase.supplier_current_details : null) || {};
  const supplierName = clean(supplier.name) || 'Supplier details unavailable';
  const storeName = clean(purchase.store_name_snapshot) || clean(purchase.store_name) || 'Store';
  const storeAddress = invoiceAddress(purchase.store_address_snapshot);
  const supplierAddress = invoiceAddress(supplier);
  const gst = purchase.supplier_document_type === 'GST_TAX_INVOICE';
  const items = purchase.items || [];
  const statusTitle = purchase.status === 'reversed' ? 'REVERSED PURCHASE RECORD' : purchase.status === 'cancelled' ? 'CANCELLED PURCHASE RECORD' : purchase.status === 'draft' ? 'DRAFT PURCHASE RECORD' : 'INTERNAL PURCHASE RECORD';
  const optionalAdjustments = [['Discount', purchase.discount_total], ['GST', purchase.tax_total], ['Freight', purchase.freight_amount], ['Other charges', purchase.additional_charges], ['Round-off', purchase.round_off]];

  return <InvoiceDocument className="purchase-record-print" label="Printable internal purchase record">
    <header className="purchase-record-header">
      <div className="purchase-record-store">
        {clean(purchase.store_logo_snapshot) && <img src={purchase.store_logo_snapshot} alt={`${storeName} logo`} />}
        <div className="purchase-record-store-info">
          <h1>{storeName}</h1>
          {storeAddress.map((line, index) => <span key={`address-${index}`}>{line}</span>)}
          {clean(purchase.store_phone_snapshot) && <span>Phone: {clean(purchase.store_phone_snapshot)}</span>}
          {clean(purchase.store_email_snapshot) && <span>{clean(purchase.store_email_snapshot)}</span>}
          {clean(purchase.store_tax_id_snapshot) && <span>GSTIN: {clean(purchase.store_tax_id_snapshot)}</span>}
        </div>
      </div>
      <div className="purchase-record-title"><strong>{statusTitle}</strong><span>Purchase reference: {clean(purchase.invoice_number) || '—'}</span><span>Status: {clean(purchase.status) || '—'}</span></div>
    </header>

    <section className="purchase-record-parties">
      <div><h2>Supplier details</h2><strong>{supplierName}</strong>
        {supplierAddress.map((line, index) => <span key={`supplier-address-${index}`}>{line}</span>)}
        {clean(supplier.gstin || supplier.tax_id) && <span>GSTIN: {clean(supplier.gstin || supplier.tax_id)}</span>}
        {clean(supplier.phone || supplier.mobile) && <span>Phone: {clean(supplier.phone || supplier.mobile)}</span>}
        <span>Supplier invoice: {clean(purchase.supplier_invoice_number) || '—'}</span>
      </div>
      <div><h2>Purchase details</h2>
        <span><b>Internal reference:</b> {clean(purchase.invoice_number) || '—'}</span>
        <span><b>Purchase date:</b> {invoiceDate(purchase.invoice_date)}</span>
        <span><b>Supplier invoice date:</b> {invoiceDate(purchase.supplier_invoice_date || purchase.invoice_date)}</span>
        <span><b>Store / warehouse:</b> {clean(purchase.store_name_snapshot) || clean(purchase.store_name) || '—'}</span>
      </div>
    </section>

    <p className="purchase-record-disclosure">Supplier document: {{ GST_TAX_INVOICE: 'GST Tax Invoice', BILL_OF_SUPPLY: 'Bill of Supply', NON_GST_COMMERCIAL: 'Commercial invoice' }[purchase.supplier_document_type] || 'Supplier invoice'}{purchase.supplier_tax_reason ? ` · ${clean(purchase.supplier_tax_reason)}` : ''}</p>

    <table className="purchase-record-items" aria-label="Purchase products">
      <colgroup><col style={{width:'4%'}}/><col style={{width:'35%'}}/><col style={{width:'10%'}}/><col style={{width:'15%'}}/><col style={{width:'12%'}}/><col style={{width:'12%'}}/><col style={{width:'12%'}}/></colgroup>
      <thead><tr><th>#</th><th>Product / description</th><th>HSN</th><th>Quantity / unit</th><th>Purchase rate</th><th>Tax</th><th>Amount</th></tr></thead>
      <tbody>{items.map((item, index) => {
        const name = clean(item.product_name_snapshot || item.product_name) || 'Product';
        const size = clean(item.product_snapshot?.tileSize);
        const description = clean(item.description);
        return <tr key={item.id || index}>
          <td>{index + 1}</td>
          <td className="purchase-record-product"><strong>{name}</strong>{item.sku && <small>SKU: {clean(item.sku)}</small>}{size && <small>{size}</small>}{description && description !== size && description !== name && <small>{description}</small>}</td>
          <td>{clean(item.product_snapshot?.hsnCode) || '—'}</td>
          <td className="purchase-record-quantity">{invoiceQuantity(item.quantity)} {clean(item.unit_name || item.unit_code) || '—'}</td>
          <td className="purchase-record-rate">{money(item.unit_price)}</td>
          <td className="purchase-record-tax"><span>{invoiceQuantity(item.tax_rate)}%</span><small>{money(item.tax_amount)}</small></td>
          <td className="purchase-record-amount"><strong>{money(item.line_total)}</strong></td>
        </tr>;
      })}</tbody>
    </table>
    <div className="purchase-record-item-count">{items.length} {items.length === 1 ? 'item' : 'items'}</div>

    <section className="purchase-record-summary">
      <div>{gst && <div className="purchase-record-tax-breakup"><h2>GST breakup</h2><TotalRow label="CGST" value={purchase.cgst_total}/><TotalRow label="SGST" value={purchase.sgst_total}/><TotalRow label="IGST" value={purchase.igst_total}/></div>}
        {purchase.notes && <div className="purchase-record-notes"><h2>Notes</h2><p>{clean(purchase.notes)}</p></div>}
      </div>
      <div className="purchase-record-totals"><TotalRow label="Subtotal" value={purchase.subtotal}/>
        {optionalAdjustments.filter(([, value]) => Number(value)).map(([label, value]) => <TotalRow key={label} label={label} value={value}/>)}
        <TotalRow label="Grand Total" value={purchase.total} emphasis/>
        <TotalRow label="Amount Paid" value={purchase.paid_amount}/>
        <TotalRow label="Outstanding" value={purchase.outstanding_balance} emphasis/>
      </div>
    </section>
    <footer className="purchase-record-footer">This is an internal purchase record based on supplier invoice details entered in Tiles Wala. It is not a supplier-issued tax invoice.</footer>
  </InvoiceDocument>;
}
