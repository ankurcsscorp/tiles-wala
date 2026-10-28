import React,{useState} from 'react';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import SalesFinalizeDialog from './SalesFinalizeDialog';

function DialogFixture({total='1234.50',...props}){
  const [payment,setPayment]=useState({amount:'',method:'cash',reference:'Saved reference',idempotencyKey:'saved-payment-key'});
  return <SalesFinalizeDialog open onClose={()=>{}} onConfirm={()=>{}} ready payment={payment} setPayment={setPayment} total={total} paymentMethods={[{code:'cash',label:'Cash'},{code:'upi',label:'UPI'}]} {...props}/>;
}

test('marking fully paid fills the total, shows zero due and clears when unchecked',()=>{
  render(<DialogFixture/>);
  const checkbox=screen.getByRole('checkbox',{name:'Mark fully paid'}),amount=screen.getByLabelText('Amount received now (optional)');
  fireEvent.click(checkbox);expect(checkbox).toBeChecked();expect(amount).toHaveValue('1234.50');
  expect(screen.getByText('Balance due: ₹0')).toBeInTheDocument();expect(screen.getByLabelText('Payment reference')).toHaveValue('Saved reference');
  fireEvent.click(checkbox);expect(checkbox).not.toBeChecked();expect(amount).toHaveValue('');expect(screen.getByText('Balance due: ₹1,234.5')).toBeInTheDocument();
});

test('editing a full payment allows a partial amount and clears the checkbox',()=>{
  render(<DialogFixture/>);fireEvent.click(screen.getByRole('checkbox',{name:'Mark fully paid'}));
  fireEvent.change(screen.getByLabelText('Amount received now (optional)'),{target:{value:'100'}});
  expect(screen.getByRole('checkbox',{name:'Mark fully paid'})).not.toBeChecked();expect(screen.getByText('Balance due: ₹1,134.5')).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Confirm & finalize'})).toBeEnabled();
});

test('the full amount tracks total changes without losing paise',async()=>{
  const view=render(<DialogFixture total="0.30"/>);fireEvent.click(screen.getByRole('checkbox',{name:'Mark fully paid'}));
  expect(screen.getByLabelText('Amount received now (optional)')).toHaveValue('0.30');
  view.rerender(<DialogFixture total="1234.51"/>);
  await waitFor(()=>expect(screen.getByLabelText('Amount received now (optional)')).toHaveValue('1234.51'));
  expect(screen.getByRole('checkbox',{name:'Mark fully paid'})).toBeChecked();expect(screen.getByText('Balance due: ₹0')).toBeInTheDocument();
});

test('users without receipt permission can finalize without recording payment',()=>{
  render(<DialogFixture canReceivePayment={false}/>);
  expect(screen.getByRole('checkbox',{name:'Mark fully paid'})).toBeDisabled();expect(screen.getByLabelText('Amount received now (optional)')).toBeDisabled();expect(screen.getByRole('button',{name:'Confirm & finalize'})).toBeEnabled();
});

test.each([{busy:true},{ready:false},{total:'0.00'},{total:'invalid'}])('full payment cannot be selected when unavailable: %o',props=>{
  render(<DialogFixture {...props}/>);expect(screen.getByRole('checkbox',{name:'Mark fully paid'})).toBeDisabled();
});

test('full payment still requires an active payment method',()=>{
  render(<DialogFixture paymentMethods={[]}/>);fireEvent.click(screen.getByRole('checkbox',{name:'Mark fully paid'}));
  expect(screen.getByText('Choose an active payment method.')).toBeInTheDocument();expect(screen.getByRole('button',{name:'Confirm & finalize'})).toBeDisabled();
});
