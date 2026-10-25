import React, { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import api from '../../api';
import { gstValidationError, normalizeGSTIN } from '../../utils/gstValidator';

export default function GSTLookupField({ value = '', onChange, onLookupSuccess, onLookupError, disabled = false, existingFormContext = {} }) {
  const [loading, setLoading] = useState(false), [error, setError] = useState(''), [preview, setPreview] = useState(null), [success, setSuccess] = useState(false);
  const generation = useRef(0), pending = useRef(null), latestValue = useRef(value);
  latestValue.current = value;
  useEffect(() => {
    generation.current++; pending.current?.abort(); pending.current = null;
    setLoading(false); setPreview(null); setSuccess(false); setError('');
    const generationRef = generation, pendingRef = pending;
    return () => { generationRef.current++; pendingRef.current?.abort(); pendingRef.current = null; };
  }, [value]);
  const validation = value ? gstValidationError(value) : '';
  const lookup = async () => {
    if (pending.current || disabled || !value || validation) return;
    const controller = new AbortController(); pending.current = controller;
    const sequence = ++generation.current, gstin = normalizeGSTIN(value);
    setLoading(true); setError(''); setSuccess(false);
    try {
      const response = await api.get(`http://localhost:4000/api/gst/lookup/${encodeURIComponent(gstin)}`, { signal: controller.signal, timeout: 22000 });
      if (sequence !== generation.current || normalizeGSTIN(latestValue.current) !== gstin) return;
      if (!response.data.success || response.data.data?.gstin !== gstin || !response.data.lookupToken) throw new Error('GST service returned an invalid response.');
      setPreview(response.data);
    } catch (failure) {
      if (sequence !== generation.current || controller.signal.aborted) return;
      const message = failure.response?.data?.message || (failure.code === 'ECONNABORTED' ? 'GST lookup timed out. Please try again.' : 'Unable to reach the GST service. Please try again.');
      setError(message); onLookupError?.(message);
    } finally { if (sequence === generation.current) { setLoading(false); pending.current = null; } }
  };
  const data = preview?.data;
  const inactive = data && data.registrationStatus?.toLowerCase() !== 'active';
  return <Box>
    <Stack useFlexGap direction={{ xs: 'column', sm: 'row' }} gap={1} alignItems={{ sm: 'flex-start' }}>
      <TextField fullWidth label="GSTIN" value={value} disabled={disabled} onChange={(event) => {
        generation.current++; pending.current?.abort(); pending.current = null; setLoading(false); setPreview(null); setError(''); setSuccess(false);
        onChange(normalizeGSTIN(event.target.value));
      }} error={Boolean(validation)} helperText={validation || 'Optional for unregistered parties. Local validation does not confirm registration.'} slotProps={{htmlInput:{ maxLength: 15, autoCapitalize: 'characters', spellCheck: false }}} />
      <Button variant="outlined" type="button" disabled={disabled || loading || !value || Boolean(validation)} onClick={lookup} sx={{ minWidth: 170, minHeight: 40 }} startIcon={loading ? <CircularProgress size={16} /> : undefined}>{loading ? 'Fetching…' : 'Fetch GST Details'}</Button>
    </Stack>
    {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
    {success && <Alert severity="success" sx={{ mt: 1 }}>GST details fetched successfully. Please verify the information before saving.</Alert>}
    {existingFormContext.clearGstVerification && <Alert severity="info" sx={{ mt: 1 }}>GST verification is stale or cleared. Existing business details remain editable; fetch again to verify this GSTIN.</Alert>}
    {existingFormContext.gstVerifiedAt && <Typography variant="caption" component="p" sx={{ mt: 1 }}>Last fetched: {new Date(existingFormContext.gstVerifiedAt).toLocaleString()} · {existingFormContext.gstDataSource} · Registration status may have changed.</Typography>}
    {existingFormContext.gstDataSource === 'finagg-sandbox' && <Alert severity="warning" sx={{ mt: 1 }}>Sandbox lookup. These details do not establish a production GST registration.</Alert>}
    <Dialog open={Boolean(data)} onClose={() => setPreview(null)} fullWidth maxWidth="sm"><DialogTitle>Review GST business details</DialogTitle><DialogContent>
      <Stack useFlexGap spacing={1.5} sx={{ pt: 1 }}>
        <Alert severity="info">Apply replaces the available business name and address fields. Contact details, payment terms and balances stay as entered. Review any manual edits before applying.</Alert>
        {data?.source === 'finagg-sandbox' && <Alert severity="warning">Sandbox data; this is not a production verification.</Alert>}
        {inactive && <Alert severity="warning">GST registration status: {data.registrationStatus || 'Unknown'}. You can still review and save this party.</Alert>}
        {data && [['GSTIN', data.gstin], ['Legal name', data.legalName], ['Trade name', data.tradeName], ['GST status', data.registrationStatus || 'Unknown'], ['Taxpayer type', data.taxpayerType], ['Business constitution', data.constitutionOfBusiness], ['Registration date', data.registrationDate], ['Registered address', [data.address?.addressLine1, data.address?.addressLine2, data.address?.city, data.address?.district, data.address?.state, data.address?.pincode].filter(Boolean).join(', ')]].map(([label, content]) => <Box key={label}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography sx={{ overflowWrap: 'anywhere' }}>{content || 'Not available'}</Typography></Box>)}
      </Stack>
    </DialogContent><DialogActions><Button onClick={() => setPreview(null)}>Keep current details</Button><Button variant="contained" disabled={disabled} onClick={() => { onLookupSuccess?.(data, preview.lookupToken); setPreview(null); setSuccess(true); }}>Apply GST details</Button></DialogActions></Dialog>
  </Box>;
}
