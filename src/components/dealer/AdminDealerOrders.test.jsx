import React from 'react';
import {MemoryRouter} from 'react-router-dom';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import api from '../../api';
import AdminDealerOrders, {getPrimaryOrderAction} from './AdminDealerOrders';

jest.mock('../../api',()=>({get:jest.fn(),post:jest.fn(),patch:jest.fn()}));
const order={id:'41',order_number:'DO-41',dealer_id:'9',business_name:'North Tiles',contact_name:'Ravi',mobile:'9876543210',store_name:'Main Store',status:'PENDING_REVIEW',payment_method:'CASH_ON_DELIVERY',payment_status:'UNPAID',subtotal:'800.00',transport_charge:'1000.00',tax_amount:'144.00',grand_total:'1944.00',quotation_version:0,created_at:'2026-10-01T12:00:00Z',billing_address_snapshot:{city:'Patna'},delivery_address_snapshot:{city:'Gaya'},items:[{productId:'5',unitId:'2',productName:'White GVT',unit:'Box',quantity:'2',dealerPrice:'400.00',lineTotal:'944.00'}],history:[],messages:[],payments:[],quotations:[]};
beforeEach(()=>{jest.clearAllMocks();api.get.mockImplementation(url=>url.includes('/summary')?Promise.resolve({data:{new_orders:1,pending_review:1}}):url.includes('/admin/orders?')?Promise.resolve({data:[{...order,product_count:1}]}):url.endsWith('/stores')?Promise.resolve({data:[]}):Promise.resolve({data:order}));api.post.mockResolvedValue({data:{}});api.patch.mockResolvedValue({data:{}});});

test('Admin dealer order dashboard summarizes, filters and opens order detail',async()=>{
 render(<MemoryRouter><AdminDealerOrders/></MemoryRouter>);
 expect(await screen.findByText('Dealer Orders')).toBeInTheDocument();expect(await screen.findByText('North Tiles')).toBeInTheDocument();expect(screen.getByText('DO-41')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Review'}));
 expect((await screen.findAllByText('White GVT')).length).toBeGreaterThanOrEqual(1);expect(screen.getByText('Delivery details')).toBeInTheDocument();expect(screen.getByText('Order activity')).not.toBeVisible();fireEvent.click(screen.getAllByRole('button',{name:'More details'})[0]);expect(await screen.findByText('Order activity')).toBeVisible();
});

test('Admin can close the order review modal with its close icon',async()=>{
 render(<MemoryRouter><AdminDealerOrders/></MemoryRouter>);fireEvent.click(await screen.findByRole('button',{name:'Review'}));await screen.findByText('Delivery details');fireEvent.click(screen.getByRole('button',{name:'Close review modal'}));await waitFor(()=>expect(screen.queryByText('Delivery details')).not.toBeInTheDocument());
});

test('Admin can start a clarification request from an order detail',async()=>{
 render(<MemoryRouter><AdminDealerOrders/></MemoryRouter>);fireEvent.click(await screen.findByRole('button',{name:'Review'}));await screen.findByText('Delivery details');fireEvent.click(screen.getAllByRole('button',{name:'More details'})[0]);fireEvent.click(await screen.findByRole('button',{name:'Request changes'}));fireEvent.change(screen.getByLabelText('Message'),{target:{value:'Please confirm delivery access.'}});fireEvent.click(screen.getByRole('button',{name:'Send'}));
 await waitFor(()=>expect(api.post).toHaveBeenCalledWith(expect.stringContaining('/clarification'),{type:'CLARIFICATION_REQUEST',message:'Please confirm delivery access.'}));
});

test('pending review primary action confirms the submitted dealer order directly',async()=>{
 render(<MemoryRouter><AdminDealerOrders/></MemoryRouter>);fireEvent.click(await screen.findByRole('button',{name:'Review'}));fireEvent.click(await screen.findByRole('button',{name:'Confirm Order'}));
 await waitFor(()=>expect(api.post).toHaveBeenCalledWith(expect.stringContaining('/confirm'),{}));
});

test('confirmed order combines stock and payment term checks before processing without creating an invoice',async()=>{
 const confirmed={...order,status:'CONFIRMED',stock_confirmed_at:null,payment_terms_confirmed_at:null};
 api.get.mockImplementation(url=>url.includes('/summary')?Promise.resolve({data:{}}):url.includes('/admin/orders?')?Promise.resolve({data:[{...confirmed,product_count:1}]}):url.endsWith('/stores')?Promise.resolve({data:[]}):Promise.resolve({data:confirmed}));
 api.post.mockImplementation(url=>url.endsWith('/stock-confirmation')?Promise.resolve({data:{confirmed:true,shortages:[]}}):Promise.resolve({data:{status:'PROCESSING'}}));
 render(<MemoryRouter><AdminDealerOrders/></MemoryRouter>);fireEvent.click(await screen.findByRole('button',{name:'Review'}));fireEvent.click(await screen.findByRole('button',{name:'Confirm Order & Prepare'}));
 await waitFor(()=>expect(api.post).toHaveBeenCalledWith(expect.stringContaining('/payment-terms/confirm'),{}));
 expect(api.post).toHaveBeenCalledWith(expect.stringContaining('/confirm'),{});expect(api.post).not.toHaveBeenCalledWith(expect.stringContaining('/invoice-draft'),{});
});

test('primary action confirms new orders and respects acceptance, invoice stage, and terminal statuses',()=>{
 expect(getPrimaryOrderAction({...order,quotation_version:1})).toMatchObject({kind:'CONFIRM_ORDER',label:'Confirm Order'});
 expect(getPrimaryOrderAction({...order,status:'QUOTATION_SENT'})).toMatchObject({kind:'WAIT',disabled:true});
 expect(getPrimaryOrderAction({...order,status:'PROCESSING'})).toMatchObject({kind:'PREPARE_DISPATCH'});
 expect(getPrimaryOrderAction({...order,status:'READY_TO_DISPATCH',customer_id:null})).toMatchObject({kind:'GENERATE_INVOICE',disabled:true});
 expect(getPrimaryOrderAction({...order,status:'READY_TO_DISPATCH',customer_id:'12',invoice:{id:'9',status:'draft'}})).toMatchObject({kind:'REVIEW_INVOICE'});
 expect(getPrimaryOrderAction({...order,status:'READY_TO_DISPATCH',transport_mode:'SELF',customer_id:'12',invoice:{id:'9',status:'posted'}})).toMatchObject({kind:'SELF_HANDOVER',label:'Confirm Collection'});
 expect(getPrimaryOrderAction({...order,status:'CANCELLED'})).toMatchObject({kind:'TERMINAL',disabled:true});
});

test('Self Pickup completion waits for verified full payment and directs Admin to payment review',async()=>{
 const delivered={...order,status:'DELIVERED',transport_mode:'SELF',payment_status:'UNPAID'};
 expect(getPrimaryOrderAction(delivered)).toMatchObject({kind:'COMPLETE',disabled:true,reason:expect.stringMatching(/full payment/i)});
 expect(getPrimaryOrderAction({...delivered,payment_status:'PAID'})).toMatchObject({kind:'COMPLETE',disabled:false});
 api.get.mockImplementation(url=>url.includes('/summary')?Promise.resolve({data:{}}):url.includes('/admin/orders?')?Promise.resolve({data:[delivered]}):url.endsWith('/stores')?Promise.resolve({data:[]}):Promise.resolve({data:delivered}));
 render(<MemoryRouter><AdminDealerOrders/></MemoryRouter>);fireEvent.click(await screen.findByRole('button',{name:'Review'}));
 expect(await screen.findByText(/Verify or collect the full payment in Dealer Payments/)).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Review payment'})).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Complete Order'})).toBeDisabled();
});
