import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SalesBilling from '../sales/SalesBilling';
import SupplierSearch from '../suppliers/SupplierSearch';
import SalesInvoicePrint from '../sales/SalesInvoicePrint';
import api from '../../api';
jest.mock('../../api',()=>({get:jest.fn(),post:jest.fn()}));
jest.mock('../../context/StoreContext',()=>({useStores:()=>({stores:[{id:1,name:'Mahua'}],selectedStoreId:'1',selectStore:jest.fn()})}));
jest.mock('../../context/AuthContext',()=>({useAuth:()=>({user:{name:'Owner'}})}));
const gstin='27AAPFU0939F1ZV';
const data={gstin,legalName:'Fixture Legal',tradeName:'Fixture Tiles',registrationStatus:'Active',address:{addressLine1:'12 Test Road',addressLine2:'Market',city:'Pune',state:'Maharashtra',pincode:'411001'},source:'finagg',fetchedAt:'2026-10-22T12:00:00.000Z'};
beforeEach(()=>{
 jest.clearAllMocks();
 api.get.mockImplementation(url=>Promise.resolve({data:url.includes('/api/gst/')?{success:true,data,lookupToken:'proof'}:url.endsWith('/sales')?{items:[]}:[]}));
 api.post.mockResolvedValue({data:{id:55,name:'Fixture Tiles',gstin}});
});
const apply=async()=>{
 fireEvent.change(screen.getByLabelText('GSTIN'),{target:{value:gstin}});
 fireEvent.click(screen.getByRole('button',{name:'Fetch GST Details'}));
 const dialog=await screen.findByRole('dialog',{name:'Review GST business details'});
 fireEvent.click(within(dialog).getByRole('button',{name:'Apply GST details'}));
 await waitFor(()=>expect(screen.queryByRole('dialog',{name:'Review GST business details'})).not.toBeInTheDocument());
};
test('sales customer quick-add saves GST details and immediately selects the customer',async()=>{
 render(<MemoryRouter><SalesBilling/></MemoryRouter>);
 fireEvent.click(await screen.findByRole('button',{name:'New invoice'}));
 fireEvent.click(screen.getByRole('button',{name:'Add customer'}));
 await apply();
 fireEvent.click(within(screen.getByRole('dialog',{name:'Add customer'})).getByRole('button',{name:'Add customer'}));
 await waitFor(()=>expect(api.post).toHaveBeenCalledWith('http://localhost:4000/api/tiles/customers',expect.objectContaining({name:'Fixture Tiles',gstin,gstLookupToken:'proof'})));
 await waitFor(()=>expect(screen.queryByRole('dialog',{name:'Add customer'})).not.toBeInTheDocument());
 expect(screen.getByRole('combobox',{name:'Customer'})).toHaveValue('Fixture Tiles');
});
test('purchase supplier quick-add saves GST details and selects without reloading',async()=>{
 const onSelect=jest.fn();render(<SupplierSearch onSelect={onSelect}/>);
 fireEvent.click(screen.getByRole('button',{name:'Add supplier'}));await apply();
 fireEvent.click(screen.getByRole('button',{name:'Add and select'}));
 await waitFor(()=>expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({id:55,name:'Fixture Tiles',gstin})));
 expect(api.post).toHaveBeenCalledWith('http://localhost:4000/api/tiles/suppliers',expect.objectContaining({gstLookupToken:'proof',billingAddress:expect.objectContaining({line1:'12 Test Road'})}));
});
test('sales printing renders canonical GST autofill address fields from the invoice snapshot',()=>{
 render(<SalesInvoicePrint invoice={{status:'posted',customer_name_snapshot:'Invoice Customer',customer_tax_id_snapshot:gstin,customer_address_snapshot:{billing:{line1:'Edited first line',street:'Old street',line2:'Second line'},city:'Pune',state:'Maharashtra',pinCode:'411001'},items:[]}}/>);
 expect(screen.getByText('Edited first line')).toBeInTheDocument();expect(screen.getByText('Second line')).toBeInTheDocument();expect(screen.getByText(gstin)).toBeInTheDocument();expect(screen.queryByText('Old street')).not.toBeInTheDocument();
});
