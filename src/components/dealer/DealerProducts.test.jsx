import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DealerProducts from './DealerProducts';
import { useDealerCart } from '../../context/DealerCartContext';
import useDealerCatalog from './useDealerCatalog';
import { getDealerSavings } from '../../utils/dealerPricing';

jest.mock('../../context/DealerCartContext',()=>({useDealerCart:jest.fn()}));
jest.mock('./useDealerCatalog',()=>jest.fn());

const product={id:'4',sku:'GVT-22',name:'GVT Ivory 2×2',brand:'Ceramic House',category:'Floor Tiles',tile_size:'2×2',product_image_url:null,product_description:'Premium vitrified finish',tax_rate:'18.0000',tax_inclusive:false,stock_status:'IN_STOCK',base_unit_id:'2',sales_unit_id:'2',available_units:[{unitId:'2',unitName:'Box',unitCode:'BOX',dealerPrice:'850.0000',mrp:'1200.00',discountPercentage:29.17,decimalPlaces:0,factorToBase:'4.00000000'}]};
beforeEach(()=>{jest.clearAllMocks();useDealerCart.mockReturnValue({lines:[],itemCount:0,setCartItemQuantity:jest.fn(),setQuantity:jest.fn(),removeItem:jest.fn(),clearCart:jest.fn()});useDealerCatalog.mockReturnValue({catalog:{storeId:'3',transportCharge:'1000.00',items:[product]},loading:false,error:''});});

test('dealer catalog uses the configured sales unit and compact stepper, then adds quantity without creating an order',()=>{
 const {setCartItemQuantity}=useDealerCart();render(<MemoryRouter><DealerProducts/></MemoryRouter>);
 expect(screen.getByRole('heading',{name:'Dealer Products'})).toBeInTheDocument();expect(screen.getByText(/Floor Tiles/)).toBeInTheDocument();expect(screen.getAllByText('₹850.00').length).toBeGreaterThan(0);
 expect(screen.getByText('₹1,200.00')).toHaveStyle({textDecoration:'line-through'});expect(screen.getByText('29% OFF')).toBeInTheDocument();expect(screen.queryByLabelText('Selling unit')).not.toBeInTheDocument();expect(screen.queryByText('Line total')).not.toBeInTheDocument();
 fireEvent.change(screen.getByRole('spinbutton',{name:'GVT Ivory 2×2 quantity'}),{target:{value:'10'}});fireEvent.click(screen.getByRole('button',{name:'Add to Cart'}));
 expect(setCartItemQuantity).toHaveBeenCalledWith('4','2','10');
});

test('catalog blocks ordering when there is no configured dealer sales unit',()=>{
 useDealerCatalog.mockReturnValue({catalog:{storeId:'3',transportCharge:'0',items:[{...product,sales_unit_id:null,base_unit_id:null}]},loading:false,error:''});
 render(<MemoryRouter><DealerProducts/></MemoryRouter>);
 expect(screen.getByText(/No dealer price is configured/)).toBeInTheDocument();expect(screen.getByRole('button',{name:'Add to Cart'})).toBeDisabled();
});

test('catalog uses the base unit when admin selects same as base unit',()=>{
 useDealerCatalog.mockReturnValue({catalog:{storeId:'3',transportCharge:'0',items:[{...product,sales_unit_id:null}]},loading:false,error:''});
 const setCartItemQuantity=jest.fn();useDealerCart.mockReturnValue({lines:[],itemCount:0,setCartItemQuantity});render(<MemoryRouter><DealerProducts/></MemoryRouter>);
 expect(screen.getByText('₹850.00')).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Add to Cart'}));expect(setCartItemQuantity).toHaveBeenCalledWith('4','2','1');
});

test('existing cart quantity is shown and card action replaces rather than adds quantity',()=>{
 const setCartItemQuantity=jest.fn();useDealerCart.mockReturnValue({lines:[{productId:'4',unitId:'2',quantity:'10'}],itemCount:1,setCartItemQuantity});render(<MemoryRouter><DealerProducts/></MemoryRouter>);
 const quantity=screen.getByRole('spinbutton',{name:'GVT Ivory 2×2 quantity'});expect(quantity).toHaveValue(10);expect(screen.getByRole('button',{name:'Added to Cart'})).toBeDisabled();
 fireEvent.change(quantity,{target:{value:'15'}});fireEvent.click(screen.getByRole('button',{name:'Update Cart'}));expect(setCartItemQuantity).toHaveBeenCalledWith('4','2','15');
});

test('quantity stepper changes by whole quantities even for fractional units',()=>{
 const fractionalProduct={...product,available_units:[{...product.available_units[0],decimalPlaces:2}]};
 useDealerCatalog.mockReturnValue({catalog:{storeId:'3',transportCharge:'0',items:[fractionalProduct]},loading:false,error:''});
 render(<MemoryRouter><DealerProducts/></MemoryRouter>);
 const quantity=screen.getByRole('spinbutton',{name:'GVT Ivory 2×2 quantity'});
 fireEvent.click(screen.getByRole('button',{name:'Increase GVT Ivory 2×2 quantity'}));expect(quantity).toHaveValue(2);
 fireEvent.click(screen.getByRole('button',{name:'Decrease GVT Ivory 2×2 quantity'}));expect(quantity).toHaveValue(1);
});

test('catalog keeps text search and stock filtering without category, brand, collection, or price controls',()=>{
 render(<MemoryRouter><DealerProducts/></MemoryRouter>);
 expect(screen.queryByText('Category')).not.toBeInTheDocument();expect(screen.queryByText('Brand')).not.toBeInTheDocument();expect(screen.queryByText('Collection')).not.toBeInTheDocument();expect(screen.queryByText('Min price')).not.toBeInTheDocument();expect(screen.queryByText('Max price')).not.toBeInTheDocument();
 fireEvent.change(screen.getByRole('textbox',{name:'Search products'}),{target:{value:'GVT-22'}});
 expect(screen.getByText('GVT Ivory 2×2')).toBeInTheDocument();
 fireEvent.change(screen.getByRole('textbox',{name:'Search products'}),{target:{value:'floor tiles'}});
 expect(screen.getByText('GVT Ivory 2×2')).toBeInTheDocument();
 fireEvent.change(screen.getByRole('textbox',{name:'Search products'}),{target:{value:'granite'}});
 expect(screen.queryByText('GVT Ivory 2×2')).not.toBeInTheDocument();
});

test('dealer savings uses only a valid higher MRP and quantity without changing order price math',()=>{
 expect(getDealerSavings('1200.00','850.0000','10')).toBe('3500.00');
 expect(getDealerSavings('850.00','850.0000','2')).toBe('0.00');
 expect(getDealerSavings('800.00','850.0000','2')).toBe('0.00');
 expect(getDealerSavings(null,'850.0000','2')).toBe('0.00');
});
