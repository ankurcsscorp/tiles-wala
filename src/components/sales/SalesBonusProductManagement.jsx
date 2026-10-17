import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import api from "../../api";

const PRODUCT_API_URL = "http://localhost:4000/api/tiles/sales-bonus/products";
const EMPTY_PRODUCT = {
  product_name: "",
  default_cost_price: "",
  default_bonus_percentage: "10",
  unit_label: "Box",
};

const SalesBonusProductManagement = ({ onCatalogChange }) => {
  const [products, setProducts] = useState([]);
  const [newProduct, setNewProduct] = useState({ ...EMPTY_PRODUCT });
  const [editingProduct, setEditingProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get(`${PRODUCT_API_URL}/manage`);
      setProducts(Array.isArray(response.data) ? response.data : []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load products.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleCreate = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.post(PRODUCT_API_URL, newProduct);
      setNewProduct({ ...EMPTY_PRODUCT });
      await loadProducts();
      onCatalogChange();
      setSuccess("Product added.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to add product.");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.put(`${PRODUCT_API_URL}/${editingProduct.id}`, editingProduct);
      setEditingProduct(null);
      await loadProducts();
      onCatalogChange();
      setSuccess("Product updated.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update product.");
    } finally {
      setSaving(false);
    }
  };

  const updateNewProduct = (field, value) => {
    setNewProduct((current) => ({ ...current, [field]: value }));
  };

  const updateEditingProduct = (field, value) => {
    setEditingProduct((current) => ({ ...current, [field]: value }));
  };

  const renderProductField = (product, field, label, type = "text") => (
    <TextField
      label={label}
      size="small"
      type={type}
      value={product[field] ?? ""}
      onChange={(event) => updateEditingProduct(field, event.target.value)}
      slotProps={type === "number" ? { htmlInput: { min: 0, step: "0.01" } } : undefined}
      fullWidth
    />
  );

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h6" fontWeight={700}>
          Update Product
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Add products or update their catalog details and availability.
        </Typography>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}

      <Paper component="form" variant="outlined" onSubmit={handleCreate} sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
          Add Product
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
              lg: "2fr 1fr 1fr 1fr auto",
            },
            gap: 1.5,
            alignItems: "center",
          }}
        >
          <TextField
            label="Product name"
            size="small"
            value={newProduct.product_name}
            onChange={(event) => updateNewProduct("product_name", event.target.value)}
            required
          />
          <TextField
            label="Cost price"
            size="small"
            type="number"
            value={newProduct.default_cost_price}
            onChange={(event) => updateNewProduct("default_cost_price", event.target.value)}
            slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
            required
          />
          <TextField
            label="Bonus %"
            size="small"
            type="number"
            value={newProduct.default_bonus_percentage}
            onChange={(event) => updateNewProduct("default_bonus_percentage", event.target.value)}
            slotProps={{ htmlInput: { min: 0, max: 100, step: "0.01" } }}
            required
          />
          <TextField
            label="Unit"
            size="small"
            value={newProduct.unit_label}
            onChange={(event) => updateNewProduct("unit_label", event.target.value)}
            required
          />
          <Button type="submit" variant="contained" disabled={saving}>
            Add Product
          </Button>
        </Box>
      </Paper>

      <TableContainer component={Paper} variant="outlined" sx={{ overflowX: "auto" }}>
        <Table sx={{ minWidth: 850 }}>
          <TableHead>
            <TableRow>
              <TableCell>Product name</TableCell>
              <TableCell>Cost price</TableCell>
              <TableCell>Bonus %</TableCell>
              <TableCell>Unit</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <CircularProgress size={22} />
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No products found.
                </TableCell>
              </TableRow>
            ) : products.map((product) => {
              const isEditing = editingProduct?.id === product.id;
              const current = isEditing ? editingProduct : product;
              return (
                <TableRow key={product.id}>
                  <TableCell>
                    {isEditing
                      ? renderProductField(current, "product_name", "Product name")
                      : product.product_name}
                  </TableCell>
                  <TableCell>
                    {isEditing
                      ? renderProductField(current, "default_cost_price", "Cost price", "number")
                      : product.default_cost_price}
                  </TableCell>
                  <TableCell>
                    {isEditing
                      ? renderProductField(current, "default_bonus_percentage", "Bonus %", "number")
                      : product.default_bonus_percentage}
                  </TableCell>
                  <TableCell>
                    {isEditing
                      ? renderProductField(current, "unit_label", "Unit")
                      : product.unit_label}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <FormControlLabel
                        control={
                          <Switch
                            checked={Boolean(editingProduct.is_active)}
                            onChange={(event) => updateEditingProduct("is_active", event.target.checked)}
                            size="small"
                          />
                        }
                        label={editingProduct.is_active ? "Active" : "Inactive"}
                      />
                    ) : product.is_active ? "Active" : "Inactive"}
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    {isEditing ? (
                      <>
                        <Button size="small" onClick={handleSave} disabled={saving}>
                          Save
                        </Button>
                        <Button size="small" onClick={() => setEditingProduct(null)} disabled={saving}>
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="small"
                        onClick={() => setEditingProduct({
                          ...product,
                          default_cost_price: String(product.default_cost_price),
                          default_bonus_percentage: String(product.default_bonus_percentage),
                        })}
                      >
                        Edit
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
};

export default SalesBonusProductManagement;