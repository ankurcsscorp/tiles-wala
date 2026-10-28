import React from 'react';
import { Chip } from '@mui/material';
import './PaymentStatusBadge.css';

const states = {
  unpaid: 'Unpaid',
  partially_paid: 'Partially paid',
  paid: 'Paid',
  unposted: 'Not posted',
};

export default function PaymentStatusBadge({ status }) {
  const known = Object.prototype.hasOwnProperty.call(states, status);
  const label = known ? states[status] : 'Unavailable';
  return <Chip className={`payment-status-badge payment-status-badge--${known ? status : 'unknown'}`}
    size="small" variant="outlined" label={label} aria-label={`Payment status: ${label}`}
    icon={<span className="payment-status-dot" aria-hidden="true" />} />;
}
