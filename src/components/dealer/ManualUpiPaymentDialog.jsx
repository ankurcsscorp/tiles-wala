import React, { useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import { formatINR } from '../../utils/dealerPricing';

export default function ManualUpiPaymentDialog({
  order, attempt, qrImage, tab, onTab, amount, onAmount, form, onForm,
  screenshot, onScreenshot, claimOpen, onClaimOpen, claimSubmitted,
  busy, onStart, onSubmitClaim, onClose,
}) {
  const [copyMessage, setCopyMessage] = useState('');
  const copy = async (value, label) => {
    try {
      await navigator.clipboard.writeText(String(value));
      setCopyMessage(`${label} copied.`);
    } catch {
      setCopyMessage('Clipboard access is unavailable. You can select and copy the payment details above.');
    }
  };
  return <Dialog open={Boolean(order)} onClose={() => !busy && onClose()} fullWidth maxWidth="sm">
    <DialogTitle>Pay for Dealer Order · {order?.order_number}</DialogTitle>
    <DialogContent dividers>
      <Stack spacing={1.5}>
        <Typography>Order total: <b>{formatINR(order?.accepted_total ?? order?.grand_total)}</b> · Already paid: <b>{formatINR(order?.paid_amount || 0)}</b></Typography>
        <Typography>Outstanding: <b>{formatINR(order?.remaining_amount ?? order?.grand_total)}</b></Typography>
        {order?.partial_payments_enabled && <TextField type="number" label="Payment amount (₹)" value={amount} disabled={Boolean(attempt)} onChange={e => onAmount(e.target.value)} inputProps={{ min: 0.01, max: order?.remaining_amount, step: 0.01 }} helperText="Partial payments are enabled for this store." />}
        {!attempt && <Button fullWidth variant="contained" disabled={Boolean(busy)} onClick={onStart}>{busy ? 'Preparing payment…' : 'Continue to UPI payment'}</Button>}
        {attempt && <>
          <Tabs value={tab} onChange={(_, value) => onTab(value)} variant="fullWidth"><Tab label="Scan QR Code"/><Tab label="Pay via UPI App"/></Tabs>
          {tab === 0 ? <Stack alignItems="center" spacing={1}>
            <Typography>Scan with a compatible UPI app and pay exactly {formatINR(attempt.amount)}.</Typography>
            {qrImage && <Box component="img" src={qrImage} alt="UPI payment QR code" sx={{ width: { xs: 240, sm: 300 }, height: 'auto', maxWidth: '100%' }} />}
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
              <Button component="a" href={qrImage} download={`${order?.order_number}-upi-qr.png`} disabled={!qrImage}>Download QR</Button>
              <Button onClick={() => navigator.clipboard?.writeText(attempt.upiId)}>Copy UPI ID</Button>
            </Stack>
            <Typography variant="body2">{attempt.upiId} · Payee: {attempt.payeeName}</Typography>
          </Stack> : <Stack spacing={1.5}>
            <Alert severity="info">Open the UPI app you prefer on your device. This page will not launch an app automatically.</Alert>
            <Typography>In your chosen app, select payment by UPI ID and enter these details:</Typography>
            <Typography>UPI ID: <b>{attempt.upiId}</b></Typography>
            <Typography>Payee: <b>{attempt.payeeName}</b></Typography>
            <Typography>Exact amount: <b>{formatINR(attempt.amount)}</b></Typography>
            <Typography>Order reference: <b>{order?.order_number}</b></Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
              <Button fullWidth variant="contained" onClick={() => copy(attempt.upiId, 'UPI ID')}>Copy UPI ID</Button>
              <Button fullWidth onClick={() => copy(attempt.amount, 'Amount')}>Copy Amount</Button>
            </Stack>
            {copyMessage && <Typography variant="caption" role="status">{copyMessage}</Typography>}
            <Typography variant="body2">Check the payee and amount in your app before authorizing. You can also use the Scan QR Code tab.</Typography>
          </Stack>}
          {claimSubmitted ? <Alert severity="info">Payment details submitted. Waiting for Admin verification. Do not pay again while this claim is pending.</Alert> : <>
            {!claimOpen ? <Button fullWidth variant="outlined" onClick={onClaimOpen}>I Have Paid</Button> : <>
              <Typography variant="subtitle1" fontWeight={700}>Submit payment details for Admin verification</Typography>
              <TextField fullWidth label="Amount paid (₹)" type="number" value={amount} disabled inputProps={{ min: 0.01, max: order?.remaining_amount, step: 0.01 }} />
              <TextField fullWidth label="UPI Transaction ID / UTR / RRN" value={form.utr} onChange={e => onForm({ ...form, utr: e.target.value })} inputProps={{ maxLength: 80 }} />
              <TextField fullWidth type="datetime-local" label="Payment date and time" slotProps={{ inputLabel: { shrink: true } }} value={form.paidAt} onChange={e => onForm({ ...form, paidAt: e.target.value })} />
              <Button component="label" variant="outlined">{screenshot?.name || 'Attach optional payment screenshot'}<input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={e => onScreenshot(e.target.files?.[0] || null)} /></Button>
              <Typography variant="caption">A UTR or screenshot is a payment claim, not proof of receipt. Admin must verify the bank credit.</Typography>
              <Button variant="contained" disabled={Boolean(busy) || form.utr.trim().length < 6} onClick={onSubmitClaim}>{busy ? 'Submitting…' : 'Submit for verification'}</Button>
            </>}
          </>}
        </>}
      </Stack>
    </DialogContent>
    <DialogActions><Button onClick={onClose} disabled={Boolean(busy)}>Close</Button></DialogActions>
  </Dialog>;
}
