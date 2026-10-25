import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import GSTPartyFields from './GSTPartyFields';
import api from '../../api';
import { applyGSTDetails } from './gstForm';

jest.mock('../../api', () => ({get:jest.fn()}));
const gstin='27AAPFU0939F1ZV';
const data={gstin,legalName:'Fixture Legal Name',tradeName:'Fixture Tiles',registrationStatus:'Active',taxpayerType:'Regular',constitutionOfBusiness:'Partnership',registrationDate:'2020-10-22',address:{addressLine1:'12 Test Road',addressLine2:'Market',city:'Pune',district:'Pune',state:'Maharashtra',stateCode:'27',pincode:'411001'},natureOfBusiness:['Retail'],fetchedAt:'2026-10-22T12:00:00.000Z',source:'finagg'};
function Form({initial={}}) { const [form,setForm]=useState({name:'Manual business',gstin:'',...initial});return <><GSTPartyFields form={form} setForm={setForm}/><output data-testid="form">{JSON.stringify(form)}</output></>; }
beforeEach(()=>jest.clearAllMocks());
const fetchDetails=async()=>{fireEvent.change(screen.getByLabelText('GSTIN'),{target:{value:gstin}});fireEvent.click(screen.getByRole('button',{name:'Fetch GST Details'}));return screen.findByRole('dialog');};

test('invalid input disables fetch, normalizes case and checks checksum',()=>{
  render(<Form/>);const input=screen.getByLabelText('GSTIN');expect(input).toHaveAttribute('maxlength','15');fireEvent.change(input,{target:{value:'27aapfu0939f1za'}});
  expect(input).toHaveValue('27AAPFU0939F1ZA');expect(screen.getByText(/checksum is invalid/)).toBeInTheDocument();expect(screen.getByRole('button',{name:'Fetch GST Details'})).toBeDisabled();
  expect(api.get).not.toHaveBeenCalled();
});
test('fetching previews details before replacing manual edits and applying does not save',async()=>{
  api.get.mockResolvedValue({data:{success:true,data,lookupToken:'signed-proof'}});render(<Form/>);
  const dialog=await fetchDetails();expect(screen.getByTestId('form')).toHaveTextContent('Manual business');
  expect(api.get).toHaveBeenCalledTimes(1);expect(api.get.mock.calls[0][0]).toBe(`http://localhost:4000/api/gst/lookup/${gstin}`);
  fireEvent.click(within(dialog).getByRole('button',{name:'Apply GST details'}));
  expect(screen.getByTestId('form')).toHaveTextContent('Fixture Tiles');expect(screen.getByTestId('form')).toHaveTextContent('411001');
  expect(screen.getByText(/GST details fetched successfully/)).toBeInTheDocument();
});
test('cancel preview preserves manual edits',async()=>{
  api.get.mockResolvedValue({data:{success:true,data,lookupToken:'proof'}});render(<Form/>);
  fireEvent.click(within(await fetchDetails()).getByRole('button',{name:'Keep current details'}));expect(screen.getByTestId('form')).toHaveTextContent('Manual business');
});
for(const status of ['Cancelled','Suspended']) test(`${status} registration shows warning and remains applicable`,async()=>{
  api.get.mockResolvedValue({data:{success:true,data:{...data,registrationStatus:status},lookupToken:'proof'}});render(<Form/>);
  const dialog=await fetchDetails();
  expect(within(dialog).getByText(new RegExp(`GST registration status: ${status}`))).toBeInTheDocument();expect(within(dialog).getByRole('button',{name:'Apply GST details'})).toBeEnabled();
});
for(const message of ['GSTIN was not found in the GST registry.','GST lookup is not configured.','GST lookup rate limit exceeded.','GST lookup timed out.','GST provider credentials need attention.']) test(`lookup shows failure: ${message}`,async()=>{
  api.get.mockRejectedValue({response:{data:{message}}});render(<Form/>);
  fireEvent.change(screen.getByLabelText('GSTIN'),{target:{value:gstin}});fireEvent.click(screen.getByRole('button',{name:'Fetch GST Details'}));
  expect(await screen.findByText(message)).toBeInTheDocument();expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
test('duplicate requests are prevented and changing GSTIN ignores an older response',async()=>{
  let finish;api.get.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));render(<Form/>);
  fireEvent.change(screen.getByLabelText('GSTIN'),{target:{value:gstin}});const button=screen.getByRole('button',{name:'Fetch GST Details'});fireEvent.click(button);fireEvent.click(button);
  expect(api.get).toHaveBeenCalledTimes(1);expect(screen.getByRole('button',{name:'Fetching…'})).toBeDisabled();
  fireEvent.change(screen.getByLabelText('GSTIN'),{target:{value:'29ABCDE1234F1ZW'}});
  finish({data:{success:true,data,lookupToken:'old'}});
  await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());expect(screen.getByTestId('form')).toHaveTextContent('Manual business');
});
test('GSTIN changes clear saved verification and show stale state',()=>{
  render(<Form initial={{gstin,gstDetails:{registrationStatus:'Active',registrationDate:'2020-10-22'},gstVerifiedAt:data.fetchedAt,gstDataSource:'finagg',gstLookupToken:'proof'}}/>);
  expect(screen.getByText(/Last fetched:/)).toBeInTheDocument();fireEvent.change(screen.getByLabelText('GSTIN'),{target:{value:'29ABCDE1234F1ZW'}});
  expect(screen.getByText(/verification is stale/)).toBeInTheDocument();expect(screen.getByLabelText('GST registration status')).toHaveValue('');expect(screen.getByTestId('form')).toHaveTextContent('"gstLookupToken":null');
});
test('autofill retains contact, balance and manually entered unavailable fields',()=>{
  const result=applyGSTDetails({mobile:'9000000000',email:'test@example.com',openingBalance:'250',city:'Manual city',billingAddress:{line1:'Manual address'}},{...data,tradeName:'',address:{}},'proof');
  expect(result.mobile).toBe('9000000000');expect(result.email).toBe('test@example.com');expect(result.openingBalance).toBe('250');expect(result.city).toBe('Manual city');expect(result.billingAddress.line1).toBe('Manual address');
});

test('optional GST fields can be expanded without crowding the initial form and date labels stay floated',()=>{
  render(<Form/>);
  const toggle=screen.getByRole('button',{name:'GST business information (optional)'});
  expect(toggle).toHaveAttribute('aria-expanded','false');
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-expanded','true');
  const date=screen.getByLabelText('GST registration date');
  expect(date).toHaveAttribute('type','date');
  expect(document.querySelector(`label[for="${date.id}"]`)).toHaveAttribute('data-shrink','true');
});
