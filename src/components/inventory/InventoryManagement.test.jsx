import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import InventoryManagement from './InventoryManagement';
import api from '../../api';

jest.mock('../../api', () => ({ get: jest.fn() }));
jest.mock('../../context/StoreContext', () => ({ useStores: () => ({ stores: [], selectedStoreId: '', selectStore: jest.fn() }) }));

test('inventory search can include out-of-stock products without changing the search text', async () => {
  api.get.mockImplementation(url => Promise.resolve({ data: url.includes('/summary') ? {} : { items: url.includes('includeZero=true') ? [{ store_id: 1, product_id: 2, product_name: 'Costa Tile', sku: 'COSTA-1', quantity_on_hand: '0', available_quantity: '0' }] : [] } }));
  render(<InventoryManagement />);
  fireEvent.change(screen.getByRole('textbox', { name: 'Search products' }), { target: { value: 'costa' } });
  await waitFor(() => expect(api.get).toHaveBeenCalledWith('http://localhost:4000/api/tiles/inventory?search=costa'));
  fireEvent.click(screen.getByRole('checkbox', { name: 'Show out-of-stock products' }));
  expect(await screen.findByText('Costa Tile')).toBeInTheDocument();
  expect(screen.getByText('Out of stock')).toBeInTheDocument();
  expect(api.get).toHaveBeenCalledWith('http://localhost:4000/api/tiles/inventory?search=costa&includeZero=true');
  expect(screen.getByRole('textbox', { name: 'Search products' })).toHaveValue('costa');
});
