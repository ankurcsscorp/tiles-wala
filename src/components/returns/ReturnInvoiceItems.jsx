import { formatMoney, formatNumber } from '../../utils/numberFormat';
import TextField from '../common/TextField';
import React from 'react';
import { Box, Button, MenuItem, Paper, Typography } from '@mui/material';
const money = formatMoney;
export default function ReturnInvoiceItems({lines,onChange,onRemove,kind,canOverrideRate,preview,simple,showSource}){
 return <Box className="return-lines">
  <div className="return-columns" aria-label="Return product columns"><span>Product Name</span><span>Quantity</span><span>Unit</span><span>Rate</span><span>Line Total</span><span>Action</span></div>
  {lines.map((line,index)=>{const calculated=preview?.items?.find(item=>String(item.invoiceItemId)===String(line.invoiceItemId)),label=showSource?`${line.name} — ${line.invoiceNumber}`:line.name;return <Paper variant="outlined" className="return-line" key={line.invoiceItemId}>
   <div className="return-line-main">
    <Box className="return-product-info"><Typography fontWeight={700}>{line.sku} · {line.name}</Typography>{kind==='sales'&&line.invoiceNumber&&<Typography variant="body2">Bill: {line.invoiceNumber}</Typography>}<Typography variant="caption">{line.size} · Original {formatNumber(line.originalQuantity)} {line.unitName} · Previously returned {formatNumber(line.previouslyReturned)} · Returnable {formatNumber(line.remaining)}{kind==='purchase'?` · Available sellable: ${formatNumber(line.storeStock)} base units · Damaged: ${formatNumber(line.damagedStock)} base units`:''}</Typography></Box>
    <TextField label="Quantity" type="number" value={line.quantity} onChange={event=>onChange(index,'quantity',event.target.value)} slotProps={{htmlInput:{min:'0.0001',max:line.remaining,step:line.precision===0?'1':String(10**-Math.min(line.precision,4)),'aria-label':`Return quantity for ${label}`}}}/>
    <TextField label="Unit" value={line.unitName} slotProps={{input:{readOnly:true}}} helperText="Original invoice unit"/>
    <TextField label="Rate" type="number" value={line.returnRate} onChange={event=>onChange(index,'returnRate',event.target.value)} slotProps={{input:{readOnly:!canOverrideRate},htmlInput:{min:0,max:line.originalRate,step:'0.0001','aria-label':`Return rate for ${label}`}}}/>
    <Typography className="return-line-value"><span>Line Total</span><strong>{calculated?money(simple?calculated.taxable:calculated.total):'—'}</strong></Typography>
    <Button color="error" onClick={()=>onRemove(index)} aria-label={`Remove ${label}`}>Remove</Button>
   </div>
   <div className="return-line-extra">
    {kind==='sales'?<TextField select label="Returned goods condition" value={line.stockCondition} onChange={event=>onChange(index,'stockCondition',event.target.value)}>
     <MenuItem value="PENDING_INSPECTION">Pending receipt / inspection</MenuItem><MenuItem value="SELLABLE">Sellable — received and accepted</MenuItem><MenuItem value="DAMAGED">Damaged — non-sellable stock</MenuItem>
    </TextField>:<TextField select label="Stock to send back" value={line.stockBucket} onChange={event=>onChange(index,'stockBucket',event.target.value)}><MenuItem value="SELLABLE">Available sellable stock</MenuItem><MenuItem value="DAMAGED">Recorded damaged stock</MenuItem></TextField>}
    {String(line.returnRate)!==String(line.originalRate)&&Number(line.returnRate)!==Number(line.originalRate)&&<TextField required label="Reason for rate change" value={line.rateChangeReason} onChange={event=>onChange(index,'rateChangeReason',event.target.value)}/>}
   </div>
  </Paper>;})}
 </Box>;
}
