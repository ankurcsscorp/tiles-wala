import React, { useEffect, useMemo, useState } from "react";
import api from "../../api";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  IconButton,
  Tooltip,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import SwapVertIcon from "@mui/icons-material/SwapVert";

const API_URL = "http://localhost:4000/api/tiles/enquiries";

const EnquiryTable = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Global search
  const [globalSearch, setGlobalSearch] = useState("");
  const [dateSortColumn, setDateSortColumn] = useState("created_at");
  const [dateSortOrder, setDateSortOrder] = useState("desc");

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Editing
  const [editingId, setEditingId] = useState(null);
  const [editedRow, setEditedRow] = useState({});
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const isMobile = useMediaQuery("(max-width:600px)");

  // Fetch enquiries once
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(API_URL);
        const result = response.data;
        console.log("Fetched enquiries:", result);

        const enquiries = Array.isArray(result)
          ? result
          : result?.content ||
            result?.enquiries ||
            result?.data ||
            [];

        setData(enquiries);
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Unable to load enquiries. Please check your backend."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Create columns from the returned enquiry data
  const columns = useMemo(() => {
    if (!data.length) return [];

    const allKeys = [
      ...new Set(data.flatMap((row) => Object.keys(row))),
    ];
    const visibleKeys = allKeys.filter(
      (key) => key !== "id" && !allKeys.includes(`${key}_internal`)
    );

    const columnOrder = [
      "customer_name",
      "mobile",
      "address",
      "required_area",
      "purchase_plan",
      "remark",
      "created_at",
      "updated_at",
    ];

    return [
      ...columnOrder,
      ...visibleKeys.filter((key) => !columnOrder.includes(key)),
    ];
  }, [data]);

  // Friendly column labels
  const formatLabel = (key) => {
    if (key === "created_at") {
      return "Created At";
    }

    if (key === "updated_at") {
      return "Updated At";
    }

    return key
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/[_-]/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const formatValue = (value, column) => {
    if (value === null || value === undefined || value === "") {
      return "—";
    }

    if (column === "created_at" || column === "updated_at") {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return String(value);
      }

      const dateParts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).formatToParts(date);
      const parts = Object.fromEntries(
        dateParts.map(({ type, value: partValue }) => [type, partValue])
      );

      return `${parts.day}-${parts.month}-${parts.year}`;
    }

    if (typeof value === "object") {
      return JSON.stringify(value);
    }

    return String(value);
  };

  // Apply global search across every displayed column.
  const filteredData = useMemo(() => {
    const globalTerm = globalSearch.trim().toLowerCase();

    if (!globalTerm) return data;

    return data.filter((row) =>
      columns.some((column) =>
        formatValue(row[column], column)
          .toLowerCase()
          .includes(globalTerm)
      )
    );
  }, [data, columns, globalSearch]);

  const sortedData = useMemo(() => {
    if (!columns.includes(dateSortColumn)) return filteredData;

    return [...filteredData].sort((first, second) => {
      const firstTime = Date.parse(first[dateSortColumn]);
      const secondTime = Date.parse(second[dateSortColumn]);
      const firstValid = Number.isFinite(firstTime);
      const secondValid = Number.isFinite(secondTime);

      if (!firstValid || !secondValid) {
        if (firstValid === secondValid) return 0;
        return firstValid ? -1 : 1;
      }

      return dateSortOrder === "asc"
        ? firstTime - secondTime
        : secondTime - firstTime;
    });
  }, [filteredData, columns, dateSortColumn, dateSortOrder]);

  // Reset to the first page whenever search or sort order changes.
  useEffect(() => {
    setPage(0);
  }, [globalSearch, dateSortColumn, dateSortOrder]);

  // Paginate the filtered results
  const visibleRows = useMemo(() => {
    const start = page * rowsPerPage;

    return sortedData.slice(start, start + rowsPerPage);
  }, [sortedData, page, rowsPerPage]);

  const handleGlobalSearch = (event) => {
    setGlobalSearch(event.target.value);
  };

  const clearSearch = () => {
    setGlobalSearch("");
    setPage(0);
  };

  const toggleDateSortOrder = (column) => {
    if (column !== dateSortColumn) {
      setDateSortColumn(column);
      setDateSortOrder("desc");
      return;
    }

    setDateSortOrder((current) => (current === "asc" ? "desc" : "asc"));
  };

  // Editing handlers
  const startEdit = (row) => {
    setEditingId(row.id);
    setEditedRow({ ...row });
    setEditError("");
  };

  const handleEditChange = (key, value) => {
    setEditedRow((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const saveEdit = async () => {
    if (editingId === null) return;

    try {
      setSaving(true);
      setEditError("");

      const response = await api.patch(`${API_URL}/${editingId}`, {
        remark: editedRow.remark ?? null,
      });
      const updatedEnquiry = response.data?.enquiry;

      if (!updatedEnquiry) {
        throw new Error("The server did not return the updated enquiry.");
      }

      setData((previous) =>
        previous.map((row) =>
          row.id === editingId
            ? { ...row, ...updatedEnquiry }
            : row
        )
      );
      setEditingId(null);
      setEditedRow({});
    } catch (err) {
      setEditError(
        err.response?.data?.message ||
          err.message ||
          "Unable to update enquiry."
      );
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    if (saving) return;
    setEditingId(null);
    setEditedRow({});
    setEditError("");
  };

  const renderActions = (row) => {
    return (
      <Tooltip title="Edit enquiry">
        <span>
          <IconButton
            color="primary"
            onClick={() => startEdit(row)}
            size="small"
            disabled={editingId !== null}
            aria-label="Edit enquiry"
          >
            <EditIcon />
          </IconButton>
        </span>
      </Tooltip>
    );
  };

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "100%",
        mx: "auto",
        p: { xs: 1, sm: 2, md: 3 },
        boxSizing: "border-box",
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: { xs: 1.5, sm: 2.5 },
          borderRadius: 2,
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Heading */}
        <Typography
          variant="h5"
          component="h1"
          sx={{
            fontWeight: 700,
            mb: 2,
            fontSize: { xs: "1.25rem", sm: "1.6rem" },
          }}
        >
          Customer Enquiries
        </Typography>

        {/* Global Search */}
        <TextField
          fullWidth
          size="small"
          value={globalSearch}
          onChange={handleGlobalSearch}
          placeholder="Search all enquiries..."
          aria-label="Search all enquiry fields"
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: globalSearch ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  aria-label="Clear global search"
                  onClick={() => setGlobalSearch("")}
                >
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />

        {/* Search Results Toolbar */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 1,
            mb: 2,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 1,
            }}
          >
            <Typography
              variant="body2"
              color="text.secondary"
            >
              {filteredData.length} of {data.length} enquiries
            </Typography>

            {["created_at", "updated_at"]
              .filter((column) => columns.includes(column))
              .map((column) => {
                const sortOrder =
                  column === dateSortColumn ? dateSortOrder : "desc";

                return (
                  <Button
                    key={column}
                    size="small"
                    startIcon={<SwapVertIcon />}
                    onClick={() => toggleDateSortOrder(column)}
                    sx={{ display: { xs: "inline-flex", sm: "none" } }}
                    aria-label={`Sort by ${formatLabel(column)}: ${sortOrder === "asc" ? "oldest first" : "newest first"}`}
                  >
                    {formatLabel(column)}: {sortOrder === "asc" ? "Oldest first" : "Newest first"}
                  </Button>
                );
              })}

            {globalSearch.trim() && (
              <Button
                size="small"
                color="inherit"
                startIcon={<ClearIcon />}
                onClick={clearSearch}
              >
                Clear Search
              </Button>
            )}
          </Box>
        </Box>

        {loading ? (
          <Typography sx={{ py: 4, textAlign: "center" }}>
            Loading enquiries...
          </Typography>
        ) : error ? (
          <Typography
            color="error"
            sx={{ py: 3, textAlign: "center" }}
          >
            {error}
          </Typography>
        ) : data.length === 0 ? (
          <Typography sx={{ py: 4, textAlign: "center" }}>
            No enquiries found.
          </Typography>
        ) : filteredData.length === 0 ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <Typography color="text.secondary">
              No enquiries match your search.
            </Typography>

            <Button
              sx={{ mt: 1 }}
              onClick={clearSearch}
            >
              Clear Search
            </Button>
          </Box>
        ) : (
          <>
            {/* Mobile Cards */}
            <Box
              sx={{
                display: { xs: "flex", sm: "none" },
                flexDirection: "column",
                gap: 1.5,
              }}
            >
              {visibleRows.map((row, index) => (
                <Card
                  key={row.id ?? index}
                  variant="outlined"
                  sx={{ borderRadius: 2 }}
                >
                  <CardContent sx={{ p: 2 }}>
                    {columns.map((column) => (
                      <Box
                        key={column}
                        sx={{ mb: 1.5 }}
                      >
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            display: "block",
                            fontWeight: 600,
                          }}
                        >
                          {formatLabel(column)}
                        </Typography>

                        <Typography
                          variant="body2"
                          sx={{
                            overflowWrap: "anywhere",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {formatValue(row[column], column)}
                        </Typography>
                      </Box>
                    ))}

                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "flex-end",
                        borderTop: "1px solid",
                        borderColor: "divider",
                        pt: 1,
                      }}
                    >
                      {renderActions(row)}
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>

            {/* Tablet and Desktop Table */}
            <TableContainer
              sx={{
                display: { xs: "none", sm: "block" },
                width: "100%",
                overflowX: "auto",
              }}
            >
              <Table
                size="small"
                sx={{ minWidth: 750 }}
                aria-label="Customer enquiries table"
              >
                <TableHead>
                  <TableRow
                    sx={{
                      backgroundColor: "grey.100",
                    }}
                  >
                    {columns.map((column) => (
                      <TableCell
                        key={column}
                        sx={{
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {column === "created_at" || column === "updated_at" ? (
                          <TableSortLabel
                            active={dateSortColumn === column}
                            direction={dateSortOrder}
                            onClick={() => toggleDateSortOrder(column)}
                          >
                            {formatLabel(column)}
                          </TableSortLabel>
                        ) : (
                          formatLabel(column)
                        )}
                      </TableCell>
                    ))}

                    <TableCell
                      sx={{
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {visibleRows.map((row, index) => (
                    <TableRow
                      hover
                      key={row.id ?? index}
                    >
                      {columns.map((column) => (
                        <TableCell
                          key={column}
                          sx={{
                            minWidth: 130,
                            maxWidth: 300,
                            overflowWrap: "anywhere",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {formatValue(row[column], column)}
                        </TableCell>
                      ))}

                      <TableCell>
                        {renderActions(row)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Shared Pagination */}
            <TablePagination
              component="div"
              count={filteredData.length}
              page={page}
              onPageChange={(event, newPage) =>
                setPage(newPage)
              }
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(Number(event.target.value));
                setPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25, 50]}
              sx={{
                mt: 1,
                "& .MuiTablePagination-toolbar": {
                  flexWrap: "wrap",
                  justifyContent: "center",
                  px: 0,
                },
              }}
            />
          </>
        )}
      </Paper>
      <Dialog
        open={editingId !== null}
        onClose={cancelEdit}
        fullScreen={isMobile}
        fullWidth
        maxWidth="sm"
        aria-labelledby="edit-enquiry-title"
      >
        <DialogTitle id="edit-enquiry-title">
          Edit Enquiry Remark
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 0.5 }}>
            {columns
              .filter((column) => column !== "remark")
              .map((column) => (
                <Grid item xs={12} sm={6} key={column}>
                  <TextField
                    fullWidth
                    size="small"
                    label={formatLabel(column)}
                    value={formatValue(editedRow[column], column)}
                    disabled
                  />
                </Grid>
              ))}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                minRows={5}
                maxRows={12}
                label="Remark"
                value={editedRow.remark ?? ""}
                onChange={(event) =>
                  handleEditChange("remark", event.target.value)
                }
                autoFocus={!isMobile}
                placeholder="Enter enquiry remark..."
              />
            </Grid>
          </Grid>
          {editError && (
            <Typography color="error" role="alert" sx={{ mt: 2 }}>
              {editError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={cancelEdit} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={saveEdit}
            disabled={saving}
            startIcon={<SaveIcon />}
          >
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EnquiryTable;