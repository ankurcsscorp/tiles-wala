import React from 'react';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import api from '../../api';
import DealerDashboard from './DealerDashboard';
jest.mock('../../api',()=>({get:jest.fn()}));

beforeEach(()=>{
 jest.clearAllMocks();api.get.mockImplementation(url=>url.includes('/dashboard/analytics')?Promise.resolve({data:{period:'monthly',range:{timezone:'Asia/Kolkata'},summary:{totalOrders:3,purchaseValue:'3750.00',averageOrderValue:'1250.00',outstandingAmount:'750.00',availableCredit:'125.00',verifiedPaymentsInPeriod:'500.00',pendingVerificationAmount:'50.00',paymentStatus:{paid:2,partiallyPaid:1,unpaid:0}},chartData:[{periodKey:'2026-01',label:'Jan',orderCount:3,purchaseValue:'3750.00'}]}}):url.endsWith('/orders')?Promise.resolve({data:[{id:'1',order_number:'DO-1',status:'PENDING_REVIEW',grand_total:'1250.00'}]}):Promise.resolve({data:{businessName:'North Tiles'}}));
});

test('dealer dashboard renders analytics returned by the authenticated API',async()=>{
 render(<MemoryRouter><DealerDashboard/></MemoryRouter>);
 expect(await screen.findByText('Total Orders')).toBeInTheDocument();
 expect(screen.getByText('My Business Overview')).toBeInTheDocument();expect(screen.getAllByText('3').length).toBeGreaterThan(0);
 expect(screen.getByText('Purchase Value Trend')).toBeInTheDocument();expect(screen.getByText('Order Count Trend')).toBeInTheDocument();
 expect(screen.getByRole('link',{name:'Details'})).toHaveAttribute('href','/dealer/orders?orderId=1');
 expect(screen.getByText('Payment Overview')).toBeInTheDocument();expect(screen.getByText('Available Credit')).toBeInTheDocument();
 expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/dashboard/analytics'),expect.objectContaining({params:{period:'monthly'},signal:expect.any(AbortSignal)}));
});

test('changing the time filter requests a new aggregation without reloading the page',async()=>{
 render(<MemoryRouter><DealerDashboard/></MemoryRouter>);await screen.findByText('Payment Overview');
 fireEvent.click(screen.getByRole('button',{name:'Daily'}));
 await waitFor(()=>expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/dashboard/analytics'),expect.objectContaining({params:{period:'daily'}})));
});
