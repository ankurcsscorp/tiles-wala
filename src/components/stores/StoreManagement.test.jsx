import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import StoreManagement from "./StoreManagement";
import api from "../../api";

jest.mock("../../api", () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() }));
jest.mock("../../context/StoreContext", () => ({ useStores: () => ({ refreshStores: jest.fn() }) }));

test("lists configured stores and exposes store administration actions", async () => {
  api.get.mockResolvedValue({ data: [{ id: "1", name: "Downtown", code: "DT01", city: "Pune", is_active: true }] });
  render(<StoreManagement />);

  expect(await screen.findByText("Downtown")).toBeInTheDocument();
  expect(screen.getByText("DT01")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Add store" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Users" })).toBeInTheDocument();
});

test("prefills a short suggested invoice code for a legacy long store code", async () => {
  api.get.mockImplementation((url) => Promise.resolve({ data: url.endsWith("/settings")
    ? { invoice_prefix: "TILESWALA1", invoice_numbering_period: "yearly", invoice_number_padding: 5, tax_inclusive: false, default_tax_rate: 0 }
    : [{ id: "1", name: "A & A Home Decor", code: "tilesWala1", invoice_prefix: "TILESWALA1", is_active: true }] }));
  render(<StoreManagement />);
  fireEvent.click(await screen.findByRole("button", { name: "Settings" }));
  expect(await screen.findByRole("textbox", { name: /Store invoice code/ })).toHaveValue("AA");
});
