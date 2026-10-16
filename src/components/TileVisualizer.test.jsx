import { fireEvent, render, screen, within } from "@testing-library/react";
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
  expect(screen.getByRole("button", { name: "View full screen" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Pause auto-rotate" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  expect(screen.getByRole("button", { name: "Pause auto-zoom" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
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

test("lets the user pause and resume automatic room rotation", () => {
  renderVisualizer();

  fireEvent.click(screen.getByRole("button", { name: "Pause auto-rotate" }));
  expect(screen.getByRole("button", { name: "Resume auto-rotate" })).toHaveAttribute(
    "aria-pressed",
    "false"
  );

  fireEvent.click(screen.getByRole("button", { name: "Resume auto-rotate" }));
  expect(screen.getByRole("button", { name: "Pause auto-rotate" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
});

test("lets the user pause and resume automatic zoom", () => {
  renderVisualizer();

  fireEvent.click(screen.getByRole("button", { name: "Pause auto-zoom" }));
  expect(screen.getByRole("button", { name: "Resume auto-zoom" })).toHaveAttribute(
    "aria-pressed",
    "false"
  );

  fireEvent.click(screen.getByRole("button", { name: "Resume auto-zoom" }));
  expect(screen.getByRole("button", { name: "Pause auto-zoom" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
});

test("reports when browser full screen is unavailable", async () => {
  renderVisualizer();

  fireEvent.click(screen.getByRole("button", { name: "View full screen" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Full screen is not supported by this browser."
  );
});

test("shows an exit control inside the stage while in full screen", async () => {
  const fullscreenDescriptor = Object.getOwnPropertyDescriptor(document, "fullscreenElement");
  const exitFullscreenDescriptor = Object.getOwnPropertyDescriptor(document, "exitFullscreen");
  document.exitFullscreen = jest.fn().mockResolvedValue(undefined);
  renderVisualizer();

  const stage = screen.getByLabelText("Marvilla Blue 3D room preview");
  Object.defineProperty(document, "fullscreenElement", {
    configurable: true,
    value: stage,
  });
  fireEvent(document, new Event("fullscreenchange"));

  const exitButton = await within(stage).findByRole("button", { name: "Exit full screen" });
  fireEvent.click(exitButton);

  expect(document.exitFullscreen).toHaveBeenCalled();

  if (fullscreenDescriptor) {
    Object.defineProperty(document, "fullscreenElement", fullscreenDescriptor);
  } else {
    delete document.fullscreenElement;
  }
  if (exitFullscreenDescriptor) {
    Object.defineProperty(document, "exitFullscreen", exitFullscreenDescriptor);
  } else {
    delete document.exitFullscreen;
  }
});

test("returns from the visualizer to the product gallery", () => {
  renderVisualizer();

  fireEvent.click(screen.getByRole("button", { name: /back to products/i }));

  expect(screen.getByRole("heading", { name: "Product gallery" })).toBeInTheDocument();
});
