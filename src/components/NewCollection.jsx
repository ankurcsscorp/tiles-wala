import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import collection from "./data/newCollection.json";
import "./NewCollection.css";

const COLLECTION_API_URL = "http://localhost:4000/api/tiles/collections";
const MAX_IMAGES = 5;
const MAX_TOTAL_IMAGE_SIZE = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const emptyForm = { name: "", size: "", description: "" };
const getProductKey = (item) =>
  `${item.name?.trim().toLocaleLowerCase()}|${item.size?.trim().toLocaleLowerCase()}`;
const featuredCollections = collection.map((item) => ({
  ...item,
  featured_key: String(item.id),
}));

const preloadImage = (src) =>
  new Promise((resolve) => {
    const image = new window.Image();
    const timeoutId = window.setTimeout(() => finish(false), 20000);
    const finish = (loaded) => {
      window.clearTimeout(timeoutId);
      image.onload = null;
      image.onerror = null;
      resolve(loaded);
    };

    image.onload = () => finish(true);
    image.onerror = () => finish(false);
    image.src = src;
    if (image.complete) finish(image.naturalWidth > 0);
  });

const CollectionImage = ({ src, alt, className, frameClassName }) => {
  const imageRef = useRef(null);
  const [imageState, setImageState] = useState({ src: null, status: "loading" });
  const status = imageState.src === src ? imageState.status : "loading";

  useEffect(() => {
    const image = imageRef.current;
    setImageState({
      src,
      status: image?.complete && image.naturalWidth > 0 ? "loaded" : "loading",
    });
  }, [src]);

  return (
    <div
      className={frameClassName}
      aria-busy={status === "loading"}
      aria-label={status === "error" ? "Tile image unavailable" : undefined}
    >
      {status === "loading" && (
        <span className="collection-image-loading" aria-label="Loading tile image" />
      )}
      {status === "error" && (
        <span className="collection-image-error">Image unavailable</span>
      )}
      <img
        ref={imageRef}
        className={`${className}${status === "loaded" ? " is-loaded" : ""}`}
        src={src}
        alt={alt}
        onLoad={() => setImageState({ src, status: "loaded" })}
        onError={() => setImageState({ src, status: "error" })}
      />
    </div>
  );
};

const CollectionCard = ({ item, isAdmin, onEdit, onView }) => {
  const [activeImage, setActiveImage] = useState(0);
  const images = item.images ?? [];

  return (
    <article className="collection-card">
      <div className="collection-card-gallery">
        {images.length > 0 ? (
          <>
            <CollectionImage
              frameClassName="collection-main-image-frame"
              className="collection-main-image"
              src={images[activeImage]}
              alt={`${item.name} tile design`}
            />
            {images.length > 1 && (
              <div className="collection-thumbnails" aria-label={`${item.name} photos`}>
                {images.map((image, index) => (
                  <button
                    className={`collection-thumbnail${index === activeImage ? " is-active" : ""}`}
                    key={`${item.id}-${index}`}
                    type="button"
                    onClick={() => setActiveImage(index)}
                    aria-label={`Show ${item.name} photo ${index + 1}`}
                    aria-pressed={index === activeImage}
                  >
                    <CollectionImage
                      frameClassName="collection-thumbnail-image-frame"
                      className="collection-thumbnail-image"
                      src={image}
                      alt=""
                    />
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="collection-image-placeholder">Tile image coming soon</div>
        )}
      </div>
      <div className="collection-info">
        <div className="collection-name-row">
          <h3>{item.name}</h3>
          {item.size && <span className="collection-size">{item.size}</span>}
        </div>
        {(item.description || item.finish) && (
          <p>{item.description || item.finish}</p>
        )}
        <button
          className="collection-visualize-button"
          type="button"
          onClick={() =>
            onView({
              ...item,
              imageUrl: images[activeImage] ?? images[0],
            })
          }
        >
          View in 360°
        </button>
        {isAdmin && (
          <button
            className="collection-edit-button"
            type="button"
            onClick={() => onEdit(item)}
            aria-label={`Edit ${item.name}`}
          >
            Edit product
          </button>
        )}
      </div>
    </article>
  );
};

const NewCollection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.userType?.toLowerCase() === "admin";
  const [collections, setCollections] = useState(featuredCollections);
  const [formData, setFormData] = useState(emptyForm);
  const [selectedImages, setSelectedImages] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [imageRetryKey, setImageRetryKey] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadCollections = async () => {
      try {
        const response = await api.get(COLLECTION_API_URL);
        if (isMounted) {
            const featuredOverrides = new Map();
            response.data.forEach((item) => {
              if (item.featured_key == null || String(item.featured_key).trim() === "") {
                return;
              }
              const featuredKey = String(item.featured_key);
              if (!featuredOverrides.has(featuredKey)) {
                featuredOverrides.set(featuredKey, item);
              }
            });
            const newCollections = response.data.filter(
              (item) => item.featured_key == null || String(item.featured_key).trim() === ""
            );
            const loadedFeaturedCollections = collection.map((item) => {
              const override = featuredOverrides.get(String(item.id));
            return override
                ? { ...item, ...override, id: item.id, featured_key: String(item.id) }
                : { ...item, featured_key: String(item.id) };
          });
          const featuredProductKeys = new Set(
              loadedFeaturedCollections.map(getProductKey)
          );
          const seenNewProductKeys = new Set();
          const uniqueNewCollections = newCollections.filter((item) => {
            const productKey = getProductKey(item);
            if (
              featuredProductKeys.has(productKey) ||
              seenNewProductKeys.has(productKey)
            ) {
              return false;
            }
            seenNewProductKeys.add(productKey);
            return true;
          });
          setCollections([...uniqueNewCollections, ...loadedFeaturedCollections]);
        }
      } catch (error) {
        console.error("Unable to load new tile collections:", error);
        if (isMounted) {
          setErrorMessage(
            "Newly added collections could not be loaded. Showing featured designs while we reconnect."
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadCollections();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const primaryImages = [
      ...new Set(
        collections
          .flatMap((item) => item.images ?? [])
          .filter((imageUrl) => typeof imageUrl === "string" && imageUrl.length > 0)
      ),
    ];

    setImagesLoaded(false);
    setImageLoadError(false);
    Promise.all(primaryImages.map(preloadImage)).then((results) => {
      if (!isMounted) return;
      setImageLoadError(results.some((loaded) => !loaded));
      setImagesLoaded(true);
    });

    return () => {
      isMounted = false;
    };
  }, [collections, imageRetryKey]);

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleImageSelection = async (event) => {
    const files = Array.from(event.target.files ?? []);
    setErrorMessage("");
    setSuccessMessage("");

    if (files.some((file) => !ALLOWED_IMAGE_TYPES.includes(file.type))) {
      setErrorMessage("Use JPG, PNG, or WebP images.");
      event.target.value = "";
      return;
    }
    if (selectedImages.length + files.length > MAX_IMAGES) {
      setErrorMessage(`Choose up to ${MAX_IMAGES} tile pictures in total.`);
      event.target.value = "";
      return;
    }
    const currentImageSize = selectedImages.reduce(
      (total, image) =>
        total +
        (image.file
          ? image.file.size
          : image.preview.startsWith("data:")
            ? Math.ceil(image.preview.length * 0.75)
            : 0),
      0
    );
    const newImageSize = files.reduce((total, file) => total + file.size, 0);
    if (currentImageSize + newImageSize > MAX_TOTAL_IMAGE_SIZE) {
      setErrorMessage("The combined size of your pictures must be 8 MB or less.");
      event.target.value = "";
      return;
    }

    try {
      const previews = await Promise.all(
        files.map(
          (file) =>
            new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                if (typeof reader.result !== "string") {
                  reject(new Error("Unable to read one of the selected images."));
                  return;
                }
                resolve({ file, preview: reader.result });
              };
              reader.onerror = () => reject(new Error("Unable to read one of the selected images."));
              reader.readAsDataURL(file);
            })
        )
      );
      setSelectedImages((current) => [...current, ...previews]);
      event.target.value = "";
    } catch (error) {
      console.error("Unable to read selected collection images:", error);
      setErrorMessage("One of the selected pictures could not be read. Please try again.");
      event.target.value = "";
    }
  };

  const startEditing = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      size: item.size ?? "",
      description: item.description ?? item.finish ?? "",
    });
    setSelectedImages(
      (item.images ?? []).map((image) => ({ file: null, preview: image }))
    );
    setErrorMessage("");
    setSuccessMessage("");
    document.getElementById("collection-admin-title")?.scrollIntoView?.({
      behavior: "smooth",
      block: "center",
    });
  };

  const cancelEditing = () => {
    setEditingItem(null);
    setFormData(emptyForm);
    setSelectedImages([]);
    setErrorMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (selectedImages.length === 0) {
      setErrorMessage("Add at least one tile picture to save this collection.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        images: selectedImages.map(({ preview }) => preview),
      };
      const endpoint = editingItem
        ? editingItem.featured_key
          ? `${COLLECTION_API_URL}/featured/${editingItem.featured_key}`
          : `${COLLECTION_API_URL}/${editingItem.id}`
        : COLLECTION_API_URL;
      const response = editingItem
        ? await api.put(endpoint, payload)
        : await api.post(endpoint, payload);
      if (editingItem && response.status !== 200) {
        throw new Error("The server did not confirm that the collection update was saved.");
      }
      const savedItem = response.data;
      if (editingItem?.featured_key) {
        setCollections((current) =>
          current.map((item) =>
            String(item.featured_key) === String(savedItem.featured_key)
              ? { ...item, ...savedItem, id: item.id }
              : item
          )
        );
      } else if (editingItem) {
        setCollections((current) =>
          current.map((item) =>
            String(item.id) === String(savedItem.id) ? savedItem : item
          )
        );
      } else {
        setCollections((current) => [savedItem, ...current]);
      }
      setFormData(emptyForm);
      setSelectedImages([]);
      setEditingItem(null);
      event.target.reset();
      setSuccessMessage(
        editingItem
          ? `${savedItem.name} was updated.`
          : `${savedItem.name} is now in the collection gallery.`
      );
    } catch (error) {
      console.error("Unable to save tile collection:", error);
      setErrorMessage(
        error.response?.data?.message || "The collection could not be saved. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const removeSelectedImage = (imageIndex) => {
    setSelectedImages((current) => current.filter((_, index) => index !== imageIndex));
  };

  if (isLoading || !imagesLoaded) {
    return (
      <main className="collection-page collection-page-loading" aria-busy="true">
        <div className="collection-page-loader" role="status">
          <span className="collection-page-spinner" aria-hidden="true" />
          <p>Loading the collection and product images…</p>
        </div>
      </main>
    );
  }

  if (imageLoadError) {
    return (
      <main className="collection-page collection-page-loading">
        <div className="collection-image-load-error" role="alert">
          <p>Some product images could not be loaded. Check your connection and try again.</p>
          <button type="button" onClick={() => setImageRetryKey((key) => key + 1)}>
            Retry loading images
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="collection-page">
      <section className="collection-hero">
        <div className="collection-hero-copy">
          <span className="collection-eyebrow">A &amp; A HOME DECOR · TILE EDIT</span>
          <h1>New Collection</h1>
          <p>Find the surface that makes your space feel like yours.</p>
        </div>
        <div className="collection-hero-art" aria-hidden="true">
          <span className="hero-art-tile hero-art-tile-one" />
          <span className="hero-art-tile hero-art-tile-two" />
          <span className="hero-art-tile hero-art-tile-three" />
        </div>
      </section>

      {isAdmin && (
        <section className="collection-admin-panel" aria-labelledby="collection-admin-title">
          <div className="collection-admin-heading">
            <span className="collection-eyebrow">ADMIN STUDIO</span>
            <h2 id="collection-admin-title">
              {editingItem ? `Edit ${editingItem.name}` : "Add a tile collection"}
            </h2>
            <p>
              {editingItem
                ? "Update the product details or replace its pictures."
                : "Share a new design with everyone browsing the gallery."}
            </p>
          </div>
          <form className="collection-upload-form" onSubmit={handleSubmit}>
            <div className="collection-form-fields">
              <label>
                Collection name
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleFieldChange}
                  maxLength={150}
                  placeholder="e.g. Calacatta Gold"
                  required
                />
              </label>
              <label>
                Tile size
                <input
                  name="size"
                  value={formData.size}
                  onChange={handleFieldChange}
                  maxLength={80}
                  placeholder="e.g. 600 × 1200 mm"
                  required
                />
              </label>
              <label className="collection-description-field">
                Description
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleFieldChange}
                  maxLength={1000}
                  placeholder="Describe the finish, pattern, or feel of this tile."
                  rows={3}
                  required
                />
              </label>
            </div>
            <label className="collection-image-picker">
              <span className="collection-upload-icon" aria-hidden="true">+</span>
              <strong>Add tile pictures</strong>
              <span>
                Select multiple files or add more in another selection · up to {MAX_IMAGES} images · 8 MB total
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleImageSelection}
              />
            </label>
            {selectedImages.length > 0 && (
              <div className="collection-upload-previews">
                {selectedImages.map(({ file, preview }, index) => (
                  <div className="collection-upload-preview" key={`${preview.slice(0, 60)}-${index}`}>
                    <img src={preview} alt={`Selected tile preview ${index + 1}`} />
                    <button
                      type="button"
                      onClick={() => removeSelectedImage(index)}
                      aria-label={`Remove selected photo ${index + 1}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button className="collection-submit-button" type="submit" disabled={isSaving}>
              {isSaving
                ? editingItem ? "Saving..." : "Publishing..."
                : editingItem ? "Save changes" : "Publish collection"}
            </button>
            {editingItem && (
              <button
                className="collection-cancel-button"
                type="button"
                onClick={cancelEditing}
                disabled={isSaving}
              >
                Cancel editing
              </button>
            )}
          </form>
        </section>
      )}

      {errorMessage && <p className="collection-message is-error" role="alert">{errorMessage}</p>}
      {successMessage && <p className="collection-message is-success" role="status">{successMessage}</p>}

      <section className="collection-list-section" aria-labelledby="collection-list-title">
        <div className="collection-section-heading">
          <div>
            <span className="collection-eyebrow">MADE TO MAKE A STATEMENT</span>
            <h2 id="collection-list-title">Explore the latest designs</h2>
          </div>
          <span className="collection-count">{collections.length} designs</span>
        </div>
        <div className="collection-grid">
          {collections.map((item) => (
            <CollectionCard
              item={item}
              isAdmin={isAdmin}
              onEdit={startEditing}
              onView={(tile) => navigate("/visualizer", { state: { tile } })}
              key={item.featured_key ? `featured-${item.featured_key}` : `collection-${item.id}`}
            />
          ))}
        </div>
      </section>
    </main>
  );
};

export default NewCollection;
