import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Accordion, AccordionDetails, AccordionSummary, Alert, Autocomplete, Box, Button, Card, Chip,
  CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControl,
  IconButton, InputLabel, MenuItem, Select, Stack, Step, StepLabel, Stepper, Table, TableBody, TableCell,
  TableHead, TableRow, TableSortLabel, TextField, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ContentCopy from '@mui/icons-material/ContentCopy';
import Search from '@mui/icons-material/SearchOutlined';
import Refresh from '@mui/icons-material/Refresh';
import Close from '@mui/icons-material/Close';
import api from '../../api';
import { formatINR } from '../../utils/dealerPricing';

const ROOT = 'http://localhost:4000/api/tiles/dealer-portal';
const statuses = ['PENDING_REVIEW', 'QUOTATION_SENT', 'AWAITING_DEALER_ACCEPTANCE', 'CONFIRMED', 'PROCESSING', 'READY_TO_DISPATCH', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'REJECTED', 'CANCELLED'];
const label = value => String(value || '').replaceAll('_', ' ');
const transportLabel = mode => ({SELF:'Self Pickup',TOTO:'Toto',THELA:'CNG Auto',PICKUP:'Pickup'}[mode]||'Legacy transport');
const orderStatusLabel = order => order?.status==='READY_TO_DISPATCH'&&order.transport_mode==='SELF'?'Ready for Pickup':order?.status==='DELIVERED'&&order.transport_mode==='SELF'?'Collected':label(order?.status);
const emptySummary = { new_orders: 0, pending_review: 0, awaiting_payment: 0, confirmed: 0, ready_to_dispatch: 0, shipped: 0, delivered: 0, cancelled: 0 };
const initialQuote = order => ({
  items: (order.items || []).map(item => ({
    productId: String(item.productId ?? item.product_id), unitId: String(item.unitId ?? item.unit_id),
    quantity: String(item.quantity), dealerPrice: String(item.dealerPrice ?? item.dealer_price_snapshot ?? ''),
  })),
  transportCharge: String(order.transport_charge || '0.00'),
  expectedDeliveryDate: order.expected_delivery_date ? String(order.expected_delivery_date).slice(0, 10) : '',
  remarks: '',
});

const progressStage = status => {
  if (['PENDING_REVIEW', 'QUOTATION_SENT', 'AWAITING_DEALER_ACCEPTANCE'].includes(status)) return 0;
  if (['CONFIRMED', 'PROCESSING', 'READY_TO_DISPATCH'].includes(status)) return 1;
  if (status === 'SHIPPED') return 2;
  if (['DELIVERED', 'COMPLETED'].includes(status)) return 3;
  return -1;
};

export function getPrimaryOrderAction(order) {
  if (!order) return null;
  const status = order.status;
  if (status === 'PENDING_REVIEW') return { kind: 'CONFIRM_ORDER', label: 'Confirm Order' };
  if (['QUOTATION_SENT', 'AWAITING_DEALER_ACCEPTANCE'].includes(status)) return { kind: 'WAIT', label: 'Waiting for Dealer', disabled: true, reason: `The dealer must accept quotation v${order.quotation_version}.` };
  if (status === 'CONFIRMED') return { kind: 'PREPARE_ORDER', label: 'Confirm Order & Prepare', reason: 'Stock and payment terms are checked before processing.' };
  if (status === 'PROCESSING') return { kind: 'PREPARE_DISPATCH', label: 'Prepare Dispatch' };
  if (status === 'READY_TO_DISPATCH') {
    if (!order.invoice) return { kind: 'GENERATE_INVOICE', label: 'Generate Invoice', disabled: !order.customer_id, reason: !order.customer_id ? 'Link the dealer to an active customer ledger account in More details.' : '' };
    if (order.invoice.status !== 'posted') return { kind: 'REVIEW_INVOICE', label: 'Review Invoice Draft' };
    if (order.transport_mode === 'SELF') return { kind: 'SELF_HANDOVER', label: 'Confirm Collection', reason: 'Record the dealer or authorized person collecting the order.' };
    return { kind: 'SHIP', label: 'Mark as Shipped' };
  }
  if (status === 'SHIPPED') return { kind: 'DELIVER', label: 'Mark as Delivered' };
  if (status === 'DELIVERED') {
    const paymentRequired = order.transport_mode === 'SELF' && order.payment_status !== 'PAID';
    return { kind: 'COMPLETE', label: 'Complete Order', disabled: paymentRequired, reason: paymentRequired ? 'Verify and record full payment before completing a Self Pickup order.' : '' };
  }
  if (status === 'COMPLETED' && order.invoice) return { kind: 'VIEW_INVOICE', label: 'View Invoice' };
  if (status === 'REJECTED' || status === 'CANCELLED') return { kind: 'TERMINAL', label: label(status), disabled: true };
  return null;
}

const addressString = value => {
  if (!value || typeof value !== 'object') return String(value || '—');
  const address = value.delivery || value.shipping || value.address || value;
  const keys = ['line1', 'line2', 'addressLine1', 'addressLine2', 'street', 'city', 'state', 'pinCode', 'pin_code', 'postalCode'];
  const parts = keys.map(key => address?.[key]).filter(item => typeof item === 'string' && item.trim());
  return parts.join(', ') || '—';
};

const moneyReceived = payments => (payments || []).filter(payment => payment.status === 'posted').reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

export default function AdminDealerOrders() {
  const navigate = useNavigate();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [summary, setSummary] = useState(emptySummary);
  const [orders, setOrders] = useState([]);
  const [orderDateDirection, setOrderDateDirection] = useState('desc');
  const [stores, setStores] = useState([]);
  const [filters, setFilters] = useState({ q: '', status: '', storeId: '', from: '', to: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [quote, setQuote] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shortages, setShortages] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [customerText, setCustomerText] = useState('');
  const [customerOptions, setCustomerOptions] = useState([]);
  const [customerSearchError, setCustomerSearchError] = useState('');
  const [referral, setReferral] = useState(null);
  const [referralText, setReferralText] = useState('');
  const [referralOptions, setReferralOptions] = useState([]);
  const [shipment, setShipment] = useState({ transporterName: '', vehicleNumber: '', driverName: '', driverMobile: '', dispatchDate: '', estimatedDeliveryDate: '', trackingNumber: '', deliveryRemarks: '' });
  const [shipDialog, setShipDialog] = useState(false);
  const [deliveryDialog, setDeliveryDialog] = useState(false);
  const [delivery, setDelivery] = useState({ receivedBy: '', actualDeliveryDate: new Date().toISOString().slice(0, 10), remarks: '' });
  const [messageDialog, setMessageDialog] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [partialQuantities, setPartialQuantities] = useState({});
  const [partialRemarks, setPartialRemarks] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
      const [summaryResult, ordersResult] = await Promise.all([
        api.get(`${ROOT}/admin/orders/summary`), api.get(`${ROOT}/admin/orders?${params}`),
      ]);
      setSummary({ ...emptySummary, ...summaryResult.data });
      setOrders(ordersResult.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load dealer orders.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
    api.get('http://localhost:4000/api/tiles/stores')
      .then(result => setStores(Array.isArray(result.data) ? result.data : (result.data?.items || [])))
      .catch(() => {});
  }, [load]);

  const open = async id => {
    setDetailLoading(true);
    setError('');
    setMoreOpen(false);
    try {
      const result = await api.get(`${ROOT}/admin/orders/${id}`);
      const order = result.data;
      setDetail(order);
      setQuote(initialQuote(order));
      setShortages([]);
      setPartialQuantities(Object.fromEntries((order.invoiceItems || []).map(item => [String(item.id), ''])));
      setPartialRemarks('');
      const linkedCustomer = order.customer_id ? { id: String(order.customer_id), name: order.customer_name || `Linked customer #${order.customer_id}` } : null;
      setCustomer(linkedCustomer);
      setCustomerText(linkedCustomer?.name || '');
      setCustomerOptions(linkedCustomer ? [linkedCustomer] : []);
      setCustomerSearchError('');
      const linkedReferral = order.referred_by_user_id ? { id: String(order.referred_by_user_id), name: order.referred_by_name || '', userType: order.referred_by_user_type || '' } : null;
      setReferral(linkedReferral);
      setReferralText(linkedReferral ? `${linkedReferral.name}${linkedReferral.userType ? ` · ${linkedReferral.userType}` : ''}` : '');
      setReferralOptions(linkedReferral ? [linkedReferral] : []);
      setShipment({
        transporterName: order.shipment?.transporter_name || '', vehicleNumber: order.shipment?.vehicle_number || '',
        driverName: order.shipment?.driver_name || '', driverMobile: order.shipment?.driver_mobile || '',
        dispatchDate: order.shipment?.dispatch_date ? String(order.shipment.dispatch_date).slice(0, 10) : '',
        estimatedDeliveryDate: order.shipment?.estimated_delivery_date ? String(order.shipment.estimated_delivery_date).slice(0, 10) : '',
        trackingNumber: order.shipment?.tracking_number || '', deliveryRemarks: order.shipment?.delivery_remarks || '',
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load dealer order details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const act = async (request, successMessage) => {
    if (!detail || busy) return false;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await request();
      if (result && Object.prototype.hasOwnProperty.call(result, 'shortages')) setShortages(result.shortages || []);
      setNotice(successMessage);
      await Promise.all([load(), open(detail.id)]);
      return true;
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'The order action could not be completed.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const confirmOrder = () => act(
    async () => (await api.post(`${ROOT}/admin/orders/${detail.id}/confirm`, {})).data,
    `Order ${detail.order_number} confirmed successfully.`,
  );

  const reviseQuotation = () => act(async () => {
    const { expectedDeliveryDate, ...values } = quote || {};
    const payload = { ...values, ...(expectedDeliveryDate ? { expectedDeliveryDate } : {}) };
    return (await api.post(`${ROOT}/orders/${detail.id}/quotations`, payload)).data;
  }, 'Revised quotation sent. The dealer must accept the new version.');

  const prepareOrder = () => act(async () => {
    if (!detail.stock_confirmed_at) {
      const stockResult = (await api.post(`${ROOT}/admin/orders/${detail.id}/stock-confirmation`, {})).data;
      if (!stockResult.confirmed) {
        setShortages(stockResult.shortages || []);
        const shortage = stockResult.shortages?.[0];
        const reason = shortage ? `Only ${shortage.available} ${shortage.unit} are available for ${shortage.productName}; the order requests ${shortage.required}.` : 'Stock could not be confirmed. Review inventory and the unit conversion.';
        throw new Error(reason);
      }
    }
    if (!detail.payment_terms_confirmed_at) await api.post(`${ROOT}/admin/orders/${detail.id}/payment-terms/confirm`, {});
    return (await api.post(`${ROOT}/admin/orders/${detail.id}/confirm`, {})).data;
  }, 'Order confirmed and moved to processing. No stock has been deducted.');

  const changeStatus = (status, extras = {}) => act(
    async () => (await api.patch(`${ROOT}/admin/orders/${detail.id}/status`, { status, ...extras })).data,
    status==='DELIVERED'&&detail?.transport_mode==='SELF'?'Dealer collection confirmed.':`Order updated to ${label(status)}.`,
  );

  const createInvoice = async () => {
    if (!detail || busy) return;
    setBusy(true);
    setError('');
    try {
      const result = detail.invoice?.id
        ? { data: detail.invoice }
        : await api.post(`${ROOT}/admin/orders/${detail.id}/invoice-draft`, {});
      navigate(`/sales/${result.data.id}`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to create the invoice draft.');
    } finally {
      setBusy(false);
    }
  };

  const shipOrder = async () => {
    const hasDispatchDetails = Boolean(shipment.dispatchDate && (shipment.transporterName.trim() || shipment.trackingNumber.trim()));
    if (!hasDispatchDetails) {
      setShipDialog(true);
      return;
    }
    const shipped = await changeStatus('SHIPPED');
    if (shipped) setShipDialog(false);
  };

  const saveAndShip = async () => {
    if (!shipment.dispatchDate || (!shipment.transporterName.trim() && !shipment.trackingNumber.trim())) return;
    const shipped = await act(async () => {
      await api.put(`${ROOT}/admin/orders/${detail.id}/shipment`, shipment);
      return (await api.patch(`${ROOT}/admin/orders/${detail.id}/status`, { status: 'SHIPPED' })).data;
    }, 'Order marked as shipped.');
    if (shipped) setShipDialog(false);
  };

  const markDelivered = async () => {
    if (!delivery.receivedBy.trim() || !delivery.actualDeliveryDate) return;
    const saved = await changeStatus('DELIVERED', { receivedBy: delivery.receivedBy.trim(), actualDeliveryDate: delivery.actualDeliveryDate, deliveryRemarks: delivery.remarks });
    if (saved) setDeliveryDialog(false);
  };

  const performPrimaryAction = async () => {
    if (!primaryAction || primaryAction.disabled || busy) return;
    switch (primaryAction.kind) {
      case 'CONFIRM_ORDER': return confirmOrder();
      case 'PREPARE_ORDER': return prepareOrder();
      case 'PREPARE_DISPATCH': return changeStatus('READY_TO_DISPATCH');
      case 'GENERATE_INVOICE':
      case 'REVIEW_INVOICE': return createInvoice();
      case 'SHIP': return shipOrder();
      case 'DELIVER': return setDeliveryDialog(true);
      case 'SELF_HANDOVER': setDelivery(current=>({...current,receivedBy:detail?.delivery_contact_name||detail?.contact_name||'',actualDeliveryDate:new Date().toISOString().slice(0,10)}));return setDeliveryDialog(true);
      case 'COMPLETE': return changeStatus('COMPLETED');
      case 'VIEW_INVOICE': return createInvoice();
      default: return undefined;
    }
  };

  const copyAddress = async () => {
    const address = addressString(detail?.delivery_address_snapshot);
    try {
      await navigator.clipboard.writeText(address);
      setNotice('Delivery address copied.');
    } catch {
      setError('Could not copy the delivery address. Select and copy it manually.');
    }
  };

  const downloadQuotation = async version => {
    try {
      const suffix = version ? `?version=${version}` : '';
      const result = await api.get(`${ROOT}/orders/${detail.id}/quotation${suffix}`, { responseType: 'blob' });
      const url = URL.createObjectURL(result.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${detail.order_number}-quotation-v${version || detail.quotation_version}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to download the quotation.');
    }
  };

  const saveCustomer = () => act(
    async () => (await api.put(`${ROOT}/admin/orders/${detail.id}/customer`, { customerId: customer?.id })).data,
    'Dealer linked to the customer ledger account.',
  );
  const saveReferral = () => act(
    async () => (await api.put(`${ROOT}/admin/orders/${detail.id}/referral`, { referredByUserId: referral?.id || null })).data,
    'Referral saved.',
  );
  const searchCustomers = async value => {
    setCustomerText(value);
    setCustomerSearchError('');
    if (value.trim().length < 2) { setCustomerOptions([]); return; }
    try {
      const result = await api.get(`${ROOT}/admin/orders/${detail.id}/customer-options?q=${encodeURIComponent(value.trim())}`);
      setCustomerOptions(result.data || []);
    } catch (requestError) {
      setCustomerOptions([]);
      setCustomerSearchError(requestError.response?.data?.message || 'Unable to search customer accounts.');
    }
  };
  const searchReferrals = async value => {
    setReferralText(value);
    if (value.trim().length < 2) { setReferralOptions([]); return; }
    try {
      const result = await api.get(`http://localhost:4000/api/tiles/users/referrals/search?q=${encodeURIComponent(value.trim())}`);
      setReferralOptions(result.data?.items || []);
    } catch { setReferralOptions([]); }
  };

  const openMessageDialog = type => { setMessageText(''); setMessageDialog(type); };
  const sendMessage = async () => {
    if (!messageDialog || !messageText.trim()) return;
    const path = messageDialog === 'CLARIFICATION_REQUEST' ? 'clarification' : 'messages';
    const sent = await act(async () => (await api.post(`${ROOT}/admin/orders/${detail.id}/${path}`, { type: messageDialog, message: messageText.trim() })).data,
      messageDialog === 'CLARIFICATION_REQUEST' ? 'Change request sent to dealer.' : messageDialog === 'EXCEPTION' ? 'Exception recorded and dealer notified.' : 'Update sent to dealer.');
    if (sent) setMessageDialog(null);
  };

  const recordPartialDelivery = () => {
    const items = Object.entries(partialQuantities).filter(([, quantity]) => quantity !== '' && Number(quantity) > 0).map(([invoiceItemId, quantity]) => ({ invoiceItemId, quantity }));
    if (!items.length) return;
    return act(async () => (await api.post(`${ROOT}/admin/orders/${detail.id}/partial-delivery`, { items, remarks: partialRemarks })).data,
      'Partial delivery recorded. The order remains shipped until delivery is complete.');
  };

  const summaryCards = [
    ['New Orders', 'new_orders', 'PENDING_REVIEW'], ['Pending Review', 'pending_review', 'PENDING_REVIEW'],
    ['Awaiting Payment', 'awaiting_payment', ''], ['Confirmed Orders', 'confirmed', 'CONFIRMED'],
    ['Ready to Dispatch', 'ready_to_dispatch', 'READY_TO_DISPATCH'], ['Shipped', 'shipped', 'SHIPPED'],
    ['Delivered', 'delivered', 'DELIVERED'], ['Cancelled Orders', 'cancelled', 'CANCELLED'],
  ];
  const sortedOrders = useMemo(() => [...orders].sort((a, b) => {
    const dateA = Date.parse(a.created_at) || 0;
    const dateB = Date.parse(b.created_at) || 0;
    return (dateA - dateB) * (orderDateDirection === 'asc' ? 1 : -1) || Number(a.id) - Number(b.id);
  }), [orders, orderDateDirection]);
  const currentItems = useMemo(() => detail?.items || [], [detail]);
  const primaryAction = getPrimaryOrderAction(detail);
  const received = moneyReceived(detail?.payments);
  const due = Math.max(0, Number(detail?.grand_total || 0) - received);
  const stage = progressStage(detail?.status);
  const waitingForDealer = ['QUOTATION_SENT', 'AWAITING_DEALER_ACCEPTANCE'].includes(detail?.status);
  const deliveryAddress = addressString(detail?.delivery_address_snapshot);

  const secondaryAction = () => {
    if (!detail) return null;
    if (detail.status === 'PENDING_REVIEW') return { label: 'Request Changes', onClick: () => openMessageDialog('CLARIFICATION_REQUEST') };
    if (waitingForDealer || detail.status === 'CONFIRMED' || detail.status === 'PROCESSING') return { label: 'View Quotation', onClick: () => downloadQuotation() };
    if (detail.status === 'READY_TO_DISPATCH') return detail.transport_mode==='SELF'?{label:'Collection Details',onClick:()=>setMoreOpen(true)}:{ label: 'Shipping Details', onClick: () => setShipDialog(true) };
    if (detail.status === 'SHIPPED') return { label: 'Tracking Details', onClick: () => setMoreOpen(true) };
    if (['DELIVERED', 'COMPLETED'].includes(detail.status) && detail.invoice) return { label: 'View Invoice', onClick: createInvoice };
    return { label: 'More Details', onClick: () => setMoreOpen(true) };
  };
  const secondary = secondaryAction();

  return (
    <Box sx={{ maxWidth: 1500, mx: 'auto', p: { xs: 2, md: 3 } }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} sx={{ mb: 2, alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
        <Box><Typography variant="overline" color="primary">Dealer Portal · Admin</Typography><Typography variant="h4" fontWeight={800}>Dealer Orders</Typography><Typography color="text.secondary">Review and fulfill dealer orders.</Typography></Box>
        <Button onClick={load} startIcon={<Refresh />}>Refresh</Button>
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert>}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(145px,1fr))', gap: 1.25, mb: 2 }}>
        {summaryCards.map(([name, key, status]) => <Card key={key + name} onClick={() => setFilters(current => ({ ...current, status }))} sx={{ p: 1.75, cursor: 'pointer', border: '1px solid', borderColor: filters.status === status && status ? 'primary.main' : 'divider' }}><Typography variant="body2" color="text.secondary">{name}</Typography><Typography variant="h5" fontWeight={800}>{summary[key] || 0}</Typography></Card>)}
      </Box>
      <Card variant="outlined" sx={{ p: 1.5, mb: 2 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0,1fr)', sm: 'repeat(2,minmax(0,1fr))', lg: 'minmax(280px,2fr) minmax(170px,1fr) minmax(160px,1fr) repeat(2,minmax(145px,.8fr))' }, gap: 1.25, alignItems: 'center' }}>
          <TextField fullWidth size="small" label="Search order, dealer, product, or product ID" value={filters.q} onChange={event => setFilters(current => ({ ...current, q: event.target.value }))} slotProps={{ input: { startAdornment: <Search color="action" sx={{ mr: 1 }} /> } }} />
          <FormControl fullWidth size="small" sx={{ minWidth: 0 }}><InputLabel>Status</InputLabel><Select label="Status" value={filters.status} onChange={event => setFilters(current => ({ ...current, status: event.target.value }))}><MenuItem value="">All statuses</MenuItem>{statuses.map(status => <MenuItem key={status} value={status}>{label(status)}</MenuItem>)}</Select></FormControl>
          <FormControl fullWidth size="small" sx={{ minWidth: 0 }}><InputLabel>Store</InputLabel><Select label="Store" value={filters.storeId} onChange={event => setFilters(current => ({ ...current, storeId: event.target.value }))}><MenuItem value="">All stores</MenuItem>{stores.map(store => <MenuItem key={store.id} value={String(store.id)}>{store.name}</MenuItem>)}</Select></FormControl>
          <TextField fullWidth size="small" type="date" label="From" slotProps={{ inputLabel: { shrink: true } }} value={filters.from} onChange={event => setFilters(current => ({ ...current, from: event.target.value }))} />
          <TextField fullWidth size="small" type="date" label="To" slotProps={{ inputLabel: { shrink: true } }} value={filters.to} onChange={event => setFilters(current => ({ ...current, to: event.target.value }))} />
        </Box>
      </Card>
      <Card variant="outlined" sx={{ overflowX: 'auto' }}>
        {loading ? <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress /></Box> : !orders.length ? <Box sx={{ p: 5, textAlign: 'center' }}><Typography color="text.secondary">No dealer orders match these filters.</Typography></Box> :
          <Table size="small" sx={{ minWidth: 1050 }}><TableHead><TableRow>{['Order Number', 'Dealer', 'Store', 'Order Date', 'Products', 'Order Amount', 'Payment', 'Payment Status', 'Order Status', 'Actions'].map(item => <TableCell key={item} sortDirection={item==='Order Date'?orderDateDirection:false} sx={{ fontWeight: 750, whiteSpace: 'nowrap' }}>{item==='Order Date'?<TableSortLabel active direction={orderDateDirection} onClick={()=>setOrderDateDirection(current=>current==='asc'?'desc':'asc')}>Order Date</TableSortLabel>:item}</TableCell>)}</TableRow></TableHead><TableBody>{sortedOrders.map(order => <TableRow hover key={order.id}><TableCell><b>{order.order_number}</b></TableCell><TableCell>{order.business_name}<Typography variant="caption" display="block" color="text.secondary">{order.contact_name || order.mobile}</Typography></TableCell><TableCell>{order.store_name}</TableCell><TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell><TableCell>{order.product_count}</TableCell><TableCell>{formatINR(order.grand_total)}</TableCell><TableCell>{order.payment_method === 'CASH_ON_DELIVERY' ? 'Cash on Delivery' : order.payment_method || '—'}</TableCell><TableCell><Chip size="small" label={label(order.payment_status)} /></TableCell><TableCell><Chip size="small" color={order.status === 'PENDING_REVIEW' ? 'warning' : order.status === 'DELIVERED' || order.status === 'COMPLETED' ? 'success' : 'default'} label={orderStatusLabel(order)} /></TableCell><TableCell><Button size="small" onClick={() => open(order.id)}>Review</Button></TableCell></TableRow>)}</TableBody></Table>}
      </Card>

      <Dialog open={Boolean(detail || detailLoading)} onClose={() => { if (!busy) { setDetail(null); setQuote(null); } }} fullWidth maxWidth="md" fullScreen={fullScreen}>
        <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
          <Box sx={{minWidth:0,flex:1}}>{detail ? <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1}><Box><Typography variant="h6" fontWeight={800}>{detail.order_number}</Typography><Typography variant="body2">{detail.business_name} · {detail.created_at ? new Date(detail.created_at).toLocaleDateString() : '—'}</Typography></Box><Stack direction="row" gap={1} alignItems="flex-start"><Chip size="small" color={detail.status === 'PENDING_REVIEW' ? 'warning' : detail.status === 'DELIVERED' || detail.status === 'COMPLETED' ? 'success' : 'primary'} label={orderStatusLabel(detail)} /><Chip size="small" variant="outlined" label={detail.store_name} /></Stack></Stack> : 'Loading order…'}</Box>
          <IconButton aria-label="Close review modal" onClick={() => { if (!busy) { setDetail(null); setQuote(null); } }} disabled={busy} size="small"><Close /></IconButton>
        </DialogTitle>
        {detailLoading && !detail ? <DialogContent><CircularProgress /></DialogContent> : detail && <DialogContent dividers sx={{ pb: { xs: 10, sm: 2 } }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {notice && <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert>}
          {['REJECTED', 'CANCELLED'].includes(detail.status) ? <Alert severity={detail.status === 'REJECTED' ? 'error' : 'warning'} sx={{ mb: 2 }}>This order is {label(detail.status).toLowerCase()}.</Alert> : <Box sx={{ mb: 2 }}>
            <Stepper activeStep={stage} alternativeLabel sx={{ '& .MuiStepLabel-label': { fontSize: { xs: '.65rem', sm: '.78rem' } }, overflowX: 'auto' }}>{['Received', 'Confirmed', 'Shipped', 'Delivered'].map(item => <Step key={item}><StepLabel>{item}</StepLabel></Step>)}</Stepper>
            {waitingForDealer && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: .5 }}>Received · Waiting for dealer to accept quotation v{detail.quotation_version}</Typography>}
          </Box>}
          {shortages.length > 0 && <Alert severity="warning" sx={{ mb: 2 }}>{shortages.map(shortage => <div key={shortage.productId}>{shortage.conversionMissing ? `Unit conversion is missing for ${shortage.productName}.` : `Only ${shortage.available} ${shortage.unit} are available for ${shortage.productName}; ${shortage.required} are required.`}</div>)}</Alert>}

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.25, mb: 2 }}>
            <Card variant="outlined" sx={{ p: 1.5 }}><Typography variant="caption" color="text.secondary">Order amount</Typography><Typography variant="h5" fontWeight={800}>{formatINR(detail.grand_total)}</Typography><Typography variant="body2">Subtotal {formatINR(detail.subtotal)} · Tax {formatINR(detail.tax_amount)}</Typography><Typography variant="body2"><b>Transport details</b> · {transportLabel(detail.transport_mode)} · {formatINR(detail.transport_charge)}</Typography>{detail.transport_mode==='SELF'&&<Typography variant="body2">Collection method: Dealer Self Collection</Typography>}<Typography variant="body2">Delivery: {Object.values(detail.delivery_address_snapshot||{}).filter(x=>typeof x==='string'&&x.trim()).join(', ')||'—'}</Typography></Card>
            <Card variant="outlined" sx={{ p: 1.5 }}><Typography variant="caption" color="text.secondary">Payment</Typography><Typography fontWeight={750}>{detail.payment_method === 'CASH_ON_DELIVERY' ? 'Cash on Delivery' : detail.payment_method || '—'} — {label(detail.payment_status)}</Typography><Typography variant="body2">{formatINR(received)} received · {formatINR(due)} due</Typography>{detail.payment_status === 'PENDING_VERIFICATION' && <Typography variant="caption" color="warning.main">UPI payment is still being verified.</Typography>}</Card>
          </Box>
          {detail.status === 'DELIVERED' && detail.transport_mode === 'SELF' && detail.payment_status !== 'PAID' && <Alert severity="warning" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={() => navigate(`/dealer/payments?q=${encodeURIComponent(detail.order_number)}`)}>Review payment</Button>}>Self Pickup is recorded. Verify or collect the full payment in Dealer Payments before completing this order.</Alert>}

          <Typography variant="subtitle1" fontWeight={750} sx={{ mb: .5 }}>Products</Typography>
          <Card variant="outlined" sx={{ overflowX: 'auto', mb: 2 }}><Table size="small" sx={{ minWidth: 460 }}><TableHead><TableRow>{['Product', 'Quantity', 'Rate', 'Amount'].map(item => <TableCell key={item}>{item}</TableCell>)}</TableRow></TableHead><TableBody>{currentItems.map((item, index) => <TableRow key={`${item.productId || item.product_id}-${index}`}><TableCell>{item.productName || item.product_name_snapshot}</TableCell><TableCell>{item.quantity} {item.unit || item.unit_snapshot}</TableCell><TableCell>{formatINR(item.dealerPrice ?? item.dealer_price_snapshot)}</TableCell><TableCell>{formatINR(item.lineTotal ?? item.line_total)}</TableCell></TableRow>)}</TableBody><TableHead><TableRow><TableCell colSpan={3} align="right">Subtotal</TableCell><TableCell>{formatINR(detail.subtotal)}</TableCell></TableRow><TableRow><TableCell colSpan={3} align="right">Transport charge</TableCell><TableCell>{formatINR(detail.transport_charge)}</TableCell></TableRow>{Number(detail.discount_amount) > 0 && <TableRow><TableCell colSpan={3} align="right">Discount</TableCell><TableCell>−{formatINR(detail.discount_amount)}</TableCell></TableRow>}<TableRow><TableCell colSpan={3} align="right">Applicable tax</TableCell><TableCell>{formatINR(detail.tax_amount)}</TableCell></TableRow><TableRow><TableCell colSpan={3} align="right"><b>Grand total</b></TableCell><TableCell><b>{formatINR(detail.grand_total)}</b></TableCell></TableRow></TableHead></Table></Card>

          <Card variant="outlined" sx={{ p: 1.5, mb: 2 }}><Stack direction="row" justifyContent="space-between" gap={1} alignItems="center"><Typography variant="subtitle1" fontWeight={750}>Delivery details</Typography><Button size="small" startIcon={<ContentCopy />} onClick={copyAddress}>Copy address</Button></Stack><Typography>{deliveryAddress}</Typography><Typography variant="body2" color="text.secondary">{detail.delivery_contact_name || 'No contact name'} · {detail.delivery_contact_mobile || 'No mobile number'}</Typography></Card>

          <Accordion expanded={moreOpen} onChange={(_, expanded) => setMoreOpen(expanded)} disableGutters variant="outlined">
            <AccordionSummary expandIcon={<ExpandMore />}><Typography fontWeight={750}>More details</Typography></AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5 }}>
                  <Card variant="outlined" sx={{ p: 1.5 }}><Typography fontWeight={750}>Dealer and ledger</Typography><Typography>{detail.contact_name || '—'} · {detail.mobile || '—'}</Typography><Typography variant="body2">{detail.email || '—'}</Typography><Typography variant="body2" sx={{ mt: .5 }}>Billing: {addressString(detail.billing_address_snapshot || detail.dealer_billing_address)}</Typography>{detail.customer_id && <Button size="small" href={`/customers/${detail.customer_id}`}>View customer ledger</Button>}<Autocomplete size="small" sx={{ mt: 1 }} options={customerOptions} value={customer} inputValue={customerText} onInputChange={(_, value, reason) => { if (reason === 'input' || reason === 'clear') { setCustomer(null); searchCustomers(value); } }} onChange={(_, value) => setCustomer(value)} isOptionEqualToValue={(a, b) => String(a.id) === String(b.id)} getOptionLabel={option => option ? `${option.name}${option.phone ? ` · ${option.phone}` : ''}` : ''} renderInput={params => <TextField {...params} label="Search customer ledger account" placeholder="Type a name or mobile" helperText={customerSearchError || 'Select an existing customer before invoicing.'} error={Boolean(customerSearchError)} />} noOptionsText={customerSearchError || (customerText.length < 2 ? 'Type at least 2 characters' : 'No active customers found')} /><Button sx={{ mt: .75 }} size="small" variant="outlined" disabled={busy || !customer?.id || Boolean(detail.sales_invoice_id)} onClick={saveCustomer}>{detail.customer_id ? 'Update customer link' : 'Link customer account'}</Button></Card>
                  <Card variant="outlined" sx={{ p: 1.5 }}><Typography fontWeight={750}>Quotation history</Typography>{(detail.quotations || []).map(item => <Stack key={item.version} direction="row" justifyContent="space-between" alignItems="center"><Typography variant="body2">v{item.version} · {item.quotation_number} · {formatINR(item.grand_total)}</Typography><Button size="small" onClick={() => downloadQuotation(item.version)}>Download</Button></Stack>)}{!detail.quotations?.length && <Typography variant="body2" color="text.secondary">No saved quotation versions.</Typography>}</Card>
                </Box>

                {['PENDING_REVIEW', 'QUOTATION_SENT', 'AWAITING_DEALER_ACCEPTANCE'].includes(detail.status) && <Card variant="outlined" sx={{ p: 1.5 }}><Typography fontWeight={750}>Revise quotation</Typography><Typography variant="caption" color="text.secondary">Only change terms when needed. A revision creates a new version and requires dealer acceptance.</Typography><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1 }}><TextField size="small" type="number" label="Transport charge" value={quote?.transportCharge || ''} onChange={event => setQuote(current => ({ ...current, transportCharge: event.target.value }))} /><TextField size="small" type="date" label="Expected delivery" slotProps={{ inputLabel: { shrink: true } }} value={quote?.expectedDeliveryDate || ''} onChange={event => setQuote(current => ({ ...current, expectedDeliveryDate: event.target.value }))} /></Stack>{currentItems.map((item, index) => <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1 }} key={index}><Typography sx={{ minWidth: 180, alignSelf: 'center' }}>{item.productName || item.product_name_snapshot}</Typography><TextField size="small" type="number" label="Quantity" value={quote?.items[index]?.quantity || ''} onChange={event => setQuote(current => ({ ...current, items: current.items.map((line, n) => n === index ? { ...line, quantity: event.target.value } : line) }))} /><TextField size="small" type="number" label="Approved price per unit" value={quote?.items[index]?.dealerPrice || ''} onChange={event => setQuote(current => ({ ...current, items: current.items.map((line, n) => n === index ? { ...line, dealerPrice: event.target.value } : line) }))} /></Stack>)}<TextField fullWidth size="small" multiline minRows={2} sx={{ mt: 1 }} label="Reason for quotation revision" value={quote?.remarks || ''} onChange={event => setQuote(current => ({ ...current, remarks: event.target.value }))} /><Button sx={{ mt: 1 }} variant="outlined" disabled={busy || !quote?.remarks.trim()} onClick={reviseQuotation}>Send revised quotation</Button></Card>}

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5 }}>
                  <Card variant="outlined" sx={{ p: 1.5 }}><Typography fontWeight={750}>Payment history</Typography>{(detail.payments || []).map(payment => <Typography variant="body2" key={payment.id}>{payment.payment_number} · {formatINR(payment.amount)} · {payment.payment_method} · {payment.payment_date} · {label(payment.status)}</Typography>)}{(detail.paymentAttempts || []).map(attempt => <Typography variant="body2" key={`attempt-${attempt.id}`}>UPI · {formatINR(attempt.amount)} · {label(attempt.status)}{attempt.status === 'pending_verification' ? ' — verification pending' : ''}</Typography>)}{!detail.payments?.length && !detail.paymentAttempts?.length && <Typography variant="body2" color="text.secondary">No payments recorded. COD remains unpaid until collected.</Typography>}</Card>
                  <Card variant="outlined" sx={{ p: 1.5 }}><Typography fontWeight={750}>Sales referral</Typography><Autocomplete size="small" sx={{ mt: 1 }} options={referralOptions} value={referral} inputValue={referralText} onInputChange={(_, value) => searchReferrals(value)} onChange={(_, value) => setReferral(value)} isOptionEqualToValue={(a, b) => String(a.id) === String(b.id)} getOptionLabel={option => option ? `${option.name}${option.userType ? ` · ${option.userType}` : ''}` : ''} renderInput={params => <TextField {...params} label="Salesperson / Tiles Mistri" placeholder="Search name or mobile" />} noOptionsText={referralText.length < 2 ? 'Type at least 2 characters' : 'No active referral users'} /><Button sx={{ mt: .75 }} size="small" disabled={busy || Boolean(detail.sales_invoice_id)} onClick={saveReferral}>Save referral</Button></Card>
                </Box>

                <Card variant="outlined" sx={{ p: 1.5 }}><Typography fontWeight={750}>Shipment and tracking</Typography><Typography variant="body2">{detail.shipment?.transporter_name || 'Transporter not set'} · {detail.shipment?.tracking_number || 'Tracking / LR not set'}</Typography><Typography variant="body2">Vehicle {detail.shipment?.vehicle_number || '—'} · Dispatch {detail.shipment?.dispatch_date ? String(detail.shipment.dispatch_date).slice(0, 10) : '—'} · ETA {detail.shipment?.estimated_delivery_date ? String(detail.shipment.estimated_delivery_date).slice(0, 10) : '—'}</Typography>{detail.shipment?.delivery_remarks && <Typography variant="body2">Remarks: {detail.shipment.delivery_remarks}</Typography>}</Card>

                {detail.status === 'SHIPPED' && detail.invoice && <Card variant="outlined" sx={{ p: 1.5 }}><Typography fontWeight={750}>Record partial delivery</Typography><Typography variant="caption" color="text.secondary">Enter delivered quantities if the order arrived in multiple shipments.</Typography>{(detail.invoiceItems || []).map(item => <Stack key={item.id} direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1, alignItems: { sm: 'center' } }}><Typography sx={{ flex: 1 }}>{item.product_name_snapshot} · {item.unit_name_snapshot} · ordered {item.quantity}</Typography><TextField size="small" type="number" label="Delivered now" value={partialQuantities[String(item.id)] || ''} onChange={event => setPartialQuantities(current => ({ ...current, [String(item.id)]: event.target.value }))} inputProps={{ min: 0, max: item.quantity, step: 'any' }} /></Stack>)}<TextField fullWidth size="small" multiline minRows={2} label="Delivery note" value={partialRemarks} onChange={event => setPartialRemarks(event.target.value)} sx={{ mt: 1 }} /><Button sx={{ mt: 1 }} size="small" variant="outlined" disabled={busy || !Object.values(partialQuantities).some(value => value !== '' && Number(value) > 0)} onClick={recordPartialDelivery}>Record partial delivery</Button></Card>}

                <Box><Typography fontWeight={750} sx={{ mb: .5 }}>Order activity</Typography>{[...(detail.history || []).map(item => ({ ...item, at: item.changed_at, title: item.new_status, text: item.remarks })), ...(detail.messages || []).map(item => ({ ...item, at: item.created_at, title: item.message_type, text: item.body }))].sort((a, b) => new Date(a.at) - new Date(b.at)).map((item, index) => <Typography key={index} variant="body2" sx={{ py: .5, borderBottom: '1px solid', borderColor: 'divider' }}>{new Date(item.at).toLocaleString()} · {label(item.title)}{item.text ? ` · ${item.text}` : ''}</Typography>)}</Box>

                <Divider />
                <Stack direction={{ xs: 'column', sm: 'row' }} flexWrap="wrap" gap={1}>
                  <Button size="small" onClick={() => openMessageDialog('CLARIFICATION_REQUEST')}>Request changes</Button>
                  <Button size="small" onClick={() => openMessageDialog('ADMIN_MESSAGE')}>Send update</Button>
                  <Button size="small" color="warning" onClick={() => openMessageDialog('EXCEPTION')}>Report exception</Button>
                  {['PENDING_REVIEW', 'QUOTATION_SENT', 'AWAITING_DEALER_ACCEPTANCE'].includes(detail.status) && <Button size="small" color="error" disabled={busy} onClick={() => changeStatus('REJECTED', { remarks: 'Rejected by Admin' })}>Reject order</Button>}
                  {['CONFIRMED', 'PROCESSING', 'READY_TO_DISPATCH'].includes(detail.status) && !detail.sales_invoice_id && <Button size="small" color="error" disabled={busy} onClick={() => changeStatus('CANCELLED', { remarks: 'Cancelled by Admin' })}>Cancel order</Button>}
                </Stack>
              </Stack>
            </AccordionDetails>
          </Accordion>
        </DialogContent>}
        {detail && <DialogActions sx={{ p: 1.5, position: { xs: 'fixed', sm: 'static' }, bottom: 0, left: 0, right: 0, bgcolor: 'background.paper', borderTop: { xs: 1, sm: 0 }, borderColor: 'divider', zIndex: 1 }}>
          <Button onClick={() => setMoreOpen(open => !open)}>{moreOpen ? 'Hide details' : 'More details'}</Button>
          {!moreOpen && secondary && secondary.label !== 'More Details' && <Button onClick={secondary.onClick}>{secondary.label}</Button>}
          <Box sx={{ flex: 1 }} />
          <Button onClick={() => { if (!busy) { setDetail(null); setQuote(null); } }} disabled={busy}>Close</Button>
          {primaryAction && <Button variant="contained" disabled={busy || primaryAction.disabled} onClick={performPrimaryAction}>{busy ? 'Working…' : primaryAction.label}</Button>}
        </DialogActions>}
      </Dialog>

      <Dialog open={shipDialog} onClose={() => !busy && setShipDialog(false)} fullWidth maxWidth="xs" fullScreen={fullScreen}>
        <DialogTitle>Shipping details</DialogTitle><DialogContent><Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Add a transporter or tracking number and dispatch date before marking this order shipped.</Typography><Stack spacing={1.5}><TextField label="Transporter" value={shipment.transporterName} onChange={event => setShipment(current => ({ ...current, transporterName: event.target.value }))} /><TextField label="Vehicle number" value={shipment.vehicleNumber} onChange={event => setShipment(current => ({ ...current, vehicleNumber: event.target.value }))} /><TextField label="Driver mobile" value={shipment.driverMobile} onChange={event => setShipment(current => ({ ...current, driverMobile: event.target.value }))} /><TextField label="Tracking / LR number" value={shipment.trackingNumber} onChange={event => setShipment(current => ({ ...current, trackingNumber: event.target.value }))} /><TextField required type="date" label="Dispatch date" slotProps={{ inputLabel: { shrink: true } }} value={shipment.dispatchDate} onChange={event => setShipment(current => ({ ...current, dispatchDate: event.target.value }))} /><TextField type="date" label="Estimated delivery" slotProps={{ inputLabel: { shrink: true } }} value={shipment.estimatedDeliveryDate} onChange={event => setShipment(current => ({ ...current, estimatedDeliveryDate: event.target.value }))} /><TextField multiline minRows={2} label="Delivery remarks" value={shipment.deliveryRemarks} onChange={event => setShipment(current => ({ ...current, deliveryRemarks: event.target.value }))} /></Stack></DialogContent><DialogActions><Button onClick={() => setShipDialog(false)} disabled={busy}>Back</Button><Button variant="contained" disabled={busy || !shipment.dispatchDate || (!shipment.transporterName.trim() && !shipment.trackingNumber.trim())} onClick={saveAndShip}>{busy ? 'Saving…' : 'Save and mark shipped'}</Button></DialogActions>
      </Dialog>

      <Dialog open={deliveryDialog} onClose={() => !busy && setDeliveryDialog(false)} fullWidth maxWidth="xs" fullScreen={fullScreen}>
          <DialogTitle>{detail?.transport_mode==='SELF'?'Confirm dealer collection':'Confirm delivery'}</DialogTitle><DialogContent><Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{detail?.transport_mode==='SELF'?'Record who collected the order from the store. Payment is verified separately.':'Record who received the goods. This does not mark payment as received.'}</Typography><Stack spacing={1.5}><TextField required label={detail?.transport_mode==='SELF'?'Collected by':'Received by'} value={delivery.receivedBy} onChange={event => setDelivery(current => ({ ...current, receivedBy: event.target.value }))} /><TextField required type="date" label={detail?.transport_mode==='SELF'?'Collection date':'Actual delivery date'} slotProps={{ inputLabel: { shrink: true } }} value={delivery.actualDeliveryDate} onChange={event => setDelivery(current => ({ ...current, actualDeliveryDate: event.target.value }))} /><TextField multiline minRows={2} label="Remarks" value={delivery.remarks} onChange={event => setDelivery(current => ({ ...current, remarks: event.target.value }))} /></Stack></DialogContent><DialogActions><Button onClick={() => setDeliveryDialog(false)} disabled={busy}>Back</Button><Button variant="contained" disabled={busy || !delivery.receivedBy.trim() || !delivery.actualDeliveryDate} onClick={markDelivered}>{detail?.transport_mode==='SELF'?'Confirm Collection':'Mark as Delivered'}</Button></DialogActions>
      </Dialog>

      <Dialog open={Boolean(messageDialog)} onClose={() => !busy && setMessageDialog(null)} fullWidth maxWidth="xs" fullScreen={fullScreen}>
        <DialogTitle>{messageDialog === 'CLARIFICATION_REQUEST' ? 'Request changes' : messageDialog === 'EXCEPTION' ? 'Report exception' : 'Send update'}</DialogTitle><DialogContent><Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{messageDialog === 'CLARIFICATION_REQUEST' ? 'The dealer will receive this message and can respond on the order.' : messageDialog === 'EXCEPTION' ? 'Record a fulfillment issue and notify the dealer.' : 'Send a short update about this order.'}</Typography><TextField autoFocus fullWidth multiline minRows={3} label="Message" value={messageText} onChange={event => setMessageText(event.target.value)} /></DialogContent><DialogActions><Button onClick={() => setMessageDialog(null)} disabled={busy}>Cancel</Button><Button variant="contained" disabled={busy || !messageText.trim()} onClick={sendMessage}>Send</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
