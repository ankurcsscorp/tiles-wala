import React from 'react';
import { createPortal } from 'react-dom';
import { invoiceAddress, invoiceAmountInWords, invoiceMoney } from '../../utils/invoiceFormat';
import './InvoiceDocument.css';

// Keep printing independent of screen containers, flex gaps and viewport heights.
// React still owns the sheet, so payment updates and route cleanup work normally.
export function InvoiceDocument({ className, label, children }) {
  return createPortal(<article className={`${className} invoice-document`} aria-label={label}>{children}</article>, document.body);
}

export function InvoiceHeader({ name, address, phone, email, gstin, logo, title, copy = 'Original for recipient' }) {
  const addressLines = invoiceAddress(address);
  return <header className="invoice-document-header">
    <div className="invoice-document-heading"><strong>{title}</strong><span>{copy}</span></div>
    <div className="invoice-document-brand">
      {logo && <img src={logo} alt={`${name} logo`} />}
      <div><h1>{name || 'Store'}</h1>
        {(addressLines.length || phone || email || gstin) && <div className="invoice-document-contact">
          {addressLines.map((line,index)=><span key={`${index}-${line}`}>{line}</span>)}
          {phone && <span>Phone: {phone}</span>}
          {email && <span>Email: {email}</span>}
          {gstin && <span><b>GSTIN:</b> {gstin}</span>}
        </div>}
      </div>
    </div>
  </header>;
}

export function InvoiceDetails({ children }) {
  return <dl className="invoice-document-details">{children}</dl>;
}

export function InvoiceDetail({ label, children }) {
  return <div><dt>{label}</dt><dd>{children || '—'}</dd></div>;
}

export function InvoiceAmountWords({ total }) {
  return <div className="invoice-document-words"><h2>Total amount in words</h2><p>{invoiceAmountInWords(total)}</p></div>;
}

export function InvoiceTotalRow({ label, value, emphasis = false }) {
  return <div className={emphasis ? 'invoice-document-grand' : ''}><span>{label}</span><strong>{invoiceMoney(value)}</strong></div>;
}

export function InvoiceSalesFooter({ terms, paymentDetails, name }) {
  const bankFields=[['accountName','Name'],['ifscCode','IFSC Code'],['accountNumber','Account No.'],['bankName','Bank'],['branch','Branch']];
  const hasBank=bankFields.some(([key])=>paymentDetails?.[key]);
  return <>
    {(hasBank||paymentDetails?.upiId)&&<section className="invoice-document-payment-details" aria-label="Payment details">
      {hasBank&&<div><h2>Bank Details</h2><InvoiceDetails>{bankFields.filter(([key])=>paymentDetails[key]).map(([key,label])=><InvoiceDetail key={key} label={label}>{paymentDetails[key]}</InvoiceDetail>)}</InvoiceDetails></div>}
      {paymentDetails?.upiId&&<div><h2>UPI Payment</h2><p>UPI ID:</p><strong className="invoice-document-upi">{paymentDetails.upiId}</strong><p className="invoice-document-payment-hint">Pay using your UPI app.</p></div>}
    </section>}
    <section className="invoice-document-closing" aria-label="Signature section">
      <div>{terms&&<><h2>Terms and Conditions</h2><p className="invoice-document-multiline">{terms}</p></>}<div className="invoice-document-receiver">Receiver’s signature: ____________________</div></div>
      <div className="invoice-document-authorization">{name&&<strong>For {name}</strong>}<div className="invoice-document-signature-space"/><span>Authorized signatory</span></div>
    </section>
  </>;
}

export function InvoiceSignatures({ name, purchase = false }) {
  return <section className="invoice-document-signatures" aria-label="Signature section">
    <div><span>{purchase ? 'Prepared by' : "Receiver’s signature"}</span><div className="invoice-document-signature-space" /><small>{purchase ? 'Name / signature' : 'Name / signature / date'}</small></div>
    <div>{!purchase && name && <strong>For {name}</strong>}<div className="invoice-document-signature-space" /><span>{purchase ? 'Checked / approved by' : 'Authorized signatory'}</span></div>
  </section>;
}
