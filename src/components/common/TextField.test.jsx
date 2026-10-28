import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import TextField from './TextField';

test('numeric fields trim loaded padding, preserve editing, and compact on blur', () => {
  const changed = jest.fn();
  function Form() {
    const [value, setValue] = useState('1.0000');
    return <TextField label="Quantity" type="number" value={value} onChange={event => {
      changed(event.target.value); setValue(event.target.value);
    }} />;
  }
  render(<Form />);
  const input = screen.getByLabelText('Quantity');
  expect(input.value).toBe('1');
  fireEvent.focus(input);
  expect(input.value).toBe('1');
  fireEvent.change(input, { target: { value: '1.2500' } });
  expect(input.value).toBe('1.2500');
  expect(changed).toHaveBeenLastCalledWith('1.2500');
  fireEvent.blur(input);
  expect(input.value).toBe('1.25');
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: '' } });
  fireEvent.blur(input);
  expect(input.value).toBe('');
});

test('text identifiers are preserved and external numeric updates display immediately', () => {
  const { rerender } = render(<TextField label="Code" value="001.000" onChange={() => {}} />);
  expect(screen.getByLabelText('Code').value).toBe('001.000');
  rerender(<TextField label="Rate" type="number" value="1.000" onChange={() => {}} />);
  fireEvent.focus(screen.getByLabelText('Rate'));
  rerender(<TextField label="Rate" type="number" value="2.500" onChange={() => {}} />);
  expect(screen.getByLabelText('Rate').value).toBe('2.5');
});
