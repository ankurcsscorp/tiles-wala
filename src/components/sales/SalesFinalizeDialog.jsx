import React from 'react';
import {Alert,Button,Dialog,DialogActions,DialogContent,DialogTitle,MenuItem,Stack,TextField,Typography} from '@mui/material';
import {validateSalesPayment} from '../../utils/salesPayment';
import SalesValidationAlert from './SalesValidationAlert';

const money=value=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(Number(value||0));
export default function SalesFinalizeDialog({open,onClose,onConfirm,invoice,customer,documentLabel,total,payment,setPayment,paymentMethods,busy,ready,error,issue,isAdmin,onRefresh}){
  const validation=validateSalesPayment(payment.amount,total);
  const methodError=Number(payment.amount)>0&&!paymentMethods.some(row=>row.code===payment.method);
  return <Dialog open={open} onClose={()=>!busy&&onClose()} fullWidth maxWidth="sm">
    <DialogTitle>Finalize invoice</DialogTitle><DialogContent><Stack spacing={2} sx={{pt:1}}>
      {error&&!issue&&<Alert severity="error">{error}</Alert>}
      <SalesValidationAlert issue={issue} isAdmin={isAdmin} onRefresh={onRefresh}/>
      <Alert severity="info">Finalizing posts this invoice and updates stock and customer balances. Review the store and totals before confirming.</Alert>
      <Typography>Invoice number: {invoice?.invoice_number||'Assigned on finalization'}</Typography>
      <Typography>Customer: {customer?.name||invoice?.current_customer_name||'Walk-in customer'}</Typography>
      <Typography>Invoice type: {documentLabel}</Typography>
      <Typography>Invoice total: {money(total)}</Typography>
      <TextField label="Amount received now (optional)" value={payment.amount} onChange={e=>setPayment({...payment,amount:e.target.value})} error={Boolean(validation.error)} helperText={validation.error||'Leave blank or enter zero to record payment later.'} slotProps={{htmlInput:{inputMode:'decimal'}}}/>
      <Typography>Balance due: {validation.balance===null?'—':money(validation.balance)}</Typography>
      <TextField select label="Payment method" value={payment.method} onChange={e=>setPayment({...payment,method:e.target.value})} error={methodError} helperText={methodError?'Choose an active payment method.':null}>
        {paymentMethods.map(m=><MenuItem key={m.code} value={m.code}>{m.label}</MenuItem>)}
      </TextField>
      <TextField label="Payment reference" value={payment.reference} onChange={e=>setPayment({...payment,reference:e.target.value})}/>
    </Stack></DialogContent><DialogActions><Button disabled={busy} onClick={onClose}>Back</Button><Button variant="contained" disabled={busy||!ready||Boolean(validation.error)||methodError||Boolean(issue)} onClick={onConfirm}>Confirm &amp; finalize</Button></DialogActions>
  </Dialog>;
}
