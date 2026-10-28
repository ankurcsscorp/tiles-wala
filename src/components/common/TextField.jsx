import React, { forwardRef, useEffect, useRef, useState } from 'react';
import { TextField as MuiTextField } from '@mui/material';
import { compactDecimal } from '../../utils/numberFormat';

// Keep the user's in-progress decimal untouched while editing numeric fields.
const TextField = forwardRef(function TextField({ type, value, onFocus, onChange, onBlur, ...props }, ref) {
  const [draft, setDraft] = useState(null);
  const lastValue = useRef(value);
  useEffect(() => {
    if (String(value) !== String(lastValue.current)) setDraft(null);
    lastValue.current = value;
  }, [value]);
  const numeric = type === 'number' && value !== undefined;
  return <MuiTextField {...props} ref={ref} type={type}
    value={numeric ? draft ?? compactDecimal(value) ?? '' : value}
    onFocus={event => {
      if (numeric) setDraft(compactDecimal(value) ?? '');
      onFocus?.(event);
    }}
    onChange={event => {
      if (numeric) { lastValue.current = event.target.value; setDraft(event.target.value); }
      onChange?.(event);
    }}
    onBlur={event => { setDraft(null); onBlur?.(event); }} />;
});

export default TextField;
