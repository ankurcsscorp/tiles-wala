import React, { useEffect, useState } from 'react';
import { Accordion, AccordionSummary, AccordionDetails, Box, Button, Stack, TextField, Typography } from '@mui/material';
import ExpandMore from '@mui/icons-material/ExpandMore';
import GSTLookupField from './GSTLookupField';
import { applyGSTDetails, changeGSTIN } from './gstForm';

export default function GSTPartyFields({ form, setForm, disabled = false }) {
  const details = form.gstDetails || {};
  const [expanded,setExpanded]=useState(Boolean(form.gstVerifiedAt));
  useEffect(()=>{if(form.gstVerifiedAt)setExpanded(true);},[form.gstVerifiedAt]);
  return <Stack useFlexGap spacing={2}>
    <GSTLookupField value={form.gstin || ''} onChange={(gstin) => setForm((current) => changeGSTIN(current, gstin))} onLookupSuccess={(data, token) => setForm((current) => applyGSTDetails(current, data, token))} existingFormContext={form} disabled={disabled} />
    <Accordion expanded={expanded} onChange={(_,open)=>setExpanded(open)} disableGutters sx={{minWidth:0,"&:before":{display:"none"}}}><AccordionSummary expandIcon={<ExpandMore/>}><Typography variant="subtitle2">GST business information (optional)</Typography></AccordionSummary><AccordionDetails>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
      {[
        ['legalName', 'Legal name'], ['tradeName', 'Trade / shop name'], ['registrationStatus', 'GST registration status'], ['taxpayerType', 'Taxpayer type'],
        ['constitutionOfBusiness', 'Business constitution'], ['registrationDate', 'GST registration date'], ['district', 'District'], ['stateCode', 'GST state code'],
      ].map(([key, label]) => <TextField key={key} fullWidth disabled={disabled} label={label} value={details[key] || ''} type={key === 'registrationDate' ? 'date' : 'text'} slotProps={{inputLabel:key === 'registrationDate' ? { shrink: true } : undefined}} onChange={(event) => setForm((current) => ({ ...current, gstDetails: { ...current.gstDetails, [key]: event.target.value } }))} />)}
      <TextField fullWidth disabled={disabled} label="Business activities" helperText="Separate activities with commas" value={(details.natureOfBusiness || []).join(', ')} onChange={(event) => setForm((current) => ({ ...current, gstDetails: { ...current.gstDetails, natureOfBusiness: event.target.value.split(',') } }))} />
    </Box>
    </AccordionDetails></Accordion>
    {(form.gstLookupToken || form.gstVerifiedAt) && <Button disabled={disabled} sx={{ alignSelf: 'flex-start' }} onClick={() => setForm((current) => changeGSTIN(current, current.gstin))}>Clear lookup verification and save manually</Button>}
  </Stack>;
}
