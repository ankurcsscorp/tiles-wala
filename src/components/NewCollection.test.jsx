import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import featuredCollections from "./data/newCollection.json";
import NewCollection from "./NewCollection";

jest.mock("../api", () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn() },
}));

jest.mock("../context/AuthContext", () => ({
  useAuth: jest.fn(),
}));

const savedCollection = {
  id: "saved-collection",
  name: "Calacatta Gold",
  size: "600 x 1200 mm",
  description: "A warm marble look.",
  images: ["data:image/png;base64,aGVsbG8="],
  featured_key: null,
};

const originalImage = window.Image;
let pendingImages;
let autoCompleteImages;
let failImages;

beforeEach(() => {
  pendingImages = [];
  autoCompleteImages = true;
  failImages = false;
  window.Image = class {
    constructor() {
      this.complete = false;
      this.naturalWidth = 0;
      this.onload = null;
      this.onerror = null;
    }

    set src(value) {
      this.source = value;
      pendingImages.push(this);
      if (autoCompleteImages) {
        Promise.resolve().then(() => {
          if (failImages) {
            this.onerror?.();
          } else {
            this.complete = true;
            this.naturalWidth = 100;
            this.onload?.();
          }
        });
      }
    }
  };
  api.get.mockResolvedValue({ data: [savedCollection] });
  api.post.mockResolvedValue({ data: savedCollection });
  api.put.mockResolvedValue({ status: 200, data: savedCollection });
  useAuth.mockReturnValue({ user: null });
});

afterEach(() => {
  window.Image = originalImage;
});

const renderCollection = () =>
  render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<NewCollection />} />
        <Route path="/visualizer" element={<h1>3D room preview</h1>} />
      </Routes>
    </MemoryRouter>
  );

test("shows saved collections to visitors without admin controls", async () => {
  renderCollection();

  expect(await screen.findByRole("heading", { name: "Calacatta Gold" })).toBeInTheDocument();
  expect(screen.getByText("A warm marble look.")).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Add a tile collection" })).not.toBeInTheDocument();
});

test("shows an image loader until the product image is ready", async () => {
  renderCollection();

  const image = await screen.findByAltText("Calacatta Gold tile design");
  const imageFrame = image.closest(".collection-main-image-frame");
  expect(imageFrame).toHaveAttribute("aria-busy", "true");

  fireEvent.load(image);

  expect(imageFrame).toHaveAttribute("aria-busy", "false");
  expect(image).toHaveClass("is-loaded");
});

test("blocks the page with a full-page loader until the gallery images load", async () => {
  autoCompleteImages = false;
  renderCollection();

  expect(screen.getByRole("status")).toHaveTextContent(
    "Loading the collection and product images"
  );
  const expectedImageRequests = new Set([
    ...featuredCollections.flatMap((item) => item.images),
    ...savedCollection.images,
  ]).size;
  await waitFor(() => {
    expect(pendingImages.length).toBeGreaterThanOrEqual(expectedImageRequests * 2 - 1);
  });

  pendingImages.forEach((image) => {
    image.complete = true;
    image.naturalWidth = 100;
    image.onload?.();
  });

  expect(await screen.findByRole("heading", { name: "Calacatta Gold" })).toBeInTheDocument();
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

test("shows a page-level retry action if an image fails to load", async () => {
  failImages = true;
  renderCollection();

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Some product images could not be loaded"
  );
  expect(screen.queryByText("Image unavailable")).not.toBeInTheDocument();

  failImages = false;
  fireEvent.click(screen.getByRole("button", { name: "Retry loading images" }));

  expect(await screen.findByRole("heading", { name: "Calacatta Gold" })).toBeInTheDocument();
});

test("shows the collection upload form to admins", async () => {
  useAuth.mockReturnValue({ user: { userType: "Admin" } });

  renderCollection();

  expect(await screen.findByRole("heading", { name: "Add a tile collection" })).toBeInTheDocument();
  expect(screen.getByLabelText("Collection name")).toBeInTheDocument();
  expect(screen.getByLabelText("Tile size")).toBeInTheDocument();
  expect(screen.getByLabelText("Description")).toBeInTheDocument();
  expect(screen.getByLabelText(/add tile pictures/i)).toBeInTheDocument();
});

test("publishes all pictures selected in separate batches", async () => {
  useAuth.mockReturnValue({ user: { userType: "Admin" } });
  const postedCollection = {
    ...savedCollection,
    id: "new-collection",
    name: "New Marble",
    images: ["data:image/png;base64,dGlsZTE=", "data:image/jpeg;base64,dGlsZTI="],
  };
  api.post.mockResolvedValue({ data: postedCollection });
  renderCollection();

  fireEvent.change(await screen.findByLabelText("Collection name"), {
    target: { value: "New Marble" },
  });
  fireEvent.change(screen.getByLabelText("Tile size"), {
    target: { value: "600 x 1200 mm" },
  });
  fireEvent.change(screen.getByLabelText("Description"), {
    target: { value: "A warm marble look." },
  });
  const imagePicker = screen.getByLabelText(/add tile pictures/i);
  fireEvent.change(imagePicker, {
    target: { files: [new File(["tile1"], "tile1.png", { type: "image/png" })] },
  });
  expect(await screen.findByAltText("Selected tile preview 1")).toBeInTheDocument();
  fireEvent.change(imagePicker, {
    target: { files: [new File(["tile2"], "tile2.jpg", { type: "image/jpeg" })] },
  });
  expect(await screen.findByAltText("Selected tile preview 2")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Publish collection" }));

  await waitFor(() => {
    expect(api.post).toHaveBeenCalledWith(
      "http://localhost:4000/api/tiles/collections",
      expect.objectContaining({
        name: "New Marble",
        size: "600 x 1200 mm",
        description: "A warm marble look.",
        images: [
          expect.stringMatching(/^data:image\/png;base64,/),
          expect.stringMatching(/^data:image\/jpeg;base64,/),
        ],
      })
    );
  });
  expect(await screen.findByRole("heading", { name: "New Marble" })).toBeInTheDocument();
});

test("allows an admin to edit and save an existing featured product", async () => {
  useAuth.mockReturnValue({ user: { userType: "Admin" } });
  api.get.mockResolvedValue({
    data: [{ ...savedCollection, id: "20", featured_key: "1" }],
  });
  const updatedCollection = {
    ...savedCollection,
    id: "20",
    featured_key: "1",
    name: "Marvilla Blue Updated",
  };
  api.put.mockResolvedValue({ status: 200, data: updatedCollection });

  renderCollection();

  fireEvent.click(await screen.findByRole("button", { name: "Edit Calacatta Gold" }));
  expect(screen.getByRole("heading", { name: "Edit Calacatta Gold" })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Collection name"), {
    target: { value: "Marvilla Blue Updated" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

  await waitFor(() => {
    expect(api.put).toHaveBeenCalledWith(
      "http://localhost:4000/api/tiles/collections/featured/1",
      expect.objectContaining({
        name: "Marvilla Blue Updated",
        images: ["data:image/png;base64,aGVsbG8="],
      })
    );
  });
  expect(await screen.findByRole("heading", { name: "Marvilla Blue Updated" })).toBeInTheDocument();
});

test("saves edits to a built-in featured product through the featured update endpoint", async () => {
  useAuth.mockReturnValue({ user: { userType: "Admin" } });
  api.get.mockResolvedValue({ data: [] });
  const featuredUpdate = {
    id: "25",
    featured_key: "1",
    name: "Marvilla Blue",
    size: "600x1200",
    description: "Book Match Glossy",
    images: ["/images/1.3.jpg", "data:image/png;base64,bmV3"],
  };
  api.put.mockResolvedValue({ status: 200, data: featuredUpdate });

  renderCollection();

  fireEvent.click(await screen.findByRole("button", { name: "Edit Marvilla Blue" }));
  fireEvent.change(screen.getByLabelText("Description"), {
    target: { value: "Updated tile details." },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

  await waitFor(() => {
    expect(api.put).toHaveBeenCalledWith(
      "http://localhost:4000/api/tiles/collections/featured/1",
      expect.objectContaining({
        name: "Marvilla Blue",
        description: "Updated tile details.",
        images: ["/images/1.3.jpg", "/images/1.3.jpg"],
      })
    );
  });
  expect(api.post).not.toHaveBeenCalled();
});

test("shows a featured product only once when the API contains an accidental duplicate", async () => {
  const duplicateFeaturedProduct = {
    ...savedCollection,
    id: "21",
    featured_key: null,
    name: "Marvilla Blue",
    size: "600x1200",
  };
  api.get.mockResolvedValue({
    data: [
      {
        ...duplicateFeaturedProduct,
        id: "20",
        featured_key: "1",
        name: "Marvilla Blue",
        images: ["/images/1.3.jpg", "/images/1.3.jpg"],
      },
      duplicateFeaturedProduct,
    ],
  });

  renderCollection();

  expect(await screen.findByRole("heading", { name: "Marvilla Blue" })).toBeInTheDocument();
  expect(screen.getAllByRole("heading", { name: "Marvilla Blue" })).toHaveLength(1);
});

test("opens the 360 preview for a gallery product", async () => {
  renderCollection();

  const viewButtons = await screen.findAllByRole("button", { name: "View in 360°" });
  fireEvent.click(viewButtons[0]);

  expect(await screen.findByRole("heading", { name: "3D room preview" })).toBeInTheDocument();
});
