import React from "react";
import InvoicePaymentStamp from './InvoicePaymentStamp';
import {gstValidationError} from "../../utils/gstValidator";

const money = (value) => {
  const raw = String(value ?? "0").trim();
  const match = raw.match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if (!match) return `₹${raw}`;
  const [, sign, whole, fraction = ""] = match;
  const grouped = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(window.BigInt(whole));
  return `${sign ? "-" : ""}₹${grouped}.${fraction.padEnd(2, "0").slice(0, 2)}`;
};

const date = (value) => value ? String(value).slice(0, 10) : "—";
const text = (value) => value == null ? "" : String(value).trim();
const addMoney = (left, right) => {
  const cents = (value) => {
    const [whole = "0", fraction = ""] = String(value ?? "0").split(".");
    return window.BigInt(whole || "0") * 100n + window.BigInt(fraction.padEnd(2, "0").slice(0, 2) || "0");
  };
  const total = cents(left) + cents(right);
  return `${total / 100n}.${String(total % 100n).padStart(2, "0")}`;
};

function addressLines(snapshot, kind = "") {
  let value = kind ? snapshot?.[kind] : snapshot?.address;
  if (typeof value === "string") value = { street: value };
  if (value && typeof value === "object") value = { ...value, city: value.city || snapshot?.city, state: value.state || snapshot?.state, pinCode: value.pinCode || value.pin_code || snapshot?.pinCode || snapshot?.pin_code };
  if (!value || typeof value !== "object") return [];
  const locality = [value.city, value.state].map(text).filter(Boolean).join(", ");
  const region = [locality, value.pinCode || value.pin_code].map(text).filter(Boolean).join(" – ");
  return [value.line1 || value.street || value.address, value.line2, region]
    .map(text).filter(Boolean);
}

export function SalesInvoiceHeader({ invoice }) {
  const nonGst=invoice.document_type?invoice.document_type==='NON_GST_COMMERCIAL':invoice.invoice_type === "NON_GST";
  const billOfSupply=invoice.document_type==='BILL_OF_SUPPLY';
  const taxInvoice=!nonGst && !billOfSupply && !gstValidationError(invoice.store_tax_id_snapshot) && (invoice.document_type?invoice.document_type==='GST_TAX_INVOICE':invoice.invoice_type === "GST" || Number(invoice.tax_total)>0);
  const name = text(invoice.store_name_snapshot) || text(invoice.current_store_name);
  return <header className="invoice-print-brand">
    <div className="invoice-brand-identity">
      {invoice.store_logo_snapshot && <img className="invoice-print-logo" src={invoice.store_logo_snapshot} alt={`${name} logo`} />}
      <div className="invoice-print-store">
        <h1>{name}</h1>
        <div className="invoice-brand-address">{addressLines(invoice.store_address_snapshot).map((line, i) => <div key={i}>{line}</div>)}</div>
        {(invoice.store_phone_snapshot || invoice.store_email_snapshot) && <div className="invoice-brand-contact">
          {invoice.store_phone_snapshot && <span>{text(invoice.store_phone_snapshot)}</span>}
          {invoice.store_email_snapshot && <span>{text(invoice.store_email_snapshot)}</span>}
        </div>}
        {!nonGst && invoice.store_tax_id_snapshot && <div className="invoice-brand-gstin"><strong>GSTIN</strong><span>{text(invoice.store_tax_id_snapshot)}</span></div>}
      </div>
    </div>
    <div className="invoice-print-title"><span>{invoice.status === "reversed" ? "REVERSED INVOICE" : billOfSupply ? "BILL OF SUPPLY" : taxInvoice ? "TAX INVOICE" : "INVOICE"}</span><small>Original for recipient</small></div>
  </header>;
}

export default function SalesInvoicePrint({ invoice }) {
  if (!invoice || !["posted", "reversed"].includes(invoice.status)) return null;
  const nonGst=invoice.document_type?invoice.document_type==='NON_GST_COMMERCIAL':invoice.invoice_type === "NON_GST";
  const billOfSupply=invoice.document_type==='BILL_OF_SUPPLY';
  const billingAddress = addressLines(invoice.customer_address_snapshot, "billing");
  const shippingAddress = addressLines(invoice.customer_address_snapshot, "shipping");
  const interState = invoice.tax_jurisdiction_snapshot === "inter_state";

  return <article className="invoice-print-sheet" aria-label="Printable sales invoice">
    <InvoicePaymentStamp invoice={invoice}/>
    <SalesInvoiceHeader invoice={invoice} />
    {billOfSupply&&invoice.registration_category_snapshot==='COMPOSITION'&&<p>Composition taxable person, not eligible to collect tax on supplies.</p>}
    {invoice.place_of_supply_state&&<p>Place of supply: {invoice.place_of_supply_state}</p>}
    <section className="invoice-print-parties">
      <div><h2>Bill to</h2><strong>{text(invoice.customer_name_snapshot) || "Walk-in customer"}</strong>
        {invoice.customer_mobile_snapshot && <div>{invoice.customer_mobile_snapshot}</div>}
        {!nonGst && invoice.customer_tax_id_snapshot && <div><strong>GSTIN:</strong> {invoice.customer_tax_id_snapshot}</div>}
        {billingAddress.map((line, i) => <div key={i}>{line}</div>)}
      </div>
      <div><h2>Invoice details</h2><div><strong>Invoice no.:</strong> {text(invoice.invoice_number)}</div>
        <div><strong>Invoice date:</strong> {date(invoice.invoice_date)}</div>
        {invoice.due_date && <div><strong>Due date:</strong> {date(invoice.due_date)}</div>}
        {invoice.salesperson_name_snapshot && <div><strong>Salesperson:</strong> {invoice.salesperson_name_snapshot}</div>}
      </div>
      {shippingAddress.length > 0 && <div className="invoice-print-ship"><h2>Ship to</h2>{shippingAddress.map((line, i) => <div key={i}>{line}</div>)}</div>}
    </section>

    <table className={`invoice-print-items${nonGst?" invoice-print-non-gst":""}`}>
      <thead><tr>{!nonGst&&<th>#</th>}<th>Product / description</th>{!nonGst&&<th>HSN</th>}<th>Qty</th><th>Unit</th><th>Rate</th>{!nonGst&&<><th>Discount</th><th>{billOfSupply?"Value":"Taxable"}</th>{!billOfSupply&&<th>Tax</th>}</>}<th>Line total</th></tr></thead>
      <tbody>{(invoice.items || []).map((line, index) => <tr key={line.id || index}>
        {!nonGst&&<td>{index + 1}</td>}
        <td><strong>{text(line.product_name_snapshot || line.product_name)}</strong>{(line.product_snapshot?.tileSize || line.description) && <small>{text(line.product_snapshot?.tileSize || line.description)}</small>}{line.sku && <small>SKU: {line.sku}</small>}</td>
        {!nonGst&&<td>{text(line.product_snapshot?.hsnCode) || "—"}</td>}<td>{line.quantity}</td><td>{text(line.unit_name) || text(line.unit_code) || "—"}</td>
        <td>{money(line.unit_price)}</td>{!nonGst&&<><td>{money(addMoney(line.discount_amount, line.invoice_discount_amount))}</td>
        <td>{money(line.taxable_value)}</td>{!billOfSupply&&<td>{money(line.tax_amount)}<small>{line.tax_rate}% {interState ? "IGST" : "GST"}</small></td>}</>}<td>{money(line.line_total)}</td>
      </tr>)}</tbody>
    </table>

    {billOfSupply&&invoice.items?.some(line=>line.product_snapshot?.classificationReference)&&<section><h2>Supply classification</h2>{invoice.items.filter(line=>line.product_snapshot?.classificationReference).map(line=><p key={line.id}>{line.product_name}: {line.product_snapshot.classificationReference}</p>)}</section>}
    <section className="invoice-print-summary">
      {!nonGst&&!billOfSupply&&<div className="invoice-print-tax"><h2>Tax summary</h2><div><span>Taxable amount</span><strong>{money(invoice.taxable_total)}</strong></div>
        {interState ? <div><span>IGST</span><strong>{money(invoice.igst_total)}</strong></div> : <><div><span>CGST</span><strong>{money(invoice.cgst_total)}</strong></div><div><span>SGST</span><strong>{money(invoice.sgst_total)}</strong></div></>}
        <div><span>Total tax</span><strong>{money(invoice.tax_total)}</strong></div>
      </div>}
      <div className="invoice-print-totals">{!nonGst&&<><div><span>Subtotal</span><strong>{money(invoice.subtotal)}</strong></div>
        <div><span>Discounts</span><strong>{money(invoice.discount_total)}</strong></div>
        <div><span>Additional charges</span><strong>{money(invoice.additional_charges)}</strong></div>
        <div><span>Round-off</span><strong>{money(invoice.round_off)}</strong></div>
        </>}<div className="invoice-print-grand"><span>Grand Total</span><strong>{money(invoice.total)}</strong></div>
        <div><span>Amount received</span><strong>{money(invoice.amount_received)}</strong></div>
        <div><span>Outstanding balance</span><strong>{money(invoice.outstanding_balance)}</strong></div>
      </div>
    </section>

    {(invoice.payments || []).length > 0 && <section className="invoice-print-payments"><h2>Payments received</h2><table><thead><tr><th>Date</th><th>Method</th><th>Reference</th><th>Amount allocated</th></tr></thead><tbody>
      {invoice.payments.map((payment, index) => <tr key={payment.id || index}><td>{date(payment.payment_date)}</td><td>{text(payment.payment_method) || "—"}</td><td>{text(payment.reference) || "—"}</td><td>{money(payment.allocated_amount)}</td></tr>)}
    </tbody></table></section>}

    {invoice.notes && <section className="invoice-print-notes"><h2>Notes</h2><p>{invoice.notes}</p></section>}
    {invoice.terms_snapshot && <section className="invoice-print-terms"><h2>Terms and conditions</h2><p>{invoice.terms_snapshot}</p></section>}
    {invoice.invoice_footer_snapshot && <footer className="invoice-print-footer">{invoice.invoice_footer_snapshot}</footer>}
  </article>;
}
