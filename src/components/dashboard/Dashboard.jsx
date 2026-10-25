import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Card, CardContent, CircularProgress, FormControl, InputLabel, MenuItem, Select, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import api from "../../api";
import { useStores } from "../../context/StoreContext";
import { useAuth } from "../../context/AuthContext";
import "./Dashboard.css";

const API = "http://localhost:4000/api/tiles/dashboard";
const reportOptions = [
  ["sales_by_date", "Sales by date"], ["sales_by_store", "Sales by store"], ["sales_by_product", "Sales by product"], ["sales_by_customer", "Sales by customer"], ["sales_by_salesperson", "Sales by salesperson"],
  ["purchases_by_date", "Purchases by date"], ["purchases_by_store", "Purchases by store"], ["purchases_by_supplier", "Purchases by supplier"], ["purchases_by_product", "Purchases by product"], ["stock_by_store", "Stock by store"], ["inventory_valuation", "Inventory valuation"], ["stock_movements", "Stock movement history"], ["low_stock", "Low stock"], ["transfers", "Stock transfers"], ["returns", "Sales and purchase returns"], ["daily_collections", "Daily collections and payments"], ["payment_methods", "Payments by method"],
];
const currency = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value || 0));
const quantity = (value) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 4 }).format(Number(value || 0));
const isoDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const initialFrom = isoDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
const initialTo = isoDate(new Date());
const labelize = (key) => key.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const formatCell = (value, key) => value == null ? "—" : key.toLowerCase().includes("date") ? String(value).slice(0, 10) : /amount|sales|purchase|discount|valuation|outstanding|receivable|payable|subtotal|profit|total/.test(key) ? currency(value) : typeof value === "number" ? quantity(value) : String(value);

export default function Dashboard() {
  const { user } = useAuth();
  const { stores, selectedStoreId, selectStore, loading: storesLoading } = useStores();
  const isAdmin = user?.userType?.toLowerCase() === "admin";
  const [storeId, setStoreId] = useState(isAdmin ? "" : selectedStoreId || "");
  const [fromDate, setFromDate] = useState(initialFrom);
  const [toDate, setToDate] = useState(initialTo);
  const [data, setData] = useState(null);
  const [report, setReport] = useState("sales_by_date");
  const [reportData, setReportData] = useState(null);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (!isAdmin && selectedStoreId) setStoreId(selectedStoreId); }, [isAdmin, selectedStoreId]);

  const fetchData = useCallback(async () => {
    setBusy(true); setError("");
    try {
      const params = { fromDate, toDate, ...(storeId ? { storeId } : {}) };
      const [summaryResponse, reportResponse] = await Promise.all([
        api.get(API, { params }),
        api.get(`${API}/reports`, { params: { ...params, report, limit: 50, offset: page * 50 } }),
      ]);
      setData(summaryResponse.data); setReportData(reportResponse.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not load reporting data. Please retry.");
    } finally { setBusy(false); }
  }, [fromDate, toDate, storeId, report, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const cards = useMemo(() => {
    if (!data) return [];
    const s = data.summary || {}; const i = data.inventory || {};
    return [
      ["Today’s sales", currency(s.todaySales), "Posted invoice totals, including tax"], ["Today’s purchases", currency(s.todayPurchases), "Posted purchase invoice totals"],
      ["Monthly sales", currency(s.monthlySales), "Month to date"], ["Monthly purchases", currency(s.monthlyPurchases), "Month to date"],
      ["Customer outstanding", currency(s.customerOutstanding), "Posted invoices less valid payments and credits"], ["Supplier outstanding", currency(s.supplierOutstanding), "Posted bills less valid payments and returns"],
      ["Total inventory quantity", quantity(i.businessTotalQuantity), "Store stock plus inventory in transit"], ["Inventory valuation", currency(i.valuation), "Indicative configured purchase-price value"],
      ["Inventory in transit", quantity(i.transitQuantity), "Dispatched transfers not yet reconciled at destination"],
      ["Low-stock products", quantity(data.lowStockCount), "Store balances at or below reorder level"], ["Customer receipts today", currency(s.todayReceipts), `${s.receiptCount || 0} posted receipts`],
      ["Supplier payments today", currency(s.todaySupplierPayments), `${s.supplierPaymentCount || 0} posted payments`], ["Gross profit", "Unavailable", "Reliable cost snapshots are not recorded on sales lines"],
    ];
  }, [data]);

  const exportCsv = async () => {
    if (!reportData?.items?.length || exporting) return;
    setExporting(true);
    try {
      const params = { fromDate, toDate, report, limit: 200, ...(storeId ? { storeId } : {}) };
      const allRows = [];
      for (let offset = 0; offset < Math.min(reportData.pagination.total, 10000); offset += 200) {
        const result = await api.get(`${API}/reports`, { params: { ...params, offset } });
        allRows.push(...result.data.items);
      }
      const columns = reportData.columns || Object.keys(allRows[0] || {});
      const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
      const contents = [columns.map(escape).join(","), ...allRows.map((item) => columns.map((column) => escape(item[column])).join(","))].join("\r\n");
      const url = URL.createObjectURL(new Blob([contents], { type: "text/csv;charset=utf-8" }));
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${report}-${fromDate}-${toDate}.csv`; anchor.click(); URL.revokeObjectURL(url);
      if (reportData.pagination.total > 10000) setError("CSV export is limited to the first 10,000 rows. Narrow the date range to export the full report.");
    } catch (requestError) { setError(requestError.response?.data?.message || "Could not export this report."); }
    finally { setExporting(false); }
  };

  const chooseStore = (value) => { setStoreId(value); if (value) selectStore(value); };
  const rows = reportData?.items || [];
  const columns = reportData?.columns || (rows[0] ? Object.keys(rows[0]) : []);

  return <section className="dashboard-page">
    <Box className="dashboard-heading"><Box><Typography variant="h4" fontWeight={750}>Business dashboard</Typography><Typography color="text.secondary">Posted financial activity and current inventory across your authorized stores.</Typography></Box><Button variant="outlined" onClick={fetchData} disabled={busy}>Refresh</Button></Box>
    <Card className="dashboard-filter"><CardContent><Stack useFlexGap className="ui-filter-grid" direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
      <FormControl size="small" sx={{ minWidth: 220 }} disabled={storesLoading}><InputLabel shrink id="dashboard-store-label">Store scope</InputLabel><Select displayEmpty labelId="dashboard-store-label" value={storeId} label="Store scope" onChange={(event) => chooseStore(event.target.value)}><MenuItem value="">All authorized stores</MenuItem>{stores.map((store) => <MenuItem key={store.id} value={String(store.id)}>{store.name}</MenuItem>)}</Select></FormControl>
      <TextField size="small" type="date" label="From" value={fromDate} onChange={(event) => { setFromDate(event.target.value); setPage(0); }} slotProps={{inputLabel:{ shrink: true }}} />
      <TextField size="small" type="date" label="To" value={toDate} onChange={(event) => { setToDate(event.target.value); setPage(0); }} slotProps={{inputLabel:{ shrink: true }}} />
      <Typography variant="body2" color="text.secondary">Date range applies to the selected report and sales by store. Today and month cards use the current calendar period.</Typography>
    </Stack></CardContent></Card>
    {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}
    {busy && !data ? <Box className="dashboard-loading"><CircularProgress /></Box> : <>
      <Box className="dashboard-cards">{cards.map(([title, value, caption]) => <Card key={title} className="dashboard-metric"><CardContent><Typography color="text.secondary" variant="body2">{title}</Typography><Typography variant="h5" fontWeight={750} sx={{ my: 1 }}>{value}</Typography><Typography variant="caption" color="text.secondary">{caption}</Typography></CardContent></Card>)}</Box>
      <Box className="dashboard-panels"><Card><CardContent><Typography variant="h6" fontWeight={700}>Sales by store</Typography><Typography variant="caption" color="text.secondary">Posted invoice totals for the selected date range (defaults to month to date).</Typography><div className="store-sales-list">{(data?.salesByStore || []).map((item) => { const maximum = Math.max(1, ...data.salesByStore.map((entry) => Number(entry.sales))); return <div className="store-sales-row" key={item.store_id}><span>{item.store_name}</span><div className="store-sales-track"><div style={{ width: `${Math.max(2, Number(item.sales) / maximum * 100)}%` }} /></div><strong>{currency(item.sales)}</strong></div>; })}{!data?.salesByStore?.length && <Typography color="text.secondary">No stores in this scope.</Typography>}</div></CardContent></Card>
        <Card><CardContent><Typography variant="h6" fontWeight={700}>Reporting notes</Typography><ul className="dashboard-notes"><li>Sales and purchases include posted documents only. Collections are posted payments and are distinct from sales.</li><li>Outstanding is calculated from posted invoices, payment allocations, and posted returns.</li><li>Inventory valuation uses the configured default purchase price. It is indicative, not configured COGS.</li><li>Reversed payments and invoices are excluded from financial totals.</li></ul><Button href="/financial-reports" size="small">Open outstanding and aging reports</Button></CardContent></Card></Box>
      <Card className="dashboard-report"><CardContent><Stack useFlexGap className="report-toolbar" direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1}><Box><Typography variant="h6" fontWeight={700}>Reports</Typography><Typography variant="caption" color="text.secondary">Aggregated in PostgreSQL; page size 50 rows. CSV exports up to 10,000 filtered rows.</Typography></Box><Stack useFlexGap direction="row" spacing={1}><FormControl size="small" sx={{ minWidth: 210 }}><InputLabel id="dashboard-report-label">Report</InputLabel><Select labelId="dashboard-report-label" label="Report" value={report} onChange={(event) => { setReport(event.target.value); setPage(0); }}>{reportOptions.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</Select></FormControl><Button variant="outlined" onClick={exportCsv} disabled={!rows.length || exporting}>{exporting ? "Preparing CSV…" : "Export CSV"}</Button></Stack></Stack>
        {busy && <Box className="report-loading"><CircularProgress size={22} /></Box>}
        <Box className="report-table-wrap"><div className="ui-table-scroll" role="region" aria-label="Scrollable data table" tabIndex={0}><Table size="small" stickyHeader><TableHead><TableRow>{columns.map((column) => <TableCell key={column}>{labelize(column)}</TableCell>)}</TableRow></TableHead><TableBody>{rows.map((row, index) => <TableRow key={`${index}-${Object.values(row)[0]}`}>{columns.map((column) => <TableCell key={column}>{formatCell(row[column], column)}</TableCell>)}</TableRow>)}{!rows.length && !busy && <TableRow><TableCell colSpan={Math.max(columns.length, 1)} align="center">No rows for this report and date range.</TableCell></TableRow>}</TableBody></Table></div></Box>
        <Stack useFlexGap className="report-pagination" direction="row" justifyContent="space-between" alignItems="center"><Typography variant="body2" color="text.secondary">{reportData?.pagination?.total || 0} rows</Typography><Stack flexWrap="wrap" useFlexGap direction="row" spacing={1}><Button disabled={page === 0 || busy} onClick={() => setPage((current) => current - 1)}>Previous</Button><Button disabled={!reportData || (page + 1) * 50 >= reportData.pagination.total || busy} onClick={() => setPage((current) => current + 1)}>Next</Button></Stack></Stack>
      </CardContent></Card>
    </>}
  </section>;
}
