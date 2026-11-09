import QuantityField from '../common/QuantityField';
import { formatMoney, formatNumber } from '../../utils/numberFormat';
import TextField from '../common/TextField';
import React from 'react';
import { Button, MenuItem, Paper, Typography } from '@mui/material';
import {nonGstLineTotal} from '../../utils/invoiceMoney';
const money = formatMoney;

export default function SalesInvoiceItems({items,simpleLayout,noTax,updateLine,changeLineUnit,removeLine,showDescription=false}){
 return <>
 {simpleLayout&&<div className="sales-simple-columns" aria-label="Product columns"><span>Product Name</span><span>Quantity</span><span>Unit</span><span>Rate</span><span>Total</span><span/></div>}
 <div className="sales-lines">{items.map((line,index)=>line.productId&&<Paper variant="outlined" className={`sales-line-card${simpleLayout?" non-gst-line":""}`} key={`${line.productId}-${index}`}><div className="sales-line-info"><b>{line.sku} · {line.name}</b><span>{line.tileSize} {line.stock!==""&&` · Store stock ${formatNumber(line.stock)} ${line.stockUnit}`}</span></div>{showDescription&&<TextField className="line-description" label="Product description" value={line.description||line.name} onChange={e=>updateLine(index,"description",e.target.value)} inputProps={{maxLength:240}}/>}<QuantityField className="line-qty" label="Qty" type="number" value={line.quantity} onChange={e=>updateLine(index,"quantity",e.target.value)} slotProps={{htmlInput:{min:"0.0001",step:"0.0001"}}}/><TextField select className="line-unit" label="Unit" value={line.unitId} onChange={e=>changeLineUnit(index,e.target.value)}>{(line.availableUnits||[{id:line.unitId,name:line.unitName}]).map(u=><MenuItem key={u.id} value={String(u.id)}>{u.name}</MenuItem>)}</TextField><TextField className="line-rate" label="Rate" type="number" value={line.unitPrice} onChange={e=>updateLine(index,"unitPrice",e.target.value)} slotProps={{htmlInput:{min:0,step:"0.01"}}}/>{!simpleLayout&&!noTax&&<><TextField className="line-discount" label="Discount" type="number" value={line.discountAmount} onChange={e=>updateLine(index,"discountAmount",e.target.value)} slotProps={{htmlInput:{min:0,step:"0.01"}}}/><TextField className="line-tax" label="Tax %" type="number" value={line.taxRate} slotProps={{input:{readOnly:true}}} helperText="Configured product rate"/></>}<Typography className="line-total" aria-label="Line total">{simpleLayout||noTax?money(nonGstLineTotal(line)):money(Math.max(0,Number(line.quantity||0)*Number(line.unitPrice||0)-Number(line.discountAmount||0))*(1+Number(line.taxRate||0)/100))}</Typography><Button color="error" onClick={()=>removeLine(index)}>Remove</Button></Paper>)}</div>
 </>;
}
