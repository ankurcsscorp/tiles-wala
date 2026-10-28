import React from 'react';
import { render, screen, within } from '@testing-library/react';
import Dashboard from './Dashboard';
import api from '../../api';

jest.mock('../../api', () => ({ get: jest.fn() }));
jest.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { userType: 'Admin' } }) }));
jest.mock('../../context/StoreContext', () => ({ useStores: () => ({ stores: [], loading: false }) }));

test.each([
  [['salesperson', 'invoice_count', 'net_sales'], { salesperson: 'Ankur', invoice_count: 1, net_sales: '1.000' }, ['Ankur', '1', '₹1']],
  [['product_name', 'quantity_on_hand', 'reorder_threshold'], { product_name: 'Tile', quantity_on_hand: '1.0000', reorder_threshold: '1.2500' }, ['Tile', '1', '1.25']],
  [['product_name', 'quantity', 'indicative_value'], { product_name: 'Tile', quantity: '0.0001', indicative_value: '1.5000' }, ['Tile', '0.0001', '₹1.5']],
])('report columns %j show compact numbers and preserve text', async (columns, row, expected) => {
  api.get.mockImplementation(url => Promise.resolve({ data: url.endsWith('/reports')
    ? { columns, items: [row], pagination: { total: 1 } }
    : { summary: {}, inventory: {}, salesByStore: [] } }));
  render(<Dashboard />);
  const table = within(await screen.findByRole('table'));
  for (const value of expected) expect(table.getByText(value)).toBeInTheDocument();
  expect(table.queryByText(/NaN/)).not.toBeInTheDocument();
});
