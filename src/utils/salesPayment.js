const toCents=value=>{
  const match=String(value).match(/^(\d{1,14})(?:\.(\d{1,2}))?$/);
  return match?window.BigInt(match[1])*100n+window.BigInt((match[2]||'').padEnd(2,'0')):null;
};
const formatted=value=>`${value/100n}.${String(value%100n).padStart(2,'0')}`;

// Blank/zero mean no initial payment; advances use the separate receipt workflow.
export function validateSalesPayment(amount,outstanding){
  const received=toCents(amount===''?'0':amount),total=toCents(outstanding);
  if(received===null)return {error:'Enter a non-negative payment amount with up to two decimal places.',balance:null};
  if(total===null)return {error:'Invoice total is unavailable. Review the invoice before finalizing.',balance:null};
  if(received>total)return {error:'Amount received cannot exceed the outstanding amount. Record advances separately.',balance:null};
  return {error:null,balance:formatted(total-received)};
}
