import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import PaymentManagement from './PaymentManagement';
import api from '../../api';
jest.mock('../../api',()=>({get:jest.fn(),post:jest.fn()}));
jest.mock('../../context/StoreContext',()=>({useStores:()=>({stores:[{id:1,name:'Store A'}],selectedStoreId:'1'})}));
jest.mock('../../context/AuthContext',()=>({useAuth:()=>({user:{userType:'Admin'}})}));
jest.mock('../customers/CustomerSearch',()=>function CustomerStub({onSelect}){return <button onClick={()=>onSelect({id:3,name:'Customer'})}>Choose customer</button>;});
jest.mock('../suppliers/SupplierSearch',()=>function SupplierStub({onSelect}){return <button onClick={()=>onSelect({id:4,name:'Supplier'})}>Choose supplier</button>;});
const API='http://localhost:4000/api/tiles/payments';
const invoices=[{id:12,invoice_number:'INV-NEW',invoice_date:'2026-10-20',total:'100.10',previously_allocated:'0',outstanding:'100.10'},
 {id:13,invoice_number:'INV-OLD',invoice_date:'2026-10-01',total:'50.25',previously_allocated:'0',outstanding:'50.25'}];
const payment={id:7,payment_number:'CR-7',status:'posted',party_type:'customer',store_name:'Store A',customer_name:'Customer',amount:'100',allocations:[{id:1,invoice_id:13,invoice_number:'INV-OLD',amount:'50.25'},{id:2,invoice_id:12,invoice_number:'INV-NEW',amount:'49.75'}]};
beforeEach(()=>{
 jest.clearAllMocks();
 api.get.mockImplementation(url=>Promise.resolve({data:url.endsWith('/eligible-invoices')?invoices:url.endsWith('/methods')?[{code:'cash',label:'Cash'}]:url.endsWith('/daily-collections')?{summary:{}}:url.endsWith('/7')?payment:{items:[]}}));
 api.post.mockResolvedValue({data:payment});
});
const openReceipt=async()=>{
 render(<PaymentManagement/>);fireEvent.click(screen.getByRole('button',{name:'Customer receipt'}));fireEvent.click(screen.getByRole('button',{name:'Choose customer'}));
 await screen.findByLabelText('Allocate to INV-OLD');fireEvent.change(screen.getByRole('spinbutton',{name:/Payment amount/}),{target:{value:'100'}});
};
test('an empty customer selection previews oldest invoices and sends no manual allocations for server allocation',async()=>{
 await openReceipt();expect(screen.getByLabelText('Allocate to INV-OLD')).toHaveValue(50.25);expect(screen.getByLabelText('Allocate to INV-NEW')).toHaveValue(49.75);
 expect(screen.getByText(/automatically pays the oldest outstanding invoices/)).toBeInTheDocument();
 fireEvent.change(screen.getByRole('spinbutton',{name:/Payment amount/}),{target:{value:'60'}});expect(screen.getByLabelText('Allocate to INV-NEW')).toHaveValue(9.75);
 fireEvent.click(screen.getByRole('button',{name:'Save payment'}));
 await waitFor(()=>expect(api.post).toHaveBeenCalledWith(`${API}/customer-receipts`,expect.objectContaining({partyId:3,amount:'60',allocations:[]})));
 expect(await screen.findByText('Invoice allocations')).toBeInTheDocument();expect(screen.queryByText('No invoice allocations. This payment is an advance.')).not.toBeInTheDocument();
});
test('manual invoice allocations override the automatic default',async()=>{
 await openReceipt();fireEvent.change(screen.getByLabelText('Allocate to INV-NEW'),{target:{value:'20'}});
 expect(screen.getByLabelText('Allocate to INV-OLD')).toHaveValue(null);
 fireEvent.click(screen.getByRole('button',{name:'Save payment'}));
 await waitFor(()=>expect(api.post).toHaveBeenCalledWith(`${API}/customer-receipts`,expect.objectContaining({allocations:[{invoiceId:'12',amount:'20'}]})));
});
test('an advance without outstanding invoices explains its customer credit in payment details',async()=>{
 const get=api.get.getMockImplementation();api.get.mockImplementation(url=>url.endsWith('/eligible-invoices')?Promise.resolve({data:[]}):get(url));
 api.post.mockResolvedValue({data:{...payment,allocations:[]}});
 render(<PaymentManagement/>);fireEvent.click(screen.getByRole('button',{name:'Customer receipt'}));fireEvent.click(screen.getByRole('button',{name:'Choose customer'}));
 fireEvent.change(screen.getByRole('spinbutton',{name:/Payment amount/}),{target:{value:'100'}});fireEvent.click(screen.getByRole('button',{name:'Save payment'}));
 expect(await screen.findByText(/This advance is already deducted from the customer’s total outstanding/)).toBeInTheDocument();
 expect(screen.getByText('No invoice allocations. This payment is an advance.')).toBeInTheDocument();
});
test('supplier payments retain manual allocation behavior',async()=>{
 render(<PaymentManagement/>);fireEvent.click(screen.getByRole('button',{name:'Supplier payment'}));fireEvent.click(screen.getByRole('button',{name:'Choose supplier'}));
 await screen.findByLabelText('Allocate to INV-OLD');fireEvent.change(screen.getByRole('spinbutton',{name:/Payment amount/}),{target:{value:'100'}});
 expect(screen.getByLabelText('Allocate to INV-OLD')).toHaveValue(null);expect(screen.queryByText(/automatically pays the oldest outstanding invoices/)).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Save payment'}));await waitFor(()=>expect(api.post).toHaveBeenCalledWith(`${API}/supplier-payments`,expect.objectContaining({allocations:[]})));
});
test('automatic allocations totaling 0.10 plus 0.20 allow saving a 0.30 receipt',async()=>{
 const get=api.get.getMockImplementation();api.get.mockImplementation(url=>url.endsWith('/eligible-invoices')?Promise.resolve({data:invoices.map(row=>({...row,total:row.id===13?'0.10':'0.20',outstanding:row.id===13?'0.10':'0.20'}))}):get(url));
 await openReceipt();fireEvent.change(screen.getByRole('spinbutton',{name:/Payment amount/}),{target:{value:'0.30'}});
 expect(screen.getByRole('button',{name:'Save payment'})).toBeEnabled();
 expect(screen.getByLabelText('Allocate to INV-OLD')).toHaveValue(0.1);expect(screen.getByLabelText('Allocate to INV-NEW')).toHaveValue(0.2);
});
