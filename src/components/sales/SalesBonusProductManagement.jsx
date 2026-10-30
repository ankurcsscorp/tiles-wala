import { formatNumber } from '../../utils/numberFormat';
import TextField from '../common/TextField';
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, FormControlLabel, Paper, Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import api from "../../api";

const PRODUCT_API_URL = "http://localhost:4000/api/tiles/sales-bonus/products";

const SalesBonusProductManagement = () => {
  const [products, setProducts] = useState([]);
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
      setError(requestError.response?.data?.message || "Unable to load invoice products.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const startEdit = product => setEditingProduct({
    ...product,
    default_cost_price: product.default_cost_price ?? product.default_purchase_price ?? "",
    default_bonus_percentage: product.default_bonus_percentage ?? "",
    unit_label: product.unit_label || "",
    is_active: product.has_bonus_rule ? Boolean(product.is_active) : true,
  });

  const updateEditingProduct = (field, value) => setEditingProduct(current => ({ ...current, [field]: value }));

  const handleSave = async () => {
    if (!editingProduct) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.put(`${PRODUCT_API_URL}/catalog/${editingProduct.product_id}`, {
        default_cost_price: editingProduct.default_cost_price,
        default_bonus_percentage: editingProduct.default_bonus_percentage,
        unit_label: editingProduct.unit_label,
        is_active: editingProduct.is_active,
      });
      setEditingProduct(null);
      await loadProducts();
      setSuccess(`Bonus rule saved for ${editingProduct.product_name}.`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save product bonus rule.");
    } finally {
      setSaving(false);
    }
  };

  const field = (key, label, type = "text") => (
    <TextField
      label={label}
      size="small"
      type={type}
      value={editingProduct?.[key] ?? ""}
      onChange={event => updateEditingProduct(key, event.target.value)}
      slotProps={type === "number" ? { htmlInput: { min: 0, max: key === "default_bonus_percentage" ? 100 : undefined, step: "0.01" } } : undefined}
      required
      fullWidth
    />
  );

  return (
    <Stack useFlexGap spacing={2.5}>
      <Box>
        <Typography variant="h6" fontWeight={700}>Product bonus rules</Typography>
        <Typography variant="body2" color="text.secondary">
          Products are loaded from the same active catalog used by sales invoices. Edit a product to set its cost, bonus percentage, and invoice unit.
        </Typography>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}

      <TableContainer component={Paper} variant="outlined" sx={{ overflowX: "auto" }}>
        <Table sx={{ minWidth: 900 }}>
          <TableHead><TableRow>{["SKU", "Invoice product", "Cost price", "Bonus %", "Unit", "Rule status", ""].map(label => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={7} align="center"><CircularProgress size={22} /></TableCell></TableRow>
              : products.length === 0 ? <TableRow><TableCell colSpan={7} align="center">No active invoice products found.</TableCell></TableRow>
                : products.map(product => {
                  const isEditing = editingProduct?.product_id === product.product_id;
                  return <TableRow key={product.product_id}>
                    <TableCell>{product.sku}</TableCell>
                    <TableCell>{product.product_name}</TableCell>
                    <TableCell>{isEditing ? field("default_cost_price", "Cost price", "number") : product.has_bonus_rule ? formatNumber(product.default_cost_price) : "—"}</TableCell>
                    <TableCell>{isEditing ? field("default_bonus_percentage", "Bonus %", "number") : product.has_bonus_rule ? `${formatNumber(product.default_bonus_percentage)}%` : "Not set"}</TableCell>
                    <TableCell>{isEditing ? field("unit_label", "Invoice unit") : product.unit_label || "—"}</TableCell>
                    <TableCell>{isEditing
                      ? <FormControlLabel control={<Switch checked={Boolean(editingProduct.is_active)} onChange={event => updateEditingProduct("is_active", event.target.checked)} size="small" />} label={editingProduct.is_active ? "Active" : "Inactive"} />
                      : product.has_bonus_rule ? product.is_active ? "Active" : "Inactive" : "Needs setup"}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>{isEditing
                      ? <Stack direction="row" spacing={0.5}><Button size="small" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button><Button size="small" onClick={() => setEditingProduct(null)} disabled={saving}>Cancel</Button></Stack>
                      : <Button size="small" onClick={() => startEdit(product)}>{product.has_bonus_rule ? "Edit rule" : "Add rule"}</Button>}</TableCell>
                  </TableRow>;
                })}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
};

export default SalesBonusProductManagement;
