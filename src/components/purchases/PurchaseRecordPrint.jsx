import React from 'react';
const money=value=>{
 const match=String(value??'0').match(/^(-?)(\d+)(?:\.(\d+))?$/);
 if(!match)return '—';
 return `${match[1]?'−':''}₹${new Intl.NumberFormat('en-IN').format(window.BigInt(match[2]))}.${(match[3]||'').padEnd(2,'0').slice(0,2)}`;
};
const address=value=>{
 const a=value?.billingAddress||value?.address||{};
 return [typeof a==='string'?a:a.line1||a.street,a.line2,value?.city||a.city,value?.state||a.state,value?.pinCode||a.pinCode].filter(Boolean).join(', ');
};
export default function PurchaseRecordPrint({purchase}) {
 if(!purchase?.invoice_layout)return null;
 const simple=purchase.invoice_layout==='SIMPLE_LAYOUT';
 const supplier=purchase.supplier_details_snapshot||(purchase.status==='draft'?purchase.supplier_current_details:null);
 const gst=purchase.supplier_document_type==='GST_TAX_INVOICE';
 const items=purchase.items||[];
 const documentTitle={GST_TAX_INVOICE:'GST Tax Invoice',BILL_OF_SUPPLY:'Bill of Supply',NON_GST_COMMERCIAL:'Commercial invoice'}[purchase.supplier_document_type]||'Supplier invoice';
 return <article className="purchase-record-print" aria-label="Printable purchase record">
  <header><h1>{purchase.store_name_snapshot||purchase.store_name}</h1><p>{address(purchase.store_address_snapshot)}</p><p>{purchase.store_phone_snapshot} {purchase.store_email_snapshot}</p>{purchase.store_tax_id_snapshot&&<p>Store GSTIN: {purchase.store_tax_id_snapshot}</p>}<h2>Purchase Record</h2><p>{purchase.invoice_number} · {String(purchase.invoice_date).slice(0,10)} · {purchase.status}</p></header>
  <section><h3>Supplier</h3><strong>{supplier?.name||'Historical supplier details unavailable'}</strong><p>{address(supplier)}</p>{supplier?.gstin&&<p>Supplier GSTIN: {supplier.gstin}</p>}<p>Supplier invoice: {purchase.supplier_invoice_number||'—'}</p><p>Supplier document: {documentTitle}</p>{purchase.supplier_tax_reason&&<p>Supplier document basis: {purchase.supplier_tax_reason}</p>}</section>
  <table aria-label="Purchase products"><thead><tr>{(simple?['Product','Quantity','Unit','Rate','Line Total']:['Product','HSN','Quantity','Unit','Rate','Discount','Taxable','GST rate','CGST','SGST','IGST','Total']).map(label=><th key={label}>{label}</th>)}</tr></thead>
   <tbody>{items.map(item=><tr key={item.id}><td>{item.product_name}</td>{!simple&&<td>{item.product_snapshot?.hsnCode||'—'}</td>}<td>{item.quantity}</td><td>{item.unit_name}</td><td>{money(item.unit_price)}</td>{!simple&&<><td>{money(item.discount_amount)}</td><td>{money(item.taxable_value)}</td><td>{item.tax_rate}%</td><td>{money(item.cgst_amount)}</td><td>{money(item.sgst_amount)}</td><td>{money(item.igst_amount)}</td></>}<td>{money(simple?item.taxable_value:item.line_total)}</td></tr>)}</tbody>
  </table>
  {gst&&simple&&<section><h3>Supplier GST details</h3><table aria-label="Supplier GST disclosures"><thead><tr>{['Product','HSN','Taxable','GST rate','CGST','SGST','IGST'].map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>{items.map(item=><tr key={item.id}><td>{item.product_name}</td><td>{item.product_snapshot?.hsnCode||'—'}</td><td>{money(item.taxable_value)}</td><td>{item.tax_rate}%</td><td>{money(item.cgst_amount)}</td><td>{money(item.sgst_amount)}</td><td>{money(item.igst_amount)}</td></tr>)}</tbody></table></section>}
  <section className="purchase-print-summary"><p>Subtotal <strong>{money(purchase.subtotal)}</strong></p>{!simple&&<><p>Discount <strong>{money(purchase.discount_total)}</strong></p><p>Freight <strong>{money(purchase.freight_amount)}</strong></p><p>Additional charges <strong>{money(purchase.additional_charges)}</strong></p><p>Round-off <strong>{money(purchase.round_off)}</strong></p></>}{gst&&<><p>CGST <strong>{money(purchase.cgst_total)}</strong></p><p>SGST <strong>{money(purchase.sgst_total)}</strong></p><p>IGST <strong>{money(purchase.igst_total)}</strong></p><p>Total GST <strong>{money(purchase.tax_total)}</strong></p></>}<p className="purchase-print-grand">Grand Total <strong>{money(purchase.total)}</strong></p><p>Paid <strong>{money(purchase.paid_amount)}</strong></p><p>Balance Due <strong>{money(purchase.outstanding_balance)}</strong></p></section>
  {(purchase.receipts||[]).length>0&&<section><h3>Goods receipts</h3>{purchase.receipts.map(r=><p key={r.id}>{r.receipt_number} · {String(r.receipt_date).slice(0,10)} · {r.status}</p>)}</section>}
  {purchase.notes&&<p>Notes: {purchase.notes}</p>}
 </article>;
}
