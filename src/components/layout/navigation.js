import {hasPermission} from '../../utils/permissions';
import {permissionForPath} from '../../utils/accessRoutes';
import Dashboard from '@mui/icons-material/DashboardOutlined';
import Receipt from '@mui/icons-material/ReceiptLongOutlined';
import Purchase from '@mui/icons-material/ShoppingCartOutlined';
import Payment from '@mui/icons-material/PaymentsOutlined';
import Returns from '@mui/icons-material/AssignmentReturnOutlined';
import Inventory from '@mui/icons-material/Inventory2Outlined';
import Products from '@mui/icons-material/CategoryOutlined';
import Transfer from '@mui/icons-material/SwapHorizOutlined';
import People from '@mui/icons-material/PeopleOutlined';
import Supplier from '@mui/icons-material/LocalShippingOutlined';
import Accounts from '@mui/icons-material/AccountBalanceOutlined';
import Store from '@mui/icons-material/StorefrontOutlined';
import Bonus from '@mui/icons-material/WorkspacePremiumOutlined';
import Enquiry from '@mui/icons-material/QuestionAnswerOutlined';
import Collection from '@mui/icons-material/GridViewOutlined';
import Launch from '@mui/icons-material/OpenInNewOutlined';
import Cart from '@mui/icons-material/ShoppingCartOutlined';
import AccountBalanceWallet from '@mui/icons-material/AccountBalanceWalletOutlined';

const staff = ['admin', 'salesperson'];
const item = (label, path, icon, roles, aliases = []) => ({ label, path, icon, roles, aliases });
export const navigation = [
  { label: 'Dealer portal', items: [item('Dashboard', '/dealer/dashboard', Dashboard, ['dealer']),item('Dealer Products', '/dealer/products', Products, ['dealer']),item('My Cart', '/dealer/cart', Cart, ['dealer']),item('Place Order', '/dealer/checkout', Cart, ['dealer']),item('My Orders', '/dealer/orders', Receipt, ['dealer']),item('Quotations', '/dealer/quotations', Receipt, ['dealer']),item('My Invoices', '/dealer/invoices', Receipt, ['dealer']),item('Payments', '/dealer/my-payments', Payment, ['dealer']),item('Outstanding Ledger', '/dealer/ledger', AccountBalanceWallet, ['dealer']),item('My Profile', '/dealer/profile', People, ['dealer']),item('Dealer Orders', '/dealer/orders/manage', Receipt, ['admin']),item('Dealer Payments', '/dealer/payments', Payment, ['admin']),item('Dealer Reports', '/dealer/reports', Accounts, ['admin'])] },
  { label: 'Main', items: [item('Dashboard', '/dashboard', Dashboard, staff)] },
  { label: 'Billing & transactions', items: [
    item('Sales & billing', '/billing', Receipt, staff, ['/sales/']),
    item('Purchases', '/purchases', Purchase, staff),
    item('Payments', '/payments', Payment, staff),
    item('Sales Return', '/returns/sales/new', Returns, staff, ['/returns/sales/']),
    item('Purchase Return', '/returns/purchase/new', Returns, staff, ['/returns/purchase/']),
    {...item('Sales & purchase returns', '/returns', Returns, staff),exact:true},
  ] },
  { label: 'Inventory', items: [
    item('Inventory & adjustments', '/inventory', Inventory, staff),
    item('Products & units', '/products', Products, ['admin']),
    item('Stock transfers', '/transfers', Transfer, staff),
  ] },
  { label: 'Parties & accounts', items: [
    item('Customers & ledgers', '/customers', People, staff),
    item('Suppliers & ledgers', '/suppliers', Supplier, staff),
    item('Accounting & outstanding', '/financial-reports', Accounts, staff),
  ] },
  { label: 'Business management', items: [
    item('Manage Users', '/users', People, ['admin']),
    item('Stores', '/stores', Store, ['admin']),
    item('Sales Bonus', '/sales-bonus', Bonus, ['admin', 'salesperson', 'tile mistire']),
    item('Commission management', '/sales-bonus-management', Bonus, ['admin']),
  ] },
  { label: 'Settings', items: [item('Invoice Settings', '/settings/invoices', Receipt, staff)] },
  { label: 'Other features', items: [
    item('Customer enquiries', '/enquiry-management', Enquiry, staff),
    item('Enquiry', '/enquiry', Enquiry, ['admin']),
    item('New Collections', '/', Collection),
    item('Online Store', 'https://mybillbook.in/store/johnson_tiles_mahua', Launch),
  ] },
];
export const isActiveItem = (item, pathname) => pathname === item.path ||
  (!item.exact && item.path !== '/' && pathname.startsWith(`${item.path}/`)) ||
  item.aliases.some((alias) => pathname.startsWith(alias));
export const navigationForRole = (role,permissions) => navigation.map((group) => ({ ...group,
  items: group.items.filter((entry) => {const key=permissionForPath(entry.path);return key&&permissions?hasPermission({userType:role,permissions},key):!entry.roles||entry.roles.includes(role);}),
})).filter((group) => group.items.length);
export const pageTitle = (pathname) => navigation.flatMap((group) => group.items)
  .find((entry) => isActiveItem(entry, pathname))?.label || ({ '/contact': 'Contact Us', '/auth': 'Account' }[pathname]) || 'Tiles Wala';
