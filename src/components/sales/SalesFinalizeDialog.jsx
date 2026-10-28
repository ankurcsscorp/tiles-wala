import { formatMoney } from '../../utils/numberFormat';
import React, {useEffect} from 'react';
import {Alert,Button,Checkbox,Dialog,DialogActions,DialogContent,DialogTitle,FormControlLabel,MenuItem,Stack,TextField,Typography} from '@mui/material';
import {validateSalesPayment} from '../../utils/salesPayment';
import SalesValidationAlert from './SalesValidationAlert';

const money = formatMoney;
export default function SalesFinalizeDialog({canReceivePayment=true,open,onClose,onConfirm,invoice,customer,documentLabel,total,payment,setPayment,paymentMethods,busy,ready,error,issue,isAdmin,onRefresh}){
  const validation=validateSalesPayment(payment.amount,total);
  const fullAmount=validateSalesPayment('',total).balance;
  useEffect(()=>{
    if(open&&payment.payInFull&&fullAmount!==null&&payment.amount!==fullAmount)setPayment({...payment,amount:fullAmount});
  },[open,payment,fullAmount,setPayment]);
  const permissionError=!canReceivePayment&&Number(payment.amount)>0;
  const methodError=Number(payment.amount)>0&&!paymentMethods.some(row=>row.code===payment.method);
  return <Dialog open={open} onClose={()=>!busy&&onClose()} fullWidth maxWidth="sm">
    <DialogTitle>Finalize invoice</DialogTitle><DialogContent><Stack spacing={2} sx={{pt:1}}>
      {error&&!issue&&<Alert severity="error">{error}</Alert>}
      <SalesValidationAlert issue={issue} isAdmin={isAdmin} onRefresh={onRefresh}/>
      <Alert severity="info">Finalizing posts this invoice and updates stock and customer balances. Review the store and totals before confirming.</Alert>
      <Typography>Invoice number: {invoice?.invoice_number||'Assigned on finalization'}</Typography>
      <Typography>Customer: {customer?.name||invoice?.current_customer_name||'Walk-in customer'}</Typography>
      <Typography>Invoice type: {documentLabel}</Typography>
      {!canReceivePayment&&<Alert severity="info">Your permissions allow invoice finalization without payment. Leave the amount blank or zero; ask an authorized user to record receipts.</Alert>}
      <Typography>Invoice total: {money(total)}</Typography>
      <FormControlLabel control={<Checkbox checked={Boolean(payment.payInFull)} disabled={busy||!ready||!canReceivePayment||fullAmount===null||Number(fullAmount)===0} onChange={e=>setPayment({...payment,payInFull:e.target.checked,amount:e.target.checked?fullAmount:''})}/>} label="Mark fully paid"/>
      <TextField label="Amount received now (optional)" value={payment.amount} disabled={busy||!canReceivePayment} onChange={e=>setPayment({...payment,amount:e.target.value,payInFull:false})} error={Boolean(validation.error)} helperText={validation.error||(payment.payInFull?'Full invoice amount filled in. Editing this amount clears the checkbox.':'Leave blank or enter zero to record payment later.')} slotProps={{htmlInput:{inputMode:'decimal'}}}/>
      <Typography>Balance due: {validation.balance===null?'—':money(validation.balance)}</Typography>
      <TextField select label="Payment method" value={payment.method} disabled={busy||!canReceivePayment} onChange={e=>setPayment({...payment,method:e.target.value})} error={methodError} helperText={methodError?'Choose an active payment method.':null}>
        {paymentMethods.map(m=><MenuItem key={m.code} value={m.code}>{m.label}</MenuItem>)}
      </TextField>
      <TextField label="Payment reference" value={payment.reference} disabled={busy||!canReceivePayment} onChange={e=>setPayment({...payment,reference:e.target.value})}/>
    </Stack></DialogContent><DialogActions><Button disabled={busy} onClick={onClose}>Back</Button><Button variant="contained" disabled={busy||!ready||Boolean(validation.error)||methodError||permissionError||Boolean(issue)} onClick={onConfirm}>Confirm &amp; finalize</Button></DialogActions>
  </Dialog>;
}
