import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RecordLink from './RecordLink';

test('record links are focusable and open the detail route using Enter', () => {
  const rowClick = jest.fn();
  render(<MemoryRouter initialEntries={['/customers']}><Routes>
    <Route path="/customers" element={<div onClick={rowClick}><RecordLink to="/customers/7">Test customer</RecordLink></div>} />
    <Route path="/customers/7" element={<h1>Customer details</h1>} />
  </Routes></MemoryRouter>);
  const link = screen.getByRole('link', { name: 'Test customer' });
  expect(link).toHaveAttribute('href', '/customers/7');
  userEvent.tab(); expect(link).toHaveFocus();
  userEvent.keyboard('{Enter}');
  expect(screen.getByRole('heading', { name: 'Customer details' })).toBeInTheDocument();
  expect(rowClick).not.toHaveBeenCalled();
});

test('clicking a record link does not trigger its parent row action', () => {
  const rowClick = jest.fn();
  render(<MemoryRouter><div onClick={rowClick}><RecordLink to="/transfers/9">TRF-9</RecordLink></div></MemoryRouter>);
  fireEvent.click(screen.getByRole('link', { name: 'TRF-9' }));
  expect(rowClick).not.toHaveBeenCalled();
});
