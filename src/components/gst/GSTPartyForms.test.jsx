import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { CustomerForm } from '../customers/CustomerManagement';
import { SupplierForm } from '../suppliers/SupplierManagement';
import api from '../../api';
jest.mock('../../api',()=>({get:jest.fn(),post:jest.fn(),put:jest.fn()}));
jest.mock('../../context/StoreContext',()=>({useStores:()=>({stores:[{id:1,name:'Mahua'}],selectedStoreId:'1'})}));
const gstin='27AAPFU0939F1ZV';
const data={gstin,legalName:'Test Legal Name',tradeName:'Test Tiles',registrationStatus:'Active',address:{addressLine1:'12 Test Road',city:'Pune',state:'Maharashtra',pincode:'411001',district:'Pune',stateCode:'27'},fetchedAt:'2026-10-22T12:00:00.000Z',source:'finagg'};
beforeEach(()=>{jest.clearAllMocks();api.get.mockResolvedValue({data:{success:true,data,lookupToken:'proof'}});api.post.mockResolvedValue({data:{id:1,name:'Test Tiles'}});api.put.mockResolvedValue({data:{id:1,name:'Test Tiles'}});});
for (const [type,Component] of [['customer',CustomerForm],['supplier',SupplierForm]]) {
  test(`${type} autofill populates editable fields and saves to the existing API`,async()=>{
    const saved=jest.fn();render(<Component open onClose={jest.fn()} onSaved={saved}/>);
    fireEvent.change(screen.getByLabelText('GSTIN'),{target:{value:gstin}});fireEvent.click(screen.getByRole('button',{name:'Fetch GST Details'}));
    const preview=await screen.findByRole('dialog',{name:'Review GST business details'});expect(api.post).not.toHaveBeenCalled();
    fireEvent.click(within(preview).getByRole('button',{name:'Apply GST details'}));
    const name=await screen.findByLabelText(new RegExp(`${type==='customer'?'Customer':'Supplier'} name`));expect(name).toHaveValue('Test Tiles');expect(screen.getByLabelText('City')).toHaveValue('Pune');
    fireEvent.change(name,{target:{value:'Reviewed Name'}});fireEvent.click(await screen.findByRole('button',{name:`Save ${type}`}));
    await waitFor(()=>expect(api.post).toHaveBeenCalledWith(`http://localhost:4000/api/tiles/${type}s`,expect.objectContaining({name:'Reviewed Name',gstin,gstLookupToken:'proof',billingAddress:expect.objectContaining({line1:'12 Test Road'})})));
    expect(saved).toHaveBeenCalled();
  });
  test(`${type} permits manual entry without GSTIN`,async()=>{
    render(<Component open onClose={jest.fn()} onSaved={jest.fn()}/>);
    fireEvent.change(screen.getByLabelText(new RegExp(`${type==='customer'?'Customer':'Supplier'} name`)),{target:{value:'Unregistered party'}});
    fireEvent.click(screen.getByRole('button',{name:`Save ${type}`}));
    await waitFor(()=>expect(api.post).toHaveBeenCalledWith(expect.any(String),expect.objectContaining({gstin:'',name:'Unregistered party'})));
    expect(api.get).not.toHaveBeenCalled();
  });
  test(`${type} edit lookup preserves original fields until explicitly applied`,async()=>{
    const existing={id:9,name:'Manually edited business',gstin,city:'Old city',is_active:true,gst_verified_at:data.fetchedAt,gst_data_source:'finagg',gst_details:{legalName:'Old legal'}};
    render(<Component open onClose={jest.fn()} onSaved={jest.fn()} {...{[type]:existing}}/>);
    expect(screen.getByLabelText('Legal name')).toHaveValue('Old legal');
    fireEvent.click(screen.getByRole('button',{name:'Fetch GST Details'}));const dialog=await screen.findByRole('dialog',{name:'Review GST business details'});
    expect(screen.getByLabelText(new RegExp(`${type==='customer'?'Customer':'Supplier'} name`))).toHaveValue('Manually edited business');
    fireEvent.click(within(dialog).getByRole('button',{name:'Keep current details'}));
    fireEvent.click(await screen.findByRole('button',{name:`Save ${type}`}));
    await waitFor(()=>expect(api.put).toHaveBeenCalledWith(`http://localhost:4000/api/tiles/${type}s/9`,expect.objectContaining({name:'Manually edited business',city:'Old city'})));
  });
}
