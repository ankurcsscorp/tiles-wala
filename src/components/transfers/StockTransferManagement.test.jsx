import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import StockTransferManagement from './StockTransferManagement';
import api from '../../api';

jest.mock('../../api', () => ({ get: jest.fn(), post: jest.fn() }));
jest.mock('../../context/StoreContext', () => ({ useStores: () => ({ selectedStoreId: '1', stores: [{ id: 1, name: 'Source' }, { id: 2, name: 'Destination' }] }) }));

test('receipt quantity fields keep their limits and send edited values through the existing workflow', async () => {
  const transfer = { id: 7, transfer_number: 'TRF-7', status: 'dispatched', transfer_date: '2026-10-23', from_store_id: 1, to_store_id: 2, from_store_name: 'Source', to_store_name: 'Destination', items: [{ id: 9, product_id: 1, product_name: 'Floor tile', unit_name: 'Box', requested_quantity: '10', dispatched_quantity: '10' }] };
  api.get.mockResolvedValue({ data: transfer });
  api.post.mockResolvedValue({ data: { ...transfer, status: 'received' } });
  render(<MemoryRouter initialEntries={['/transfers/7']}><Routes><Route path="/transfers/:id" element={<StockTransferManagement />} /></Routes></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: 'Receive stock' }));
  const dialog = within(screen.getByRole('dialog'));
  const accepted = dialog.getByRole('spinbutton', { name: 'Accepted' });
  expect(accepted).toHaveAttribute('max', '10');
  expect(accepted).toHaveAttribute('step', '0.0001');
  fireEvent.change(accepted, { target: { value: '8' } });
  fireEvent.change(dialog.getByRole('spinbutton', { name: 'Damaged' }), { target: { value: '1' } });
  fireEvent.change(dialog.getByRole('spinbutton', { name: 'Shortage' }), { target: { value: '1' } });
  fireEvent.change(dialog.getByRole('textbox', { name: 'Reason' }), { target: { value: 'One damaged box and one missing box' } });
  fireEvent.click(dialog.getByRole('button', { name: 'Confirm receipt' }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('http://localhost:4000/api/tiles/transfers/7/receive', expect.objectContaining({ items: [{ transferItemId: '9', receivedQuantity: '8', damagedQuantity: '1', shortageQuantity: '1', discrepancyReason: 'One damaged box and one missing box' }] })));
});
