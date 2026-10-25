import React from "react";
import { render, screen } from "@testing-library/react";
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
