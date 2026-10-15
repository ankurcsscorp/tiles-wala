import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";
import Auth from "../Auth";
import SalesBonusProductManagement from "./SalesBonusProductManagement";

const createEmptyRow = (catalog = []) => {
  const fallbackProduct = catalog[0] ?? null;
  return {
    id: Date.now() + Math.random(),
    productName: fallbackProduct?.product_name ?? "",
    costPrice: fallbackProduct?.default_cost_price ?? 0,
    sellingPrice: fallbackProduct?.default_cost_price ?? 0,
    quantity: 1,
    bonusRate: fallbackProduct?.default_bonus_percentage ?? 0,
  };
};

const INR = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const parseNumber = (value) => {
  const parsed = Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const calculateRow = (row, selectedUserType) => {
  const costPrice = parseNumber(row.costPrice);
  const sellingPrice = parseNumber(row.sellingPrice);
  const quantity = parseNumber(row.quantity);
  const bonusRate = parseNumber(row.bonusRate);

  const totalCost = costPrice * quantity;
  const totalSellingAmount = sellingPrice * quantity;
  const grossProfit = totalSellingAmount - totalCost;
  const grossBonus = Math.max(grossProfit, 0) * (bonusRate / 100);
  const userBonus =
    selectedUserType === "Salesperson" ? grossBonus * 0.5 : grossBonus;

  return {
    totalCost,
    totalSellingAmount,
    grossProfit,
    grossBonus,
    userBonus,
  };
};

const SalesBonusManagement = () => {
  const { token } = useAuth();
  const [userSearch, setUserSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const userType = selectedUser?.userType ?? "";
  const [userOptions, setUserOptions] = useState([]);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState("");
  const [resolvedUserSearch, setResolvedUserSearch] = useState("");
  const [showSignupDialog, setShowSignupDialog] = useState(false);
  const [productCatalog, setProductCatalog] = useState([]);
  const [catalogRefreshKey, setCatalogRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [rows, setRows] = useState([]);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [totalAmountPaid, setTotalAmountPaid] = useState("0.00");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [isFullyPaid, setIsFullyPaid] = useState(false);
  const searchTimeoutRef = useRef(null);
  const searchRequestIdRef = useRef(0);

  useEffect(() => {
    if (!submitSuccess) return undefined;

    const timeoutId = setTimeout(() => setSubmitSuccess(""), 5000);
    return () => clearTimeout(timeoutId);
  }, [submitSuccess]);

  useEffect(() => {
    const loadProductCatalog = async () => {
      try {
        const response = await api.get(
          "http://localhost:4000/api/tiles/sales-bonus/products"
        );
        const catalog = response.data || [];
        setProductCatalog(catalog);
        setRows((currentRows) => (currentRows.length ? currentRows : [createEmptyRow(catalog)]));
      } catch (error) {
        const fallback = [
          {
            product_name: "Antila 12x18 Wall Tiles",
            default_cost_price: 210,
            default_bonus_percentage: 10,
          },
          {
            product_name: "Antila 12x12 Floor Tiles",
            default_cost_price: 230,
            default_bonus_percentage: 10,
          },
          {
            product_name: "Coinn 2x2 Floor Tiles",
            default_cost_price: 440,
            default_bonus_percentage: 10,
          },
          {
            product_name: "Alaska 2x4 Gloss Tiles",
            default_cost_price: 570,
            default_bonus_percentage: 10,
          },
                    {
            product_name: "Alaska 2x4 Carvin Tiles",
            default_cost_price: 620,
            default_bonus_percentage: 10,
          },
          {
            product_name: "Alaska 2x4 High gloss Tiles",
            default_cost_price: 895,
            default_bonus_percentage: 10,
          },
          {
            product_name: "Galaxy Black Granite",
            default_cost_price: 160,
            default_bonus_percentage: 10,
          },
          {
            product_name: "R Black Granite",
            default_cost_price: 95,
            default_bonus_percentage: 10,
          },
                    {
            product_name: "P white Granite",
            default_cost_price: 70,
            default_bonus_percentage: 10,
          },
                    {
            product_name: "M Black Granite",
            default_cost_price: 95,
            default_bonus_percentage: 10,
          },
                    {
            product_name: "K Black Granite",
            default_cost_price: 95,
            default_bonus_percentage: 10,
          },
           {
            product_name: "R Brown Granite",
            default_cost_price: 95,
            default_bonus_percentage: 10,
          },
                    {
            product_name: "Gem red Granite",
            default_cost_price: 115,
            default_bonus_percentage: 10,
          },
        ];
        setProductCatalog(fallback);
        setRows((currentRows) => (currentRows.length ? currentRows : [createEmptyRow(fallback)]));
      }
    };

    loadProductCatalog();
  }, [catalogRefreshKey]);

  const rowsWithComputedValues = useMemo(
    () => rows.map((row) => ({ ...row, ...calculateRow(row, userType) })),
    [rows, userType]
  );

  const summary = useMemo(
    () =>
      rowsWithComputedValues.reduce(
        (acc, row) => {
          acc.totalQuantity += Number(row.quantity || 0);
          acc.totalCost += row.totalCost;
          acc.totalSellingAmount += row.totalSellingAmount;
          acc.totalGrossProfit += row.grossProfit;
          acc.totalGrossBonus += row.grossBonus;
          acc.finalUserBonus += row.userBonus;
          return acc;
        },
        {
          totalQuantity: 0,
          totalCost: 0,
          totalSellingAmount: 0,
          totalGrossProfit: 0,
          totalGrossBonus: 0,
          finalUserBonus: 0,
        }
      ),
    [rowsWithComputedValues]
  );

  useEffect(() => {
    if (isFullyPaid) {
      setTotalAmountPaid(summary.finalUserBonus.toFixed(2));
    }
  }, [isFullyPaid, summary.finalUserBonus]);

  const searchUsers = React.useCallback(async (query) => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      setUserOptions([]);
      return;
    }

    const requestId = ++searchRequestIdRef.current;
    setUserLoading(true);
    setUserError("");
    setResolvedUserSearch("");

    try {
      const response = await api.get("http://localhost:4000/api/tiles/users/search", {
        params: {
          q: normalizedQuery,
        },
      });
      const nextOptions = response.data || [];
      if (requestId !== searchRequestIdRef.current) return;
      setUserOptions(nextOptions);
      setResolvedUserSearch(normalizedQuery.toLowerCase());
      if (!nextOptions.length) {
        setUserError("No matching user found.");
      }
    } catch (error) {
      if (requestId !== searchRequestIdRef.current) return;
      setUserError("Unable to search users at the moment.");
      setUserOptions([]);
    } finally {
      if (requestId === searchRequestIdRef.current) {
        setUserLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (selectedUser) {
      return undefined;
    }

    if (!userSearch.trim()) {
      searchRequestIdRef.current += 1;
      setUserOptions([]);
      setUserError("");
      setUserLoading(false);
      setResolvedUserSearch("");
      return undefined;
    }

    clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      searchUsers(userSearch);
    }, 350);

    return () => clearTimeout(searchTimeoutRef.current);
  }, [userSearch, searchUsers, selectedUser]);

  const handleUserSearchChange = (value) => {
    searchRequestIdRef.current += 1;
    setSelectedUser(null);
    setUserSearch(value);
    setUserOptions([]);
    setUserError("");
    setUserLoading(false);
    setResolvedUserSearch("");
  };

  const searchKey = userSearch.trim().toLowerCase();
  const addUserDisabled =
    Boolean(selectedUser) ||
    userLoading ||
    (Boolean(userSearch.trim()) &&
      (resolvedUserSearch !== searchKey || userOptions.length > 0));

  const handleProductSelect = (rowId, selectedProduct) => {
    setRows((currentRows) =>
      currentRows.map((row) => {
        if (row.id !== rowId) return row;
        return {
          ...row,
          productName: selectedProduct?.product_name ?? "",
          costPrice: selectedProduct?.default_cost_price ?? 0,
          sellingPrice: selectedProduct?.default_cost_price ?? 0,
          bonusRate: selectedProduct?.default_bonus_percentage ?? 0,
        };
      })
    );
  };

  const handleRowChange = (rowId, field, value) => {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.id !== rowId ? row : { ...row, [field]: value }
      )
    );
  };

  const addRow = () => {
    setRows((currentRows) => [...currentRows, createEmptyRow(productCatalog)]);
  };

  const removeRow = (rowId) => {
    setRows((currentRows) => {
      if (currentRows.length === 1) {
        return [createEmptyRow(productCatalog)];
      }
      return currentRows.filter((row) => row.id !== rowId);
    });
  };

  const handleSubmit = async () => {
    if (!selectedUser) {
      setSubmitError("Please select a user before creating the record.");
      return;
    }

    const invalidRow = rows.some(
      (row) =>
        !row.productName ||
        parseNumber(row.sellingPrice) < 0 ||
        parseNumber(row.quantity) <= 0 ||
        parseNumber(row.bonusRate) < 0
    );

    if (invalidRow) {
      setSubmitError(
        "Each row requires a valid product, selling price, quantity, and bonus percentage."
      );
      return;
    }

    const paidAmount = Number(totalAmountPaid);
    const finalPayable = Number(summary.finalUserBonus.toFixed(2));
    if (!Number.isFinite(paidAmount) || paidAmount < 0 || paidAmount > finalPayable) {
      setSubmitError("Paid amount must be between 0 and the final user bonus payable.");
      return;
    }
    if (paidAmount > 0 && !paymentMethod) {
      setSubmitError("Select a payment method for the paid amount.");
      return;
    }

    setSubmitLoading(true);
    setSubmitError("");
    setSubmitSuccess("");

    try {
      await api.post(
        "http://localhost:4000/api/tiles/sales-bonus/records",
        {
          selectedUserId: selectedUser.id,
          selectedUserType: userType,
          totalAmountPaid: isFullyPaid ? finalPayable : paidAmount,
          paymentMethod,
          isFullyPaid,
          rows: rows.map((row) => ({
            productName: row.productName,
            sellingPrice: row.sellingPrice,
            quantity: row.quantity,
            bonusRate: row.bonusRate,
          })),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setSubmitSuccess("Sales bonus record saved successfully.");
      setSelectedUser(null);
      setUserSearch("");
      setUserOptions([]);
      setRows([createEmptyRow(productCatalog)]);
      setTotalAmountPaid("0.00");
      setPaymentMethod("CASH");
      setIsFullyPaid(false);
    } catch (error) {
      setSubmitError(
        error.response?.data?.message || "Unable to save the sales bonus record."
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1300, mx: "auto", px: { xs: 2, md: 4 }, py: 5 }}>
      <Paper sx={{ p: { xs: 2, md: 4 }, borderRadius: 3 }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" fontWeight={700}>
              Sales Bonus Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Calculate bonus allocations from gross profit using product-wise cost and bonus settings.
            </Typography>
          </Box>

          <Tabs
            value={activeTab}
            onChange={(_, value) => setActiveTab(value)}
            aria-label="Sales bonus management sections"
          >
            <Tab label="Product Entry" />
            <Tab label="Update Product" />
          </Tabs>

          <Box hidden={activeTab !== 0} sx={{ width: "100%" }}>
            <Stack spacing={3}>

          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              alignItems={{ xs: "stretch", md: "center" }}
            >
              <TextField
                label="User Type"
                value={userType}
                placeholder="Selected user type"
                slotProps={{ input: { readOnly: true } }}
                sx={{ minWidth: { xs: "100%", md: 220 } }}
              />

              <Autocomplete
                freeSolo
                options={userOptions}
                loading={userLoading}
                getOptionLabel={(option) =>
                  typeof option === "string" ? option : `${option.name} — ${option.mobile}`
                }
                value={selectedUser}
                onChange={(_, value) => {
                  const nextUser = value && typeof value === "object" ? value : null;
                  setSelectedUser(nextUser);
                  if (nextUser) {
                    setUserSearch(`${nextUser.name} — ${nextUser.mobile}`);
                  }
                }}
                inputValue={userSearch}
                onInputChange={(_, value, reason) => {
                  if (reason === "input" || reason === "clear") {
                    handleUserSearchChange(value);
                  }
                }}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderOption={(props, option) => {
                  const { key, ...restProps } = props;
                  return (
                    <Box component="li" key={option.id} {...restProps}>
                      <Stack>
                        <Typography variant="body2" fontWeight={600}>
                          {option.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.mobile}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.userType}
                        </Typography>
                      </Stack>
                    </Box>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Search user by name or mobile"
                    placeholder="Search users"
                    slotProps={{
                      ...params.slotProps,
                      input: {
                        ...params.slotProps.input,
                        endAdornment: (
                        <>
                          {userLoading ? <CircularProgress color="inherit" size={18} /> : null}
                            {params.slotProps.input.endAdornment}
                        </>
                        ),
                      },
                    }}
                  />
                )}
                sx={{ flex: 1 }}
              />

              <Button
                variant="outlined"
                onClick={() => setShowSignupDialog(true)}
                disabled={addUserDisabled}
              >
                Add User
              </Button>
            </Stack>

            {selectedUser && (
              <Box sx={{ mt: 2 }}>
                <Chip
                  label={`${selectedUser.name} — ${selectedUser.mobile}`}
                  color="primary"
                  variant="outlined"
                />
              </Box>
            )}

            {userError && (
              <Alert severity="info" sx={{ mt: 2 }}>
                {userError}
              </Alert>
            )}
          </Paper>

          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Typography variant="h6" fontWeight={700}>
                Product Entry
              </Typography>
            </Box>

            {!selectedUser && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Select a user to enable product entry.
              </Typography>
            )}

            <Box
              component="fieldset"
              disabled={!selectedUser}
              sx={{
                border: 0,
                p: 0,
                m: 0,
                minWidth: 0,
                opacity: selectedUser ? 1 : 0.55,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "flex-end",
                  mb: 2,
                }}
              >
              <Button variant="contained" onClick={addRow}>
                Add New Row
              </Button>
              </Box>

              <TableContainer sx={{ overflowX: "auto" }}>
                <Table sx={{ minWidth: 1200 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 300, minWidth: 300 }}>
                      Product Type
                    </TableCell>
                    <TableCell>Selling Price</TableCell>
                    <TableCell>Quantity</TableCell>
                    <TableCell>Total Selling Amount</TableCell>
                    <TableCell>Gross Profit</TableCell>
                    <TableCell>Bonus %</TableCell>
                    <TableCell>Gross Bonus</TableCell>
                    <TableCell>User Bonus</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => {
                    const computed = calculateRow(row, userType);
                    return (
                      <TableRow key={row.id}>
                        <TableCell sx={{ width: 300, minWidth: 300 }}>
                          <Autocomplete
                            options={productCatalog}
                            value={
                              productCatalog.find(
                                (product) => product.product_name === row.productName
                              ) || null
                            }
                            onChange={(_, selectedProduct) =>
                              handleProductSelect(row.id, selectedProduct)
                            }
                            getOptionLabel={(option) => option?.product_name || ""}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label="Product"
                                size="small"
                                fullWidth
                              />
                            )}
                            isOptionEqualToValue={(option, value) =>
                              option.product_name === value.product_name
                            }
                            sx={{ width: "100%" }}
                            fullWidth
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            value={row.sellingPrice}
                            onChange={(event) =>
                              handleRowChange(row.id, "sellingPrice", event.target.value)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            value={row.quantity}
                            onChange={(event) =>
                              handleRowChange(row.id, "quantity", event.target.value)
                            }
                          />
                        </TableCell>
                        <TableCell>{INR(computed.totalSellingAmount)}</TableCell>
                        <TableCell>{INR(computed.grossProfit)}</TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            value={row.bonusRate}
                            onChange={(event) =>
                              handleRowChange(row.id, "bonusRate", event.target.value)
                            }
                          />
                        </TableCell>
                        <TableCell>{INR(computed.grossBonus)}</TableCell>
                        <TableCell>{INR(computed.userBonus)}</TableCell>
                        <TableCell>
                          <Button
                            color="error"
                            variant="text"
                            onClick={() => removeRow(row.id)}
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                </Table>
              </TableContainer>

              <Box
                sx={{
                  mt: 3,
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 2,
                }}
              >
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Total Quantity
                </Typography>
                <Typography variant="h6">{summary.totalQuantity}</Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Total Selling Amount
                </Typography>
                <Typography variant="h6">{INR(summary.totalSellingAmount)}</Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Total Gross Profit
                </Typography>
                <Typography variant="h6">{INR(summary.totalGrossProfit)}</Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Total Gross Bonus
                </Typography>
                <Typography variant="h6">{INR(summary.totalGrossBonus)}</Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Final User Bonus Payable
                </Typography>
                <Typography variant="h6">{INR(summary.finalUserBonus)}</Typography>
              </Paper>
              </Box>

              <Box
                sx={{
                  mt: 2,
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 2,
                  alignItems: "center",
                }}
              >
                <TextField
                  label="Total Amount Paid"
                  type="number"
                  value={totalAmountPaid}
                  onChange={(event) => setTotalAmountPaid(event.target.value)}
                  slotProps={{
                    htmlInput: {
                      min: 0,
                      max: summary.finalUserBonus.toFixed(2),
                      step: "0.01",
                    },
                    input: { readOnly: isFullyPaid },
                  }}
                  fullWidth
                />
                <FormControl fullWidth size="small">
                  <InputLabel id="payment-method-label">Payment Method</InputLabel>
                  <Select
                    labelId="payment-method-label"
                    label="Payment Method"
                    value={paymentMethod}
                    onChange={(event) => setPaymentMethod(event.target.value)}
                  >
                    <MenuItem value="UPI">UPI</MenuItem>
                    <MenuItem value="CASH">CASH</MenuItem>
                  </Select>
                </FormControl>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isFullyPaid}
                      onChange={(event) => setIsFullyPaid(event.target.checked)}
                    />
                  }
                  label="Mark as fully paid"
                />
              </Box>
            </Box>
          </Paper>

          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Box sx={{ flex: 1 }}>
              {submitError && <Alert severity="error">{submitError}</Alert>}
              {submitSuccess && <Alert severity="success">{submitSuccess}</Alert>}
            </Box>
            <Button
              variant="contained"
              size="large"
              onClick={handleSubmit}
              disabled={submitLoading || !selectedUser}
            >
              {submitLoading ? "Saving..." : "Save Sales Bonus Record"}
            </Button>
          </Box>
            </Stack>
          </Box>

          <Box hidden={activeTab !== 1} sx={{ width: "100%" }}>
            <SalesBonusProductManagement
              onCatalogChange={() => setCatalogRefreshKey((current) => current + 1)}
            />
          </Box>
        </Stack>
      </Paper>

      <Dialog
        open={showSignupDialog}
        onClose={() => setShowSignupDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Register New User</DialogTitle>
        <DialogContent>
          <Auth
            initialMode="signup"
            hideToggle
            onCancel={() => setShowSignupDialog(false)}
            onSignupSuccess={(newUser) => {
              setSelectedUser(newUser);
              setUserSearch(newUser.name);
              setShowSignupDialog(false);
              setUserOptions((currentOptions) => [newUser, ...currentOptions]);
            }}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default SalesBonusManagement;
