import React from "react";
import { render, screen } from "@testing-library/react";
import ProductManagement from "./ProductManagement";
import api from "../../api";

jest.mock("../../api",()=>({get:jest.fn(),post:jest.fn(),put:jest.fn(),patch:jest.fn()}));
jest.mock("../../context/AuthContext",()=>({useAuth:()=>({user:{userType:"Admin"}})}));
jest.mock("../../context/StoreContext",()=>({useStores:()=>({stores:[{id:"3",name:"Main",is_active:true}],selectedStoreId:"3"})}));

test("renders shared product results and the stock readout",async()=>{
  api.get.mockImplementation((url)=>{
    if(url.endsWith("/categories"))return Promise.resolve({data:[{id:"1",name:"Floor",is_active:true}]});
    if(url.endsWith("/units"))return Promise.resolve({data:[{id:"1",name:"Square foot",code:"SQFT",is_active:true}]});
    return Promise.resolve({data:{items:[{id:"8",sku:"TILE-8",name:"Ivory Tile",category:"Floor",brand:"Ceramic Co",base_unit_name:"Square foot",store_stock:"22.5000",business_stock:"45.0000",is_active:true}],pagination:{page:1,limit:20,total:1,totalPages:1}}});
  });
  render(<ProductManagement/>);
  expect(await screen.findByText("Ivory Tile")).toBeInTheDocument();
  expect(screen.getByRole("combobox",{name:"Category"})).toHaveTextContent("All categories");
  expect(screen.getByText("TILE-8")).toBeInTheDocument();
  expect(screen.getByText("22.5000")).toBeInTheDocument();
  expect(screen.getByRole("button",{name:"Add product"})).toBeInTheDocument();
});

test('invoice repair link opens the named product editor',async()=>{
 window.history.replaceState({},'', '/products?edit=43');
 api.get.mockImplementation(url=>Promise.resolve({data:url.endsWith('/43')?{id:43,sku:'ALASKA01',name:'Costa Blue',base_unit_id:1,hsn_code:'657854',tax_rate:null,gst_supply_classification:'UNKNOWN'}:[]}));
 try{
  render(<ProductManagement/>);
  expect(await screen.findByDisplayValue('Costa Blue')).toBeInTheDocument();
  expect(api.get).toHaveBeenCalledWith('http://localhost:4000/api/tiles/products/43');
  expect(screen.getByDisplayValue('657854')).toBeInTheDocument();
 }finally{window.history.replaceState({},'', '/');}
});
