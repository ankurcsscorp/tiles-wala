import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import TileVisualizer from "./TileVisualizer";

jest.mock("@react-three/fiber", () => ({
  Canvas: () => <div data-testid="three-canvas">3D room scene</div>,
  useLoader: jest.fn(),
}));

const tile = {
  id: 1,
  name: "Marvilla Blue",
  imageUrl: "/images/1.3.jpg",
  size: "600x1200",
  finish: "Glossy",
};

const renderVisualizer = () =>
  render(
    <MemoryRouter
      initialEntries={[
        { pathname: "/visualizer", state: { tile } },
      ]}
    >
      <Routes>
        <Route path="/" element={<h1>Product gallery</h1>} />
        <Route path="/visualizer" element={<TileVisualizer />} />
      </Routes>
    </MemoryRouter>
  );

test("shows product specs and room and surface controls", () => {
  renderVisualizer();

  expect(screen.getByRole("heading", { name: "Marvilla Blue" })).toBeInTheDocument();
  expect(screen.getByLabelText("Room")).toHaveValue("living");
  expect(screen.getByRole("button", { name: "Floor" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "Walls" })).toHaveAttribute("aria-pressed", "false");

  fireEvent.change(screen.getByLabelText("Room"), { target: { value: "bathroom" } });
  fireEvent.click(screen.getByRole("button", { name: "Walls" }));

  expect(screen.getByLabelText("Room")).toHaveValue("bathroom");
  expect(screen.getByText("Bathroom · Walls")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Walls" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByTestId("three-canvas")).toBeInTheDocument();
});

test("returns from the visualizer to the product gallery", () => {
  renderVisualizer();

  fireEvent.click(screen.getByRole("button", { name: /back to products/i }));

  expect(screen.getByRole("heading", { name: "Product gallery" })).toBeInTheDocument();
});
