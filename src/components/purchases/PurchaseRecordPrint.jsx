import React from 'react';
import { invoiceAddress, invoiceDate, invoiceMoney, invoiceQuantity } from '../../utils/invoiceFormat';
import { InvoiceDocument, InvoiceHeader, InvoiceDetails, InvoiceDetail, InvoiceAmountWords, InvoiceTotalRow, InvoiceSignatures } from '../invoices/InvoiceDocument';

export default function PurchaseRecordPrint({ purchase }) {
  // Historical records retain their existing renderer and its original data semantics.
  if (!purchase?.invoice_layout) return null;
  const simple = purchase.invoice_layout === 'SIMPLE_LAYOUT';
  const supplier = purchase.supplier_details_snapshot || (purchase.status === 'draft' ? purchase.supplier_current_details : null);
  const gst = purchase.supplier_document_type === 'GST_TAX_INVOICE';
  const items = purchase.items || [];
  const documentTitle = { GST_TAX_INVOICE: 'GST Tax Invoice', BILL_OF_SUPPLY: 'Bill of Supply', NON_GST_COMMERCIAL: 'Commercial invoice' }[purchase.supplier_document_type] || 'Supplier invoice';
  const widths = simple ? [44, 12, 12, 16, 16] : [27, 9, 10, 9, 12, 10, 11, 12];
  const adjustments = [['Discount', purchase.discount_total], ['Freight', purchase.freight_amount], ['Additional charges', purchase.additional_charges], ['Round-off', purchase.round_off]];

  return <InvoiceDocument className="purchase-record-print" label="Printable purchase record">
    <InvoiceHeader name={purchase.store_name_snapshot || purchase.store_name} address={purchase.store_address_snapshot}
      phone={purchase.store_phone_snapshot} email={purchase.store_email_snapshot} gstin={gst ? purchase.store_tax_id_snapshot : null}
      title={purchase.status === 'reversed' ? 'REVERSED PURCHASE RECORD' : purchase.status === 'draft' ? 'DRAFT PURCHASE RECORD' : 'Purchase Record'} copy="Internal purchase record" />
    <section className="invoice-document-parties">
      <div><h2>Supplier / purchased from</h2><strong className="invoice-document-party-name">{supplier?.name || 'Historical supplier details unavailable'}</strong>
        {invoiceAddress(supplier).map((line, index) => <div key={index}>{line}</div>)}
        {(supplier?.phone || supplier?.mobile) && <div>Phone: {supplier.phone || supplier.mobile}</div>}
        {supplier?.email && <div>Email: {supplier.email}</div>}
        {supplier?.gstin && <div>Supplier GSTIN: {supplier.gstin}</div>}
      </div>
      <div><h2>Purchase details</h2><InvoiceDetails>
        <InvoiceDetail label="Purchase no.">{purchase.invoice_number}</InvoiceDetail>
        <InvoiceDetail label="Invoice date">{invoiceDate(purchase.invoice_date)}</InvoiceDetail>
        {purchase.due_date && <InvoiceDetail label="Due date">{invoiceDate(purchase.due_date)}</InvoiceDetail>}
        <InvoiceDetail label="Supplier invoice">{purchase.supplier_invoice_number}</InvoiceDetail>
        <InvoiceDetail label="Status">{purchase.status}</InvoiceDetail>
      </InvoiceDetails></div>
    </section>
    <p className="invoice-document-disclosure">Supplier document: {documentTitle}</p>
    {purchase.supplier_tax_reason && <p className="invoice-document-disclosure">Supplier document basis: {purchase.supplier_tax_reason}</p>}

    <table className="invoice-document-items" aria-label="Purchase products">
      <colgroup>{widths.map((width, index) => <col key={index} style={{ width: `${width}%` }} />)}</colgroup>
      <thead><tr><th className="invoice-cell-product">Product</th>{!simple && <th className="invoice-cell-center">HSN</th>}<th>Quantity</th><th className="invoice-cell-center">Unit</th><th>Rate</th>{!simple && <><th>Discount</th><th>Taxable</th></>}<th>Line Total</th></tr></thead>
      <tbody>{items.map((item, index) => <tr key={item.id || index}>
        <td className="invoice-cell-product"><strong>{item.product_name_snapshot || item.product_name}</strong>{item.sku && <small>SKU: {item.sku}</small>}{item.product_snapshot?.tileSize && <small>{item.product_snapshot.tileSize}</small>}{item.description && item.description !== item.product_snapshot?.tileSize && <small>{item.description}</small>}</td>
        {!simple && <td className="invoice-cell-center">{item.product_snapshot?.hsnCode || '—'}</td>}
        <td>{invoiceQuantity(item.quantity)}</td><td className="invoice-cell-center">{item.unit_name || item.unit_code || '—'}</td><td>{invoiceMoney(item.unit_price, { rate: true })}</td>
        {!simple && <><td>{invoiceMoney(item.discount_amount)}</td><td>{invoiceMoney(item.taxable_value)}</td></>}
        <td><strong>{invoiceMoney(simple ? item.taxable_value : item.line_total)}</strong></td>
      </tr>)}</tbody>
    </table>
    <div className="invoice-document-item-count">{items.length} {items.length === 1 ? 'item' : 'items'}{gst && simple ? ' · Line totals exclude supplier tax; see the tax details below.' : ''}</div>

    {gst && <section className="invoice-document-section"><h2>Supplier GST details</h2>
      <table className="invoice-document-items" aria-label="Supplier GST disclosures"><colgroup>{[27, 10, 15, 9, 13, 13, 13].map((width, index) => <col key={index} style={{width:`${width}%`}}/>)}</colgroup>
        <thead><tr><th className="invoice-cell-product">Product</th><th className="invoice-cell-center">HSN</th><th>Taxable</th><th>GST rate</th><th>CGST</th><th>SGST</th><th>IGST</th></tr></thead>
        <tbody>{items.map((item, index) => <tr key={item.id || index}><td className="invoice-cell-product">{item.product_name_snapshot || item.product_name}</td><td className="invoice-cell-center">{item.product_snapshot?.hsnCode || '—'}</td><td>{invoiceMoney(item.taxable_value)}</td><td>{invoiceQuantity(item.tax_rate)}%</td><td>{invoiceMoney(item.cgst_amount)}</td><td>{invoiceMoney(item.sgst_amount)}</td><td>{invoiceMoney(item.igst_amount)}</td></tr>)}</tbody>
      </table>
    </section>}

    <section className="invoice-document-summary">
      <div><InvoiceAmountWords total={purchase.total} />
        {gst && <div className="invoice-document-tax"><h2>Tax summary</h2><InvoiceTotalRow label="CGST" value={purchase.cgst_total} /><InvoiceTotalRow label="SGST" value={purchase.sgst_total} /><InvoiceTotalRow label="IGST" value={purchase.igst_total} /></div>}
      </div>
      <div className="invoice-document-totals">
        <InvoiceTotalRow label="Subtotal" value={purchase.subtotal} />
        {adjustments.filter(([, value]) => Number(value)).map(([label, value]) => <InvoiceTotalRow key={label} label={label} value={value} />)}
        {gst && <InvoiceTotalRow label="Total GST" value={purchase.tax_total} />}
        <InvoiceTotalRow label="Grand Total" value={purchase.total} emphasis />
        <InvoiceTotalRow label="Paid" value={purchase.paid_amount} />
        {Number(purchase.returned_total) > 0 && <InvoiceTotalRow label="Return credit" value={purchase.returned_total} />}
        <InvoiceTotalRow label="Balance Due" value={purchase.outstanding_balance} />
      </div>
    </section>
    {(purchase.receipts || []).length > 0 && <section className="invoice-document-section"><h2>Goods receipts</h2>{purchase.receipts.map(receipt => <p key={receipt.id}>{receipt.receipt_number} · {invoiceDate(receipt.receipt_date)} · {receipt.status}</p>)}</section>}
    {(purchase.payments || []).length > 0 && <section className="invoice-document-section"><h2>Supplier payments</h2>
      <table className="invoice-document-items" aria-label="Supplier payments"><colgroup><col style={{width:'22%'}}/><col style={{width:'22%'}}/><col style={{width:'28%'}}/><col style={{width:'28%'}}/></colgroup><thead><tr><th className="invoice-cell-product">Date</th><th className="invoice-cell-product">Payment no.</th><th className="invoice-cell-product">Method / reference</th><th>Amount allocated</th></tr></thead>
        <tbody>{purchase.payments.map((payment, index) => <tr key={payment.id || index}><td className="invoice-cell-product">{invoiceDate(payment.payment_date)}</td><td className="invoice-cell-product">{payment.payment_number || '—'}</td><td className="invoice-cell-product">{payment.payment_method || '—'}{payment.reference && <small>{payment.reference}</small>}</td><td>{invoiceMoney(payment.allocated_amount)}</td></tr>)}</tbody>
      </table>
    </section>}
    {purchase.notes && <section className="invoice-document-section"><h2>Notes</h2><p className="invoice-document-multiline">{purchase.notes}</p></section>}
    <InvoiceSignatures purchase />
  </InvoiceDocument>;
}
