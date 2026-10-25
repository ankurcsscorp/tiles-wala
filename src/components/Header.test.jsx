import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Header from './Header';

test('provides public storefront routes and sign in', () => {
  render(<MemoryRouter><Header /></MemoryRouter>);
  expect(screen.getByRole('link', { name: 'Contact Us' })).toHaveAttribute('href', '/contact');
  expect(screen.getByRole('link', { name: 'Sign In' })).toHaveAttribute('href', '/auth');
  expect(screen.queryByRole('link', { name: 'Sales & billing' })).not.toBeInTheDocument();
});

test('public menu toggle is keyboard accessible and announces its state', () => {
  render(<MemoryRouter><Header /></MemoryRouter>);
  const toggle = screen.getByRole('button', { name: 'Toggle navigation' });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  fireEvent.click(screen.getByRole('link', { name: 'Contact Us' }));
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
});
