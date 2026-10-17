import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Header from "./Header";
import { useAuth } from "../context/AuthContext";

jest.mock("../context/AuthContext", () => ({
  useAuth: jest.fn(),
}));

const renderHeader = (userType) => {
  useAuth.mockReturnValue({
    user: userType ? { userType, name: "Test User" } : null,
    isAuthenticated: Boolean(userType),
    logout: jest.fn(),
  });

  return render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>
  );
};

test("shows the Enquiry tab to admins", () => {
  renderHeader("Admin");

  expect(screen.getByRole("link", { name: "Enquiry" })).toHaveAttribute("href", "/enquiry");
});

test("hides the Enquiry tab from non-admin users", () => {
  renderHeader("Salesperson");

  expect(screen.queryByRole("link", { name: "Enquiry" })).not.toBeInTheDocument();
});

test("shows the Sales Bonus tab to logged-in users", () => {
  renderHeader("Salesperson");

  expect(screen.getByRole("link", { name: "Sales Bonus" })).toHaveAttribute(
    "href",
    "/sales-bonus"
  );
});

test("hides the Sales Bonus tab from signed-out visitors", () => {
  renderHeader(null);

  expect(screen.queryByRole("link", { name: "Sales Bonus" })).not.toBeInTheDocument();
});

test("shows the Contact Us tab to signed-out visitors", () => {
  renderHeader(null);

  expect(screen.getByRole("link", { name: "Contact Us" })).toHaveAttribute(
    "href",
    "/contact"
  );
});

test("hides the Contact Us tab from logged-in users", () => {
  renderHeader("Customer");

  expect(screen.queryByRole("link", { name: "Contact Us" })).not.toBeInTheDocument();
});
