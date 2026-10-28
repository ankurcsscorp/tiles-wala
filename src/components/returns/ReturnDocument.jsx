import { formatMoney, formatNumber } from '../../utils/numberFormat';
import React from 'react';
const money = formatMoney;
const address=value=>{if(!value)return '';if(typeof value==='string')return value;const a=value.billing||value.billingAddress||value.address||value;return [typeof a==='string'?a:a.line1||a.street,a.line2,a.city||value.city,a.state||value.state,a.pinCode||value.pinCode].filter(Boolean).join(', ');};
const gstDocument=(invoice,items)=>invoice?.documentType==='GST_TAX_INVOICE'||(!invoice?.documentType&&(invoice?.invoiceType==='GST'||items.some(line=>Number(line.tax_adjustment)>0)));
function ProductTable({items,gst}){
 return <table><thead><tr>{['Product Name',...(gst?['HSN']:[]),'Quantity','Unit','Rate',...(gst?['Taxable','GST rate','CGST','SGST','IGST']:[]),'Line Total'].map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>{items.map(line=><tr key={line.id}>
  <td>{line.sku} · {line.product_name}</td>{gst&&<td>{line.return_snapshot?.product?.hsnCode||line.product_snapshot?.hsnCode||'—'}</td>}
  <td>{formatNumber(line.quantity)}</td><td>{line.unit_name}</td><td>{money(line.unit_price??line.unit_cost)}</td>
  {gst&&<><td>{money(line.taxable_adjustment??Number(line.line_total)-Number(line.tax_adjustment))}</td><td>{formatNumber(line.tax_rate)}%</td><td>{line.return_snapshot?.taxBreakupKnown===false?'—':money(line.cgst_adjustment)}</td><td>{line.return_snapshot?.taxBreakupKnown===false?'—':money(line.sgst_adjustment)}</td><td>{line.return_snapshot?.taxBreakupKnown===false?'—':money(line.igst_adjustment)}</td></>}
  <td>{money(line.line_total)}</td>
 </tr>)}</tbody></table>;
}
export default function ReturnDocument({record,kind}){
 if(!record)return null;
 const snapshot=record.document_snapshot||{},store=snapshot.store||{},party=snapshot.party||{},items=record.items||[];
 const sources=snapshot.invoices?.length?snapshot.invoices:[snapshot];
 const groups=sources.map(source=>{
  const invoice=source.invoice||{};
  const lines=sources.length===1?items:items.filter(line=>String(line.original_invoice_id??line.return_snapshot?.invoice?.id)===String(invoice.id));
  return {source,invoice,items:lines,gst:gstDocument(invoice,lines)};
 }).filter(group=>group.items.length);
 const gst=groups.some(group=>group.gst),mixed=gst&&groups.some(group=>!group.gst),multiple=groups.length>1;
 const title=kind==='sales'?(mixed?'SALES RETURN STATEMENT':gst?'SALES RETURN / CREDIT NOTE':'SALES RETURN / COMMERCIAL CREDIT NOTE'):'PURCHASE RETURN RECORD';
 return <article className="return-print-sheet" aria-label="Printable return document">
  <header className="return-print-brand">{store.logo&&<img src={store.logo} alt="Store logo"/>}<h1>{store.name||record.store_name}</h1><p>{address(store.address)}</p><p>{store.phone} {store.email}</p>{gst&&store.gstin&&<p>GSTIN: {store.gstin}</p>}<h2>{title}</h2><p>{record.return_number} · {record.return_date} · {record.status}</p></header>
  <section className="return-print-parties"><div><h3>{kind==='sales'?'Customer':'Supplier'}</h3><strong>{party.name||record.party_name}</strong><p>{address(party.address||party)}</p><p>{party.phone}</p>{gst&&party.gstin&&<p>GSTIN: {party.gstin}</p>}</div><div><p>Original {multiple?'invoices':'invoice'}: <strong>{record.original_invoice_number}</strong></p>{!multiple&&<p>Invoice date: {record.original_invoice_date}</p>}<p>Return reason: {record.reason}</p></div></section>
  {groups.map((group,index)=><section className="return-print-source" key={group.invoice.id||index} aria-label={multiple?'Returned items from '+group.invoice.number:'Returned items'}>
   {multiple&&<><h3>Original invoice: {group.invoice.number} · {group.invoice.date}</h3><p>{group.gst?'GST return items — original tax adjustment':'Commercial return items — no GST collected'}</p>{group.gst&&group.source.store?.gstin&&<p>Original seller GSTIN: {group.source.store.gstin}</p>}{group.gst&&group.source.party?.gstin&&<p>Original customer GSTIN: {group.source.party.gstin}</p>}</>}
   <ProductTable items={group.items} gst={group.gst}/>
   {multiple&&<p>Return amount for {group.invoice.number}: <strong>{money(group.items.reduce((sum,line)=>sum+Number(line.line_total),0))}</strong></p>}
  </section>)}
  {kind==='purchase'&&gst&&<p>Internal purchase return record. Supplier credit note: {record.supplier_credit_note_reference||'Pending receipt'}. This record does not by itself establish a statutory GST debit note or an input-tax-credit reversal.</p>}
  <section className="return-print-totals"><p>Subtotal <strong>{money(record.amounts?.subtotal)}</strong></p>{gst&&<p>Tax reversal <strong>{money(record.tax_adjustment)}</strong></p>}<h3>Return total <strong>{money(record.total)}</strong></h3><p>Adjusted against invoices <strong>{money(record.adjusted_amount)}</strong></p><p>Retained credit <strong>{money(record.unapplied_credit)}</strong></p><p>{kind==='sales'?'Refund paid':'Refund received'} <strong>{money(record.effective_refund_amount??record.refund_amount)}</strong></p></section>
  {record.refunds?.map(refund=><p key={refund.id}>Refund payment: {refund.payment_number} · {refund.status} · {refund.payment_method} · {money(refund.amount)} · {String(refund.payment_date).slice(0,10)} {refund.reference}</p>)}
  {record.notes&&<p>Remarks: {record.notes}</p>}<p className="return-print-signature">Authorized signature __________________</p>
 </article>;
}
