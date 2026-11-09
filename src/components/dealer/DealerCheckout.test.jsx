import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DealerCheckout from './DealerCheckout';
import api from '../../api';
import { useDealerCart } from '../../context/DealerCartContext';
import useDealerCatalog from './useDealerCatalog';

jest.mock('../../api',()=>({get:jest.fn(),post:jest.fn()}));
jest.mock('../../context/DealerCartContext',()=>({useDealerCart:jest.fn()}));
jest.mock('./useDealerCatalog',()=>jest.fn());
const clearCart=jest.fn();
beforeEach(()=>{jest.clearAllMocks();useDealerCart.mockReturnValue({lines:[{productId:'4',unitId:'2',quantity:'10'}],clearCart});useDealerCatalog.mockReturnValue({catalog:{storeId:'3',transportCharge:'1000.00',transportOptions:[{code:'SELF',label:'Self Pickup',charge:'0.00'},{code:'TOTO',label:'Toto',charge:'400.00'},{code:'THELA',label:'CNG Auto',charge:'700.00'},{code:'PICKUP',label:'Pickup',charge:'1000.00'}],items:[{id:'4',name:'GVT Ivory',tile_size:'2×2',tax_rate:'18',tax_inclusive:false,stock_status:'IN_STOCK',available_units:[{unitId:'2',unitName:'Box',dealerPrice:'850.0000',decimalPlaces:0}]}]},loading:false,error:''});api.get.mockImplementation(url=>url.endsWith('/profile')?Promise.resolve({data:{business_name:'Dealer House',contact_name:'Asha',mobile:'9876543210',billing_address:{city:'Patna'},delivery_address:{city:'Mahua'}}}):url.endsWith('/payment-intent')?Promise.resolve({data:{paymentUri:'upi://pay?pa=dealer%40upi'}}):Promise.resolve({data:[]}));api.post.mockResolvedValue({data:{id:'73',order_number:'DO-73',quotation_number:'Q-DO-73-1',status:'PENDING_REVIEW',grand_total:'10306.00'}});});

test('checkout sends order request with dealer-selected payment method and idempotency key; server supplies price and transport',async()=>{
 render(<MemoryRouter><DealerCheckout/></MemoryRouter>);
 expect(await screen.findByText('Dealer House')).toBeInTheDocument();fireEvent.click(await screen.findByRole('button',{name:/Place order request/}));
 await waitFor(()=>expect(api.post).toHaveBeenCalled());
 const [url,payload,config]=api.post.mock.calls[0];expect(url).toContain('/orders');expect(payload.items).toEqual([{productId:'4',unitId:'2',quantity:'10'}]);expect(payload.paymentMethod).toBe('UPI');expect(payload.deliveryInstructions).toBe('');expect(payload).not.toHaveProperty('price');expect(payload).not.toHaveProperty('transportCharge');expect(config.headers['Idempotency-Key'].length).toBeGreaterThanOrEqual(16);
 expect(payload.transportMode).toBe('PICKUP');expect(screen.getByText('Choose Transport Mode')).toBeInTheDocument();expect(screen.getByText('₹400.00')).toBeInTheDocument();expect(screen.getByText('₹700.00')).toBeInTheDocument();expect(clearCart).toHaveBeenCalled();expect(await screen.findByText(/Order request submitted/)).toBeInTheDocument();expect(screen.getByText(/not a tax invoice/)).toBeInTheDocument();expect(await screen.findByRole('link',{name:'My Dealer Orders'})).toHaveAttribute('href','/dealer/orders');expect(api.get).not.toHaveBeenCalledWith(expect.stringContaining('/payment-intent'));
});

test('Self Pickup is free and updates the checkout total and order mode immediately',async()=>{
 render(<MemoryRouter><DealerCheckout/></MemoryRouter>);
 const place=await screen.findByRole('button',{name:/Place order request/});expect(place).toHaveTextContent('₹11,030.00');expect(screen.getByText(/FREE/)).toBeInTheDocument();
 fireEvent.click(screen.getByRole('radio',{name:/Self Pickup/}));expect(place).toHaveTextContent('₹10,030.00');
 fireEvent.click(place);await waitFor(()=>expect(api.post).toHaveBeenCalledWith(expect.stringContaining('/orders'),expect.objectContaining({transportMode:'SELF'}),expect.any(Object)));
});

test('checkout can save a new delivery address and place a Cash on Delivery request',async()=>{
 api.get.mockImplementation(url=>url.endsWith('/profile')?Promise.resolve({data:{business_name:'Dealer House',contact_name:'Asha',mobile:'9876543210',billing_address:{city:'Patna'},delivery_address:{}}}):url.endsWith('/addresses')?Promise.resolve({data:[]}):Promise.resolve({data:{}}));
 api.post.mockImplementation(url=>url.endsWith('/addresses')?Promise.resolve({data:{id:'55',label:'Project Site',address:{line1:'Plot 7',city:'Gaya'},contact_name:'Asha',mobile:'9876543210'}}):Promise.resolve({data:{id:'74',order_number:'DO-74',quotation_number:'Q-DO-74-1',status:'PENDING_REVIEW'}}));
 render(<MemoryRouter><DealerCheckout/></MemoryRouter>);
 fireEvent.change(await screen.findByLabelText(/Address label/),{target:{value:'Project Site'}});fireEvent.change(screen.getByLabelText(/Address line 1/),{target:{value:'Plot 7'}});fireEvent.change(screen.getByLabelText(/City/),{target:{value:'Gaya'}});
 fireEvent.click(screen.getByLabelText('Cash on Delivery'));fireEvent.click(screen.getByRole('button',{name:/Place order request/}));
 await waitFor(()=>expect(api.post).toHaveBeenCalledTimes(2));expect(api.post.mock.calls[0][0]).toContain('/addresses');const [url,payload]=api.post.mock.calls[1];expect(url).toContain('/orders');expect(payload.paymentMethod).toBe('CASH_ON_DELIVERY');expect(payload.deliveryAddressId).toBe('55');expect(payload.deliveryContactName).toBe('Asha');expect(api.post.mock.calls[1][2].headers['Idempotency-Key']).toBeTruthy();expect(await screen.findByText(/Order request submitted/)).toBeInTheDocument();
});
