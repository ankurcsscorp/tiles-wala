// Inputs allow four decimal places. BigInt multiplication avoids binary float rounding.
const scaled=value=>{
  const match=String(value??'0').match(/^(\d{1,14})(?:\.(\d{0,4}))?$/);
  return match?window.BigInt(match[1])*10000n+window.BigInt((match[2]||'').padEnd(4,'0')):0n;
};
const cents=line=>(scaled(line.quantity)*scaled(line.unitPrice)+500000n)/1000000n;
const formatted=value=>{const absolute=value<0n?-value:value;return `${value<0n?'-':''}${absolute/100n}.${String(absolute%100n).padStart(2,'0')}`;};
export const nonGstLineTotal=line=>formatted(cents(line));
export const nonGstTotal=lines=>formatted(lines.reduce((sum,line)=>sum+cents(line),0n));
export const simpleInvoiceTotals=(lines,chargeTax=true)=>{
  const subtotal=lines.reduce((sum,line)=>sum+cents(line),0n);
  const tax=chargeTax?lines.reduce((sum,line)=>sum+(cents(line)*scaled(line.taxRate)+500000n)/1000000n,0n):0n;
  return {subtotal:formatted(subtotal),tax:formatted(tax),total:formatted(subtotal+tax)};
};
export const salesInvoiceTotals=(lines,invoiceDiscount='0',charges='0',roundOff='0')=>{
 const bases=lines.map(line=>{const gross=cents(line),discount=scaled(line.discountAmount||'0')/100n;return {gross,discount,taxable:gross>discount?gross-discount:0n};});
 const beforeDiscount=bases.reduce((sum,x)=>sum+x.taxable,0n),requested=scaled(invoiceDiscount||'0')/100n;
 const invoiceDisc=requested>beforeDiscount?beforeDiscount:requested;
 let allocated=0n,tax=0n;
 bases.forEach((line,index)=>{
  const disc=beforeDiscount===0n?0n:index===bases.length-1?invoiceDisc-allocated:(invoiceDisc*line.taxable+beforeDiscount/2n)/beforeDiscount;
  allocated+=disc;tax+=((line.taxable-disc)*scaled(lines[index].taxRate)+500000n)/1000000n;
 });
 const taxable=beforeDiscount-invoiceDisc;
 const adjustment=scaled(String(roundOff).replace(/^-/,'')||'0')/100n*(String(roundOff).startsWith('-')?-1n:1n);
 return {subtotal:formatted(bases.reduce((sum,x)=>sum+x.gross,0n)),discount:formatted(bases.reduce((sum,x)=>sum+x.discount,0n)),taxable:formatted(taxable),tax:formatted(tax),total:formatted(taxable+tax+scaled(charges||'0')/100n+adjustment)};
};
// Purchase tax breakup follows the per-line rounding used by PostgreSQL NUMERIC.
export const purchaseTaxBreakup=(lines,jurisdiction)=>{
 let cgst=0n,sgst=0n,igst=0n;
 for(const line of lines){
  const taxable=cents(line)-scaled(line.discountAmount||'0')/100n;
  const tax=((taxable>0n?taxable:0n)*scaled(line.taxRate)+500000n)/1000000n;
  if(jurisdiction==='INTER_STATE')igst+=tax;
  else if(jurisdiction==='INTRA_STATE'){const half=(tax+1n)/2n;cgst+=half;sgst+=tax-half;}
 }
 return {cgst:formatted(cgst),sgst:formatted(sgst),igst:formatted(igst)};
};
