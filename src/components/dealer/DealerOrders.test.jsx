import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import api from '../../api';
import { MemoryRouter } from 'react-router-dom';
import DealerOrders from './DealerOrders';

jest.mock('../../api', () => ({ get: jest.fn(), post: jest.fn() }));
jest.mock('qrcode', () => ({ toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,qr') }));

const order = overrides => ({
  id: '41', order_number: 'DO-41', status: 'CONFIRMED', payment_method: 'UPI',
  payment_status: 'UNPAID', grand_total: '21500.00', accepted_total: '21500.00',
  paid_amount: '0.00', remaining_amount: '21500.00', upi_payments_enabled: true, created_at: '2026-10-31T00:00:00Z',
  ...overrides,
});

beforeEach(() => { jest.clearAllMocks(); api.get.mockResolvedValue({ data: [order()] }); });

test('confirmed UPI order shows balance and opens payment summary', async () => {
  render(<MemoryRouter><DealerOrders /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: 'Pay Now' }));
  expect(screen.getAllByText(/Order total:/)).toHaveLength(2);
  expect(screen.getByText(/Already paid:/)).toBeInTheDocument();
  expect(screen.getByText(/Outstanding:/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Continue to UPI payment' })).toBeInTheDocument();
});

test('COD order shows pay at delivery without opening online payment', async () => {
  api.get.mockResolvedValue({ data: [order({ payment_method: 'CASH_ON_DELIVERY' })] });
  render(<MemoryRouter><DealerOrders /></MemoryRouter>);
  expect(await screen.findByText('Pay at Delivery')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Pay Now' })).not.toBeInTheDocument();
});

test('orderId deep link opens the selected order from Recent orders', async () => {
  api.get.mockImplementation(url => url.endsWith('/orders')
    ? Promise.resolve({ data: [order()] })
    : Promise.resolve({ data: { ...order(), items: [], quotations: [], payments: [], history: [], messages: [] } }));
  render(<MemoryRouter initialEntries={['/dealer/orders?orderId=41']}><DealerOrders /></MemoryRouter>);
  expect(await screen.findByText(/DO-41 · Order details/)).toBeInTheDocument();
  expect(api.get).toHaveBeenCalledWith(expect.stringMatching(/\/orders\/41$/));
  fireEvent.click(screen.getByRole('button', { name: 'Close order details' }));
  await waitFor(() => expect(screen.queryByText(/DO-41 · Order details/)).not.toBeInTheDocument());
});

