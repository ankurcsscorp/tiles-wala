import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DealerCartProvider, useDealerCart } from './DealerCartContext';
import { useAuth } from './AuthContext';

jest.mock('./AuthContext',()=>({useAuth:jest.fn()}));
function Controls(){const cart=useDealerCart();return <><span>{cart.lines.map(line=>`${line.productId}:${line.unitId}:${line.quantity}`).join('|')}</span><button onClick={()=>cart.addItem('4','2','5')}>Add one</button><button onClick={()=>cart.addItem('4','2','3')}>Add again</button><button onClick={()=>cart.setCartItemQuantity('4','2','10')}>Set ten</button><button onClick={()=>cart.setCartItemQuantity('4','2','15')}>Set fifteen</button><button onClick={()=>cart.setCartItemQuantity('4','2','5')}>Set five</button><button onClick={cart.clearCart}>Clear</button></>;}
beforeEach(()=>{localStorage.clear();useAuth.mockReturnValue({user:{id:'29',userType:'Dealer'}});});

test('cart is dealer-scoped, merges matching product units, and persists only checkout identifiers and quantities',async()=>{
 render(<DealerCartProvider><Controls/></DealerCartProvider>);
 fireEvent.click(screen.getByRole('button',{name:'Add one'}));fireEvent.click(screen.getByRole('button',{name:'Add again'}));
 expect(await screen.findByText('4:2:8')).toBeInTheDocument();
 const stored=JSON.parse(localStorage.getItem('tilesWalaDealerCart:29'));
 expect(stored).toEqual([{productId:'4',unitId:'2',quantity:'8'}]);
 expect(stored[0]).not.toHaveProperty('price');
 fireEvent.click(screen.getByRole('button',{name:'Clear'}));
 await waitFor(()=>expect(localStorage.getItem('tilesWalaDealerCart:29')).toBe('[]'));
});

test('absolute cart quantity updates remain idempotent and replace matching lines',async()=>{
 render(<DealerCartProvider><Controls/></DealerCartProvider>);
 fireEvent.click(screen.getByRole('button',{name:'Set ten'}));fireEvent.click(screen.getByRole('button',{name:'Set ten'}));fireEvent.click(screen.getByRole('button',{name:'Set ten'}));
 expect(await screen.findByText('4:2:10')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Set fifteen'}));expect(await screen.findByText('4:2:15')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Set five'}));expect(await screen.findByText('4:2:5')).toBeInTheDocument();
 expect(JSON.parse(localStorage.getItem('tilesWalaDealerCart:29'))).toEqual([{productId:'4',unitId:'2',quantity:'5'}]);
});

test('setting a quantity replaces legacy matching lines without summing them',async()=>{
 localStorage.setItem('tilesWalaDealerCart:29',JSON.stringify([{productId:'4',unitId:'2',quantity:'10'},{productId:'4',unitId:'2',quantity:'5'}]));
 render(<DealerCartProvider><Controls/></DealerCartProvider>);fireEvent.click(screen.getByRole('button',{name:'Set ten'}));
 expect(await screen.findByText('4:2:10')).toBeInTheDocument();expect(JSON.parse(localStorage.getItem('tilesWalaDealerCart:29'))).toEqual([{productId:'4',unitId:'2',quantity:'10'}]);
});
