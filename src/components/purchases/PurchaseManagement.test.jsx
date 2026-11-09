import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PurchaseManagement from './PurchaseManagement';
import api from '../../api';
import {useStores} from '../../context/StoreContext';
jest.mock('../../api', () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn() }));
jest.mock('../../context/StoreContext', () => ({ useStores: jest.fn() }));
jest.mock('../suppliers/SupplierSearch',()=>function SupplierStub({onSelect}) {return <button type="button" onClick={()=>onSelect({id:9,name:'Supplier'})}>Select fixture supplier</button>;});
beforeEach(()=>{jest.clearAllMocks();useStores.mockReturnValue({stores:[{id:1,name:'Mahua'},{id:2,name:'Other'}],selectedStoreId:'1'});});

test('purchase lists use the same colored payment badges as sales',async()=>{
 api.get.mockImplementation(url=>Promise.resolve({data:url.endsWith('/purchases')?{items:['unpaid','partially_paid','paid'].map((payment_status,i)=>({id:i+1,invoice_number:`PUR-${i}`,invoice_date:'2026-10-28',status:'posted',payment_status,total:'100.00'}))}:url.endsWith('/reports')?{summary:{},bySupplier:[],byStore:[]}:[]}));
 render(<MemoryRouter><PurchaseManagement/></MemoryRouter>);
 for(const label of ['Unpaid','Partially paid','Paid'])expect(await screen.findByLabelText(`Payment status: ${label}`)).toBeInTheDocument();
 expect(screen.queryByText('partially_paid')).not.toBeInTheDocument();
});

test('purchase invoice row menu exposes posted invoice management actions',async()=>{
 api.get.mockImplementation(url=>Promise.resolve({data:url.endsWith('/purchases')?{items:[{id:12,invoice_number:'AA-P0101',supplier_invoice_number:'SUP-41',store_name:'Mahua',supplier_name:'Supplier',invoice_date:'2026-10-28',status:'posted',payment_status:'unpaid',total:'200.00'}]}:url.endsWith('/reports')?{summary:{},bySupplier:[],byStore:[]}:[]}));
 render(<MemoryRouter><PurchaseManagement/></MemoryRouter>);
 fireEvent.click(await screen.findByRole('button',{name:'Actions for AA-P0101'}));
 for(const label of ['View Invoice','Edit Invoice','Print Invoice','Download PDF','Delete Duplicate Invoice','View History'])expect(screen.getByRole('menuitem',{name:new RegExp(label)})).toBeInTheDocument();
});

test('posting a purchase requires confirmation and retains the existing endpoint', async () => {
  const purchase = { id: 7, store_id: 1, status: 'draft', invoice_number: 'PUR-7', store_name: 'Mahua', items: [], receipts: [], payments: [] };
  api.get.mockImplementation((url) => Promise.resolve({ data: url.endsWith('/purchases/7') ? purchase : [] }));
  api.post.mockResolvedValue({ data: {} });
  render(<MemoryRouter initialEntries={['/purchases/7']}><Routes><Route path="/purchases/:id" element={<PurchaseManagement />} /></Routes></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: 'Post purchase' }));
  expect(api.post).not.toHaveBeenCalled();
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByText(/Stock is updated when goods are received/)).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm' }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('http://localhost:4000/api/tiles/purchases/7/post', {}));
});

const product={id:3,sku:'T1',name:'Fixture Tile',base_unit_id:1,base_unit_name:'Box',default_purchase_price:'100',tax_rate:'18',hsn_code:'6907'};
const fixture={id:7,store_id:1,status:'draft',invoice_layout:'SIMPLE_LAYOUT',supplier_document_type:'GST_TAX_INVOICE',supplier_tax_jurisdiction:'INTRA_STATE',supplier_id:9,supplier_name:'Supplier',invoice_date:'2026-10-24',invoice_number:'PUR-7',tax_total:'36',total:'236',subtotal:'200',freight_amount:'0',additional_charges:'0',round_off:'0',items:[],receipts:[],payments:[]};
const setup=layout=>{
 api.get.mockImplementation(url=>Promise.resolve({data:url.endsWith('/invoice-settings')?{data:{invoiceLayout:layout,invoiceType:'GST'}}:url.endsWith('/purchases/7')?fixture:url.endsWith('/purchases')?{items:[]}:url.endsWith('/reports')?{summary:{},bySupplier:[],byStore:[]}:url.endsWith('/products')||url.endsWith('/products/search')?{items:[product]}:[]}));
 api.post.mockResolvedValue({data:fixture});
};
const page=()=> <MemoryRouter><PurchaseManagement/></MemoryRouter>;
const select=async(label,option)=>{fireEvent.mouseDown(screen.getByRole('combobox',{name:label}));fireEvent.click(await screen.findByRole('option',{name:option}));};
const addProduct=async()=>{
 const input=screen.getByRole('combobox',{name:'Product'});fireEvent.focus(input);fireEvent.change(input,{target:{value:'Fixture'}});
 fireEvent.click(await screen.findByRole('option',{name:'T1 · Fixture Tile'}));
 await waitFor(()=>expect(screen.getByRole('spinbutton',{name:/^Rate/})).toHaveValue(100));fireEvent.change(screen.getByRole('spinbutton',{name:/^Quantity/}),{target:{value:'2'}});
};
test('Simple Purchase uses five entry fields and retains supplier GST in a separate section',async()=>{
 setup('SIMPLE_LAYOUT');render(page());fireEvent.click(await screen.findByRole('button',{name:'New purchase'}));await screen.findByText(/Tiles Wala Simple Billing · Payment status/);
 await select('Supplier invoice tax document','GST Tax Invoice — supplier charged GST');fireEvent.click(screen.getByRole('button',{name:'Select fixture supplier'}));await addProduct();
 const line=screen.getByRole('combobox',{name:'Product'}).closest('.purchase-line');
 expect(within(line).queryByRole('spinbutton',{name:/^Tax %/})).not.toBeInTheDocument();expect(within(line).queryByRole('spinbutton',{name:/^Discount/})).not.toBeInTheDocument();expect(within(line).getByText('₹200')).toBeInTheDocument();
 expect(screen.getByRole('spinbutton',{name:/GST rate for Fixture Tile/})).toHaveValue(18);expect(screen.getByText('₹236')).toBeInTheDocument();expect(screen.queryByRole('spinbutton',{name:/^Freight/})).not.toBeInTheDocument();
 await select('GST breakup on supplier invoice','CGST + SGST');fireEvent.change(screen.getByLabelText('GST total on supplier invoice'),{target:{value:'36'}});fireEvent.change(screen.getByLabelText('Supplier invoice number'),{target:{value:'SUP-1'}});
 fireEvent.click(screen.getByRole('button',{name:'Save draft'}));
 await waitFor(()=>expect(api.post).toHaveBeenCalledWith('http://localhost:4000/api/tiles/purchases',expect.objectContaining({invoiceLayout:'SIMPLE_LAYOUT',supplierDocumentType:'GST_TAX_INVOICE',declaredTaxTotal:'36',items:[expect.objectContaining({quantity:'2',unitPrice:'100',taxRate:'18',discountAmount:'0'})]})));
});
test('Simple Purchase without supplier GST sums quantity times rate and preserves product tax metadata',async()=>{
 setup('SIMPLE_LAYOUT');render(page());fireEvent.click(await screen.findByRole('button',{name:'New purchase'}));await screen.findByText(/Tiles Wala Simple Billing · Payment status/);
 await select('Supplier invoice tax document','Non-GST commercial invoice — no GST charged');await addProduct();
 expect(screen.getByText('Grand total').parentElement).toHaveTextContent('₹200');expect(screen.queryByRole('spinbutton',{name:/GST rate for Fixture Tile/})).not.toBeInTheDocument();expect(product.tax_rate).toBe('18');
});
test('GST preference keeps detailed Purchase inputs',async()=>{
 setup('STANDARD_GST_LAYOUT');render(page());fireEvent.click(await screen.findByRole('button',{name:'New purchase'}));await screen.findByText(/GST Billing · Payment status/);
 expect(screen.getByRole('spinbutton',{name:/^Tax %/})).toBeInTheDocument();expect(screen.getByRole('spinbutton',{name:/^Discount/})).toBeInTheDocument();expect(screen.getByRole('spinbutton',{name:/^Freight/})).toBeInTheDocument();
});
test('existing purchase drafts retain their saved layout without fetching the new default',async()=>{
 setup('STANDARD_GST_LAYOUT');render(<MemoryRouter initialEntries={['/purchases/7']}><Routes><Route path="/purchases/:id" element={<PurchaseManagement/>}/></Routes></MemoryRouter>);
 fireEvent.click(await screen.findByRole('button',{name:'Edit draft'}));expect(await screen.findByText(/Tiles Wala Simple Billing · Payment status/)).toBeInTheDocument();expect(api.get.mock.calls.some(([url])=>url.endsWith('/invoice-settings'))).toBe(false);
});
test('switching receiving store loads its own preference and keeps the new purchase editor open',async()=>{
 setup('SIMPLE_LAYOUT');api.get.mockImplementation(url=>Promise.resolve({data:url.endsWith('/stores/1/invoice-settings')?{data:{invoiceLayout:'SIMPLE_LAYOUT'}}:url.endsWith('/stores/2/invoice-settings')?{data:{invoiceLayout:'STANDARD_GST_LAYOUT'}}:url.endsWith('/purchases')?{items:[]}:url.endsWith('/reports')?{summary:{},bySupplier:[],byStore:[]}:[]}));
 render(page());fireEvent.click(await screen.findByRole('button',{name:'New purchase'}));await screen.findByText(/Tiles Wala Simple Billing · Payment status/);
 await select('Receiving store','Other');await screen.findByText(/GST Billing · Payment status/);expect(screen.getByRole('button',{name:'Add product'})).toBeInTheDocument();
});

test('Non-GST default purchase hides all GST setup and saves zero tax despite product GST metadata',async()=>{
 setup('SIMPLE_LAYOUT');const previous=api.get.getMockImplementation();
 api.get.mockImplementation(url=>url.endsWith('/invoice-settings')?Promise.resolve({data:{data:{billingMode:'NON_GST',invoiceType:'NON_GST',invoiceLayout:'SIMPLE_LAYOUT',defaultDocumentType:'NON_GST_COMMERCIAL'}}}):previous(url));
 render(page());fireEvent.click(await screen.findByRole('button',{name:'New purchase'}));await screen.findByText(/Non-GST — Tiles Wala Simple Billing/);
 expect(screen.queryByLabelText('Supplier invoice tax document')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Select fixture supplier'}));await addProduct();
 expect(screen.getByText('Grand total').parentElement).toHaveTextContent('₹200');expect(screen.queryByText('Supplier tax details')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Save draft'}));
 await waitFor(()=>expect(api.post).toHaveBeenCalledWith('http://localhost:4000/api/tiles/purchases',expect.objectContaining({supplierDocumentType:'NON_GST_COMMERCIAL',items:[expect.objectContaining({taxRate:'0'})]})));
 expect(product.tax_rate).toBe('18');
});
