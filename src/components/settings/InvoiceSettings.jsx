import React, {useEffect, useRef, useState} from 'react';
import {Accordion, AccordionSummary, AccordionDetails, Alert, Box, Button, CircularProgress, FormControl, FormControlLabel, FormLabel, MenuItem, Paper, Radio, RadioGroup, Stack, TextField, Typography} from '@mui/material';
import {Link} from 'react-router-dom';
import api from '../../api';
import {useStores} from '../../context/StoreContext';
import {documentOptions,documentWarning} from '../../utils/invoicePolicy';
const endpoint=id=>`http://localhost:4000/api/tiles/stores/${id}/invoice-settings`;
const defaults=s=>({invoiceLayout:s.invoiceLayout||(s.invoiceType==='NON_GST'?'SIMPLE_LAYOUT':'STANDARD_GST_LAYOUT'),defaultDocumentType:s.defaultDocumentType||(s.invoiceType==='NON_GST'?'NON_GST_COMMERCIAL':'GST_TAX_INVOICE'),registrationStatus:s.registrationStatus||'UNKNOWN',registrationCategory:s.registrationCategory||'UNKNOWN'});
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
  const initial=settings?defaults(settings):{};
  const patch=Object.fromEntries(Object.entries(form).filter(([key,value])=>value!==initial[key]));
  const taxChanged=['defaultDocumentType','registrationStatus','registrationCategory'].some(key=>key in patch);
  const policy={gstin:settings?.gstin,tax_id:settings?.hasStoredTaxId&&!settings?.gstin?'saved identifier':null,gst_registration_status:form.registrationStatus,gst_registration_category:form.registrationCategory};
  const warning=settings?documentWarning(policy,form.defaultDocumentType):null;
  const blocker=taxChanged?warning:null;
  const set=(key,value)=>{setForm(f=>({...f,[key]:value}));setError('');setSuccess('');};
  const save=async(appearanceOnly=false)=>{
    if(!appearanceOnly&&blocker)return;
    const payload=appearanceOnly?{invoiceLayout:form.invoiceLayout}:Object.fromEntries(Object.entries(patch).filter(([key])=>key!=='invoiceLayout'));
    const savingStore=selectedStoreId;
    setBusy(true);setError('');setSuccess('');
    try{const r=await api.put(endpoint(savingStore),payload);if(activeStore.current===savingStore){setSettings(r.data.data);setForm(previous=>appearanceOnly?{...previous,invoiceLayout:r.data.data.invoiceLayout}:{...defaults(r.data.data),invoiceLayout:previous.invoiceLayout});setSuccess(appearanceOnly?'Billing mode saved. Tax configuration was not changed.':'Tax configuration saved.');}}
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
        <FormControl disabled={disabled}><FormLabel id="invoice-appearance-label">Preferred Billing Mode</FormLabel><RadioGroup aria-labelledby="invoice-appearance-label" value={form.invoiceLayout} onChange={e=>set('invoiceLayout',e.target.value)}>
          <FormControlLabel sx={{border:"1px solid",borderColor:form.invoiceLayout==="STANDARD_GST_LAYOUT"?"primary.main":"divider",borderRadius:2,m:0,mt:1,p:1}} value="STANDARD_GST_LAYOUT" control={<Radio/>} label="GST Billing"/><Typography variant="body2" color="text.secondary">Detailed sales and purchase billing with GST fields, HSN, tax rates, and tax calculations.</Typography>
          <FormControlLabel sx={{border:"1px solid",borderColor:form.invoiceLayout==="SIMPLE_LAYOUT"?"primary.main":"divider",borderRadius:2,m:0,mt:2,p:1}} value="SIMPLE_LAYOUT" control={<Radio/>} label="Tiles Wala Simple Billing"/><Typography variant="body2" color="text.secondary">Fast sales and purchase entry with Product, Quantity, Unit, Rate, and Line Total.</Typography>
        </RadioGroup></FormControl>
        <Typography variant="body2">Applies to Sales and Purchases.</Typography>
        <Alert severity="info">{form.invoiceLayout==='SIMPLE_LAYOUT'?'Simple Billing is selected. Applicable GST will still be calculated for taxable sales. Purchases retain tax actually charged by the supplier.':'GST Billing is selected. Detailed GST entry is available for Sales and Purchases.'}</Alert>
        <Button variant="contained" disabled={disabled} onClick={()=>save(true)}>{busy?'Saving…':'Save Settings'}</Button>
        <Accordion defaultExpanded={false}><AccordionSummary aria-controls="advanced-tax-settings" id="advanced-tax-title">Advanced: GST Registration and Tax Document Configuration</AccordionSummary><AccordionDetails id="advanced-tax-settings"><Stack spacing={3}>
        <Typography variant="h6">Business GST Registration</Typography>
        <TextField select label="Business GST registration declaration" value={form.registrationStatus} disabled={disabled} onChange={e=>set('registrationStatus',e.target.value)} helperText="Record the actual business status. Changing appearance does not change this declaration.">
          <MenuItem value="UNKNOWN">Not established</MenuItem><MenuItem value="REGISTERED">Registered</MenuItem><MenuItem value="UNREGISTERED">Unregistered</MenuItem>
        </TextField>
        <TextField label="Store GSTIN" value={settings.gstin||''} slotProps={{input:{readOnly:true}}} helperText={<>Existing registration identifiers are preserved. Administrators can edit business details in <Link to="/stores">Stores</Link>.</>}/>
        <TextField select label="GST registration category" value={form.registrationCategory} disabled={disabled} onChange={e=>set('registrationCategory',e.target.value)}>
          <MenuItem value="UNKNOWN">Not established</MenuItem><MenuItem value="REGULAR">Regular</MenuItem><MenuItem value="COMPOSITION">Composition</MenuItem>
        </TextField>
        <FormControl disabled={disabled}><FormLabel id="tax-document-label">Default Tax Document Type</FormLabel><RadioGroup aria-labelledby="tax-document-label" value={form.defaultDocumentType} onChange={e=>set('defaultDocumentType',e.target.value)}>
          {documentOptions(policy).map(option=><Box key={option.value}><FormControlLabel value={option.value} control={<Radio/>} label={option.label} disabled={Boolean(option.reason)||disabled}/><Typography variant="body2" color="text.secondary">{option.reason||option.description}</Typography></Box>)}
        </RadioGroup></FormControl>
        {warning&&<Alert severity={blocker?'error':'info'}>{warning}{!taxChanged&&' Billing mode can be saved independently above. Tax-document eligibility is checked before issuing an invoice.'}</Alert>}
        <Typography variant="body2" color="text.secondary">Saved defaults apply to new invoices. Existing drafts and finalized invoices keep their appearance and document type.</Typography>
        <Button variant="outlined" disabled={disabled||Boolean(blocker)} onClick={()=>save(false)}>{busy?'Saving…':'Save Tax Configuration'}</Button></Stack></AccordionDetails></Accordion>
      </>}
    </Stack></Paper></Box>;
}
