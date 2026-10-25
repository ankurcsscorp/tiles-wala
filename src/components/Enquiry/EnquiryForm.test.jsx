import { render, screen } from '@testing-library/react';
import EnquiryForm from './EnquiryForm';

test('renders phone and area adornments with their native input constraints', () => {
  render(<EnquiryForm />);
  expect(screen.getByText('+91')).toBeInTheDocument();
  expect(screen.getByText('sq. ft.')).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: /Mobile Number/ })).toHaveAttribute('maxlength', '10');
  expect(screen.getByRole('spinbutton', { name: /Area Required/ })).toHaveAttribute('min', '0');
  expect(screen.getByRole('spinbutton', { name: /Area Required/ })).toHaveAttribute('step', 'any');
});
