import React from 'react';
import { IconButton, InputAdornment } from '@mui/material';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import TextField from './TextField';
import { compactDecimal } from '../../utils/numberFormat';

// Whole-unit controls are independent of the precision allowed for typed quantities.
export default function QuantityField({ value, onChange, slotProps = {}, onKeyDown, disabled, ...props }) {
  const limits = slotProps.htmlInput || {};
  const changeBy = direction => {
    const match = String(value || '0').match(/^(\d+)(?:\.(\d+))?$/);
    if (!match) return;
    const fraction = match[2] || '';
    const scale = 10n ** window.BigInt(fraction.length);
    const next = window.BigInt(match[1] + fraction) + window.BigInt(direction) * scale;
    if (next < 0n) return;
    const digits = String(next).padStart(fraction.length + 1, '0');
    let nextValue = compactDecimal(fraction.length ? `${digits.slice(0, -fraction.length)}.${digits.slice(-fraction.length)}` : digits);
    if (Number(nextValue) < Number(limits.min ?? 0)) return;
    if (limits.max != null && Number(nextValue) > Number(limits.max)) nextValue = compactDecimal(limits.max);
    onChange?.({ target: { value: nextValue }, currentTarget: { value: nextValue } });
  };
  return <TextField {...props} type="number" value={value} disabled={disabled} onChange={onChange}
    onKeyDown={event => {
      onKeyDown?.(event);
      if (!disabled && !event.defaultPrevented && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
        event.preventDefault(); changeBy(event.key === 'ArrowUp' ? 1 : -1);
      }
    }}
    sx={[{ '& input::-webkit-inner-spin-button, & input::-webkit-outer-spin-button': { WebkitAppearance: 'none', margin: 0 }, '& input[type=number]': { MozAppearance: 'textfield' } }, ...(Array.isArray(props.sx) ? props.sx : [props.sx || {}])]}
    slotProps={{ ...slotProps, htmlInput: { ...limits, step: 'any' }, input: {
      ...slotProps.input,
      endAdornment: <InputAdornment position="end" sx={{ flexDirection: 'column', height: 'auto', maxHeight: 'none', ml: 0 }}>
        <IconButton size="small" disabled={disabled} aria-label={`Increase ${props.label || 'quantity'}`} onMouseDown={event => event.preventDefault()} onClick={() => changeBy(1)} sx={{ p: 0 }}><ArrowDropUpIcon fontSize="small" /></IconButton>
        <IconButton size="small" disabled={disabled} aria-label={`Decrease ${props.label || 'quantity'}`} onMouseDown={event => event.preventDefault()} onClick={() => changeBy(-1)} sx={{ p: 0 }}><ArrowDropDownIcon fontSize="small" /></IconButton>
      </InputAdornment>,
    } }} />;
}
