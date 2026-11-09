const CENTS_PER_PRICE_QUANTITY=1000000n;
const decimalScaled=(value,scaleDigits)=>{const [whole,fraction='']=String(value??0).split('.');const toBigInt=window['BigInt'];const scale=10n**toBigInt(scaleDigits);return toBigInt(whole||'0')*scale+toBigInt(fraction.padEnd(scaleDigits,'0').slice(0,scaleDigits));};
export const centsToMoney=cents=>`${cents/100n}.${String(cents%100n).padStart(2,'0')}`;
export function getLineAmounts(price,quantity,taxRate=0,taxInclusive=false){
 const scaledPrice=decimalScaled(price,4),scaledQuantity=decimalScaled(quantity,4);const grossCents=(scaledPrice*scaledQuantity+500000n)/CENTS_PER_PRICE_QUANTITY;
 const rate=decimalScaled(taxRate,4);const taxDenominator=taxInclusive?1000000n+rate:1000000n;const taxCents=(grossCents*rate+taxDenominator/2n)/taxDenominator;
 const subtotalCents=taxInclusive?grossCents-taxCents:grossCents;const totalCents=taxInclusive?grossCents:grossCents+taxCents;
 return {subtotalCents,taxCents,totalCents,subtotal:centsToMoney(subtotalCents),tax:centsToMoney(taxCents),total:centsToMoney(totalCents)};
}
export function getDealerSavings(mrp,dealerPrice,quantity){
 if(mrp===null||mrp===undefined||mrp===''||decimalScaled(mrp,4)<=decimalScaled(dealerPrice,4))return '0.00';
 const scaledProduct=(decimalScaled(mrp,4)-decimalScaled(dealerPrice,4))*decimalScaled(quantity,4);
 return centsToMoney((scaledProduct+500000n)/1000000n);
}
export function sumMoney(values){return values.reduce((sum,value)=>sum+decimalScaled(value,2),0n);}
export const formatINR=value=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(Number(value||0));
