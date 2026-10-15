import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the home page content', () => {
  render(<App />);
  expect(screen.getAllByText(/new collection/i).length).toBeGreaterThan(0);
});
