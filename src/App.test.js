import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./components/TileVisualizer', () => () => <div>Visualizer</div>);

test('renders the home page content', () => {
  render(<App />);
  expect(screen.getAllByText(/new collection/i).length).toBeGreaterThan(0);
});

test('direct protected invoice links redirect signed-out visitors to sign in', async () => {
  window.history.replaceState({}, '', '/sales/42');
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
  expect(window.location.pathname).toBe('/auth');
  window.history.replaceState({}, '', '/');
});

test('the visualizer retains its full-screen route without shell navigation', () => {
  window.history.replaceState({}, '', '/visualizer');
  render(<App />);
  expect(screen.getByText('Visualizer')).toBeInTheDocument();
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  window.history.replaceState({}, '', '/');
});
