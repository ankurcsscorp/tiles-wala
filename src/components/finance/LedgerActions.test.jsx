import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import LedgerActions from './LedgerActions';
import api from '../../api';
jest.mock('../../api',()=>({get:jest.fn()}));
const props={partyType:'customer',partyId:'12',storeId:'33',fromDate:'2026-01-01',toDate:'2026-10-28'};
let clicked,clickedLink;
beforeEach(()=>{jest.clearAllMocks();URL.createObjectURL=jest.fn(()=> 'blob:ledger-pdf');URL.revokeObjectURL=jest.fn();clicked=jest.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(function(){clickedLink=this;});});
afterEach(()=>{clicked.mockRestore();jest.restoreAllMocks();});
test('downloads a real PDF for the full selected scope without screen pagination',async()=>{
 const blob=new Blob(['%PDF-1.7']);api.get.mockResolvedValue({data:blob,headers:{'content-disposition':'attachment; filename="Ledger-Demo-2026-01-01-2026-10-28.pdf"'}});
 render(<LedgerActions {...props}/>);fireEvent.click(screen.getByRole('button',{name:'Download PDF'}));
 await waitFor(()=>expect(clicked).toHaveBeenCalledTimes(1));expect(api.get).toHaveBeenCalledWith('http://localhost:4000/api/tiles/financial-reports/ledger/customer/12/pdf',{params:{storeId:'33',fromDate:'2026-01-01',toDate:'2026-10-28'},responseType:'blob'});expect(clickedLink.download).toBe('Ledger-Demo-2026-01-01-2026-10-28.pdf');expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
});
test('prints the complete server statement after loading the embedded font',async()=>{
 const preview={document:{open:jest.fn(),write:jest.fn(),close:jest.fn(),fonts:{load:jest.fn(()=>Promise.resolve()),ready:Promise.resolve()}},focus:jest.fn(),print:jest.fn(),close:jest.fn(),closed:false};jest.spyOn(window,'open').mockReturnValue(preview);api.get.mockResolvedValue({data:'<!doctype html><title>Ledger</title><p>Opening Balance</p><p>Closing Balance</p>'});
 render(<LedgerActions {...props}/>);fireEvent.click(screen.getByRole('button',{name:'Print Ledger'}));await waitFor(()=>expect(preview.print).toHaveBeenCalled());expect(preview.document.write).toHaveBeenCalledWith(expect.stringContaining('Opening Balance'));expect(preview.document.fonts.load).toHaveBeenCalledWith('12px Ledger');expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/customer/12/print'),expect.objectContaining({responseType:'text',params:expect.objectContaining({fromDate:'2026-01-01'})}));
});
test('blocked print pop-ups are explained and do not issue a misleading export request',()=>{
 jest.spyOn(window,'open').mockReturnValue(null);render(<LedgerActions {...props}/>);fireEvent.click(screen.getByRole('button',{name:'Print Ledger'}));expect(screen.getByRole('alert')).toHaveTextContent('Allow pop-ups');expect(api.get).not.toHaveBeenCalled();expect(screen.getByRole('button',{name:'Download PDF'})).toBeEnabled();
});
test('PDF API errors show the server reason and keep retry available',async()=>{
 const blob=new Blob(['{}']);blob.text=async()=>JSON.stringify({message:'Choose a shorter date range to print or download.'});api.get.mockRejectedValue({response:{data:blob}});
 render(<LedgerActions {...props}/>);fireEvent.click(screen.getByRole('button',{name:'Download PDF'}));expect(await screen.findByRole('alert')).toHaveTextContent('Choose a shorter date range');expect(screen.getByRole('button',{name:'Download PDF'})).toBeEnabled();expect(clicked).not.toHaveBeenCalled();
});
test('party ledgers use their own permission-protected endpoint and export buttons require a party',async()=>{
 api.get.mockResolvedValue({data:new Blob(['%PDF-']),headers:{}});const {rerender}=render(<LedgerActions {...props} endpoint="http://localhost:4000/api/tiles/suppliers/4/ledger"/>);fireEvent.click(screen.getByRole('button',{name:'Download PDF'}));await waitFor(()=>expect(clicked).toHaveBeenCalled());expect(api.get).toHaveBeenCalledWith('http://localhost:4000/api/tiles/suppliers/4/ledger/pdf',expect.any(Object));rerender(<LedgerActions {...props} partyId=""/>);expect(screen.getByRole('button',{name:'Download PDF'})).toBeDisabled();expect(screen.getByRole('button',{name:'Print Ledger'})).toBeDisabled();
});
