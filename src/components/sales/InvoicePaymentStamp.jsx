import React from 'react';
import './InvoicePaymentStamp.css';

const stamps={
  unpaid:{label:'DUE',tone:'due'},
  partially_paid:{label:'PARTIALLY PAID',tone:'partial'},
  paid:{label:'PAID',tone:'paid'},
};

export default function InvoicePaymentStamp({invoice}){
  if(invoice?.status!=='posted')return null;
  const balance=invoice.outstanding_balance;
  const hasBalance=balance!==null&&balance!==undefined&&balance!==''&&Number.isFinite(Number(balance));
  let status=invoice.payment_status;
  if(hasBalance){
    status=Number(balance)<=0?'paid':Number(invoice.amount_received)>0||Number(invoice.return_credit)>0||status==='partially_paid'?'partially_paid':'unpaid';
  }
  const stamp=stamps[status];
  if(!stamp)return null;
  return <div className={`invoice-payment-stamp invoice-payment-stamp--${stamp.tone}`} role="img" aria-label={`Payment status: ${stamp.label}`}>
    <span>{stamp.label}</span>
  </div>;
}
