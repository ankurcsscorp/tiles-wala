import React from 'react';
import { Button, Divider, Paper, Stack, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { formatINR } from '../../utils/dealerPricing';
import { cartTotals } from './dealerCartMath';

export default function DealerOrderSummary({lines,transportCharge,checkoutPath='/dealer/checkout',disabled=false,compact=false,showButton=true,heading='Order summary',countText=''}){
 const totals=cartTotals(lines,transportCharge);const count=lines.length;
 return <Paper className={`dealer-summary ${compact?'dealer-summary-compact':''}`} elevation={compact?0:2}>
  <Stack direction="row" sx={{justifyContent:'space-between',alignItems:'center'}}><Typography variant="h6" fontWeight={750}>{heading}</Typography>{countText&&<Typography color="text.secondary">{countText}</Typography>}</Stack>
  <Stack spacing={1.1} sx={{mt:2}}><Row label={`Items (${count})`} value={formatINR(totals.subtotal)}/><Row label="GST" value={formatINR(totals.tax)}/><Row label="Transport · per order" value={formatINR(totals.transport)}/></Stack>
  <Divider sx={{my:2}}/><Stack direction="row" sx={{justifyContent:'space-between'}}><Typography fontWeight={700}>Estimated total</Typography><Typography fontWeight={800}>{formatINR(totals.total)}</Typography></Stack>
  <Typography variant="caption" color="text.secondary" display="block" sx={{mt:1}}>Final prices and stock are checked when you submit the order.</Typography>
  {showButton&&<Button component={Link} to={checkoutPath} variant="contained" fullWidth size="large" disabled={disabled||!count} sx={{mt:2,borderRadius:2,fontWeight:750}}>Proceed to checkout</Button>}
 </Paper>;
}
function Row({label,value}){return <Stack direction="row" sx={{justifyContent:'space-between'}} gap={1}><Typography variant="body2" color="text.secondary">{label}</Typography><Typography variant="body2" fontWeight={600}>{value}</Typography></Stack>;}
