import React, {useEffect, useRef, useState} from 'react';
import {Alert, Box, Button, CircularProgress, FormControl, FormControlLabel, FormLabel, MenuItem, Paper, Radio, RadioGroup, Stack, Switch, TextField, Typography} from '@mui/material';
import {Link} from 'react-router-dom';
import api from '../../api';
import {useStores} from '../../context/StoreContext';
import {documentWarning} from '../../utils/invoicePolicy';
const endpoint=id=>'http://localhost:4000/api/tiles/stores/'+id+'/invoice-settings';
const paymentFields=[['accountName','Account holder name',160],['accountNumber','Account number',34],['bankName','Bank name',160],['branch','Branch',160],['ifscCode','IFSC code',11],['upiId','UPI ID',128]];
const defaults=s=>({billingMode:s.billingMode==='NON_GST'||s.defaultDocumentType==='NON_GST_COMMERCIAL'?'NON_GST':'GST',registrationStatus:s.registrationStatus||'UNKNOWN',registrationCategory:s.registrationCategory||'UNKNOWN',termsAndConditions:s.termsAndConditions||'',paymentDetails:Object.fromEntries(paymentFields.map(([key])=>[key,s.paymentDetails?.[key]||''])),partialDealerPaymentsEnabled:Boolean(s.partialDealerPaymentsEnabled)});
export default function InvoiceSettings() {
  const {stores,selectedStoreId,selectStore}=useStores();
  const activeStore=useRef(selectedStoreId);activeStore.current=selectedStoreId;
  const [settings,setSettings]=useState(null),[form,setForm]=useState({});
  const [loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState('');
  useEffect(()=>{
    let active=true;setSettings(null);setLoading(false);setError('');setSuccess('');
    if(!selectedStoreId)return;
    setLoading(true);
    api.get(endpoint(selectedStoreId)).then(r=>{if(active){setSettings(r.data.data);setForm(defaults(r.data.data));}})
      .catch(e=>{if(active)setError(e.response?.data?.message||'Unable to load invoice settings');})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[selectedStoreId]);
  const gst=form.billingMode==='GST';
  const warning=settings&&gst?documentWarning({gstin:settings.gstin,tax_id:settings.hasStoredTaxId&&!settings.gstin?'saved identifier':null,gst_registration_status:form.registrationStatus,gst_registration_category:form.registrationCategory},'GST_TAX_INVOICE'):null;
  const initial=settings?defaults(settings):null;
  const taxChanged=initial&&(form.billingMode!==initial.billingMode||(gst&&(form.registrationStatus!==initial.registrationStatus||form.registrationCategory!==initial.registrationCategory)));
  const detailsChanged=initial&&(form.termsAndConditions!==initial.termsAndConditions||JSON.stringify(form.paymentDetails)!==JSON.stringify(initial.paymentDetails)||form.partialDealerPaymentsEnabled!==initial.partialDealerPaymentsEnabled);
  const blockingWarning=warning&&(taxChanged||!detailsChanged)?warning:null;
  const set=(key,value)=>{setForm(f=>({...f,[key]:value}));setError('');setSuccess('');};
  const save=async()=>{
    if(blockingWarning)return;
    const initial=defaults(settings),payload={};
    if(taxChanged||!detailsChanged)payload.billingMode=form.billingMode;
    if(gst)for(const key of ['registrationStatus','registrationCategory'])if(form[key]!==initial[key])payload[key]=form[key];
    if(form.termsAndConditions!==initial.termsAndConditions)payload.termsAndConditions=form.termsAndConditions;
    if(JSON.stringify(form.paymentDetails)!==JSON.stringify(initial.paymentDetails))payload.paymentDetails=form.paymentDetails;
    if(form.partialDealerPaymentsEnabled!==initial.partialDealerPaymentsEnabled)payload.partialDealerPaymentsEnabled=form.partialDealerPaymentsEnabled;
    const savingStore=selectedStoreId;
    setBusy(true);setError('');setSuccess('');
    try{const r=await api.put(endpoint(savingStore),payload);if(activeStore.current===savingStore){setSettings(r.data.data);setForm(defaults(r.data.data));setSuccess('Billing settings saved. Terms and payment details apply to newly finalized sales invoices.');}}
    catch(e){if(activeStore.current===savingStore)setError(e.response?.data?.message||'Unable to save invoice settings');}finally{setBusy(false);}
  };
  const disabled=busy||!settings?.canEdit;
  return <Box sx={{maxWidth:800,mx:'auto',p:{xs:2,md:3}}}><Typography variant="h4" fontWeight={750} gutterBottom>Invoice Settings</Typography>
    <Paper sx={{p:{xs:2,md:3}}}><Stack spacing={3}>
      <TextField select label="Store" value={selectedStoreId||''} disabled={busy} onChange={e=>selectStore(e.target.value)}>{stores.map(s=><MenuItem key={s.id} value={String(s.id)}>{s.name}</MenuItem>)}</TextField>
      {!selectedStoreId&&<Alert severity="info">Select an active store to configure invoices.</Alert>}
      {loading&&<CircularProgress aria-label="Loading invoice settings"/>}{error&&<Alert severity="error">{error}</Alert>}{success&&<Alert severity="success">{success}</Alert>}
      {settings&&<>
        {!settings.canEdit&&<Alert severity="info">Only store owners, managers, or administrators can modify these settings.</Alert>}
        <FormControl disabled={disabled}><FormLabel id="billing-mode-label">Billing mode</FormLabel><RadioGroup aria-labelledby="billing-mode-label" value={form.billingMode} onChange={e=>set('billingMode',e.target.value)}>
          <FormControlLabel value="NON_GST" control={<Radio/>} label="Non-GST — Tiles Wala Simple Billing"/>
          <Typography variant="body2" color="text.secondary">Default billing. Product, Quantity, Unit, Rate, and Line Total. Total = Quantity × Rate. No GST setup or tax charges.</Typography>
          <FormControlLabel value="GST" control={<Radio/>} label="GST Billing"/>
          <Typography variant="body2" color="text.secondary">GST invoices with HSN, tax rates, GST calculations, and tax disclosures.</Typography>
        </RadioGroup></FormControl>
        <Typography variant="body2">Applies to new Sales and Purchases.</Typography>
        {gst&&<>
          <Typography variant="h6">GST setup</Typography>
          <TextField label="Store GSTIN" value={settings.gstin||''} slotProps={{input:{readOnly:true}}} helperText={<>Update the actual business GSTIN in <Link to="/stores">Stores</Link>.</>}/>
          <TextField select label="Business GST registration declaration" value={form.registrationStatus} disabled={disabled} onChange={e=>set('registrationStatus',e.target.value)} helperText="Confirm the actual business registration.">
            <MenuItem value="UNKNOWN">Not established</MenuItem><MenuItem value="REGISTERED">Registered</MenuItem><MenuItem value="UNREGISTERED">Unregistered</MenuItem>
          </TextField>
          <TextField select label="GST registration category" value={form.registrationCategory} disabled={disabled} onChange={e=>set('registrationCategory',e.target.value)}>
            <MenuItem value="UNKNOWN">Not established</MenuItem><MenuItem value="REGULAR">Regular</MenuItem><MenuItem value="COMPOSITION">Composition</MenuItem>
          </TextField>
          {warning&&<Alert severity={blockingWarning?'error':'info'}>{warning}</Alert>}
        </>}
        <Typography variant="h6">Sales invoice terms and conditions</Typography>
        <TextField label="Terms and conditions" multiline minRows={4} value={form.termsAndConditions} disabled={disabled} onChange={e=>set('termsAndConditions',e.target.value)} slotProps={{htmlInput:{maxLength:10000}}} helperText="Enter one condition per line. These terms print on sales invoices."/>
        <Typography variant="h6">Dealer order UPI payments</Typography>
        <Typography variant="body2" color="text.secondary">The UPI ID below is used to create order specific payment links and QR codes. Manual UTR verification is required; a dealer claim is never treated as payment until verified by an Admin.</Typography>
        <TextField label="Receiving UPI ID" placeholder="8109961022@indianbk" value={form.paymentDetails.upiId} disabled={disabled} onChange={e=>set('paymentDetails',{...form.paymentDetails,upiId:e.target.value.trim()})} slotProps={{htmlInput:{maxLength:128}}} helperText="Store specific. Dealers cannot change the receiving UPI ID."/>
        <FormControlLabel control={<Switch checked={form.partialDealerPaymentsEnabled} disabled={disabled} onChange={e=>set('partialDealerPaymentsEnabled',e.target.checked)}/>} label="Allow partial dealer order payments"/>
        <Typography variant="body2" color="text.secondary">Payee name is taken from the store name. Manual verification is always required for direct UPI payments.</Typography>
        <Typography variant="h6">Bank details for customer payments</Typography>
        <Typography variant="body2" color="text.secondary">Optional. To show a bank account, enter the account holder, account number, bank name and IFSC. Branch is optional.</Typography>
        <Box sx={{display:'grid',gridTemplateColumns:{xs:'1fr',sm:'1fr 1fr'},gap:2}}>
          {paymentFields.filter(([key])=>key!=='upiId').map(([key,label,maxLength])=><TextField key={key} label={label} value={form.paymentDetails[key]} disabled={disabled} onChange={e=>set('paymentDetails',{...form.paymentDetails,[key]:key==='ifscCode'?e.target.value.toUpperCase():e.target.value})} slotProps={{htmlInput:{maxLength,...(key==='accountNumber'?{inputMode:'numeric'}:{})}}}/>) }
        </Box>
        <Typography variant="body2" color="text.secondary">Payment details are specific to this store and appear only on sales invoices. Finalized invoices keep their saved terms and payment details.</Typography>
        <Typography variant="body2" color="text.secondary">Existing drafts and finalized invoices keep their saved format and totals. Saved business identifiers and registration declarations are preserved when switching to Non-GST.</Typography>
        <Button variant="contained" disabled={disabled||Boolean(blockingWarning)} onClick={save}>{busy?'Saving…':'Save Settings'}</Button>
      </>}
    </Stack></Paper></Box>;
}
