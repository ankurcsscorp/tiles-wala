import {fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import PartyLedger from './PartyLedger';
import api from '../../api';
jest.mock('../../api',()=>({get:jest.fn()}));
jest.mock('../../context/StoreContext',()=>({useStores:()=>({stores:[{id:'33',name:'A & A Home Decor'}],selectedStoreId:'33'})}));
const report={scope:'A & A Home Decor',openingBalance:'100.00',closingBalance:'250.00',totalCredit:'50.00',totalDebit:'200.00',pagination:{total:2},items:[{entry_date:'2026-02-01',store_id:'33',store_name:'A & A Home Decor',entry_type:'sales_invoice',reference:'INV-1',source_id:'1',debit:'200.00',credit:'0.00',running_balance:'300.00'},{entry_date:'2026-02-02',store_id:'33',store_name:'A & A Home Decor',entry_type:'customer_receipt',reference:'REC-1',source_id:'2',payment_method:'cash',debit:'0.00',credit:'50.00',running_balance:'250.00'}]};
beforeEach(()=>{jest.clearAllMocks();api.get.mockResolvedValue({data:report});});
test('customer ledger shows opening and closing rows, period totals and print/PDF actions',async()=>{
 render(<PartyLedger partyType="customer" partyId="12"/>);const table=within(await screen.findByRole('table',{name:'Party ledger transactions'}));expect(table.getByText('Opening Balance')).toBeInTheDocument();expect(table.getByText('Closing Balance')).toBeInTheDocument();expect(table.getByText('Payment Received')).toBeInTheDocument();expect(table.getByText('₹100 Dr')).toBeInTheDocument();expect(table.getByText('₹300 Dr')).toBeInTheDocument();expect(screen.getByRole('button',{name:'Print Ledger'})).toBeEnabled();expect(screen.getByRole('button',{name:'Download PDF'})).toBeEnabled();
 fireEvent.change(screen.getByLabelText('From date'),{target:{value:'2026-01-01'}});await waitFor(()=>expect(api.get).toHaveBeenLastCalledWith(expect.stringContaining('/customers/12/ledger/report'),expect.objectContaining({params:expect.objectContaining({storeId:'33',fromDate:'2026-01-01',offset:0})})));
});
test('supplier statements retain the opposite debit/credit balance labels',async()=>{
 render(<PartyLedger partyType="supplier" partyId="4"/>);const table=within(await screen.findByRole('table'));expect(table.getByText('₹100 Cr')).toBeInTheDocument();expect(table.getByText('₹300 Cr')).toBeInTheDocument();expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/suppliers/4/ledger/report'),expect.any(Object));
});
test('empty periods still display both balance rows and allow export',async()=>{
 api.get.mockResolvedValue({data:{...report,openingBalance:'25.00',closingBalance:'25.00',totalCredit:'0.00',totalDebit:'0.00',pagination:{total:0},items:[]}});render(<PartyLedger partyType="customer" partyId="12"/>);expect(await screen.findByText('No transactions in this period.')).toBeInTheDocument();const table=within(screen.getByRole('table'));expect(table.getByText('Opening Balance')).toBeInTheDocument();expect(table.getByText('Closing Balance')).toBeInTheDocument();expect(screen.getByRole('button',{name:'Download PDF'})).toBeEnabled();
});
test('pagination shows closing balance on the final screen page without treating it as a movement',async()=>{
 api.get.mockImplementation((url,{params})=>Promise.resolve({data:params.offset?{...report,items:[report.items[1]],pagination:{total:101}}:{...report,pagination:{total:101}}}));render(<PartyLedger partyType="customer" partyId="12"/>);await screen.findByRole('table');expect(screen.queryByText('Closing Balance')).not.toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Next'}));await waitFor(()=>expect(api.get).toHaveBeenLastCalledWith(expect.any(String),expect.objectContaining({params:expect.objectContaining({offset:100})})));expect(await screen.findByText('Closing Balance')).toBeInTheDocument();expect(screen.queryByText('Opening Balance')).not.toBeInTheDocument();
});
