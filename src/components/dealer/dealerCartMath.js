import { getLineAmounts, sumMoney } from '../../utils/dealerPricing';

export function hydrateCart(lines,products){
 const byId=new Map(products.map(product=>[String(product.id),product]));
 return lines.map(line=>{const product=byId.get(String(line.productId));const unit=product?.available_units?.find(x=>String(x.unitId)===String(line.unitId));return {...line,product,unit,amounts:unit?getLineAmounts(unit.dealerPrice,line.quantity,product.tax_rate??0,product.tax_inclusive===true):null};});
}
export function cartTotals(lines,transportCharge='0.00'){
 const available=lines.filter(line=>line.amounts);const subtotalCents=sumMoney(available.map(line=>line.amounts.subtotal));const taxCents=sumMoney(available.map(line=>line.amounts.tax));const transportCents=sumMoney([transportCharge]);return {subtotalCents,taxCents,transportCents,totalCents:subtotalCents+taxCents+transportCents,subtotal:`${subtotalCents/100n}.${String(subtotalCents%100n).padStart(2,'0')}`,tax:`${taxCents/100n}.${String(taxCents%100n).padStart(2,'0')}`,transport:`${transportCents/100n}.${String(transportCents%100n).padStart(2,'0')}`,total:`${(subtotalCents+taxCents+transportCents)/100n}.${String((subtotalCents+taxCents+transportCents)%100n).padStart(2,'0')}`};
}
