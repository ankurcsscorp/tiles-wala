import {render,screen} from '@testing-library/react';
import PaymentStatusBadge from './PaymentStatusBadge';

test.each([['unpaid','Unpaid'],['partially_paid','Partially paid'],['paid','Paid'],['unposted','Not posted']])('payment status %s has a readable label and its own color class',(status,label)=>{
  render(<PaymentStatusBadge status={status}/>);
  const badge=screen.getByLabelText(`Payment status: ${label}`);
  expect(badge).toHaveTextContent(label);
  expect(badge).toHaveClass(`payment-status-badge--${status}`);
});

test('missing payment data is not presented as paid or unpaid',()=>{
  render(<PaymentStatusBadge/>);
  expect(screen.getByLabelText('Payment status: Unavailable')).toHaveClass('payment-status-badge--unknown');
});
