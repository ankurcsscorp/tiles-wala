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
    api.get.mockResolvedValue({ data: { records: [] } });
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

    fireEvent.click(screen.getByRole("button", { name: "English" }));

    expect(screen.getByRole("heading", { name: "Sales Bonus" })).toBeInTheDocument();
    expect(screen.getByText("No sale bonus records found.")).toBeInTheDocument();
  });
});
