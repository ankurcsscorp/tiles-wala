import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import useMediaQuery from '@mui/material/useMediaQuery';
import BusinessShell from './BusinessShell';
import { useAuth } from '../../context/AuthContext';
import { useStores } from '../../context/StoreContext';

jest.mock('@mui/material/useMediaQuery', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../context/StoreContext', () => ({ useStores: jest.fn() }));
const logout = jest.fn(), selectStore = jest.fn();
const Location = () => <div data-testid="location">{useLocation().pathname}</div>;
const renderShell = (role = 'admin', path = '/sales/42', mobile = false) => {
  useMediaQuery.mockImplementation((query) => query === '(min-width:1200px)' ? !mobile : mobile === true);
  useAuth.mockReturnValue({ user: { userType: role, name: 'Shop Owner' }, logout });
  useStores.mockReturnValue({ stores: [{ id: 1, name: 'Mahua' }, { id: 2, name: 'Patna' }], selectedStoreId: '1', selectStore });
  return render(<MemoryRouter initialEntries={[path]}><BusinessShell><Location /></BusinessShell></MemoryRouter>);
};
beforeEach(() => jest.clearAllMocks());

test('custom permissions show granted modules and hide denied ones regardless of base account type',()=>{
 useMediaQuery.mockImplementation(query=>query==='(min-width:1200px)');
 useAuth.mockReturnValue({user:{name:'Custom user',userType:'Tile Mistire',permissions:{'sales.view':true,'purchases.view':false}},logout});
 useStores.mockReturnValue({stores:[],selectedStoreId:'',selectStore});
 render(<MemoryRouter><BusinessShell>Content</BusinessShell></MemoryRouter>);
 expect(screen.getByRole('link',{name:'Sales & billing'})).toBeInTheDocument();expect(screen.queryByRole('link',{name:'Purchases'})).not.toBeInTheDocument();expect(screen.queryByRole('link',{name:'Manage Users'})).not.toBeInTheDocument();
});

test('direct invoice routes select billing and expanding the sidebar preserves the route', () => {
  renderShell();
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sales & billing');
  expect(screen.getByRole('link', { name: 'Sales & billing' })).toHaveAttribute('aria-current', 'page');
  fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
  expect(screen.getByRole('button', { name: 'Expand sidebar' })).toHaveAttribute('aria-expanded', 'false');
  expect(screen.getByRole('link', { name: 'Sales & billing' })).toHaveAttribute('href', '/billing');
  expect(screen.getByTestId('location')).toHaveTextContent('/sales/42');
});

test('salespeople see transaction links while admin-only modules stay hidden', () => {
  renderShell('salesperson');
  expect(screen.getByRole('link', { name: 'Purchases' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Customer enquiries' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Stores' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Products & units' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Commission management' })).not.toBeInTheDocument();
});

test('non-staff roles do not see protected billing modules', () => {
  renderShell('tile mistire', '/sales-bonus');
  expect(screen.getByRole('link', { name: 'Sales Bonus' })).toHaveAttribute('aria-current', 'page');
  expect(screen.queryByRole('link', { name: 'Sales & billing' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Customers & ledgers' })).not.toBeInTheDocument();
});

test('dealers receive catalog and cart navigation without staff or admin links',()=>{
 renderShell('dealer','/dealer/products');
 expect(screen.getByRole('link',{name:'Dealer Products'})).toHaveAttribute('aria-current','page');
 expect(screen.getByRole('link',{name:'My Cart'})).toBeInTheDocument();
 expect(screen.getByRole('link',{name:'Dashboard'})).toHaveAttribute('href','/dealer/dashboard');
 expect(screen.getByRole('link',{name:'Outstanding Ledger'})).toBeInTheDocument();
 expect(screen.queryByRole('link',{name:'Dealer Reports'})).not.toBeInTheDocument();
 expect(screen.queryByRole('link',{name:'Sales & billing'})).not.toBeInTheDocument();
 expect(screen.queryByRole('link',{name:'Products & units'})).not.toBeInTheDocument();
});

test('store changes use the shared selection handler and only supplied stores are shown', () => {
  renderShell();
  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Active store' }));
  const options = within(screen.getByRole('listbox'));
  expect(options.getAllByRole('option')).toHaveLength(2);
  fireEvent.click(options.getByRole('option', { name: 'Patna' }));
  expect(selectStore).toHaveBeenCalledWith('2');
});

test('mobile drawer opens and closes after navigation', async () => {
  renderShell('admin', '/dashboard', true);
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
  expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  fireEvent.click(screen.getByRole('link', { name: 'Sales & billing' }));
  await waitFor(() => expect(screen.queryByRole('navigation')).not.toBeInTheDocument());
  expect(screen.getByTestId('location')).toHaveTextContent('/billing');
});

test('navigating to a child reopens its collapsed group', async () => {
  renderShell('admin', '/dashboard');
  const group = screen.getByRole('button', { name: 'Billing & transactions' });
  fireEvent.click(group);
  await waitFor(() => expect(screen.queryByRole('link', { name: 'Sales & billing' })).not.toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
  fireEvent.click(await screen.findByRole('link', { name: 'Sales & billing' }));
  fireEvent.click(screen.getByRole('button', { name: 'Expand sidebar' }));
  expect(screen.getByRole('button', { name: 'Billing & transactions' })).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('link', { name: 'Sales & billing' })).toHaveAttribute('aria-current', 'page');
});

test('account menu signs out through the existing auth context', () => {
  renderShell();
  fireEvent.click(screen.getByRole('button', { name: 'Open account menu' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Sign Out' }));
  expect(logout).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('location')).toHaveTextContent('/');
});


test('tablet rail can open a full drawer and Escape closes it', async () => {
  renderShell('admin', '/purchases/7', 'tablet');
  expect(screen.getByRole('link', { name: 'Purchases' })).toHaveAttribute('aria-current', 'page');
  fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
  const close = screen.getByRole('button', { name: 'Close navigation' });
  fireEvent.keyDown(close, { key: 'Escape', code: 'Escape' });
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Close navigation' })).not.toBeInTheDocument());
  expect(screen.getByTestId('location')).toHaveTextContent('/purchases/7');
});
