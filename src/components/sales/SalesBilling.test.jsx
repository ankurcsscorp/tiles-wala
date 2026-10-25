import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SalesBilling from './SalesBilling';
import api from '../../api';
import {documentOptions as taxDocumentOptions} from '../../utils/invoicePolicy';
import { useStores } from '../../context/StoreContext';

jest.mock('../../api', () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn() }));
jest.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { name: 'Owner',userType:'Admin' } }) }));
jest.mock('../../context/StoreContext', () => ({ useStores: jest.fn() }));

const draft = { id: 42, store_id: 1, status: 'draft', current_store_name: 'Mahua', items: [] };
beforeEach(() => {
  jest.clearAllMocks();
  useStores.mockReturnValue({ stores: [{ id: 1, name: 'Mahua' }], selectedStoreId: '1', selectStore: jest.fn() });
  api.get.mockImplementation((url) => Promise.resolve({ data: url.endsWith('/invoice-settings') ? {data:{invoiceType:'GST'}} : url.endsWith('/sales/42') ? draft : [] }));
});

const billingPage = () => <MemoryRouter><SalesBilling /></MemoryRouter>;
const product = { id: 7, sku: 'COSTA-1', name: 'Costa Tile', base_unit_id: 1, store_stock: null };
const mockProductSearch = () => api.get.mockImplementation(url => Promise.resolve({ data: url.endsWith('/invoice-settings') ? {data:{invoiceType:'GST'}} : url.endsWith('/products/search') ? { items: [product] } : [] }));

test('product search omits an empty store ID and lists matching names', async () => {
  useStores.mockReturnValue({ stores: [], selectedStoreId: '', selectStore: jest.fn() });
  mockProductSearch();
  render(billingPage());
  fireEvent.click(screen.getByRole('button', { name: 'New invoice' }));
  fireEvent.focus(screen.getByRole('combobox', { name: 'Search products by SKU or name' }));
  fireEvent.change(screen.getByRole('combobox', { name: 'Search products by SKU or name' }), { target: { value: 'costa' } });
  expect(await screen.findByRole('option', { name: 'COSTA-1 · Costa Tile' })).toBeInTheDocument();
  expect(api.get).toHaveBeenCalledWith('http://localhost:4000/api/tiles/products/search', { params: { q: 'costa', storeId: undefined, limit: 12 } });
  expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
  fireEvent.click(screen.getByRole('option', { name: 'COSTA-1 · Costa Tile' }));
  expect(await screen.findByRole('button', { name: 'Remove' })).toBeInTheDocument();
  expect(screen.getByText('COSTA-1 · Costa Tile')).toBeInTheDocument();
  expect(screen.queryByText(/Store stock 0/)).not.toBeInTheDocument();
});

test('choosing a store keeps the invoice editor open and refreshes search with that store', async () => {
  const selectStore = jest.fn();
  useStores.mockReturnValue({ stores: [], selectedStoreId: '', selectStore });
  mockProductSearch();
  const view = render(billingPage());
  fireEvent.click(screen.getByRole('button', { name: 'New invoice' }));
  fireEvent.focus(screen.getByRole('combobox', { name: 'Search products by SKU or name' }));
  fireEvent.change(screen.getByRole('combobox', { name: 'Search products by SKU or name' }), { target: { value: 'costa' } });
  await screen.findByRole('option', { name: 'COSTA-1 · Costa Tile' });
  useStores.mockReturnValue({ stores: [{ id: 1, name: 'Mahua' }], selectedStoreId: '1', selectStore });
  view.rerender(billingPage());
  await waitFor(() => expect(api.get).toHaveBeenCalledWith('http://localhost:4000/api/tiles/products/search', { params: { q: 'costa', storeId: '1', limit: 12 } }));
  expect(screen.getByRole('button', { name: 'Save draft' })).toBeEnabled();
  expect(screen.getByRole('combobox', { name: 'Search products by SKU or name' })).toHaveValue('costa');
});

test('product search displays API failures so they are not mistaken for empty results', async () => {
  api.get.mockImplementation(url => url.endsWith('/products/search') ? Promise.reject({ response: { data: { message: 'You do not have access to this store' } } }) : Promise.resolve({ data: [] }));
  render(billingPage());
  fireEvent.click(screen.getByRole('button', { name: 'New invoice' }));
  fireEvent.focus(screen.getByRole('combobox', { name: 'Search products by SKU or name' }));
  fireEvent.change(screen.getByRole('combobox', { name: 'Search products by SKU or name' }), { target: { value: 'costa' } });
  expect(await screen.findByText('You do not have access to this store')).toBeInTheDocument();
});

test('cancelling an invoice requires explicit confirmation before calling the existing API', async () => {
  api.post.mockResolvedValue({ data: { ...draft, status: 'cancelled' } });
  render(<MemoryRouter initialEntries={['/sales/42']}><Routes><Route path="/sales/:id" element={<SalesBilling />} /></Routes></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: 'Cancel draft' }));
  const dialog = screen.getByRole('dialog');
  expect(api.post).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Keep invoice' }));
  expect(api.post).not.toHaveBeenCalled();
  fireEvent.click(await screen.findByRole('button', { name: 'Cancel draft' }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm cancellation' }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('http://localhost:4000/api/tiles/sales/42/cancel'));
});

test('Non-GST editor hides tax and adjustments and recalculates quantity times rate',async()=>{
 api.get.mockImplementation(url=>Promise.resolve({data:url.endsWith('/invoice-settings')?{data:{invoiceType:'NON_GST',registrationStatus:'UNREGISTERED'}}:url.endsWith('/products/search')?{items:[{...product,default_selling_price:'850',tax_rate:'18'}]}:url.endsWith('/units')?[{id:1,name:'Box'}]:[]}));
 render(billingPage());fireEvent.click(screen.getByRole('button',{name:'New invoice'}));
 await screen.findByText(/Non-GST Commercial Invoice/);
 fireEvent.focus(screen.getByRole('combobox',{name:'Search products by SKU or name'}));
 fireEvent.change(screen.getByRole('combobox',{name:'Search products by SKU or name'}),{target:{value:'costa'}});
 fireEvent.click(await screen.findByRole('option',{name:'COSTA-1 · Costa Tile'}));
 await screen.findByRole('button',{name:'Remove'});
 expect(screen.queryByLabelText('Tax %')).not.toBeInTheDocument();expect(screen.queryByLabelText('Discount')).not.toBeInTheDocument();expect(screen.queryByLabelText('Invoice discount')).not.toBeInTheDocument();expect(screen.queryByText('Estimated tax')).not.toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('Qty'),{target:{value:'10'}});
 expect(screen.getAllByText('₹8,500.00')).toHaveLength(2);
 fireEvent.change(screen.getByLabelText('Rate'),{target:{value:'600'}});
 expect(screen.getAllByText('₹6,000.00')).toHaveLength(2);
 fireEvent.click(screen.getByRole('button',{name:'Remove'}));expect(screen.getByText('₹0.00')).toBeInTheDocument();
});

test('Simple Layout on a GST invoice hides tax inputs while retaining the tax in the grand total',async()=>{
 api.get.mockImplementation(url=>Promise.resolve({data:url.endsWith('/invoice-settings')?{data:{invoiceType:'GST',invoiceLayout:'SIMPLE_LAYOUT',defaultDocumentType:'GST_TAX_INVOICE',documentOptions:[{value:'GST_TAX_INVOICE',label:'GST Tax Invoice',reason:null}]}}:url.endsWith('/products/search')?{items:[{...product,default_selling_price:'100',tax_rate:'18'}]}:url.endsWith('/units')?[{id:1,name:'Box'}]:[]}));
 render(billingPage());fireEvent.click(screen.getByRole('button',{name:'New invoice'}));await screen.findByText(/GST Tax Invoice · Tiles Wala Simple Billing/);
 fireEvent.focus(screen.getByRole('combobox',{name:'Search products by SKU or name'}));fireEvent.change(screen.getByRole('combobox',{name:'Search products by SKU or name'}),{target:{value:'costa'}});
 fireEvent.click(await screen.findByRole('option',{name:'COSTA-1 · Costa Tile'}));await screen.findByRole('button',{name:'Remove'});
 expect(screen.queryByLabelText('Tax %')).not.toBeInTheDocument();expect(screen.queryByLabelText('Discount')).not.toBeInTheDocument();
 expect(screen.getByText('Estimated tax')).toBeInTheDocument();expect(screen.getByText('₹18.00')).toBeInTheDocument();expect(screen.getByText('₹118.00')).toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('Qty'),{target:{value:'2'}});expect(screen.getByText('₹236.00')).toBeInTheDocument();
});

const storeTaxSettings=(status='UNKNOWN',category='UNKNOWN',canEdit=true)=>({
 invoiceType:'GST',invoiceLayout:'SIMPLE_LAYOUT',defaultDocumentType:'GST_TAX_INVOICE',registrationStatus:status,registrationCategory:category,gstin:'10JNEPD0678B1ZL',canEdit,
 documentOptions:taxDocumentOptions({gstin:'10JNEPD0678B1ZL',gst_registration_status:status,gst_registration_category:category})
});
const setupBlockedStore=(canEdit=true,layout='SIMPLE_LAYOUT')=>{
 let settings={...storeTaxSettings('UNKNOWN','UNKNOWN',canEdit),invoiceLayout:layout};
 api.get.mockImplementation(url=>Promise.resolve({data:url.endsWith('/invoice-settings')?{data:settings}:url.endsWith('/products/search')?{items:[{...product,default_selling_price:'850',tax_rate:'18'}]}:url.endsWith('/units')?[{id:1,name:'Box'}]:[]}));
 api.put.mockImplementation((url,body)=>{
  settings={...storeTaxSettings(body.registrationStatus,body.registrationCategory,canEdit),invoiceLayout:layout};
  return Promise.resolve({data:{success:true,data:settings}});
 });
};
const selectTaxSetup=async(label,name)=>{
 fireEvent.mouseDown(within(screen.getByRole('dialog',{name:'Complete store tax setup'})).getByRole('combobox',{name:label}));
 fireEvent.click(await screen.findByRole('option',{name}));
};
test('incomplete tax setup can be completed inside Simple Billing without losing product entries',async()=>{
 setupBlockedStore();render(billingPage());fireEvent.click(screen.getByRole('button',{name:'New invoice'}));
 await screen.findByRole('button',{name:'Complete tax setup'});
 expect(screen.getByRole('button',{name:'Save draft'})).toBeDisabled();expect(screen.getByRole('combobox',{name:'Tax document type'})).toHaveTextContent(/^GST Tax Invoice$/);
 const search=screen.getByRole('combobox',{name:'Search products by SKU or name'});fireEvent.focus(search);fireEvent.change(search,{target:{value:'costa'}});
 fireEvent.click(await screen.findByRole('option',{name:'COSTA-1 · Costa Tile'}));await screen.findByRole('button',{name:'Remove'});
 fireEvent.change(screen.getByLabelText('Qty'),{target:{value:'12'}});
 fireEvent.click(screen.getByRole('button',{name:'Complete tax setup'}));
 const dialog=screen.getByRole('dialog',{name:'Complete store tax setup'});
 expect(within(dialog).getByRole('combobox',{name:'Business GST registration'})).toHaveTextContent('Not established');
 expect(within(dialog).getByRole('button',{name:'Save tax setup & continue'})).toBeDisabled();
 await selectTaxSetup('Business GST registration','Registered');
 expect(within(dialog).getByRole('button',{name:'Save tax setup & continue'})).toBeDisabled();
 await selectTaxSetup('Registration category','Regular');
 fireEvent.click(within(dialog).getByRole('button',{name:'Save tax setup & continue'}));
 await waitFor(()=>expect(screen.queryByRole('dialog',{name:'Complete store tax setup'})).not.toBeInTheDocument());
 await waitFor(()=>expect(screen.getByRole('button',{name:'Save draft'})).toBeEnabled());
 expect(screen.getByRole('button',{name:'Finalize invoice'})).toBeEnabled();expect(screen.getByLabelText('Qty')).toHaveValue(12);expect(screen.getByLabelText('Rate')).toHaveValue(850);
 expect(screen.getByText('₹12,036.00')).toBeInTheDocument();expect(screen.queryByText('Item discounts')).not.toBeInTheDocument();expect(screen.queryByText('Additional charges')).not.toBeInTheDocument();
 expect(api.put).toHaveBeenCalledWith('http://localhost:4000/api/tiles/stores/1/invoice-settings',{registrationStatus:'REGISTERED',registrationCategory:'REGULAR',defaultDocumentType:'GST_TAX_INVOICE'});
 expect(api.post).not.toHaveBeenCalled();
});
test('cancelling tax setup preserves the invoice and does not change registration',async()=>{
 setupBlockedStore();render(billingPage());fireEvent.click(screen.getByRole('button',{name:'New invoice'}));fireEvent.click(await screen.findByRole('button',{name:'Complete tax setup'}));
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Back to invoice'}));
 expect(await screen.findByRole('heading',{name:'New invoice'})).toBeInTheDocument();expect(api.put).not.toHaveBeenCalled();expect(screen.getByRole('button',{name:'Finalize invoice'})).toBeDisabled();
});
test('users without store-management permission get an actionable explanation without a settings mutation',async()=>{
 setupBlockedStore(false);render(billingPage());fireEvent.click(screen.getByRole('button',{name:'New invoice'}));
 expect(await screen.findByText(/Ask a store owner, manager, or administrator to confirm/)).toBeInTheDocument();expect(screen.queryByRole('button',{name:'Complete tax setup'})).not.toBeInTheDocument();expect(api.put).not.toHaveBeenCalled();
});
test('backend tax-setup errors remain visible and do not unlock invoice finalization',async()=>{
 setupBlockedStore();api.put.mockRejectedValue({response:{data:{message:'You no longer manage this store'}}});
 render(billingPage());fireEvent.click(screen.getByRole('button',{name:'New invoice'}));fireEvent.click(await screen.findByRole('button',{name:'Complete tax setup'}));
 await selectTaxSetup('Business GST registration','Registered');await selectTaxSetup('Registration category','Regular');fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Save tax setup & continue'}));
 expect(await screen.findByText('You no longer manage this store')).toBeInTheDocument();fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Back to invoice'}));await screen.findByRole('heading',{name:'New invoice'});expect(screen.getByRole('button',{name:'Finalize invoice'})).toBeDisabled();
});

for(const layout of ['STANDARD_GST_LAYOUT','SIMPLE_LAYOUT']){
 test(`${layout}: Finalize directly resolves incomplete setup and then creates/posts the invoice`,async()=>{
  setupBlockedStore(true,layout);
  let savedInvoice={id:42,store_id:1,status:'draft',invoice_number:null,items:[],payments:[],invoice_layout:layout,invoice_type:'GST',document_type:'GST_TAX_INVOICE',total:'11033.00'};
  const get=api.get.getMockImplementation();
  api.get.mockImplementation(url=>url.endsWith('/sales/42')?Promise.resolve({data:savedInvoice}):get(url));
  api.post.mockImplementation(url=>{
   if(url.endsWith('/finalize'))savedInvoice={...savedInvoice,status:'posted',invoice_number:'INV-42'};
   return Promise.resolve({data:savedInvoice});
  });
  render(<MemoryRouter initialEntries={['/billing']}><Routes><Route path="/billing" element={<SalesBilling/>}/><Route path="/sales/:id" element={<SalesBilling/>}/></Routes></MemoryRouter>);
  fireEvent.click(screen.getByRole('button',{name:'New invoice'}));await screen.findByRole('button',{name:'Complete tax setup'});
  const search=screen.getByRole('combobox',{name:'Search products by SKU or name'});fireEvent.focus(search);fireEvent.change(search,{target:{value:'costa'}});
  fireEvent.click(await screen.findByRole('option',{name:'COSTA-1 · Costa Tile'}));await screen.findByRole('button',{name:'Remove'});
  fireEvent.change(screen.getByLabelText('Qty'),{target:{value:'11'}});
  if(layout==='STANDARD_GST_LAYOUT')fireEvent.change(screen.getByLabelText('Additional charges'),{target:{value:'100'}});
  const finalize=screen.getByRole('button',{name:'Finalize invoice'});
  expect(finalize).toBeEnabled();expect(screen.getByRole('button',{name:'Save draft'})).toBeDisabled();
  expect(finalize.closest('.sales-form')).toHaveTextContent('Click Finalize invoice to complete the store tax setup');
  fireEvent.click(finalize);expect(api.post).not.toHaveBeenCalled();
  expect(await screen.findByRole('dialog',{name:'Complete store tax setup'})).toBeInTheDocument();
  await selectTaxSetup('Business GST registration','Registered');await selectTaxSetup('Registration category','Regular');
  fireEvent.click(within(screen.getByRole('dialog',{name:'Complete store tax setup'})).getByRole('button',{name:'Save tax setup & continue'}));
  const confirm=await screen.findByRole('dialog',{name:'Finalize invoice'});
  const submit=within(confirm).getByRole('button',{name:'Confirm & finalize'});await waitFor(()=>expect(submit).toBeEnabled());fireEvent.click(submit);
  await waitFor(()=>expect(api.post).toHaveBeenCalledWith('http://localhost:4000/api/tiles/sales',expect.objectContaining({invoiceLayout:layout,documentType:'GST_TAX_INVOICE',additionalCharges:layout==='SIMPLE_LAYOUT'?'0':'100',items:[expect.objectContaining({quantity:'11',unitPrice:'850'})]})));
  await waitFor(()=>expect(api.post).toHaveBeenCalledWith('http://localhost:4000/api/tiles/sales/42/finalize',{payment:undefined}));
  expect(await screen.findByRole('button',{name:'Print invoice'})).toBeInTheDocument();
 });
}

const setupEligibleSale=(document='GST_TAX_INVOICE',classification='TAXABLE',rate='18')=>{
 const settings={...storeTaxSettings('REGISTERED','REGULAR'),defaultDocumentType:document};
 const tile={...product,default_selling_price:'850',tax_rate:rate,hsn_code:'6907',gst_supply_classification:classification,gst_classification_reference:classification==='EXEMPT'?'Reviewed exemption':''};
 api.get.mockImplementation(url=>Promise.resolve({data:url.endsWith('/invoice-settings')?{data:settings}:url.endsWith('/products/search')?{items:[tile]}:url.endsWith('/units')?[{id:1,name:'Box'}]:url.endsWith('/methods')?[{code:'cash',label:'Cash'}]:[]}));
 return {settings,tile};
};
const addSaleProduct=async()=>{
 fireEvent.click(screen.getByRole('button',{name:'New invoice'}));
 await screen.findByText(/Tiles Wala Simple Billing/);
 const search=screen.getByRole('combobox',{name:'Search products by SKU or name'});fireEvent.focus(search);fireEvent.change(search,{target:{value:'costa'}});
 fireEvent.click(await screen.findByRole('option',{name:'COSTA-1 · Costa Tile'}));await screen.findByRole('button',{name:'Remove'});
 fireEvent.change(screen.getByLabelText('Qty'),{target:{value:'3'}});
};
test('reported saved Bill of Supply default shows the product repair action without converting its classification',async()=>{
 setupEligibleSale('BILL_OF_SUPPLY','UNKNOWN',null);
 render(billingPage());await addSaleProduct();
 expect(screen.getByRole('combobox',{name:'Tax document type'})).toHaveTextContent('Bill of Supply');
 expect(screen.getByText(/Product Costa Tile requires HSN and GST supply classification/)).toBeInTheDocument();
 expect(screen.getByRole('link',{name:'Update product'})).toHaveAttribute('href','/products?edit=7');
 expect(screen.getByRole('button',{name:'Finalize invoice'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Use GST Tax Invoice for this sale'}));
 expect(screen.getByText(/needs its applicable GST rate configured/)).toBeInTheDocument();
 expect(screen.getByRole('combobox',{name:'Tax document type'})).toHaveTextContent('GST Tax Invoice');
 expect(api.put).not.toHaveBeenCalled();expect(api.post).not.toHaveBeenCalled();
});
test('Simple GST uses its saved GST default and validates full/partial/zero and excessive payment inline',async()=>{
 setupEligibleSale();render(billingPage());await addSaleProduct();
 expect(screen.getByLabelText('Product columns')).toHaveTextContent('Product NameQuantityUnitRateLine Total');
 expect(screen.getByRole('combobox',{name:'Tax document type'})).toHaveTextContent('GST Tax Invoice');
 expect(screen.queryByLabelText('Tax %')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Finalize invoice'}));
 const dialog=within(screen.getByRole('dialog',{name:'Finalize invoice'})),amount=dialog.getByLabelText('Amount received now (optional)'),confirm=dialog.getByRole('button',{name:'Confirm & finalize'});
 expect(dialog.getByText('Invoice total: ₹3,009.00')).toBeInTheDocument();expect(dialog.getByText('Invoice number: Assigned on finalization')).toBeInTheDocument();
 for(const [value,balance] of [['1000','₹2,009.00'],['3009','₹0.00'],['0','₹3,009.00']]){
  fireEvent.change(amount,{target:{value}});expect(confirm).toBeEnabled();expect(dialog.getByText(`Balance due: ${balance}`)).toBeInTheDocument();
 }
 for(const value of ['25550','-1','abc']){fireEvent.change(amount,{target:{value}});expect(confirm).toBeDisabled();}
 expect(api.post).not.toHaveBeenCalled();
});
test('eligible Bill of Supply has a 2550 total and rejects 25550 before any API write',async()=>{
 setupEligibleSale('BILL_OF_SUPPLY','EXEMPT');render(billingPage());await addSaleProduct();
 fireEvent.click(screen.getByRole('button',{name:'Finalize invoice'}));
 const dialog=within(screen.getByRole('dialog',{name:'Finalize invoice'}));
 expect(dialog.getByText('Invoice total: ₹2,550.00')).toBeInTheDocument();
 fireEvent.change(dialog.getByLabelText('Amount received now (optional)'),{target:{value:'25550'}});
 expect(dialog.getByText(/Amount received cannot exceed/)).toBeInTheDocument();expect(dialog.getByRole('button',{name:'Confirm & finalize'})).toBeDisabled();
 fireEvent.change(dialog.getByLabelText('Amount received now (optional)'),{target:{value:'1000'}});
 expect(dialog.getByText('Balance due: ₹1,550.00')).toBeInTheDocument();expect(dialog.getByRole('button',{name:'Confirm & finalize'})).toBeEnabled();expect(api.post).not.toHaveBeenCalled();
});
test('failed finalization keeps the created draft for retry instead of creating duplicate drafts',async()=>{
 setupEligibleSale();const saved={...draft,invoice_type:'GST',invoice_layout:'SIMPLE_LAYOUT',document_type:'GST_TAX_INVOICE',items:[]};
 api.post.mockImplementation(url=>url.endsWith('/finalize')?Promise.reject({response:{data:{code:'INSUFFICIENT_STOCK',productId:7,field:'items',message:'Insufficient stock'}}}):Promise.resolve({data:saved}));
 api.put.mockResolvedValue({data:saved});
 render(billingPage());await addSaleProduct();fireEvent.click(screen.getByRole('button',{name:'Finalize invoice'}));
 let dialog=within(screen.getByRole('dialog',{name:'Finalize invoice'}));fireEvent.click(dialog.getByRole('button',{name:'Confirm & finalize'}));
 await waitFor(()=>expect(dialog.getByText('Insufficient stock')).toBeInTheDocument());
 expect(dialog.getByRole('button',{name:'Confirm & finalize'})).toBeDisabled();
 fireEvent.click(dialog.getByRole('button',{name:'Back'}));
 await waitFor(()=>expect(screen.queryByRole('dialog',{name:'Finalize invoice'})).not.toBeInTheDocument());
 fireEvent.change(screen.getByLabelText('Qty'),{target:{value:'2'}});
 fireEvent.click(screen.getByRole('button',{name:'Finalize invoice'}));
 dialog=within(screen.getByRole('dialog',{name:'Finalize invoice'}));
 expect(dialog.getByRole('button',{name:'Confirm & finalize'})).toBeEnabled();
 fireEvent.click(dialog.getByRole('button',{name:'Confirm & finalize'}));
 await waitFor(()=>expect(api.put).toHaveBeenCalledWith('http://localhost:4000/api/tiles/sales/42',expect.objectContaining({documentType:'GST_TAX_INVOICE'})));
 expect(api.post.mock.calls.filter(([url])=>url==='http://localhost:4000/api/tiles/sales')).toHaveLength(1);
});
test('opening an old draft uses its saved appearance and document rather than store defaults',async()=>{
 const existing={...draft,invoice_layout:'SIMPLE_LAYOUT',document_type:'BILL_OF_SUPPLY',invoice_type:null,items:[{id:1,product_id:7,unit_id:1,quantity:'3',unit_price:'850',discount_amount:'0',tax_rate:'0',unit_name:'Box',product_name:'Costa Tile'}]};
 api.get.mockImplementation(url=>Promise.resolve({data:url.endsWith('/sales/42')?existing:[]}));
 render(<MemoryRouter initialEntries={['/sales/42']}><Routes><Route path="/sales/:id" element={<SalesBilling/>}/></Routes></MemoryRouter>);
 fireEvent.click(await screen.findByRole('button',{name:'Edit'}));
 expect(screen.getByText('Bill of Supply · Tiles Wala Simple Billing')).toBeInTheDocument();expect(screen.getByText(/This draft keeps its saved appearance and tax document/)).toBeInTheDocument();
 expect(screen.queryByRole('combobox',{name:'Tax document type'})).not.toBeInTheDocument();expect(api.get.mock.calls.some(([url])=>url.endsWith('/invoice-settings'))).toBe(false);
});
test('screenshot case selects eligible GST for a new Simple sale despite the Bill of Supply default',async()=>{
 setupEligibleSale('BILL_OF_SUPPLY','UNKNOWN','18.0000');render(billingPage());await addSaleProduct();
 expect(screen.getByRole('combobox',{name:'Tax document type'})).toHaveTextContent('GST Tax Invoice');
 expect(screen.getByText(/saved default is not eligible/)).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Finalize invoice'})).toBeEnabled();
 expect(screen.queryByRole('link',{name:'Update product'})).not.toBeInTheDocument();expect(screen.getByText('₹3,009.00')).toBeInTheDocument();
 expect(screen.queryByLabelText('Tax %')).not.toBeInTheDocument();expect(api.put).not.toHaveBeenCalled();
 const saved={...draft,invoice_layout:'SIMPLE_LAYOUT',document_type:'GST_TAX_INVOICE',invoice_type:'GST'};
 api.post.mockResolvedValue({data:saved});fireEvent.click(screen.getByRole('button',{name:'Finalize invoice'}));
 fireEvent.click(within(screen.getByRole('dialog',{name:'Finalize invoice'})).getByRole('button',{name:'Confirm & finalize'}));
 await waitFor(()=>expect(api.post).toHaveBeenCalledWith('http://localhost:4000/api/tiles/sales',expect.objectContaining({documentType:'GST_TAX_INVOICE',invoiceLayout:'SIMPLE_LAYOUT'})));
 await waitFor(()=>expect(api.post).toHaveBeenCalledWith('http://localhost:4000/api/tiles/sales/42/finalize',{payment:undefined}));
});
test('explicit Bill of Supply selection retains genuine classification validation after automatic resolution',async()=>{
 setupEligibleSale('BILL_OF_SUPPLY','UNKNOWN','18');render(billingPage());await addSaleProduct();
 fireEvent.mouseDown(screen.getByRole('combobox',{name:'Tax document type'}));fireEvent.click(await screen.findByRole('option',{name:'Bill of Supply'}));
 expect(await screen.findByText(/Product Costa Tile requires HSN and GST supply classification/)).toBeInTheDocument();
 expect(screen.getByRole('combobox',{name:'Tax document type'})).toHaveTextContent('Bill of Supply');expect(screen.getByRole('button',{name:'Finalize invoice'})).toBeDisabled();expect(api.post).not.toHaveBeenCalled();
});
