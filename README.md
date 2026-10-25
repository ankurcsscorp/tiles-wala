# Tiles Wala

Tiles Wala is a React storefront for browsing tile collections, previewing a selected tile in a 3D room, and supporting customer enquiries and staff sales-bonus workflows.

The frontend is built with Create React App. Its interactive room preview uses React Three Fiber and Three.js; catalog, authentication, enquiry, and sales-bonus data are served by a separate backend.

## Features

- Browse featured tile products and open a product in the room visualizer.
- Preview a tile on the floor, walls, or both surfaces in living room, bedroom, kitchen, and bathroom scenes.
- Orbit the camera, pause or resume the scene motion, and switch to full-screen preview.
- Sign in and access role-dependent enquiry and sales-bonus pages.
- Submit and manage customer enquiries, and view or manage sales-bonus records and products.

## Requirements

- Node.js and npm compatible with the installed `react-scripts` version.
- The Tiles Wala backend running at `http://localhost:4000/api/tiles` for backend-backed features.
- Product images referenced by the catalog data. These are served from the frontend's `public` directory.

## Getting started

From this directory:

```bash
npm install
npm start
```

The development server opens at [http://localhost:3000](http://localhost:3000). Start the backend separately for authentication, collections, enquiries, and sales-bonus features. The frontend currently uses hard-coded `http://localhost:4000/api/tiles` URLs; configure the backend to accept requests from the frontend origin.

## Available scripts

For another device on the same Wi-Fi, keep the backend running on port 4000 and run `npm run start:lan`. Open `http://<this-computer-LAN-IP>:3001` on that device. This binds the frontend to all interfaces and proxies `/api` requests to `127.0.0.1:4000`, preserving authentication without adding LAN origins to backend CORS. Keep this computer awake and connected. This is local-network access; it does not configure a public internet tunnel or router forwarding.

| Command | Purpose |
| --- | --- |
| `npm start` | Run the development server. |
| `npm run start:lan` | Run a LAN-accessible session on port 3001 with API forwarding. |
| `npm test -- --watchAll=false` | Run the Jest test suite once. |
| `npm run build` | Create an optimized production build in `build/`. |

## Product and brand images

Featured product metadata is in [`src/components/data/newCollection.json`](src/components/data/newCollection.json). Its image URLs use the `/images/...` public URL convention. Put the corresponding files in `public/images/`; for example, `/images/brandlogo.png` maps to `public/images/brandlogo.png`.

The repository currently includes the brand logo but may not include all product images referenced by the catalog data. Add the matching image files or update the catalog paths before expecting every product thumbnail and visualizer texture to load. The current room visualizer builds its rooms from 3D geometry and does not require panorama files.

## Routes

| Route | Purpose | Access |
| --- | --- | --- |
| `/` | New tile collections | Public |
| `/visualizer` | 3D tile room preview | Public; opened with a product selected from the collection |
| `/contact` | Contact page | Public |
| `/enquiry` | Enquiry page | Public route; header link is shown to admins |
| `/auth` | Sign-in and account access | Public |
| `/sales-bonus` | Sales-bonus view | Authenticated users |
| `/sales-bonus-management` | Sales-bonus administration | Admin |
| `/stores` | Store administration, billing settings, and staff assignments | Admin |
| `/products` | Shared product, category, and unit management | Admin |
| `/enquiry-management` | Enquiry management | Admin and salesperson |

The header also links to the external online store. Authorization and role assignments are expected to be provided by the backend.

## Backend integration

The frontend currently calls a local API base, `http://localhost:4000/api/tiles`. The main API areas include authentication, collections, enquiries, user search, and sales-bonus records/products. The backend must provide compatible routes and enable CORS for the frontend origin. Backend implementation and database setup are not included in this frontend project.

Authentication state is stored in browser storage under `tilesWalaAuth`. Do not store secrets in the frontend; browser-delivered application code and storage are accessible to users.

## Project structure

```text
src/
  App.js                         Routes and application shell
  context/AuthContext.jsx        Authentication state and actions
  components/
    TileVisualizer.jsx           Three.js room and tile preview
    TileVisualizer.test.jsx      Visualizer regression tests
    NewCollection.jsx            Featured products and visualizer handoff
    data/newCollection.json      Featured product metadata
    Enquiry/                     Customer enquiry pages
    sales/                       Sales-bonus pages and management
public/
  images/                        Brand and product images
```

For implementation details and current design constraints, see [`DESIGN.md`](DESIGN.md).
