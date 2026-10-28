import { formatMoney, formatNumber } from '../../utils/numberFormat';
import React from 'react';
import {Alert,Button,Dialog,DialogActions,DialogContent,DialogTitle,Typography} from '@mui/material';
const money = formatMoney;
export default function ReturnFinalizeDialog({open,onBack,onSave,onFinalize,kind,party,source,preview,number,busy,error,ready,lines}){
 const sellable=lines.filter(x=>x.stockCondition==='SELLABLE').length,damaged=lines.filter(x=>x.stockCondition==='DAMAGED').length;
 return <Dialog open={open} onClose={()=>!busy&&onBack()} fullWidth maxWidth="sm"><DialogTitle>Finalize {kind==='sales'?'sales':'purchase'} return</DialogTitle><DialogContent>
  {error&&<Alert severity="error" sx={{mb:2}}>{error}</Alert>}
  <div className="return-confirm-summary">
   <Typography>Return number: {number||'Assigned when the draft is saved'}</Typography><Typography>Party: {party?.name||'—'}</Typography><Typography>Original invoice: {source?.invoice_number||'—'}</Typography>
   <Typography>Total return quantity: {formatNumber(preview?.amounts?.quantity||'—')} (invoice units)</Typography><Typography>Subtotal: {money(preview?.amounts?.subtotal)}</Typography>
   {Number(preview?.amounts?.tax)>0&&<Typography>Tax reversal from original invoice: {money(preview?.amounts?.tax)}</Typography>}
   <Typography variant="h6">Total return amount: {money(preview?.amounts?.total)}</Typography><Typography>Outstanding before return: {money(preview?.outstandingBefore)}</Typography><Typography>Amount adjusted: {money(preview?.adjustedAmount)}</Typography>
   <Typography>Remaining party credit: {money(preview?.creditAmount)}</Typography><Typography>{kind==='sales'?'Refund paid':'Supplier refund received'}: {money(preview?.refundAmount)}</Typography>
  </div>
  <Alert severity="info" sx={{mt:2}}>{kind==='sales'?`${sellable} sellable line(s) will increase available stock. ${damaged} damaged line(s) and ${lines.length-sellable-damaged} pending line(s) stay outside available stock.`:'Stock will be removed from the selected sellable or damaged bucket.'}</Alert>
  <Typography variant="body2" sx={{mt:2}}>Saving a draft does not change stock or party balances. Finalization checks current returnable quantities, stock, settlement and refund details again.</Typography>
 </DialogContent><DialogActions sx={{flexWrap:'wrap',gap:1}}><Button disabled={busy} onClick={onBack}>Back</Button><Button disabled={busy||!ready} onClick={onSave}>Save Draft</Button><Button variant="contained" disabled={busy||!ready} onClick={onFinalize}>{busy?'Finalizing…':'Confirm & Finalize'}</Button></DialogActions></Dialog>;
}
