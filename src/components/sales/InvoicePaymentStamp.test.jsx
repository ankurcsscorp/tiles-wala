import {render,screen} from '@testing-library/react';
import InvoicePaymentStamp from './InvoicePaymentStamp';

test.each([
  ['8000.00','0','0','DUE','due'],
  ['8000.00','500','0','PARTIALLY PAID','partial'],
  ['0.00','8500','0','PAID','paid'],
  ['0.00','0','8500','PAID','paid'],
  ['8000.00','0','500','PARTIALLY PAID','partial'],
])('balance %s with payment %s and credit %s displays %s',(outstanding_balance,amount_received,return_credit,label,tone)=>{
  render(<InvoicePaymentStamp invoice={{status:'posted',outstanding_balance,amount_received,return_credit}}/>);
  expect(screen.getByRole('img',{name:`Payment status: ${label}`})).toHaveClass(`invoice-payment-stamp--${tone}`);
});
test.each(['draft','cancelled','reversed'])('does not stamp a %s invoice as a collectible bill',status=>{
  render(<InvoicePaymentStamp invoice={{status,payment_status:'paid',outstanding_balance:'0'}}/>);
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
});
test('status follows newly recorded payments and falls back to the API status when balance is absent',()=>{
  const {rerender}=render(<InvoicePaymentStamp invoice={{status:'posted',payment_status:'unpaid'}}/>);
  expect(screen.getByText('DUE')).toBeInTheDocument();
  rerender(<InvoicePaymentStamp invoice={{status:'posted',outstanding_balance:'100',amount_received:'50'}}/>);
  expect(screen.getByText('PARTIALLY PAID')).toBeInTheDocument();
  rerender(<InvoicePaymentStamp invoice={{status:'posted',outstanding_balance:'0',amount_received:'150'}}/>);
  expect(screen.getByText('PAID')).toBeInTheDocument();
});
test('does not invent a payment status when financial data is unavailable',()=>{
  render(<InvoicePaymentStamp invoice={{status:'posted'}}/>);
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
});
