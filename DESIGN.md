# Tiles Wala — Design and Architecture

## Product overview

Tiles Wala combines a tile product gallery with a 3D room preview. A shopper selects a product in the gallery, opens the visualizer, and applies its image texture to the floor, walls, or both. Staff-facing pages support enquiries and sales-bonus workflows.

The frontend is a single-page React application. Catalog and staff workflows depend on a separately deployed API; the modeled visualizer itself runs in the browser.

## Application structure

- `src/index.js` mounts the React application inside `React.StrictMode`.
- `src/App.js` configures React Router routes, the shared header, and protected pages.
- `src/context/AuthContext.jsx` exposes authentication state and actions to the application.
- `src/components/NewCollection.jsx` loads/displays featured tiles and passes the selected tile to the visualizer through router state.
- `src/components/TileVisualizer.jsx` owns the room scene, materials, camera controls, toolbar, and full-screen behavior.
- `src/components/Enquiry/` and `src/components/sales/` contain customer-enquiry and sales-bonus workflows.

### Navigation and access

The gallery is the normal entry point. Selecting a product navigates to `/visualizer` with the selected tile in route state. The visualizer requires a tile with an image URL; when opened without one, it reports that it must be launched from a collection product.

Routes for sales and enquiry management are protected according to the authenticated user's `userType`. The header shows sales-bonus access to signed-in users, enquiry management to admins and salespeople, and admin-only links for administration pages. Backend authentication remains the source of user identity and permissions.

## 3D visualizer

### Scene architecture

The visualizer is a modeled room rather than a panorama-photo overlay. React Three Fiber renders the scene inside a Three.js `Canvas`. `ROOM_TEMPLATES` defines the room labels and dimensions for living, bedroom, bathroom, and kitchen templates. Room meshes include a floor, surrounding walls, a ceiling, a window opening, and baseboards; each template also conditionally renders its room-specific furniture or fixtures.

This geometry-based approach keeps the tile surface as a real floor or wall mesh. Tile overlays therefore do not have to be manually aligned over photographed beds, bathtubs, or other foreground objects.

### Camera and user controls

The camera starts inside the room at approximately standing eye level. `RoomOrbitControls` manages the camera around an eye-level target, constrains orbit and zoom to the room, and avoids free panning. The toolbar provides:

- Room selection.
- Floor, walls, or both surface selection.
- Full-screen mode.
- Pause/resume controls for camera auto-rotation and auto-zoom.

The WebGL canvas uses ACES filmic tone mapping and sRGB output. An environment map provides reflections, while directional/ambient lighting and contact shadows add depth to the room.

### Tile materials and texture scale

`TiledMaterial` clones the selected tile image texture and applies repeat wrapping. Repeat values are derived from room dimensions and the tile's dimensions so the image tiles at a meaningful scale. A generated grout bump/roughness texture provides subtle joints and surface variation; anisotropic filtering reduces texture blur at shallow viewing angles. Material finish settings select a glossy or matte response, with a small metalness contribution.

Textures are component-owned resources: dynamically created or cloned textures are disposed when the material is replaced or unmounted. The visualizer's error boundary and Suspense fallback provide failure and loading states around scene rendering.

### Asset handling

The tile image URL comes from the selected product data and is loaded as a texture. Public files are addressed from the site root: `/images/example.jpg` corresponds to `public/images/example.jpg`. Product metadata and file paths must agree. Missing files will prevent the corresponding product image or material texture from loading.

Room scenes are generated from geometry; the current implementation does not depend on external 360-degree panorama assets.

## Backend integration

The current frontend API URLs target `http://localhost:4000/api/tiles`. The expected API areas include:

- Authentication.
- Tile collections and user search.
- Customer enquiries.
- Sales-bonus records and products.

The backend is not part of this repository. It must be running separately, provide the routes and response shapes consumed by the frontend, and allow cross-origin requests from the frontend host. API URLs are presently hard-coded in components rather than configured through a shared environment-based API client.

The authentication context stores session data under the `tilesWalaAuth` browser-storage key. Client-side route protection improves navigation flow but is not a substitute for backend authorization.

## Design constraints and follow-up considerations

- **Asset completeness:** The catalog references public image files. Verify each referenced file exists under `public/` before release; the current checkout may contain only the brand logo.
- **Local API configuration:** Replace component-level localhost URLs with a shared configurable API base before deploying the frontend outside local development.
- **Visual calibration:** The room scenes use explicit dimensions, material parameters, and camera limits. Review each room and tile format at desktop and mobile viewport sizes; geometry and lighting changes can alter perceived scale and appearance.
- **Accessibility:** Keep labels and accessible names for canvas controls, selectors, toggles, and full-screen actions as new controls are added.
- **Performance:** Large tile textures and real-time shadows/environment lighting can be GPU-intensive. Test on mid-range mobile devices and optimize texture dimensions or rendering settings if needed.
