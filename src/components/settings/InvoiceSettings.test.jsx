import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import InvoiceSettings from './InvoiceSettings';
import api from '../../api';
import {useStores} from '../../context/StoreContext';
jest.mock('../../api',()=>({get:jest.fn(),put:jest.fn()}));
jest.mock('../../context/StoreContext',()=>({useStores:jest.fn()}));
const settings={storeId:33,invoiceType:'GST',invoiceLayout:'STANDARD_GST_LAYOUT',defaultDocumentType:'GST_TAX_INVOICE',registrationStatus:'UNKNOWN',registrationCategory:'UNKNOWN',gstin:'10JNEPD0678B1ZL',hasStoredTaxId:true,canEdit:true};
const page=()=> <MemoryRouter><InvoiceSettings/></MemoryRouter>;
beforeEach(()=>{jest.clearAllMocks();useStores.mockReturnValue({stores:[{id:33,name:'A & A Home Decor'},{id:2,name:'Other'}],selectedStoreId:'33',selectStore:jest.fn()});api.get.mockResolvedValue({data:{data:settings}});api.put.mockResolvedValue({data:{data:{...settings,invoiceLayout:'SIMPLE_LAYOUT'}}});});
test('GSTIN store with unknown declaration saves only its layout and restores it on reload',async()=>{
 const view=render(page());await screen.findByRole('radio',{name:'GST Billing'});
 fireEvent.click(screen.getByRole('radio',{name:'Tiles Wala Simple Billing'}));
 expect(screen.getByRole('button',{name:'Save Settings'})).toBeEnabled();
 fireEvent.click(screen.getByRole('button',{name:/Advanced:/}));
 expect(screen.getByRole('radio',{name:'Non-GST Commercial Invoice'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Save Settings'}));await screen.findByText(/Billing mode saved/);
 expect(api.put).toHaveBeenCalledWith('http://localhost:4000/api/tiles/stores/33/invoice-settings',{invoiceLayout:'SIMPLE_LAYOUT'});
 view.unmount();api.get.mockResolvedValue({data:{data:{...settings,invoiceLayout:'SIMPLE_LAYOUT'}}});render(page());expect(await screen.findByRole('radio',{name:'Tiles Wala Simple Billing'})).toBeChecked();
});
test('an incomplete tax configuration does not block an appearance-only change',async()=>{
 api.get.mockResolvedValue({data:{data:{...settings,gstin:'',hasStoredTaxId:false}}});render(page());await screen.findByRole('radio',{name:'Tiles Wala Simple Billing'});
 fireEvent.click(screen.getByRole('radio',{name:'Tiles Wala Simple Billing'}));expect(screen.getByText('Applies to Sales and Purchases.')).toBeInTheDocument();expect(screen.getByRole('button',{name:'Save Settings'})).toBeEnabled();
});
test('eligible unregistered store can select a commercial document',async()=>{
 api.get.mockResolvedValue({data:{data:{...settings,gstin:'',hasStoredTaxId:false,registrationStatus:'UNREGISTERED',defaultDocumentType:'NON_GST_COMMERCIAL'}}});render(page());await screen.findByRole('radio',{name:'GST Billing'});fireEvent.click(screen.getByRole('button',{name:/Advanced:/}));expect(await screen.findByRole('radio',{name:'Non-GST Commercial Invoice'})).toBeChecked();expect(screen.getByRole('radio',{name:'GST Tax Invoice'})).toBeDisabled();
});
test('incompatible registration changes explain why saving is blocked',async()=>{
 render(page());await screen.findByRole('radio',{name:'Tiles Wala Simple Billing'});
 fireEvent.click(screen.getByRole('button',{name:/Advanced:/}));
 fireEvent.mouseDown(screen.getByRole('combobox',{name:'Business GST registration declaration'}));fireEvent.click(await screen.findByRole('option',{name:'Unregistered'}));
 expect(screen.getByText(/incompatible with an Unregistered declaration/,{selector:'.MuiAlert-message'})).toBeInTheDocument();expect(screen.getByRole('button',{name:'Save Tax Configuration'})).toBeDisabled();expect(screen.getByRole('button',{name:'Save Settings'})).toBeEnabled();
 fireEvent.click(screen.getByRole('button',{name:'Save Settings'}));await screen.findByText(/Billing mode saved/);expect(api.put).toHaveBeenCalledWith(expect.any(String),{invoiceLayout:'STANDARD_GST_LAYOUT'});
});
test('switches stores and respects read-only permissions',async()=>{
 const view=render(page());await screen.findByRole('radio',{name:'Tiles Wala Simple Billing'});
 useStores.mockReturnValue({stores:[{id:2,name:'Other'}],selectedStoreId:'2',selectStore:jest.fn()});api.get.mockResolvedValue({data:{data:{...settings,storeId:2,canEdit:false}}});view.rerender(page());await screen.findByText(/Only store owners/);
 expect(api.get).toHaveBeenCalledWith('http://localhost:4000/api/tiles/stores/2/invoice-settings');expect(screen.getByRole('button',{name:'Save Settings'})).toBeDisabled();
});
test('shows backend errors',async()=>{
 api.put.mockRejectedValue({response:{data:{message:'Registration changed. Review settings.'}}});render(page());await screen.findByRole('radio',{name:'Tiles Wala Simple Billing'});fireEvent.click(screen.getByRole('button',{name:'Save Settings'}));expect(await screen.findByText('Registration changed. Review settings.')).toBeInTheDocument();
});
