import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import FinancialReporting from './FinancialReporting';
import api from '../../api';
jest.mock('../../api',()=>({get:jest.fn()}));
jest.mock('../../context/StoreContext',()=>({useStores:()=>({stores:[{id:'33',name:'Store A'}],selectedStoreId:'33'})}));
const ledger={openingBalance:'100.00',closingBalance:'250.00',pagination:{total:1},items:[{entry_date:'2026-01-01',store_id:'33',store_name:'Store A',entry_type:'sales_invoice',reference:'INV-1',debit:'150.00',credit:'0.00',running_balance:'250.00',source_type:'sales_invoice',source_id:'1'}]};
test('financial reports expose opening/closing rows and full-period print/PDF actions for the selected account',async()=>{
 api.get.mockImplementation(url=>Promise.resolve({data:url.endsWith('/summary')?{stores:[],business:{receivables:'0.00',payables:'0.00'}}:url.endsWith('/search')?[{id:12,name:'Demo Customer'}]:ledger}));
 render(<FinancialReporting/>);fireEvent.click(screen.getByRole('tab',{name:'Customer / supplier ledger'}));
 expect(screen.getByRole('button',{name:'Download PDF'})).toBeDisabled();fireEvent.change(screen.getByLabelText('Search customer'),{target:{value:'Demo'}});
 fireEvent.mouseDown(screen.getByRole('combobox',{name:'Party'}));fireEvent.click(await screen.findByRole('option',{name:'Demo Customer'}));
 expect(await screen.findByText('Opening Balance')).toBeInTheDocument();expect(screen.getByText('Closing Balance')).toBeInTheDocument();expect(screen.getByRole('button',{name:'Download PDF'})).toBeEnabled();expect(screen.getByRole('button',{name:'Print Ledger'})).toBeEnabled();
 await waitFor(()=>expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/ledger/customer/12'),expect.objectContaining({params:expect.objectContaining({storeId:'33',limit:100,offset:0})})));
});
