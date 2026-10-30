import { formatNumber } from '../../utils/numberFormat';
import TextField from '../common/TextField';
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Autocomplete, Box, Button, Chip, CircularProgress, FormControl, InputLabel, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";
import {useNavigate} from 'react-router-dom';

const API_URL = "http://localhost:4000/api/tiles";

const translations = {
  en: {
    title: "Sales Bonus",
    description:
      "View sale dates, item-wise bonuses, payments, and any outstanding bonus balance.",
    searchUser: "Search user by name or mobile",
    searchPlaceholder: "Enter a name or mobile number",
    noMatchingUser: "No matching user found.",
    searchFailed: "Unable to search users.",
    loadFailed: "Unable to load sales bonus records.",
    paymentAmountError:
      "Enter an amount greater than zero and no more than the due amount.",
    paymentFailed: "Unable to update the payment.",
    paymentSaved: "Payment saved.",
    selectUser:
      "Search by name or mobile number and select a user to view their sales bonus records.",
    loading: "Loading sales bonus records",
    noRecords: "No sale bonus records found.",
    totalBonus: "Total bonus",
    totalPaid: "Total paid",
    totalDueBonus: "Total due bonus",
    recoveryBalance: "Advance recovery balance",
    recoveryOffset: "Recovered from this bonus",
    recoveryDetails: "This balance came from bonus already paid on a sale that was later returned. It will be recovered automatically from future bonuses before they are paid.",
    recovered: "Applied to recovery balance",
    awaitingCollection: "Awaiting invoice collection",
    awaitingCollectionDetails: "Approved bonus not yet payable because customer invoice payments have not been collected yet.",
    amountAwaitingCollection: "Awaiting collection",
    adminPayoutOverride: "Admin payment can be recorded now and will override the invoice collection release limit.",
    adminDueWarning: "This is the unpaid approved bonus balance. Admin can record a partial or full payout here.",
    outstandingWarning:
      "Outstanding bonus from previous sales is included in the total due bonus above.",
    allPaid: "All bonus amount paid",
    saleOn: "Sale on",
    sale: "Sale",
    paymentDue: "Payment due",
    awaitingPayment: "Awaiting collection",
    paid: "Paid",
    item: "Item",
    sellingPrice: "Selling price",
    quantity: "Quantity",
    bonusPercent: "Bonus %",
    itemBonus: "Item bonus",
    noItemDetails: "No item details available.",
    saleBonus: "Sale bonus",
    dueFromSale: "Due from this sale",
    paymentStatus: "Payment status",
    partiallyPaid: "Partially paid",
    unpaid: "Unpaid",
    recordPaymentTitle: "Record a payment for this sale",
    amount: "Amount",
    method: "Method",
    cash: "Cash",
    upi: "UPI",
    saving: "Saving...",
    recordPayment: "Record payment",
    payRemaining: "Pay remaining",
    dateUnavailable: "Date unavailable",
    language: "Language",
    english: "English",
    hindi: "हिन्दी",
    topMason: "Top tile mason",
    topSalesperson: "Top salesperson",
    topThreeMasons: "Top 3 tile masons",
    topThreeSalespeople: "Top 3 salespeople",
    topSalesValue: "Lifetime sales",
    loadingTopSellers: "Loading the top sellers",
    noTopSellers: "No sales have been recorded for this group yet.",
    topSellersLoadFailed: "Unable to load the top sellers.",
    invoice: "Invoice",
    pendingApproval: "Bonus approval pending",
    onHold: "On hold",
    history: "Payment history",
    noHistory: "No payment history yet.",
    untrackedPaid: "Previously recorded as paid, but transaction details are unavailable:",
  },
  hi: {
    title: "बिक्री बोनस",
    description: "बिक्री की तारीख, हर सामान का बोनस, भुगतान और बाकी बोनस देखें।",
    searchUser: "नाम या मोबाइल से उपयोगकर्ता खोजें",
    searchPlaceholder: "नाम या मोबाइल नंबर लिखें",
    noMatchingUser: "इस नाम या मोबाइल नंबर से कोई उपयोगकर्ता नहीं मिला।",
    searchFailed: "उपयोगकर्ता खोजा नहीं जा सका।",
    loadFailed: "बिक्री बोनस का विवरण लोड नहीं हो सका।",
    paymentAmountError: "रकम शून्य से अधिक और बाकी रकम से कम या बराबर लिखें।",
    paymentFailed: "भुगतान दर्ज नहीं हो सका।",
    paymentSaved: "भुगतान दर्ज हो गया।",
    selectUser: "बिक्री बोनस देखने के लिए नाम या मोबाइल नंबर से उपयोगकर्ता खोजें और चुनें।",
    loading: "बिक्री बोनस का विवरण लोड हो रहा है",
    noRecords: "बिक्री बोनस का कोई रिकॉर्ड नहीं मिला।",
    totalBonus: "कुल बोनस",
    totalPaid: "कुल भुगतान",
    totalDueBonus: "कुल बाकी बोनस",
    recoveryBalance: "अग्रिम रिकवरी बाकी",
    recoveryOffset: "इस बोनस से रिकवरी",
    recoveryDetails: "यह बकाया उस बोनस से बना है जिसका भुगतान हो चुका था, फिर बिक्री का सामान लौटाया गया। आगे के बोनस का भुगतान करने से पहले यह रकम अपने आप समायोजित होगी।",
    recovered: "रिकवरी में समायोजित",
    awaitingCollection: "इनवॉइस भुगतान का इंतज़ार",
    awaitingCollectionDetails: "ग्राहक से इनवॉइस का भुगतान मिलने पर ही स्वीकृत बोनस देय होगा।",
    amountAwaitingCollection: "भुगतान मिलने तक बाकी",
    adminPayoutOverride: "एडमिन अभी भुगतान दर्ज कर सकता है; इससे इनवॉइस कलेक्शन की सीमा हट जाएगी।",
    adminDueWarning: "यह स्वीकृत बोनस की बाकी रकम है। एडमिन यहाँ पूरा या आंशिक भुगतान दर्ज कर सकता है।",
    outstandingWarning: "पिछली बिक्री का बाकी बोनस ऊपर दिखाई गई कुल बाकी रकम में शामिल है।",
    allPaid: "पूरा बोनस चुका दिया गया है",
    saleOn: "बिक्री की तारीख",
    sale: "बिक्री",
    paymentDue: "भुगतान बाकी",
    awaitingPayment: "इनवॉइस भुगतान का इंतज़ार",
    paid: "भुगतान हो गया",
    item: "सामान",
    sellingPrice: "बिक्री की कीमत",
    quantity: "मात्रा",
    bonusPercent: "बोनस %",
    itemBonus: "सामान का बोनस",
    noItemDetails: "सामान का विवरण उपलब्ध नहीं है।",
    saleBonus: "बिक्री का बोनस",
    dueFromSale: "इस बिक्री का बाकी",
    paymentStatus: "भुगतान की स्थिति",
    partiallyPaid: "कुछ भुगतान हुआ",
    unpaid: "भुगतान बाकी",
    recordPaymentTitle: "इस बिक्री का भुगतान दर्ज करें",
    amount: "रकम",
    method: "तरीका",
    cash: "नकद",
    upi: "यूपीआई",
    saving: "सेव हो रहा है...",
    recordPayment: "भुगतान दर्ज करें",
    payRemaining: "बाकी रकम दें",
    dateUnavailable: "तारीख उपलब्ध नहीं है",
    language: "भाषा",
    english: "English",
    hindi: "हिन्दी",
    topMason: "टाइल मिस्त्रियों में सबसे आगे",
    topSalesperson: "सेल्सपर्सन में सबसे आगे",
    topThreeMasons: "शीर्ष 3 टाइल मिस्त्री",
    topThreeSalespeople: "शीर्ष 3 सेल्सपर्सन",
    topSalesValue: "कुल बिक्री",
    loadingTopSellers: "शीर्ष विक्रेताओं का विवरण लोड हो रहा है",
    noTopSellers: "इस समूह के लिए अभी तक कोई बिक्री दर्ज नहीं हुई है।",
    topSellersLoadFailed: "शीर्ष विक्रेताओं का विवरण लोड नहीं हो सका।",
    invoice: "इनवॉइस",
    pendingApproval: "बोनस स्वीकृत बाकी",
    onHold: "रोक पर",
    history: "भुगतान इतिहास",
    noHistory: "अभी भुगतान इतिहास नहीं है।",
    untrackedPaid: "पहले भुगतान दर्ज हुआ था, लेकिन उसका लेन-देन विवरण उपलब्ध नहीं है:",
  },
};

const INR = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatSaleDate = (value, language) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? translations[language].dateUnavailable
    : date.toLocaleString(language === "hi" ? "hi-IN" : "en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
};

const amountDue = (record,isAdmin=false) => {
  if (isAdmin && record.admin_effective_due !== undefined) return Number(record.admin_effective_due || 0);
  if (!isAdmin && record.effective_due !== undefined) return Number(record.effective_due || 0);
  const adjustments=Number(record.adjustments||0);
  const limit=isAdmin&&record.source_sales_invoice_id
    ? Math.max(Number(record.approved_bonus??record.final_user_bonus??0)+adjustments,0)
    : Number(record.payable_amount??record.final_user_bonus??0);
  return Math.max(limit-Number(record.total_amount_paid||0),0);
};

const amountAwaitingCollection = (record) => record.effective_awaiting_collection !== undefined ? Number(record.effective_awaiting_collection || 0) : Math.max(
  Number(record.approved_bonus ?? record.final_user_bonus ?? 0) - Math.max(Number(record.payable_amount ?? record.final_user_bonus ?? 0),Number(record.total_amount_paid||0)),
  0
);

const untrackedPaidAmount = (record) => {
  const historyTotal=(record.payments||[]).reduce((sum,payment)=>sum+Number(payment.amount||0),0);
  return Math.max(Math.round((Number(record.total_amount_paid||0)-historyTotal)*100)/100,0);
};

const paymentState = (record,isAdmin=false) => {
  if (record.status === "pending_approval") return "pendingApproval";
  if (record.status === "on_hold") return "onHold";
  if (Number(record.recovery_offset || 0) > 0 && amountDue(record,isAdmin) === 0 && Number(record.effective_awaiting_collection || 0) === 0) return "recovered";
  const due = amountDue(record,isAdmin);
  if (due > 0) return Number(record.total_amount_paid || 0) > 0 ? "partiallyPaid" : "unpaid";
  const approved = Number(record.approved_bonus ?? record.final_user_bonus ?? 0);
  const paid = Number(record.total_amount_paid || 0);
  return approved > paid ? "awaitingPayment" : "paid";
};

const SaleBonus = () => {
  const navigate=useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.userType?.toLowerCase() === "admin";
  const [language, setLanguage] = useState(isAdmin ? "en" : "hi");
  const text = translations[language];
  const displayUserType = (userType) => {
    if (language === "en" || !userType) return userType;
    const hindiUserTypes = {
      admin: "प्रशासक",
      salesperson: "सेल्सपर्सन",
      "tile mistire": "टाइल मिस्त्री",
    };
    return hindiUserTypes[userType.toLowerCase()] || userType;
  };
  const [searchText, setSearchText] = useState("");
  const [userOptions, setUserOptions] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [records, setRecords] = useState([]);
  const [accountRecoveryBalance, setAccountRecoveryBalance] = useState(0);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState("");
  const [topSellers, setTopSellers] = useState([]);
  const [topSellersLoading, setTopSellersLoading] = useState(false);
  const [topSellersError, setTopSellersError] = useState(false);
  const [paymentDrafts, setPaymentDrafts] = useState({});
  const [paymentSubmittingId, setPaymentSubmittingId] = useState(null);
  const [paymentFeedback, setPaymentFeedback] = useState({});
  const searchRequestRef = useRef(0);
  const recordsRequestRef = useRef(0);

  useEffect(() => {
    const sellerType = isAdmin ? selectedUser?.userType : user?.userType;
    if (!sellerType) {
      setTopSellers([]);
      setTopSellersError(false);
      setTopSellersLoading(false);
      return undefined;
    }

    let active = true;
    const loadTopSellers = async () => {
      setTopSellers([]);
      setTopSellersLoading(true);
      setTopSellersError(false);
      try {
        const response = await api.get(`${API_URL}/sales-bonus/top-seller`, {
          params: isAdmin ? { userType: sellerType } : undefined,
        });
        if (!Array.isArray(response.data?.topSellers)) {
          throw new Error("The server returned an invalid top sellers response.");
        }
        if (active) setTopSellers(response.data.topSellers);
      } catch {
        if (active) {
          setTopSellers([]);
          setTopSellersError(true);
        }
      } finally {
        if (active) setTopSellersLoading(false);
      }
    };

    loadTopSellers();
    return () => {
      active = false;
    };
  }, [isAdmin, selectedUser?.id, selectedUser?.userType, user?.userType]);

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
          if (!response.data?.length) setSearchError("noMatchingUser");
        }
      } catch {
        if (requestId === searchRequestRef.current) {
          setUserOptions([]);
          setSearchError("searchFailed");
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
    setAccountRecoveryBalance(0);
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
          setAccountRecoveryBalance(Number(response.data.user?.recoveryBalance || 0));
        }
      } catch {
        if (requestId === recordsRequestRef.current) {
          setRecordsError("loadFailed");
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
          summary.due += amountDue(record,isAdmin);
          summary.awaitingCollection += amountAwaitingCollection(record);
          return summary;
        },
        { bonus: 0, paid: 0, due: 0, awaitingCollection: 0 }
      ),
    [records,isAdmin]
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
    const due = amountDue(record,isAdmin);
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
          message: "paymentAmountError",
        },
      }));
      return;
    }

    setPaymentSubmittingId(record.id);
    setPaymentFeedback((current) => ({ ...current, [record.id]: null }));
    try {
      const response = await api.patch(
        `${API_URL}/sales-bonus/records/${record.id}/payment`,
        { amount, paymentMethod: draft.paymentMethod, idempotencyKey: window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}` }
      );
      const refreshed = await api.get(`${API_URL}/sales-bonus/records`, {
        params: isAdmin ? { userId: selectedUser?.id } : undefined,
      });
      setRecords(refreshed.data.records || []);
      setAccountRecoveryBalance(Number(refreshed.data.user?.recoveryBalance || 0));
      setPaymentDrafts((current) => ({
        ...current,
        [record.id]: { ...draft, amount: "" },
      }));
      setPaymentFeedback((current) => ({
        ...current,
        [record.id]: {
          severity: "success",
          message: "paymentSaved",
        },
      }));
    } catch {
      setPaymentFeedback((current) => ({
        ...current,
        [record.id]: {
          severity: "error",
          message: "paymentFailed",
        },
      }));
    } finally {
      setPaymentSubmittingId(null);
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, md: 4 }, py: 5 }}>
      <Paper sx={{ p: { xs: 2, md: 4 }, borderRadius: 3 }}>
        <Stack useFlexGap spacing={3}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", sm: "center" },
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            <Box>
              <Typography variant="h4" fontWeight={700}>
                {text.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {text.description}
              </Typography>
            </Box>
            <ToggleButtonGroup
              value={language}
              exclusive
              size="small"
              aria-label={text.language}
              onChange={(_, nextLanguage) => {
                if (nextLanguage) setLanguage(nextLanguage);
              }}
            >
              <ToggleButton value="en">{text.english}</ToggleButton>
              <ToggleButton value="hi">{text.hindi}</ToggleButton>
            </ToggleButtonGroup>
            {isAdmin&&<Button variant="contained" onClick={()=>navigate('/sales-bonus-management')}>Manage bonus approvals and payments</Button>}
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
                    <Stack useFlexGap>
                      <Typography variant="body2" fontWeight={600}>
                        {option.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.mobile} · {displayUserType(option.userType)}
                      </Typography>
                    </Stack>
                  </Box>
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={text.searchUser}
                  placeholder={text.searchPlaceholder}
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
                {user?.mobile} · {displayUserType(user?.userType)}
              </Typography>
            </Paper>
          )}

          {(!isAdmin || selectedUser) && (
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderColor: "warning.light",
                bgcolor: "warning.50",
              }}
            >
              {topSellersLoading ? (
                <Stack useFlexGap direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                  <CircularProgress size={20} aria-label={text.loadingTopSellers} />
                  <Typography>{text.loadingTopSellers}</Typography>
                </Stack>
              ) : topSellersError ? (
                <Alert severity="error">{text.topSellersLoadFailed}</Alert>
              ) : topSellers.length > 0 ? (
                <Stack useFlexGap direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
                  <StarRoundedIcon
                    aria-hidden="true"
                    sx={{ color: "warning.main", fontSize: 36, mt: 0.25 }}
                  />
                  <Stack useFlexGap spacing={1}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {(isAdmin ? selectedUser.userType : user?.userType)
                        ?.toLowerCase() === "tile mistire"
                        ? isAdmin
                          ? text.topThreeMasons
                          : text.topMason
                        : isAdmin
                          ? text.topThreeSalespeople
                          : text.topSalesperson}
                    </Typography>
                    {(isAdmin ? topSellers : topSellers.slice(0, 1)).map(
                      (seller, index) => (
                        <Box key={seller.id}>
                          <Typography fontWeight={600}>
                            #{index + 1} {seller.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {text.topSalesValue}: {INR(seller.total_sales)}
                          </Typography>
                        </Box>
                      )
                    )}
                  </Stack>
                </Stack>
              ) : (
                <Stack useFlexGap direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                  <StarRoundedIcon
                    aria-hidden="true"
                    sx={{ color: "warning.main", fontSize: 36 }}
                  />
                  <Typography>{text.noTopSellers}</Typography>
                </Stack>
              )}
            </Paper>
          )}

          {searchError && <Alert severity="info">{text[searchError]}</Alert>}
          {recordsError && <Alert severity="error">{text[recordsError]}</Alert>}

          {isAdmin && !selectedUser ? (
            <Alert severity="info">
              {text.selectUser}
            </Alert>
          ) : recordsLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
              <CircularProgress aria-label={text.loading} />
            </Box>
          ) : recordsError ? null : records.length === 0 ? (
            <Alert severity="info">{text.noRecords}</Alert>
          ) : (
            <>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(5, minmax(0, 1fr))" },
                  gap: 2,
                }}
              >
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {text.totalBonus}
                  </Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {INR(totals.bonus)}
                  </Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {text.totalPaid}
                  </Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {INR(totals.paid)}
                  </Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {text.totalDueBonus}
                  </Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {INR(totals.due)}
                  </Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="body2" color="text.secondary">{text.amountAwaitingCollection}</Typography>
                  <Typography variant="h6" fontWeight={700}>{INR(totals.awaitingCollection)}</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 2, borderColor: accountRecoveryBalance > 0 ? "warning.main" : undefined }}>
                  <Typography variant="body2" color="text.secondary">{text.recoveryBalance}</Typography>
                  <Typography variant="h6" fontWeight={700}>{INR(accountRecoveryBalance)}</Typography>
                </Paper>
              </Box>

              {accountRecoveryBalance > 0 ? (
                <Alert severity="warning">{text.recoveryDetails}</Alert>
              ) : totals.due > 0 ? (
                <Alert severity={isAdmin?"info":"warning"}>
                  {isAdmin?text.adminDueWarning:text.outstandingWarning}
                </Alert>
              ) : totals.awaitingCollection > 0 ? (
                <Alert severity="info">{text.awaitingCollectionDetails}</Alert>
              ) : (
                <Alert severity="success">{text.allPaid}</Alert>
              )}

              <Stack useFlexGap spacing={2}>
                {records.map((record) => {
                  const due = amountDue(record,isAdmin);
                  return (
                    <Paper
                      key={record.id}
                      variant="outlined"
                      sx={{ p: { xs: 1.5, md: 2 }, borderRadius: 2 }}
                    >
                      <Stack useFlexGap
                        direction={{ xs: "column", sm: "row" }}
                        justifyContent="space-between"
                        spacing={1}
                        sx={{ mb: 2, alignItems: { xs: "flex-start", sm: "center" } }}
                      >
                        <Box>
                          <Typography variant="h6" fontWeight={700}>
                            {text.saleOn} {formatSaleDate(record.created_at, language)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {record.invoice_number?`${text.invoice} ${record.invoice_number} · `:''}{text.sale} #{record.id}
                          </Typography>
                        </Box>
                        <Chip
                          label={text[paymentState(record,isAdmin)]}
                          color={record.status==='on_hold'?'error':record.status==='pending_approval'?'warning':paymentState(record,isAdmin)==='awaitingPayment'?'info':due > 0 ? "warning" : "success"}
                          variant="outlined"
                        />
                      </Stack>

                      <TableContainer sx={{ overflowX: "auto", mb: 2 }}>
                        <Table size="small" sx={{ minWidth: 680 }}>
                          <TableHead>
                            <TableRow>
                              <TableCell>{text.item}</TableCell>
                              <TableCell align="right">{text.sellingPrice}</TableCell>
                              <TableCell align="right">{text.quantity}</TableCell>
                              <TableCell align="right">{text.bonusPercent}</TableCell>
                              <TableCell align="right">{text.itemBonus}</TableCell>
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
                                  {formatNumber(item.quantity)}
                                </TableCell>
                                <TableCell align="right">
                                  {formatNumber(item.bonus_percentage)}%
                                </TableCell>
                                <TableCell align="right">
                                  {INR(item.user_bonus)}
                                </TableCell>
                              </TableRow>
                            ))}
                            {record.items?.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={5} align="center">
                                  {text.noItemDetails}
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
                            {text.saleBonus}
                          </Typography>
                          <Typography fontWeight={600}>
                            {INR(record.approved_bonus ?? record.final_user_bonus)}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            {text.paid}
                          </Typography>
                          <Typography fontWeight={600}>
                            {INR(record.total_amount_paid)}
                            {record.payment_method
                              ? ` · ${
                                  record.payment_method === "CASH"
                                    ? text.cash
                                    : record.payment_method === "UPI"
                                      ? text.upi
                                      : record.payment_method
                                }`
                              : ""}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            {text.dueFromSale}
                          </Typography>
                          <Typography fontWeight={600}>
                            {INR(due)}
                          </Typography>
                          {Number(record.recovery_offset || 0) > 0 && (
                            <Typography variant="caption" display="block" color="warning.dark">
                              {text.recoveryOffset}: {INR(record.recovery_offset)}
                            </Typography>
                          )}
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            {text.paymentStatus}
                          </Typography>
                          <Typography fontWeight={600}>
                            {due === 0
                              ? paymentState(record,isAdmin)==="awaitingPayment" ? text.awaitingCollectionDetails : text.allPaid
                              : due < Number(record.payable_amount ?? record.final_user_bonus)
                                ? text.partiallyPaid
                                : text.unpaid}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{mb:1}}><Typography variant="subtitle2">{text.history}</Typography>{record.payments?.map(payment=><Typography key={payment.id} variant="body2" color="text.secondary">{String(payment.payment_date).slice(0,10)} · {INR(payment.amount)} · {payment.payment_method}{payment.reference?` · ${payment.reference}`:''}</Typography>)}{untrackedPaidAmount(record)>0?<Typography variant="body2" color="text.secondary">{text.untrackedPaid} {INR(untrackedPaidAmount(record))}</Typography>:!record.payments?.length?<Typography variant="body2" color="text.secondary">{text.noHistory}</Typography>:null}</Box>

                      {isAdmin && !["pending_approval", "on_hold", "reversed"].includes(record.status) && due > 0 && (
                        <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: "divider" }}>
                          {amountAwaitingCollection(record)>0&&<Alert severity="info" sx={{mb:1.5}}>{text.adminPayoutOverride}</Alert>}
                          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>{text.recordPaymentTitle}</Typography>
                          <Stack className="ui-form-grid" useFlexGap
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1.5}
                            sx={{ alignItems: { sm: "center" } }}
                          >
                            <TextField
                              label={text.amount}
                              type="number"
                              size="small"
                              value={paymentDrafts[record.id]?.amount ?? ""}
                              onChange={(event) =>
                                updatePaymentDraft(record.id, "amount", event.target.value)
                              }
                              slotProps={{htmlInput:{ min: 0.01, max: due, step: 0.01 }}}
                              sx={{ minWidth: { sm: 160 } }}
                            />
                            <FormControl size="small" sx={{ minWidth: { sm: 140 } }}>
                              <InputLabel id={`payment-method-${record.id}`}>
                                {text.method}
                              </InputLabel>
                              <Select
                                labelId={`payment-method-${record.id}`}
                                label={text.method}
                                value={paymentDrafts[record.id]?.paymentMethod ?? "CASH"}
                                onChange={(event) =>
                                  updatePaymentDraft(
                                    record.id,
                                    "paymentMethod",
                                    event.target.value
                                  )
                                }
                              >
                                <MenuItem value="CASH">{text.cash}</MenuItem>
                                <MenuItem value="UPI">{text.upi}</MenuItem>
                              </Select>
                            </FormControl>
                            <Button
                              variant="contained"
                              onClick={() => handleRecordPayment(record)}
                              disabled={paymentSubmittingId === record.id}
                            >
                              {paymentSubmittingId === record.id
                                ? text.saving
                                : text.recordPayment}
                            </Button>
                            <Button
                              variant="outlined"
                              onClick={() => handleRecordPayment(record, true)}
                              disabled={paymentSubmittingId === record.id}
                            >
                              {text.payRemaining} {INR(due)}
                            </Button>
                          </Stack>
                          {paymentFeedback[record.id] && (
                            <Alert
                              severity={paymentFeedback[record.id].severity}
                              sx={{ mt: 1.5 }}
                            >
                              {text[paymentFeedback[record.id].message]}
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
