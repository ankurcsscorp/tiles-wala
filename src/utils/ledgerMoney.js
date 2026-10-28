export function ledgerMoney(value){
 const raw=String(value??'0'),negative=raw.startsWith('-'),[whole,decimal='']=raw.replace(/^[-+]/,'').split('.');
 const fraction=decimal.slice(0,2).replace(/0+$/,'');
 return `${negative?'-':''}₹${new Intl.NumberFormat('en-IN').format(window.BigInt(whole||'0'))}${fraction?`.${fraction}`:''}`;
}
export function ledgerBalance(value,type){const negative=String(value).startsWith('-');return `${ledgerMoney(String(value??'0').replace(/^-/,''))}${Number(value)===0?'':negative===(type==='supplier')?' Dr':' Cr'}`;}
export const ledgerToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const ledgerVoucher=value=>({sales_invoice:'Sales Invoice',purchase_invoice:'Purchase Invoice',customer_receipt:'Payment Received',customer_receipt_advance:'Unallocated Receipt',supplier_payment:'Payment Made',supplier_payment_advance:'Unallocated Supplier Payment',sales_credit_note:'Sales Return',purchase_debit_note:'Purchase Return',customer_refund:'Customer Refund',supplier_refund:'Supplier Refund',opening_balance:'Opening Balance Adjustment'}[value]||String(value||'').replaceAll('_',' '));
