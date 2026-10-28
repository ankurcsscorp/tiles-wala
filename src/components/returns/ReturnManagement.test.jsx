import {fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {MemoryRouter,Route,Routes} from 'react-router-dom';
import ReturnManagement from './ReturnManagement';
import api from '../../api';
import {useStores} from '../../context/StoreContext';
jest.mock('../../api',()=>({get:jest.fn(),post:jest.fn(),put:jest.fn()}));
jest.mock('../../context/AuthContext',()=>({useAuth:()=>({user:{userType:'Admin'}})}));
jest.mock('../../context/StoreContext',()=>({useStores:jest.fn()}));
jest.mock('../customers/CustomerSearch',()=>function CustomerStub({onSelect}){return <button onClick={()=>onSelect({id:3,name:'Customer',phone:'9999999999'})}>Choose customer</button>;});
jest.mock('../suppliers/SupplierSearch',()=>function SupplierStub({onSelect}){return <button onClick={()=>onSelect({id:4,name:'Supplier',phone:'8888888888'})}>Choose supplier</button>;});
jest.mock('../customers/CustomerManagement',()=>({CustomerForm:()=>null}));
const API='http://localhost:4000/api/tiles/returns';
const source={id:1,invoice_number:'INV-S1',invoice_date:'2026-10-20',total:'1000.00',store_id:1,invoice_layout:'SIMPLE_LAYOUT',document_type:'NON_GST_COMMERCIAL'};
const permissions={canEdit:true,canFinalize:true,canOverrideRate:true,canRefund:true,canInspect:true,allowUnlinked:false};
const items=[{id:7,product_id:9,sku:'T1',product_name:'Costa Blue',unit_id:1,unit_name:'Box',quantity:'10',remaining_quantity:'8',previously_returned_quantity:'2',unit_price:'100.0000',decimal_places:2,product_snapshot:{tileSize:'600 x 1200'},store_stock:'100',damaged_stock:'0'},
 {id:8,product_id:10,sku:'T2',product_name:'White Tile',unit_id:1,unit_name:'Box',quantity:'5',remaining_quantity:'5',previously_returned_quantity:'0',unit_price:'50.0000',decimal_places:2}];
let saved;
const makeRecord=body=>({id:11,store_id:1,sales_invoice_id:1,purchase_invoice_id:1,return_number:'SR-11',return_date:body.returnDate,reason:body.reason,notes:body.notes,total:'200.00',tax_adjustment:'0.00',status:'draft',party_id:3,party_name:'Customer',store_name:'Store A',original_invoice_number:'INV-S1',original_invoice_date:'2026-10-20',permissions,workflow_version:2,settlement_mode:body.settlementMode||'ADJUST',refund_amount:'0',effective_refund_amount:'0.00',unapplied_credit:'0.00',adjusted_amount:'200.00',current_party_balance:'100.00',allocations:[],refunds:[],buckets:[],amounts:{subtotal:'200.00'},items:body.items.map(line=>({id:20,...line,sales_invoice_item_id:line.invoiceItemId,purchase_invoice_item_id:line.invoiceItemId,sku:'T1',product_name:'Costa Blue',quantity:line.quantity,unit_name:'Box',unit_price:line.returnRate,unit_cost:line.returnRate,line_total:'200.00',restock_quantity:line.stockCondition==='SELLABLE'?line.quantity:'0',product_condition:line.stockCondition==='DAMAGED'?'damaged':'resalable',tax_rate:'0',tax_adjustment:'0',taxable_adjustment:'200.00'}))});
const calculate=body=>{
 const total=body.items.reduce((sum,line)=>sum+Number(line.quantity)*Number(line.returnRate),0),adjusted=body.settlementMode==='CREDIT'?0:Math.min(total,300);
 return {amounts:{subtotal:total.toFixed(2),total:total.toFixed(2),tax:'0.00',quantity:body.items.reduce((n,x)=>n+Number(x.quantity),0).toFixed(4)},outstandingBefore:'300.00',adjustedAmount:adjusted.toFixed(2),creditAmount:(total-adjusted-Number(body.refundAmount||0)).toFixed(2),refundAmount:body.refundAmount||'0',items:body.items.map(line=>({invoiceItemId:line.invoiceItemId,rate:line.returnRate,total:(Number(line.quantity)*Number(line.returnRate)).toFixed(2),taxable:(Number(line.quantity)*Number(line.returnRate)).toFixed(2),tax:'0.00'}))};
};
beforeEach(()=>{
 jest.clearAllMocks();saved=null;useStores.mockReturnValue({stores:[{id:1,name:'Store A'}],selectedStoreId:'1',selectStore:jest.fn()});
 api.get.mockImplementation(url=>Promise.resolve({data:url.endsWith('/eligible-invoices')?[{...source,returnable_amount:'800.00',returnable_quantity:'8'}]:url.endsWith('/party-balance')?{totalOutstanding:'300.00'}:url.includes('/invoice/')?{invoice:source,items,permissions,partyBalance:'300.00'}:url.endsWith('/methods')?[{code:'cash',label:'Cash'}]:url.endsWith('/11')?saved:[]}));
 api.post.mockImplementation((url,body)=>{
  if(url.endsWith('/preview'))return Promise.resolve({data:calculate(body)});
  if(url.endsWith('/finalize')){saved={...saved,status:'posted'};return Promise.resolve({data:saved});}
  saved=makeRecord(body);return Promise.resolve({data:saved});
 });
 api.put.mockImplementation((url,body)=>{saved=makeRecord(body);return Promise.resolve({data:saved});});
});
const page=(kind='sales',path)=>render(<MemoryRouter initialEntries={[path||`/returns/${kind}/new`]}><Routes><Route path="/returns" element={<ReturnManagement/>}/><Route path="/returns/:type/new" element={<ReturnManagement/>}/><Route path="/returns/:type/:id" element={<ReturnManagement/>}/><Route path="/returns/:type/:id/edit" element={<ReturnManagement/>}/></Routes></MemoryRouter>);
const selectOption=async(label,pattern)=>{const input=await screen.findByRole('combobox',{name:label});fireEvent.focus(input);if(input.getAttribute('aria-expanded')!=='true')fireEvent.mouseDown(input);fireEvent.click(await screen.findByRole('option',{name:pattern}));};
const prepare=async(kind='sales')=>{
 page(kind);fireEvent.click(screen.getByRole('button',{name:kind==='sales'?'Choose customer':'Choose supplier'}));
 await selectOption(kind==='sales'?'Original sales invoices':'Original purchase invoice',/^INV-S1/);
 await selectOption('Search products by name or SKU',/^T1 · Costa Blue/);
 fireEvent.change(screen.getByLabelText('Return quantity for Costa Blue'),{target:{value:'2'}});fireEvent.change(screen.getByRole('textbox',{name:/^Return reason/}),{target:{value:'Customer return'}});
 await waitFor(()=>expect(screen.getByRole('button',{name:'Save Draft'})).toBeEnabled());
};
test('Sales Return opens directly as an invoice entry page and saves a draft without posting',async()=>{
 await prepare();expect(screen.getByRole('heading',{name:'New sales return'})).toBeInTheDocument();expect(screen.getByText(/Current customer balance/)).toHaveTextContent('₹300');expect(screen.getByLabelText('Return product columns')).toHaveTextContent('Product NameQuantityUnitRateLine TotalAction');
 expect(screen.getByText(/Previously returned 2/)).toBeInTheDocument();expect(screen.queryByLabelText('Tax %')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Save Draft'}));await waitFor(()=>expect(api.post).toHaveBeenCalledWith(`${API}/sales`,expect.objectContaining({invoiceId:1,partyId:3,items:[expect.objectContaining({invoiceItemId:'7',quantity:'2',returnRate:'100.0000',stockCondition:'PENDING_INSPECTION'})]})));
 expect(api.post.mock.calls.some(([url])=>url.endsWith('/finalize'))).toBe(false);expect(await screen.findByText(/Status: draft/)).toBeInTheDocument();
});
test('finalization reviews return amount and stock before creating and posting the saved draft',async()=>{
 await prepare();fireEvent.mouseDown(screen.getByRole('combobox',{name:'Returned goods condition'}));fireEvent.click(await screen.findByRole('option',{name:'Sellable — received and accepted'}));
 await waitFor(()=>expect(screen.getByRole('button',{name:'Finalize Return'})).toBeEnabled());fireEvent.click(screen.getByRole('button',{name:'Finalize Return'}));
 const dialog=within(screen.getByRole('dialog',{name:'Finalize sales return'}));expect(dialog.getByText('Total return amount: ₹200')).toBeInTheDocument();expect(dialog.getByText('Amount adjusted: ₹200')).toBeInTheDocument();expect(dialog.getByText(/1 sellable line/)).toBeInTheDocument();expect(api.post.mock.calls.some(([url])=>url===`${API}/sales`)).toBe(false);
 fireEvent.click(dialog.getByRole('button',{name:'Confirm & Finalize'}));await waitFor(()=>expect(api.post).toHaveBeenCalledWith(`${API}/sales/11/finalize`,expect.objectContaining({idempotencyKey:expect.any(String)})));
 expect(await screen.findByRole('button',{name:'Print Return'})).toBeInTheDocument();expect(screen.getByText(/Status: posted/)).toBeInTheDocument();
});
test('Purchase Return uses supplier search, original purchase rates and the stock bucket selector',async()=>{
 await prepare('purchase');expect(screen.getByText(/Current supplier balance/)).toHaveTextContent('₹300');expect(screen.getByRole('combobox',{name:'Stock to send back'})).toHaveTextContent('Available sellable stock');
 fireEvent.click(screen.getByRole('button',{name:'Save Draft'}));await waitFor(()=>expect(api.post).toHaveBeenCalledWith(`${API}/purchase`,expect.objectContaining({partyId:4,items:[expect.objectContaining({quantity:'2',returnRate:'100.0000',stockBucket:'SELLABLE'})]})));
});
test('return quantity errors stay inline and block both saving and finalizing',async()=>{
 await prepare();const post=api.post.getMockImplementation();api.post.mockImplementation((url,body)=>url.endsWith('/preview')&&Number(body.items[0].quantity)>8?Promise.reject({response:{data:{message:'Quantity exceeds the remaining eligible quantity (8 Box)'}}}):post(url,body));
 fireEvent.change(screen.getByLabelText('Return quantity for Costa Blue'),{target:{value:'9'}});expect(await screen.findByText(/Quantity exceeds the remaining eligible/)).toBeInTheDocument();expect(screen.getByRole('button',{name:'Save Draft'})).toBeDisabled();expect(screen.getByRole('button',{name:'Finalize Return'})).toBeDisabled();
});
test('products can be added and removed and authorized rate edits require a reason input',async()=>{
 await prepare();await selectOption('Search products by name or SKU',/^T2 · White Tile/);fireEvent.change(screen.getByLabelText('Return rate for Costa Blue'),{target:{value:'90'}});expect(screen.getByRole('textbox',{name:'Reason for rate change'})).toBeInTheDocument();
 fireEvent.change(screen.getByRole('textbox',{name:'Reason for rate change'}),{target:{value:'Manager agreed a lower return rate'}});fireEvent.click(screen.getByRole('button',{name:'Remove White Tile'}));await waitFor(()=>expect(screen.getByRole('button',{name:'Save Draft'})).toBeEnabled());fireEvent.click(screen.getByRole('button',{name:'Save Draft'}));
 await waitFor(()=>expect(api.post).toHaveBeenCalledWith(`${API}/sales`,expect.objectContaining({items:[expect.objectContaining({returnRate:'90',rateChangeReason:'Manager agreed a lower return rate'})]})));
});
test('backend finalization failure preserves the saved draft for retry',async()=>{
 await prepare();const post=api.post.getMockImplementation();api.post.mockImplementation((url,body)=>url.endsWith('/finalize')?Promise.reject({response:{data:{message:'Stock changed. Refresh the return.'}}}):post(url,body));
 fireEvent.click(screen.getByRole('button',{name:'Finalize Return'}));fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Confirm & Finalize'}));
 expect(await within(screen.getByRole('dialog')).findByText('Stock changed. Refresh the return.')).toBeInTheDocument();fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Confirm & Finalize'}));
 await waitFor(()=>expect(api.put).toHaveBeenCalledWith(`${API}/sales/11`,expect.any(Object)));expect(api.post.mock.calls.filter(([url])=>url===`${API}/sales`)).toHaveLength(1);
});
test('an existing saved draft is reviewed through the same finalization modal',async()=>{
 saved=makeRecord({returnDate:'2026-10-27',reason:'Saved return',settlementMode:'ADJUST',items:[{invoiceItemId:7,quantity:'2',returnRate:'100',stockCondition:'SELLABLE'}]});
 page('sales','/returns/sales/11');fireEvent.click(await screen.findByRole('button',{name:'Finalize saved draft'}));
 const dialog=await screen.findByRole('dialog',{name:'Finalize sales return'});expect(within(dialog).getByText('Total return amount: ₹200')).toBeInTheDocument();expect(api.post.mock.calls.some(([url])=>url.endsWith('/finalize'))).toBe(false);
});

test('a customer can select five bills and return the same product at each original rate in one form',async()=>{
 const bills=Array.from({length:5},(_,index)=>({...source,id:index+1,invoice_number:'INV-S'+(index+1),returnable_amount:'800.00'}));
 const originalGet=api.get.getMockImplementation();
 api.get.mockImplementation(url=>{
  if(url.endsWith('/eligible-invoices'))return Promise.resolve({data:bills});
  if(url.includes('/invoice/')){const index=Number(url.split('/').pop())-1;return Promise.resolve({data:{invoice:bills[index],permissions,partyBalance:'300.00',items:[{...items[0],id:7+index,unit_price:String((index+1)*100),remaining_quantity:'8'}]}});}
  return originalGet(url);
 });
 page();fireEvent.click(screen.getByRole('button',{name:'Choose customer'}));
 for(const bill of bills)await selectOption('Original sales invoices',new RegExp('^'+bill.invoice_number+' ·'));
 for(const bill of bills)await selectOption('Search products by name or SKU',new RegExp('Bill '+bill.invoice_number+'$'));
 fireEvent.change(screen.getByRole('textbox',{name:/^Return reason/}),{target:{value:'Items from five bills'}});
 for(let i=0;i<5;i++)expect(screen.getByLabelText('Return rate for Costa Blue — INV-S'+(i+1))).toHaveValue((i+1)*100);
 await waitFor(()=>expect(screen.getByRole('button',{name:'Save Draft'})).toBeEnabled());
 fireEvent.click(screen.getByRole('button',{name:'Finalize Return'}));const dialog=within(screen.getByRole('dialog'));
 expect(dialog.getByText('Original invoice: INV-S1, INV-S2, INV-S3, INV-S4, INV-S5')).toBeInTheDocument();expect(dialog.getByText('Total return amount: ₹1,500')).toBeInTheDocument();
 fireEvent.click(dialog.getByRole('button',{name:'Confirm & Finalize'}));
 await waitFor(()=>expect(api.post).toHaveBeenCalledWith(API+'/sales',expect.objectContaining({items:bills.map((bill,index)=>expect.objectContaining({invoiceId:String(bill.id),invoiceItemId:String(7+index),quantity:'1',returnRate:String((index+1)*100)}))})));
 expect(api.post.mock.calls.filter(([url])=>url.endsWith('/finalize'))).toHaveLength(1);
});

test('adding a bill retains existing edited rows and removing it removes only its own products',async()=>{
 const second={...source,id:2,invoice_number:'INV-S2',returnable_amount:'500.00'},originalGet=api.get.getMockImplementation();
 api.get.mockImplementation(url=>url.endsWith('/eligible-invoices')?Promise.resolve({data:[source,second]}):url.endsWith('/invoice/sales/2')?Promise.resolve({data:{invoice:second,items:[{...items[1],id:10}],permissions,partyBalance:'300.00'}}):originalGet(url));
 await prepare();await selectOption('Original sales invoices',/^INV-S2/);
 expect(await screen.findByLabelText('Return quantity for Costa Blue — INV-S1')).toHaveValue(2);
 await selectOption('Search products by name or SKU',/Bill INV-S2$/);
 await selectOption('Original sales invoices',/^INV-S2/);
 await waitFor(()=>expect(screen.queryByRole('button',{name:/Remove White Tile/})).not.toBeInTheDocument());
 expect(await screen.findByLabelText('Return quantity for Costa Blue')).toHaveValue(2);
 await waitFor(()=>expect(screen.getByRole('button',{name:'Save Draft'})).toBeEnabled());
 fireEvent.click(screen.getByRole('button',{name:'Save Draft'}));
 await waitFor(()=>expect(api.post).toHaveBeenCalledWith(API+'/sales',expect.objectContaining({items:[expect.objectContaining({invoiceItemId:'7',quantity:'2',invoiceId:'1'})]})));
});

test('editing a saved multi-bill return reloads all sources and source-specific quantities',async()=>{
 const second={...source,id:2,invoice_number:'INV-S2',returnable_amount:'500.00'},originalGet=api.get.getMockImplementation();
 saved={...makeRecord({returnDate:'2026-10-27',reason:'Saved multi return',items:[{invoiceItemId:7,quantity:'2',returnRate:'100',stockCondition:'SELLABLE'},{invoiceItemId:10,quantity:'1',returnRate:'50',stockCondition:'DAMAGED'}]}),original_invoices:[source,second]};
 api.get.mockImplementation(url=>url.endsWith('/eligible-invoices')?Promise.resolve({data:[source,second]}):url.endsWith('/invoice/sales/2')?Promise.resolve({data:{invoice:second,items:[{...items[1],id:10}],permissions,partyBalance:'300.00'}}):originalGet(url));
 page('sales','/returns/sales/11/edit');
 expect(await screen.findByLabelText('Return quantity for Costa Blue — INV-S1')).toHaveValue(2);expect(screen.getByLabelText('Return quantity for White Tile — INV-S2')).toHaveValue(1);
 await waitFor(()=>expect(screen.getByRole('button',{name:'Save Draft'})).toBeEnabled());fireEvent.click(screen.getByRole('button',{name:'Save Draft'}));
 await waitFor(()=>expect(api.put).toHaveBeenCalledWith(API+'/sales/11',expect.objectContaining({items:[expect.objectContaining({invoiceItemId:'7',invoiceId:'1',quantity:'2'}),expect.objectContaining({invoiceItemId:'10',invoiceId:'2',quantity:'1'})]})));
});
