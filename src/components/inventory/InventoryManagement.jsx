import { formatMoney } from '../../utils/numberFormat';
import TextField from '../common/TextField';
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Checkbox, Chip, CircularProgress, FormControlLabel, MenuItem, Paper, Stack, Tab, Tabs, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import api from "../../api";
import { useStores } from "../../context/StoreContext";
import "./InventoryManagement.css";

const base = "http://localhost:4000/api/tiles";
const tabs = ["Stock", "Movements", "Low stock", "Valuation", "Reconciliation", "Adjust stock"];
const money = (value) => value === null || value === undefined ? "Not configured" : formatMoney(value);
const quantity = (value) => Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 4 });

export default function InventoryManagement() {
  const { stores, selectedStoreId, selectStore } = useStores();
  const [storeId, setStoreId] = useState(selectedStoreId || "");
  const [tab, setTab] = useState(0); const [search, setSearch] = useState("");
  const [includeZero, setIncludeZero] = useState(false);
  const [items, setItems] = useState([]); const [summary, setSummary] = useState(null);
  const [products, setProducts] = useState([]); const [conversionUnits, setConversionUnits] = useState({});
  const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const [reason, setReason] = useState(""); const [lines, setLines] = useState([{ productId: "", unitId: "", quantity: "", direction: "increase" }]);
  const params = useMemo(() => { const query = new URLSearchParams(); if (storeId) query.set("storeId", storeId); if (search.trim()) query.set("search", search.trim()); if (tab === 0 && includeZero) query.set("includeZero", "true"); return query.toString(); }, [storeId, search, tab, includeZero]);

  const loadData = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const path = ["", "/movements", "/low-stock", "/valuation", "/reconciliation", ""][tab];
      if (tab === 5) {
        const [productResponse, stockResponse] = await Promise.all([
          api.get(`${base}/products`, { params: { limit: 100, q: search } }),
          api.get(`${base}/inventory`, { params: { storeId, includeZero: true, limit: 200, search } }),
        ]);
        setProducts(productResponse.data.items || productResponse.data);
        setItems(stockResponse.data.items || []);
      } else {
        const endpoint = tab === 0 ? `${base}/inventory` : `${base}/inventory${path}`;
        const response = await api.get(endpoint + (params ? `?${params}` : ""));
        if (tab === 0) { setItems(response.data.items || []); setSummary((await api.get(`${base}/inventory/summary${storeId ? `?storeId=${storeId}` : ""}`)).data); }
        else if (tab === 1 || tab === 3) setItems(response.data.items || response.data);
        else if (tab === 2) setItems(response.data);
        else setItems([...(response.data.discrepancies || []).map(row=>({...row,location:row.store_name,expected:row.balance_quantity})),...(response.data.transitDiscrepancies || []).map(row=>({...row,location:"IN TRANSIT",expected:row.expected_quantity}))]);
      }
    } catch (requestError) { setError(requestError.response?.data?.message || "Unable to load inventory data"); }
    finally { setLoading(false); }
  }, [tab, params, storeId, search]);
  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { setStoreId(selectedStoreId || ""); }, [selectedStoreId]);

  const updateLine = (index, key, value) => setLines((current) => current.map((line, i) => i === index ? { ...line, [key]: value } : line));
  const selectLineProduct = async (index, productId) => {
    updateLine(index, "productId", productId); updateLine(index, "unitId", "");
    if (!productId) return;
    try { const response = await api.get(`${base}/products/${productId}/conversions`); setConversionUnits((current) => ({ ...current, [productId]: response.data })); }
    catch { setConversionUnits((current) => ({ ...current, [productId]: [] })); }
  };
  const addLine = () => setLines((current) => [...current, { productId: "", unitId: "", quantity: "", direction: "increase" }]);
  const submitAdjustment = async (event) => {
    event.preventDefault(); setError(""); setNotice("");
    try {
      const key = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const response = await api.post(`${base}/inventory/adjustments`, { storeId, reason, idempotencyKey: key, items: lines.map((line) => ({ ...line, quantity: line.quantity })) });
      setNotice(`Posted ${response.data.adjustmentNumber}. Stock ledger and balances were updated.`); setReason(""); setLines([{ productId: "", unitId: "", quantity: "", direction: "increase" }]);
      await loadData();
    } catch (requestError) { setError(requestError.response?.data?.message || "Unable to post the stock adjustment"); }
  };

  const columns = tab === 1 ? ["Date", "Product", "Store", "Movement", "Change", "Source", "User"]
    : tab === 4 ? ["Location", "Product", "Expected", "Ledger", "Difference"]
      : ["Product", "SKU", "Store", "On hand", "Reserved", "Available", "Unit", "Value", "Availability"];

  return <Box className="inventory-page">
    <Stack useFlexGap direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} spacing={2}>
      <Box><Typography variant="h4" fontWeight={700}>Inventory</Typography><Typography color="text.secondary">Shared product catalog · store-specific stock and inventory movements</Typography></Box>
      <Stack className="ui-form-grid" useFlexGap direction={{ xs: "column", sm: "row" }} spacing={1}>
        <TextField slotProps={{inputLabel:{shrink:true},select:{displayEmpty:true}}} select label="Store" size="small" value={storeId} onChange={(event) => { setStoreId(event.target.value); if (event.target.value) selectStore(event.target.value); }} sx={{ minWidth: 210 }}>
          <MenuItem value="">All authorized stores</MenuItem>{stores.map((store) => <MenuItem key={store.id} value={String(store.id)}>{store.name}</MenuItem>)}
        </TextField>
        <TextField label="Search products" size="small" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="SKU, name, brand, size…" />
        {tab === 0 && <FormControlLabel control={<Checkbox checked={includeZero} onChange={(event) => setIncludeZero(event.target.checked)} />} label="Show out-of-stock products" />}
      </Stack>
    </Stack>
    {summary && tab === 0 && <div className="inventory-summary">
      <Paper><span>{storeId?"Stock at selected store":"Stock at stores"}</span><b>{quantity(summary.total_quantity)}</b></Paper><Paper><span>In transit</span><b>{quantity(summary.transit_quantity)}</b></Paper><Paper><span>{storeId?"Selected store + transit":"Stores + transit"}</span><b>{quantity(summary.business_total_quantity)}</b></Paper><Paper><span>Valued stock</span><b>{money(summary.valued_stock)}</b></Paper><Paper><span>Missing costs</span><b>{summary.unvalued_product_store_count}</b></Paper>
    </div>}
    <Paper className="inventory-panel">
      <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto">{tabs.map((label) => <Tab key={label} label={label} />)}</Tabs>
      {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}{notice && <Alert severity="success" sx={{ m: 2 }}>{notice}</Alert>}
      {loading ? <Box sx={{ display: "grid", placeItems: "center", p: 6 }}><CircularProgress /></Box> : tab === 5 ? <Box component="form" onSubmit={submitAdjustment} className="adjustment-form">
        <Typography variant="h6">Create a stock adjustment</Typography>
        <Alert severity="info">Adjustments are recorded in the immutable movement ledger. Decreases that would make stock negative are rejected.</Alert>
        <TextField slotProps={{inputLabel:{shrink:true},select:{displayEmpty:true}}} required select label="Store to adjust" value={storeId} onChange={(event) => setStoreId(event.target.value)}><MenuItem value="">Choose store</MenuItem>{stores.map((store) => <MenuItem key={store.id} value={String(store.id)}>{store.name}</MenuItem>)}</TextField>
        <TextField required multiline minRows={2} label="Reason" value={reason} onChange={(event) => setReason(event.target.value)} slotProps={{htmlInput:{ maxLength: 1000 }}} />
        {lines.map((line, index) => <Stack useFlexGap key={index} direction={{ xs: "column", md: "row" }} spacing={1} className="adjustment-line">
          <TextField slotProps={{inputLabel:{shrink:true},select:{displayEmpty:true}}} required select fullWidth label="Product" value={line.productId} onChange={(event) => selectLineProduct(index, event.target.value)}><MenuItem value="">Choose product</MenuItem>{products.map((product) => <MenuItem key={product.id} value={String(product.id)}>{product.sku} — {product.name}</MenuItem>)}</TextField>
          <TextField slotProps={{inputLabel:{shrink:true},select:{displayEmpty:true}}} required select label="Unit" value={line.unitId} onChange={(event) => updateLine(index, "unitId", event.target.value)}><MenuItem value="">Choose unit</MenuItem>{(() => { const product = products.find((row) => String(row.id) === String(line.productId)); const choices = product ? [{ id: product.base_unit_id, name: product.base_unit_name }, ...(conversionUnits[line.productId] || []).map((row) => ({ id: row.unit_id, name: row.name }))] : []; return choices.map((unit) => <MenuItem key={unit.id} value={String(unit.id)}>{unit.name}</MenuItem>); })()}</TextField>
          <TextField required type="number" label="Quantity" value={line.quantity} onChange={(event) => updateLine(index, "quantity", event.target.value)} slotProps={{htmlInput:{ min: "0.0001", step: "0.0001" }}} />
          <TextField select label="Direction" value={line.direction} onChange={(event) => updateLine(index, "direction", event.target.value)}><MenuItem value="increase">Increase</MenuItem><MenuItem value="decrease">Decrease</MenuItem></TextField>
          {lines.length > 1 && <Button color="error" onClick={() => setLines((current) => current.filter((_, i) => i !== index))}>Remove</Button>}
        </Stack>)}
        <Stack flexWrap="wrap" useFlexGap direction="row" spacing={1}><Button onClick={addLine}>Add line</Button><Button type="submit" variant="contained" disabled={!storeId}>Post adjustment</Button></Stack>
      </Box> : <div className="inventory-table-wrap"><Table size="small" stickyHeader><TableHead><TableRow>{columns.map((column) => <TableCell key={column} align={/^(Qty|Quantity|On hand|Reserved|Available|Value|Change|Expected|Ledger|Difference|Rate|Discount|Tax|Taxable|Line total|Total|Amount|Allocated|Previously allocated|Outstanding|This payment|Received|Remaining)/.test(column)?"right":"left"}>{column}</TableCell>)}</TableRow></TableHead><TableBody>
        {items.map((item) => <TableRow key={item.id || `${item.store_id}-${item.product_id}-${item.created_at}`}>
          {tab === 1 ? <><TableCell>{new Date(item.created_at).toLocaleString()}</TableCell><TableCell>{item.sku} · {item.product_name}</TableCell><TableCell>{item.store_name}</TableCell><TableCell>{item.movement_type}</TableCell><TableCell align="right">{quantity(item.quantity_delta)} {item.unit_code}</TableCell><TableCell>{item.source_type} #{item.source_id}</TableCell><TableCell>{item.created_by_name || "—"}</TableCell></>
            : tab === 4 ? <><TableCell>{item.location}</TableCell><TableCell>{item.sku} · {item.product_name}</TableCell><TableCell align="right">{quantity(item.expected)}</TableCell><TableCell align="right">{quantity(item.ledger_quantity)}</TableCell><TableCell align="right">{quantity(item.difference)}</TableCell></>
              : <><TableCell>{item.product_name}</TableCell><TableCell>{item.sku}</TableCell><TableCell>{item.store_name}</TableCell><TableCell align="right">{quantity(item.quantity_on_hand)}</TableCell><TableCell align="right">{quantity(item.reserved_quantity)}</TableCell><TableCell align="right">{quantity(item.available_quantity)}</TableCell><TableCell>{item.unit_name}</TableCell><TableCell align="right">{money(item.stock_value)}</TableCell><TableCell><Chip variant="outlined" color={Number(item.available_quantity)<=0?"error":tab===2?"warning":"success"} label={Number(item.available_quantity)<=0?"Out of stock":tab===2?"Low stock":"Available"}/></TableCell></>}
        </TableRow>)}
        {!items.length && <TableRow><TableCell colSpan={columns.length} align="center">{tab === 4 ? "Inventory ledger and balances reconcile" : "No inventory rows match this filter"}</TableCell></TableRow>}
      </TableBody></Table></div>}
    </Paper>
  </Box>;
}
