import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import QuantityField from './QuantityField';

function Form({ initial = '1.0000', max }) {
  const [quantity, setQuantity] = useState(initial);
  return <QuantityField label="Quantity" value={quantity} onChange={event => setQuantity(event.target.value)}
    slotProps={{ htmlInput: { min: '0.0001', max } }} />;
}

test('quantity arrows increment whole units and remove decimal padding', () => {
  render(<Form />);
  const input = screen.getByLabelText('Quantity');
  expect(input.value).toBe('1');
  fireEvent.click(screen.getByRole('button', { name: 'Increase Quantity' }));
  expect(input.value).toBe('2');
  fireEvent.focus(input);
  fireEvent.keyDown(input, { key: 'ArrowUp' });
  expect(input.value).toBe('3');
  fireEvent.keyDown(input, { key: 'ArrowDown' });
  expect(input.value).toBe('2');
});

test('typed fractional quantities remain valid and step by one without precision loss', () => {
  render(<Form initial="1.2500" />);
  const input = screen.getByLabelText('Quantity');
  expect(input.validity.stepMismatch).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'Increase Quantity' }));
  expect(input.value).toBe('2.25');
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: '0.0001' } });
  expect(input.validity.valid).toBe(true);
  fireEvent.keyDown(input, { key: 'ArrowUp' });
  expect(input.value).toBe('1.0001');
});

test('quantity controls respect bounds and start empty quantities at one', () => {
  render(<Form initial="" max="1.5" />);
  const input = screen.getByLabelText('Quantity');
  fireEvent.click(screen.getByRole('button', { name: 'Increase Quantity' }));
  expect(input.value).toBe('1');
  fireEvent.click(screen.getByRole('button', { name: 'Decrease Quantity' }));
  expect(input.value).toBe('1');
  fireEvent.click(screen.getByRole('button', { name: 'Increase Quantity' }));
  expect(input.value).toBe('1.5');
});
