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
