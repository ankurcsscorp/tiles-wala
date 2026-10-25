import React,{useEffect,useState} from 'react';
import {Alert,Button,Dialog,DialogActions,DialogContent,DialogTitle,MenuItem,Stack,TextField,Typography} from '@mui/material';
import api from '../../api';
import {documentOptions,documentWarning} from '../../utils/invoicePolicy';

// Uses the same authorized settings endpoint and eligibility policy as Invoice Settings.
// Registration/category are never inferred from a GSTIN or a preferred appearance.
export default function StoreTaxSetupDialog({open,settings,storeId,storeName,documentType,onClose,onSaved}) {
 const [form,setForm]=useState({registrationStatus:'UNKNOWN',registrationCategory:'UNKNOWN',defaultDocumentType:'GST_TAX_INVOICE'});
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{
  if(!open)return;
  setError('');setForm({registrationStatus:settings?.registrationStatus||'UNKNOWN',registrationCategory:settings?.registrationCategory||'UNKNOWN',defaultDocumentType:documentType||settings?.defaultDocumentType||'GST_TAX_INVOICE'});
 },[open,settings,documentType,storeId]);
 const policy={gstin:settings?.gstin,tax_id:settings?.hasStoredTaxId&&!settings?.gstin?'saved identifier':null,gst_registration_status:form.registrationStatus,gst_registration_category:form.registrationCategory};
 const warning=documentWarning(policy,form.defaultDocumentType);
 const canEdit=Boolean(settings?.canEdit);
 const save=async()=>{
  if(warning||busy||!canEdit)return;
  setBusy(true);setError('');
  try{
   const r=await api.put(`http://localhost:4000/api/tiles/stores/${storeId}/invoice-settings`,form);
   onSaved(r.data.data);
  }catch(e){setError(e.response?.data?.message||'Unable to save store tax setup');}
  finally{setBusy(false);}
 };
 return <Dialog open={open} onClose={()=>!busy&&onClose()} fullWidth maxWidth="sm">
  <DialogTitle>Complete store tax setup</DialogTitle><DialogContent><Stack spacing={2} sx={{pt:1}}>
   <Typography fontWeight={700}>{storeName}</Typography>
   <Typography variant="body2">Confirm the actual business registration. Your customer, products, quantities, and rates will stay in this invoice. Simple Billing and the store GSTIN will stay unchanged.</Typography>
   {error&&<Alert severity="error">{error}</Alert>}
   {!canEdit&&<Alert severity="info">Ask a store owner, manager, or administrator to confirm the store tax setup.</Alert>}
   <TextField label="Store GSTIN" value={settings?.gstin||''} slotProps={{input:{readOnly:true}}} helperText="If this identifier is missing or inaccurate, an administrator must correct it in Stores."/>
   <TextField select label="Business GST registration" value={form.registrationStatus} disabled={busy||!canEdit} onChange={e=>setForm(f=>({...f,registrationStatus:e.target.value}))}>
    <MenuItem value="UNKNOWN">Not established</MenuItem><MenuItem value="REGISTERED">Registered</MenuItem><MenuItem value="UNREGISTERED">Unregistered</MenuItem>
   </TextField>
   <TextField select label="Registration category" value={form.registrationCategory} disabled={busy||!canEdit} onChange={e=>setForm(f=>({...f,registrationCategory:e.target.value}))}>
    <MenuItem value="UNKNOWN">Not established</MenuItem><MenuItem value="REGULAR">Regular</MenuItem><MenuItem value="COMPOSITION">Composition</MenuItem>
   </TextField>
   <TextField select label="Default tax document" value={form.defaultDocumentType} disabled={busy||!canEdit} onChange={e=>setForm(f=>({...f,defaultDocumentType:e.target.value}))}>
    {documentOptions(policy).map(option=><MenuItem key={option.value} value={option.value} disabled={Boolean(option.reason)}>{option.label}</MenuItem>)}
   </TextField>
   {warning&&<Alert severity="warning">{warning}</Alert>}
  </Stack></DialogContent><DialogActions><Button disabled={busy} onClick={onClose}>Back to invoice</Button><Button variant="contained" disabled={busy||!canEdit||Boolean(warning)} onClick={save}>{busy?'Saving…':'Save tax setup & continue'}</Button></DialogActions>
 </Dialog>;
}
