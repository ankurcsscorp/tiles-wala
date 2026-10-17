import { fireEvent, render, screen } from "@testing-library/react";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";
import SaleBonus from "./SaleBonus";

jest.mock("../../api", () => ({
  get: jest.fn(),
  patch: jest.fn(),
}));

jest.mock("../../context/AuthContext", () => ({
  useAuth: jest.fn(),
}));

describe("SaleBonus language selection", () => {
  beforeEach(() => {
    useAuth.mockReturnValue({
      user: {
        id: 12,
        name: "Ramesh",
        mobile: "9876543210",
        userType: "tile mistire",
      },
    });
    api.get.mockImplementation((url) =>
      Promise.resolve(
        url.endsWith("/top-seller")
          ? {
              data: {
                topSellers: [
                  {
                    id: 28,
                    name: "Top Mason",
                    total_sales: "12500.00",
                  },
                ],
              },
            }
          : { data: { records: [] } }
      )
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("defaults to Hindi for non-admin users and allows switching to English", async () => {
    render(<SaleBonus />);

    expect(screen.getByRole("heading", { name: "बिक्री बोनस" })).toBeInTheDocument();
    expect(
      await screen.findByText("बिक्री बोनस का कोई रिकॉर्ड नहीं मिला।")
    ).toBeInTheDocument();
    expect(await screen.findByText("टाइल मिस्त्रियों में सबसे आगे")).toBeInTheDocument();
    expect(screen.getByText(/Top Mason/)).toBeInTheDocument();
    expect(screen.getByText(/कुल बिक्री:/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "English" }));

    expect(screen.getByRole("heading", { name: "Sales Bonus" })).toBeInTheDocument();
    expect(screen.getByText("No sale bonus records found.")).toBeInTheDocument();
  });

  it("shows a salesperson leaderboard when a salesperson is logged in", async () => {
    useAuth.mockReturnValue({
      user: {
        id: 15,
        name: "Amit",
        mobile: "9876543211",
        userType: "Salesperson",
      },
    });

    render(<SaleBonus />);

    expect(await screen.findByText("सेल्सपर्सन में सबसे आगे")).toBeInTheDocument();
  });

  it("shows the top three sellers from the group selected by an admin", async () => {
    useAuth.mockReturnValue({
      user: {
        id: 1,
        name: "Admin",
        mobile: "9876543212",
        userType: "Admin",
      },
    });
    api.get.mockImplementation((url) => {
      if (url.endsWith("/users/search")) {
        return Promise.resolve({
          data: [
            {
              id: 28,
              name: "Tile Mason",
              mobile: "9876543213",
              userType: "Tile Mistire",
            },
          ],
        });
      }
      if (url.endsWith("/top-seller")) {
        return Promise.resolve({
          data: {
            topSellers: [
              { id: 28, name: "First Mason", total_sales: "12500.00" },
              { id: 29, name: "Second Mason", total_sales: "10000.00" },
              { id: 30, name: "Third Mason", total_sales: "7500.00" },
            ],
          },
        });
      }
      return Promise.resolve({ data: { records: [] } });
    });

    render(<SaleBonus />);
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Tile Mason" },
    });
    fireEvent.click(await screen.findByRole("option"));

    expect(await screen.findByText("Top 3 tile masons")).toBeInTheDocument();
    expect(screen.getByText(/First Mason/)).toBeInTheDocument();
    expect(screen.getByText(/Second Mason/)).toBeInTheDocument();
    expect(screen.getByText(/Third Mason/)).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith(
      expect.stringContaining("/sales-bonus/top-seller"),
      { params: { userType: "Tile Mistire" } }
    );
  });
});
