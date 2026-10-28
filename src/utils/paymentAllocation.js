const cents=value=>{
 const match=String(value??'').match(/^(\d{1,14})(?:\.(\d{1,2}))?$/);
 return match?window.BigInt(match[1])*100n+window.BigInt((match[2]||'').padEnd(2,'0')):0n;
};
const formatted=value=>`${value/100n}.${String(value%100n).padStart(2,'0')}`;
export function allocationTotals(amount,allocations){
 const allocated=Object.values(allocations).reduce((sum,value)=>sum+cents(value),0n),payment=cents(amount);
 return {allocated:formatted(allocated),unallocated:formatted(payment>allocated?payment-allocated:0n),exceeds:allocated>payment};
}
// Preview only. The server allocates again against locked, current balances.
export function oldestFirstAllocation(invoices,amount){
 let remaining=cents(amount);const allocations={};
 const ordered=[...invoices].sort((a,b)=>{
  const byDate=String(a.invoice_date).slice(0,10).localeCompare(String(b.invoice_date).slice(0,10));
  return byDate||(window.BigInt(a.id)<window.BigInt(b.id)?-1:window.BigInt(a.id)>window.BigInt(b.id)?1:0);
 });
 for(const invoice of ordered){
  if(remaining===0n)break;
  const due=cents(invoice.outstanding),value=due<remaining?due:remaining;
  if(value>0n){allocations[String(invoice.id)]=formatted(value);remaining-=value;}
 }
 return allocations;
}
