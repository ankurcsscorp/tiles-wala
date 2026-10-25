import React from 'react';
import { Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

// A real link keeps record navigation available to keyboard and new-tab users.
export default function RecordLink({ to, children }) {
  return <Link component={RouterLink} to={to} underline="hover" fontWeight={600} onClick={(event) => event.stopPropagation()}>{children}</Link>;
}
