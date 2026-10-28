import {fireEvent,render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import InvoiceSettings from './InvoiceSettings';
import api from '../../api';
import {useStores} from '../../context/StoreContext';
jest.mock('../../api',()=>({get:jest.fn(),put:jest.fn()}));
jest.mock('../../context/StoreContext',()=>({useStores:jest.fn()}));
const settings={storeId:33,billingMode:'NON_GST',invoiceType:'NON_GST',invoiceLayout:'SIMPLE_LAYOUT',defaultDocumentType:'NON_GST_COMMERCIAL',registrationStatus:'UNKNOWN',registrationCategory:'UNKNOWN',gstin:'10JNEPD0678B1ZL',hasStoredTaxId:true,canEdit:true};
const page=()=> <MemoryRouter><InvoiceSettings/></MemoryRouter>;
beforeEach(()=>{jest.clearAllMocks();useStores.mockReturnValue({stores:[{id:33,name:'A & A Home Decor'},{id:2,name:'Other'}],selectedStoreId:'33',selectStore:jest.fn()});api.get.mockResolvedValue({data:{data:settings}});api.put.mockResolvedValue({data:{data:settings}});});
test('Non-GST defaults to five-column billing and saves without any GST declaration',async()=>{
 const view=render(page());expect(await screen.findByRole('radio',{name:'Non-GST — Tiles Wala Simple Billing'})).toBeChecked();
 expect(screen.queryByLabelText('Store GSTIN')).not.toBeInTheDocument();expect(screen.queryByText('Default Tax Document Type')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Save Settings'}));await screen.findByText(/Billing settings saved/);
 expect(api.put).toHaveBeenCalledWith('http://localhost:4000/api/tiles/stores/33/invoice-settings',{billingMode:'NON_GST'});
 view.unmount();render(page());expect(await screen.findByRole('radio',{name:'Non-GST — Tiles Wala Simple Billing'})).toBeChecked();
});
test('switching an incomplete GST store to Non-GST clears setup blockers without changing declarations',async()=>{
 api.get.mockResolvedValue({data:{data:{...settings,billingMode:'GST',defaultDocumentType:'GST_TAX_INVOICE'}}});render(page());await screen.findByRole('radio',{name:'GST Billing'});
 expect(screen.getByRole('button',{name:'Save Settings'})).toBeDisabled();expect(screen.getByText(/Confirm the actual Registered declaration/)).toBeInTheDocument();
 fireEvent.click(screen.getByRole('radio',{name:'Non-GST — Tiles Wala Simple Billing'}));expect(screen.getByRole('button',{name:'Save Settings'})).toBeEnabled();
 fireEvent.click(screen.getByRole('button',{name:'Save Settings'}));await screen.findByText(/Billing settings saved/);expect(api.put).toHaveBeenCalledWith(expect.any(String),{billingMode:'NON_GST'});
});
test('GST requires explicitly confirming the actual registration and category',async()=>{
 render(page());await screen.findByRole('radio',{name:'GST Billing'});fireEvent.click(screen.getByRole('radio',{name:'GST Billing'}));
 expect(screen.getByRole('button',{name:'Save Settings'})).toBeDisabled();
 fireEvent.mouseDown(screen.getByRole('combobox',{name:'Business GST registration declaration'}));fireEvent.click(await screen.findByRole('option',{name:'Registered'}));
 fireEvent.mouseDown(screen.getByRole('combobox',{name:'GST registration category'}));fireEvent.click(await screen.findByRole('option',{name:'Regular'}));
 fireEvent.click(screen.getByRole('button',{name:'Save Settings'}));await screen.findByText(/Billing settings saved/);
 expect(api.put).toHaveBeenCalledWith(expect.any(String),{billingMode:'GST',registrationStatus:'REGISTERED',registrationCategory:'REGULAR'});
});
test('GST without a valid GSTIN explains why saving is blocked',async()=>{
 api.get.mockResolvedValue({data:{data:{...settings,gstin:'',hasStoredTaxId:false}}});render(page());fireEvent.click(await screen.findByRole('radio',{name:'GST Billing'}));
 expect(screen.getByText(/A valid store GSTIN is required/)).toBeInTheDocument();expect(screen.getByRole('button',{name:'Save Settings'})).toBeDisabled();
});
test('switches stores and respects read-only permissions',async()=>{
 const view=render(page());await screen.findByRole('radio',{name:'GST Billing'});
 useStores.mockReturnValue({stores:[{id:2,name:'Other'}],selectedStoreId:'2',selectStore:jest.fn()});api.get.mockResolvedValue({data:{data:{...settings,storeId:2,canEdit:false}}});view.rerender(page());await screen.findByText(/Only store owners/);
 expect(api.get).toHaveBeenCalledWith('http://localhost:4000/api/tiles/stores/2/invoice-settings');expect(screen.getByRole('button',{name:'Save Settings'})).toBeDisabled();
});
test('shows backend errors',async()=>{
 api.put.mockRejectedValue({response:{data:{message:'You no longer manage this store'}}});render(page());await screen.findByRole('radio',{name:'GST Billing'});fireEvent.click(screen.getByRole('button',{name:'Save Settings'}));expect(await screen.findByText('You no longer manage this store')).toBeInTheDocument();
});

test('bank, UPI and multiline terms save per store and persist after refresh',async()=>{
 let saved=settings;
 api.put.mockImplementation(async(_,body)=>{saved={...settings,...body};return {data:{data:saved}};});
 const view=render(page());await screen.findByRole('radio',{name:'GST Billing'});
 for(const [label,value] of [['Account holder name','Demo Store'],['Account number','001234567890'],['Bank name','Demo Bank'],['Branch','Main Branch'],['IFSC code','abcd0123456'],['UPI ID','demo@bank'],['Terms and conditions','1. Saved term\n2. Another saved term']])fireEvent.change(screen.getByLabelText(label),{target:{value}});
 fireEvent.click(screen.getByRole('button',{name:'Save Settings'}));await screen.findByText(/Billing settings saved/);
 expect(api.put).toHaveBeenCalledWith(expect.stringContaining('/33/'),{termsAndConditions:'1. Saved term\n2. Another saved term',paymentDetails:{accountName:'Demo Store',accountNumber:'001234567890',bankName:'Demo Bank',branch:'Main Branch',ifscCode:'ABCD0123456',upiId:'demo@bank'}});
 view.unmount();api.get.mockResolvedValue({data:{data:saved}});render(page());await screen.findByRole('radio',{name:'GST Billing'});
 expect(screen.getByLabelText('Account number')).toHaveValue('001234567890');expect(screen.getByLabelText('UPI ID')).toHaveValue('demo@bank');expect(screen.getByLabelText('Terms and conditions')).toHaveValue('1. Saved term\n2. Another saved term');
});

test('footer-only changes can save without altering an incomplete GST configuration',async()=>{
 const gstSettings={...settings,billingMode:'GST',defaultDocumentType:'GST_TAX_INVOICE'};
 api.get.mockResolvedValue({data:{data:gstSettings}});api.put.mockResolvedValue({data:{data:{...gstSettings,termsAndConditions:'Saved terms'}}});
 render(page());await screen.findByLabelText('Terms and conditions');expect(screen.getByRole('button',{name:'Save Settings'})).toBeDisabled();
 fireEvent.change(screen.getByLabelText('Terms and conditions'),{target:{value:'Saved terms'}});
 expect(screen.getByRole('button',{name:'Save Settings'})).toBeEnabled();fireEvent.click(screen.getByRole('button',{name:'Save Settings'}));await screen.findByText(/Billing settings saved/);
 expect(api.put).toHaveBeenCalledWith(expect.any(String),{termsAndConditions:'Saved terms'});
});

test('payment fields honor store permissions and show validation errors from the server',async()=>{
 api.put.mockRejectedValue({response:{data:{message:'Bank details require account holder name, account number, bank name and IFSC code.'}}});
 const view=render(page());await screen.findByLabelText('Account number');fireEvent.change(screen.getByLabelText('Account number'),{target:{value:'1234567890'}});
 fireEvent.click(screen.getByRole('button',{name:'Save Settings'}));expect(await screen.findByText(/Bank details require account holder/)).toBeInTheDocument();
 useStores.mockReturnValue({stores:[{id:2,name:'Other'}],selectedStoreId:'2',selectStore:jest.fn()});api.get.mockResolvedValue({data:{data:{...settings,storeId:2,canEdit:false}}});view.rerender(page());await screen.findByText(/Only store owners/);
 expect(screen.getByLabelText('Account number')).toBeDisabled();expect(screen.getByLabelText('UPI ID')).toBeDisabled();expect(screen.getByLabelText('Terms and conditions')).toBeDisabled();expect(screen.getByLabelText('Account number')).toHaveValue('');
});
