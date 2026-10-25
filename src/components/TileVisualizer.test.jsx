import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import TileVisualizer from "./TileVisualizer";

jest.mock("@react-three/fiber", () => ({
  Canvas: ({ camera }) => <div data-testid="three-canvas" data-fov={camera.fov}>3D room scene</div>,
  useLoader: jest.fn(),
}));

jest.mock("@react-three/drei/core/Environment", () => ({
  Environment: () => null,
}));

jest.mock("@react-three/drei/core/ContactShadows", () => ({
  ContactShadows: () => null,
}));

jest.mock("@react-three/drei/core/Lightformer", () => ({ Lightformer: () => null }));
jest.mock("@react-three/drei/core/OrbitControls", () => ({ OrbitControls: () => null }));

jest.mock("@react-three/drei/core/RoundedBox", () => ({ RoundedBox: () => null }));

jest.mock("@react-three/drei/core/OrthographicCamera", () => ({ OrthographicCamera: () => null }));

jest.mock("three/examples/jsm/lights/RectAreaLightUniformsLib.js", () => ({ RectAreaLightUniformsLib: { init: jest.fn() } }));

const tile = {
  id: 1,
  name: "Marvilla Blue",
  imageUrl: "/images/1.3.jpg",
  size: "600x1200",
  finish: "Glossy",
};

const renderVisualizer = (selectedTile = tile) =>
  render(
    <MemoryRouter
      initialEntries={[
        { pathname: "/visualizer", state: { tile: selectedTile } },
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
  expect(screen.getByRole("button", { name: "Close-up" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByLabelText("Room")).toHaveValue("living");
  expect(screen.getByRole("button", { name: "Floor" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "Walls" })).toHaveAttribute("aria-pressed", "false");

  fireEvent.change(screen.getByLabelText("Room"), { target: { value: "bathroom" } });
  fireEvent.click(screen.getByRole("button", { name: "Walls" }));

  expect(screen.getByLabelText("Room")).toHaveValue("bathroom");
  expect(screen.getByText("Bathroom · Walls")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Walls" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByTestId("three-canvas")).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("Room"), { target: { value: "kitchen" } });
  expect(screen.getByLabelText("Room")).toHaveValue("kitchen");
  expect(screen.getByText("Kitchen · Walls")).toBeInTheDocument();
});

test.each(["rotate", "zoom"])("lets the user pause and resume auto-%s", (mode) => {
  renderVisualizer();
  fireEvent.click(screen.getByRole("button", { name: `Pause auto-${mode}` }));
  expect(screen.getByRole("button", { name: `Resume auto-${mode}` })).toHaveAttribute("aria-pressed", "false");
  fireEvent.click(screen.getByRole("button", { name: `Resume auto-${mode}` }));
  expect(screen.getByRole("button", { name: `Pause auto-${mode}` })).toHaveAttribute("aria-pressed", "true");
});

test("restores close-up and automatic camera motion when entering full screen", async () => {
  renderVisualizer();
  const stage = screen.getByLabelText("Marvilla Blue 3D room preview");
  stage.requestFullscreen = jest.fn().mockResolvedValue(undefined);
  fireEvent.click(screen.getByRole("button", { name: "Top View" }));
  expect(screen.getByRole("button", { name: "Resume auto-rotate" })).toHaveAttribute("aria-pressed", "false");
  expect(screen.getByRole("button", { name: "Resume auto-zoom" })).toHaveAttribute("aria-pressed", "false");

  fireEvent.click(screen.getByRole("button", { name: "View full screen" }));
  expect(stage.requestFullscreen).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Close-up" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "Pause auto-rotate" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "Pause auto-zoom" })).toHaveAttribute("aria-pressed", "true");
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

test("supports inspection settings and resets the camera without changing the product", () => {
  renderVisualizer();
  fireEvent.click(screen.getByText("Tile & scene settings"));
  fireEvent.change(screen.getByLabelText("Layout"), { target: { value: "brick" } });
  fireEvent.change(screen.getByLabelText("Rotation"), { target: { value: "90" } });
  fireEvent.change(screen.getByLabelText("Finish"), { target: { value: "matte" } });
  fireEvent.change(screen.getByLabelText("Joint width"), { target: { value: "4" } });
  fireEvent.click(screen.getByLabelText("Show furniture"));
  expect(screen.getByLabelText("Layout")).toHaveValue("brick");
  expect(screen.getByLabelText("Rotation")).toHaveValue("90");
  expect(screen.getByLabelText("Show furniture")).not.toBeChecked();
  expect(screen.getByText(/4 mm joints · Matte/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Top View" }));
  expect(screen.getByRole("button", { name: "Top View" })).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByRole("button", { name: "Reset camera" }));
  expect(screen.getByRole("button", { name: "Floor Focus" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("heading", { name: tile.name })).toBeInTheDocument();
});

test('wall and kitchen settings are contextual and independent from floor appearance', () => {
  renderVisualizer();
  fireEvent.click(screen.getByText('Tile & scene settings'));
  fireEvent.change(screen.getByLabelText('Rotation'), { target: { value: '90' } });
  fireEvent.change(screen.getByLabelText('Finish'), { target: { value: 'satin' } });
  expect(screen.queryByLabelText('Wall Tile Orientation')).not.toBeInTheDocument();
  expect(screen.queryByRole('group', { name: 'Kitchen Slab Color' })).not.toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Room'), { target: { value: 'kitchen' } });
  fireEvent.click(screen.getByRole('button', { name: 'Walls', exact: true }));
  expect(screen.getByRole('button', { name: 'Front Wall' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.change(screen.getByLabelText('Wall Tile Orientation'), { target: { value: 'horizontal' } });
  fireEvent.change(screen.getByLabelText('Wall finish'), { target: { value: 'matte' } });
  fireEvent.change(screen.getByLabelText('Wall joint width'), { target: { value: '3' } });
  fireEvent.change(screen.getByLabelText('Wall grout / epoxy'), { target: { value: '#626363' } });
  fireEvent.change(screen.getByLabelText('Tile Coverage'), { target: { value: 'backsplash' } });
  fireEvent.click(screen.getByRole('button', { name: 'Backsplash Focus' }));
  fireEvent.click(screen.getByRole('button', { name: 'Black slab' }));
  expect(screen.getByRole('button', { name: 'Black slab' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Backsplash Focus' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByLabelText('Wall Tile Orientation')).toHaveValue('horizontal');
  expect(screen.getByLabelText('Tile Coverage')).toHaveValue('backsplash');
  expect(screen.getByText(/3 mm joints · Matte/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Both', exact: true }));
  expect(screen.getByRole('button', { name: 'Floor & Wall', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByLabelText('Rotation')).toHaveValue('90');
  expect(screen.getByLabelText('Finish')).toHaveValue('satin');
  expect(screen.getByLabelText('Wall Tile Orientation')).toHaveValue('horizontal');
  fireEvent.click(screen.getByRole('button', { name: 'Floor', exact: true }));
  expect(screen.getByRole('button', { name: 'Close-up' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByLabelText('Rotation')).toHaveValue('90');
  expect(screen.getByLabelText('Finish')).toHaveValue('satin');
});

test('wall inspection is temporary, preserves cabinet preferences, and resets to a wall view', () => {
  renderVisualizer();
  fireEvent.change(screen.getByLabelText('Room'), { target: { value: 'kitchen' } });
  fireEvent.click(screen.getByRole('button', { name: 'Walls', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: 'Inspect Wall Tiles' }));
  expect(screen.getByRole('button', { name: 'Exit wall inspection' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(screen.getByText('Tile & scene settings'));
  expect(screen.getByLabelText('Show upper cabinets')).toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'Reset camera' }));
  expect(screen.getByRole('button', { name: 'Front Wall' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Inspect Wall Tiles' })).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(screen.getByLabelText('Show upper cabinets'));
  expect(screen.getByLabelText('Show upper cabinets')).not.toBeChecked();
  fireEvent.change(screen.getByLabelText('Room'), { target: { value: 'bathroom' } });
  expect(screen.queryByRole('button', { name: 'Backsplash Focus' })).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Tile Coverage')).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: tile.name })).toBeInTheDocument();
});


test('opens a wall product with an eye-level wall camera and keeps floor camera defaults', () => {
  const { unmount } = renderVisualizer({ ...tile, type: 'wall' });
  expect(screen.getByRole('button', { name: 'Front Wall' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByTestId('three-canvas')).toHaveAttribute('data-fov', '44');
  expect(screen.getByRole('button', { name: 'Pause auto-rotate' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Pause auto-zoom' })).toHaveAttribute('aria-pressed', 'true');
  unmount();
  renderVisualizer();
  expect(screen.getByTestId('three-canvas')).toHaveAttribute('data-fov', '58');
  expect(screen.getByRole('button', { name: 'Close-up' })).toHaveAttribute('aria-pressed', 'true');
});

test('full screen restores wall close-up with both automatic motion flags enabled', () => {
  renderVisualizer({ ...tile, type: 'wall' });
  const stage = screen.getByLabelText('Marvilla Blue 3D room preview');
  stage.requestFullscreen = jest.fn().mockResolvedValue(undefined);
  fireEvent.click(screen.getByRole('button', { name: 'Right Wall' }));
  fireEvent.click(screen.getByRole('button', { name: 'View full screen' }));
  expect(stage.requestFullscreen).toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Wall Close-up' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Pause auto-rotate' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Pause auto-zoom' })).toHaveAttribute('aria-pressed', 'true');
});
