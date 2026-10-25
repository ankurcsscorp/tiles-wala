import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import CustomerSearch from "./CustomerSearch";
import api from "../../api";

jest.mock("../../api", () => ({ get: jest.fn() }));

test("customer lookup offers matches and invokes add without changing the parent selection", async () => {
  const selected = { id:"2", name:"Existing Customer", phone:"9876543210" };
  const onSelect = jest.fn();
  const onAddNew = jest.fn();
  api.get.mockResolvedValue({ data:[{ id:"3", name:"Sanjay", phone:"9876500000" }] });
  render(<CustomerSearch value={selected} onSelect={onSelect} onAddNew={onAddNew} />);
  fireEvent.change(screen.getByRole("combobox", { name:"Customer" }), { target:{value:"Sanj"} });
  await waitFor(() => expect(api.get).toHaveBeenCalled());
  expect(await screen.findByText("Sanjay · 9876500000")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name:"Add customer" }));
  expect(onAddNew).toHaveBeenCalledTimes(1);
  expect(onSelect).not.toHaveBeenCalled();
});
