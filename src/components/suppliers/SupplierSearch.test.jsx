import React from "react";
import {fireEvent,render,screen,waitFor} from "@testing-library/react";
import api from "../../api";
import SupplierSearch from "./SupplierSearch";

jest.mock("../../api",()=>({get:jest.fn(),post:jest.fn()}));

test("supplier lookup offers results and add intent leaves purchase selection with its caller",async()=>{
  const selected={id:"6",name:"Current Supplier",phone:"9876543210"};const onSelect=jest.fn();const onAddNew=jest.fn();
  api.get.mockResolvedValue({data:[{id:"7",name:"Sanjay Tiles",phone:"9876500000"}]});
  render(<SupplierSearch value={selected} onSelect={onSelect} onAddNew={onAddNew}/>);
  fireEvent.change(screen.getByRole("combobox",{name:"Supplier"}),{target:{value:"Sanj"}});
  await waitFor(()=>expect(api.get).toHaveBeenCalled());
  expect(await screen.findByText("Sanjay Tiles · 9876500000")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:"Add supplier"}));
  expect(onAddNew).toHaveBeenCalledTimes(1);expect(onSelect).not.toHaveBeenCalled();
});

test("quick add creates and selects a supplier while leaving the invoice draft with its parent",async()=>{
  const onSelect=jest.fn();const newSupplier={id:"9",name:"New Supplier",phone:"9999999999"};api.post.mockResolvedValue({data:newSupplier});
  render(<SupplierSearch value={null} onSelect={onSelect}/>);
  fireEvent.click(screen.getByRole("button",{name:"Add supplier"}));
  fireEvent.change(screen.getByRole("textbox",{name:"Supplier name"}),{target:{value:"New Supplier"}});
  fireEvent.click(screen.getByRole("button",{name:"Add and select"}));
  await waitFor(()=>expect(api.post).toHaveBeenCalledWith("http://localhost:4000/api/tiles/suppliers",expect.objectContaining({name:"New Supplier"})));
  await waitFor(()=>expect(onSelect).toHaveBeenCalledWith(newSupplier));
});
