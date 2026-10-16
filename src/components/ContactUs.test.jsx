import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ContactUs from "./ContactUs";
import api from "../api";

jest.mock("../api", () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

beforeEach(() => {
  api.post.mockResolvedValue({
    data: { message: "Enquiry created successfully" },
  });
});

test("sends contact enquiries through the shared enquiry endpoint", async () => {
  render(<ContactUs />);

  fireEvent.change(screen.getByLabelText("Your name"), {
    target: { value: "Asha Kumar" },
  });
  fireEvent.change(screen.getByLabelText("Mobile number"), {
    target: { value: "9876543210" },
  });
  fireEvent.change(screen.getByLabelText("Address"), {
    target: { value: "Mahua, Bihar" },
  });
  fireEvent.change(screen.getByLabelText("Area required (sq. ft.)"), {
    target: { value: "450" },
  });
  fireEvent.change(screen.getByLabelText("Purchase plan"), {
    target: { value: "Immediate" },
  });
  fireEvent.change(screen.getByLabelText("What are you looking for?"), {
    target: { value: "Bathroom wall and floor tiles" },
  });

  fireEvent.click(screen.getByRole("button", { name: "Send Enquiry" }));

  await waitFor(() => {
    expect(api.post).toHaveBeenCalledWith(
      "http://localhost:4000/api/tiles/enquiries",
      {
        customer_name: "Asha Kumar",
        mobile: "9876543210",
        address: "Mahua, Bihar",
        required_area: 450,
        purchase_plan: "Immediate",
        remark: "Bathroom wall and floor tiles",
      }
    );
  });
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Enquiry created successfully"
  );
});

test("validates required enquiry details before sending", async () => {
  render(<ContactUs />);

  fireEvent.click(screen.getByRole("button", { name: "Send Enquiry" }));

  expect(await screen.findByText("Name is required.")).toBeInTheDocument();
  expect(screen.getByText("Enter a valid 10-digit Indian mobile number.")).toBeInTheDocument();
  expect(api.post).not.toHaveBeenCalled();
});

test("shows a server error when an enquiry cannot be saved", async () => {
  api.post.mockRejectedValue({
    response: { status: 500, data: { message: "Unable to save enquiry" } },
  });
  render(<ContactUs />);

  fireEvent.change(screen.getByLabelText("Your name"), {
    target: { value: "Asha Kumar" },
  });
  fireEvent.change(screen.getByLabelText("Mobile number"), {
    target: { value: "9876543210" },
  });
  fireEvent.change(screen.getByLabelText("Address"), {
    target: { value: "Mahua, Bihar" },
  });
  fireEvent.change(screen.getByLabelText("Area required (sq. ft.)"), {
    target: { value: "450" },
  });
  fireEvent.change(screen.getByLabelText("Purchase plan"), {
    target: { value: "Immediate" },
  });
  fireEvent.change(screen.getByLabelText("What are you looking for?"), {
    target: { value: "Bathroom wall tiles" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send Enquiry" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Unable to save enquiry");
});
