import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
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
  TextField,
  Typography,
} from "@mui/material";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";

const API_URL = "http://localhost:4000/api/tiles";

const INR = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatSaleDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
};

const amountDue = (record) =>
  Math.max(
    Number(record.final_user_bonus || 0) - Number(record.total_amount_paid || 0),
    0
  );

const SaleBonus = () => {
  const { user } = useAuth();
  const isAdmin = user?.userType?.toLowerCase() === "admin";
  const [searchText, setSearchText] = useState("");
  const [userOptions, setUserOptions] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState("");
  const [paymentDrafts, setPaymentDrafts] = useState({});
  const [paymentSubmittingId, setPaymentSubmittingId] = useState(null);
  const [paymentFeedback, setPaymentFeedback] = useState({});
  const searchRequestRef = useRef(0);
  const recordsRequestRef = useRef(0);

  useEffect(() => {
    if (!isAdmin) return undefined;
    if (selectedUser) {
      searchRequestRef.current += 1;
      setSearchError("");
      setSearchLoading(false);
      return undefined;
    }

    const query = searchText.trim();
    if (!query) {
      searchRequestRef.current += 1;
      setUserOptions([]);
      setSearchError("");
      setSearchLoading(false);
      return undefined;
    }

    const requestId = ++searchRequestRef.current;
    const timeoutId = setTimeout(async () => {
      setSearchLoading(true);
      setSearchError("");
      try {
        const response = await api.get(`${API_URL}/users/search`, {
          params: { q: query },
        });
        if (requestId === searchRequestRef.current) {
          setUserOptions(response.data || []);
          if (!response.data?.length) setSearchError("No matching user found.");
        }
      } catch (error) {
        if (requestId === searchRequestRef.current) {
          setUserOptions([]);
          setSearchError(
            error.response?.data?.message || "Unable to search users."
          );
        }
      } finally {
        if (requestId === searchRequestRef.current) setSearchLoading(false);
      }
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [isAdmin, searchText, selectedUser]);

  useEffect(() => {
    const userId = isAdmin ? selectedUser?.id : user?.id;
    const requestId = ++recordsRequestRef.current;
    setRecords([]);
    setRecordsError("");
    if (!userId) {
      setRecordsLoading(false);
      return undefined;
    }

    const loadRecords = async () => {
      setRecordsLoading(true);
      try {
        const response = await api.get(`${API_URL}/sales-bonus/records`, {
          params: isAdmin ? { userId } : undefined,
        });
        if (requestId === recordsRequestRef.current) {
          setRecords(response.data.records || []);
        }
      } catch (error) {
        if (requestId === recordsRequestRef.current) {
          setRecordsError(
            error.response?.data?.message || "Unable to load sales bonus records."
          );
        }
      } finally {
        if (requestId === recordsRequestRef.current) setRecordsLoading(false);
      }
    };

    loadRecords();
    return () => {
      recordsRequestRef.current += 1;
    };
  }, [isAdmin, selectedUser?.id, user?.id]);

  const totals = useMemo(
    () =>
      records.reduce(
        (summary, record) => {
          summary.bonus += Number(record.final_user_bonus || 0);
          summary.paid += Number(record.total_amount_paid || 0);
          summary.due += amountDue(record);
          return summary;
        },
        { bonus: 0, paid: 0, due: 0 }
      ),
    [records]
  );

  const updatePaymentDraft = (recordId, field, value) => {
    setPaymentDrafts((current) => ({
      ...current,
      [recordId]: {
        amount: "",
        paymentMethod: "CASH",
        ...current[recordId],
        [field]: value,
      },
    }));
  };

  const handleRecordPayment = async (record, payRemaining = false) => {
    const due = amountDue(record);
    const draft = paymentDrafts[record.id] || {
      amount: "",
      paymentMethod: "CASH",
    };
    const amount = payRemaining ? due : Number(draft.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > due) {
      setPaymentFeedback((current) => ({
        ...current,
        [record.id]: {
          severity: "error",
          message: "Enter an amount greater than zero and no more than the due amount.",
        },
      }));
      return;
    }

    setPaymentSubmittingId(record.id);
    setPaymentFeedback((current) => ({ ...current, [record.id]: null }));
    try {
      const response = await api.patch(
        `${API_URL}/sales-bonus/records/${record.id}/payment`,
        { amount, paymentMethod: draft.paymentMethod }
      );
      setRecords((current) =>
        current.map((currentRecord) =>
          currentRecord.id === record.id
            ? { ...currentRecord, ...response.data.record }
            : currentRecord
        )
      );
      setPaymentDrafts((current) => ({
        ...current,
        [record.id]: { ...draft, amount: "" },
      }));
      setPaymentFeedback((current) => ({
        ...current,
        [record.id]: {
          severity: "success",
          message: response.data.message || "Payment saved.",
        },
      }));
    } catch (error) {
      setPaymentFeedback((current) => ({
        ...current,
        [record.id]: {
          severity: "error",
          message:
            error.response?.data?.message || "Unable to update the payment.",
        },
      }));
    } finally {
      setPaymentSubmittingId(null);
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, md: 4 }, py: 5 }}>
      <Paper sx={{ p: { xs: 2, md: 4 }, borderRadius: 3 }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" fontWeight={700}>
              Sales Bonus
            </Typography>
            <Typography variant="body2" color="text.secondary">
              View sale dates, item-wise bonuses, payments, and any outstanding
              bonus balance.
            </Typography>
          </Box>

          {isAdmin ? (
            <Autocomplete
              options={userOptions}
              loading={searchLoading}
              value={selectedUser}
              inputValue={searchText}
              getOptionLabel={(option) =>
                option ? `${option.name} — ${option.mobile}` : ""
              }
              isOptionEqualToValue={(option, value) => option.id === value.id}
              onChange={(_, nextUser) => {
                setSelectedUser(nextUser);
                if (nextUser) setSearchText(`${nextUser.name} — ${nextUser.mobile}`);
              }}
              onInputChange={(_, value, reason) => {
                if (reason === "input" || reason === "clear") {
                  setSelectedUser(null);
                  setSearchText(value);
                  setUserOptions([]);
                }
              }}
              renderOption={(props, option) => {
                const { key, ...optionProps } = props;
                return (
                  <Box component="li" {...optionProps} key={key ?? option.id}>
                    <Stack>
                      <Typography variant="body2" fontWeight={600}>
                        {option.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.mobile} · {option.userType}
                      </Typography>
                    </Stack>
                  </Box>
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search user by name or mobile"
                  placeholder="Enter a name or mobile number"
                  slotProps={{
                    ...params.slotProps,
                    input: {
                      ...params.slotProps.input,
                      endAdornment: (
                      <>
                        {searchLoading ? (
                          <CircularProgress color="inherit" size={18} />
                        ) : null}
                        {params.slotProps.input.endAdornment}
                      </>
                      ),
                    },
                  }}
                />
              )}
            />
          ) : (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography fontWeight={600}>{user?.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {user?.mobile} · {user?.userType}
              </Typography>
            </Paper>
          )}

          {searchError && <Alert severity="info">{searchError}</Alert>}
          {recordsError && <Alert severity="error">{recordsError}</Alert>}

          {isAdmin && !selectedUser ? (
            <Alert severity="info">
              Search by name or mobile number and select a user to view their
              sales bonus records.
            </Alert>
          ) : recordsLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
              <CircularProgress aria-label="Loading sales bonus records" />
            </Box>
          ) : recordsError ? null : records.length === 0 ? (
            <Alert severity="info">No sale bonus records found.</Alert>
          ) : (
            <>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(3, minmax(0, 1fr))",
                  },
                  gap: 2,
                }}
              >
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Total bonus
                  </Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {INR(totals.bonus)}
                  </Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Total paid
                  </Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {INR(totals.paid)}
                  </Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Total due bonus
                  </Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {INR(totals.due)}
                  </Typography>
                </Paper>
              </Box>

              {totals.due > 0 ? (
                <Alert severity="warning">
                  Outstanding bonus from previous sales is included in the
                  total due bonus above.
                </Alert>
              ) : (
                <Alert severity="success">All bonus amount paid</Alert>
              )}

              <Stack spacing={2}>
                {records.map((record) => {
                  const due = amountDue(record);
                  return (
                    <Paper
                      key={record.id}
                      variant="outlined"
                      sx={{ p: { xs: 1.5, md: 2 }, borderRadius: 2 }}
                    >
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        justifyContent="space-between"
                        alignItems={{ xs: "flex-start", sm: "center" }}
                        spacing={1}
                        sx={{ mb: 2 }}
                      >
                        <Box>
                          <Typography variant="h6" fontWeight={700}>
                            Sale on {formatSaleDate(record.created_at)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Sale #{record.id}
                          </Typography>
                        </Box>
                        <Chip
                          label={due > 0 ? "Payment due" : "Paid"}
                          color={due > 0 ? "warning" : "success"}
                          variant="outlined"
                        />
                      </Stack>

                      <TableContainer sx={{ overflowX: "auto", mb: 2 }}>
                        <Table size="small" sx={{ minWidth: 680 }}>
                          <TableHead>
                            <TableRow>
                              <TableCell>Item</TableCell>
                              <TableCell align="right">Selling price</TableCell>
                              <TableCell align="right">Quantity</TableCell>
                              <TableCell align="right">Bonus %</TableCell>
                              <TableCell align="right">Item bonus</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {(record.items || []).map((item) => (
                              <TableRow key={item.id}>
                                <TableCell>{item.product_name}</TableCell>
                                <TableCell align="right">
                                  {INR(item.selling_price)}
                                </TableCell>
                                <TableCell align="right">
                                  {item.quantity}
                                </TableCell>
                                <TableCell align="right">
                                  {item.bonus_percentage}%
                                </TableCell>
                                <TableCell align="right">
                                  {INR(item.user_bonus)}
                                </TableCell>
                              </TableRow>
                            ))}
                            {record.items?.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={5} align="center">
                                  No item details available.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>

                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: {
                            xs: "1fr 1fr",
                            md: "repeat(4, minmax(0, 1fr))",
                          },
                          gap: 2,
                        }}
                      >
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Sale bonus
                          </Typography>
                          <Typography fontWeight={600}>
                            {INR(record.final_user_bonus)}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Paid
                          </Typography>
                          <Typography fontWeight={600}>
                            {INR(record.total_amount_paid)}
                            {record.payment_method
                              ? ` · ${record.payment_method}`
                              : ""}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Due from this sale
                          </Typography>
                          <Typography fontWeight={600}>
                            {INR(due)}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Payment status
                          </Typography>
                          <Typography fontWeight={600}>
                            {due === 0
                              ? "All bonus amount paid"
                              : due < Number(record.final_user_bonus)
                                ? "Partially paid"
                                : "Unpaid"}
                          </Typography>
                        </Box>
                      </Box>

                      {isAdmin && due > 0 && (
                        <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: "divider" }}>
                          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                            Record a payment for this sale
                          </Typography>
                          <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1.5}
                            alignItems={{ sm: "center" }}
                          >
                            <TextField
                              label="Amount"
                              type="number"
                              size="small"
                              value={paymentDrafts[record.id]?.amount ?? ""}
                              onChange={(event) =>
                                updatePaymentDraft(record.id, "amount", event.target.value)
                              }
                              inputProps={{ min: 0.01, max: due, step: 0.01 }}
                              sx={{ minWidth: { sm: 160 } }}
                            />
                            <FormControl size="small" sx={{ minWidth: { sm: 140 } }}>
                              <InputLabel id={`payment-method-${record.id}`}>
                                Method
                              </InputLabel>
                              <Select
                                labelId={`payment-method-${record.id}`}
                                label="Method"
                                value={paymentDrafts[record.id]?.paymentMethod ?? "CASH"}
                                onChange={(event) =>
                                  updatePaymentDraft(
                                    record.id,
                                    "paymentMethod",
                                    event.target.value
                                  )
                                }
                              >
                                <MenuItem value="CASH">Cash</MenuItem>
                                <MenuItem value="UPI">UPI</MenuItem>
                              </Select>
                            </FormControl>
                            <Button
                              variant="contained"
                              onClick={() => handleRecordPayment(record)}
                              disabled={paymentSubmittingId === record.id}
                            >
                              {paymentSubmittingId === record.id
                                ? "Saving..."
                                : "Record payment"}
                            </Button>
                            <Button
                              variant="outlined"
                              onClick={() => handleRecordPayment(record, true)}
                              disabled={paymentSubmittingId === record.id}
                            >
                              Pay remaining {INR(due)}
                            </Button>
                          </Stack>
                          {paymentFeedback[record.id] && (
                            <Alert
                              severity={paymentFeedback[record.id].severity}
                              sx={{ mt: 1.5 }}
                            >
                              {paymentFeedback[record.id].message}
                            </Alert>
                          )}
                        </Box>
                      )}
                    </Paper>
                  );
                })}
              </Stack>
            </>
          )}
        </Stack>
      </Paper>
    </Box>
  );
};

export default SaleBonus;
