import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  Paper,
  Grid,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  MenuItem,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import RestartAltIcon from "@mui/icons-material/RestartAlt";

const API_URL = "http://localhost:4000/api/tiles/enquiries";

const initialFormData = {
  name: "",
  mobile: "",
  address: "",
  area: "",
  purchasePlan: "",
  remark: "",
};

// Shared props so every field is full width and mobile friendly
const fieldProps = {
  fullWidth: true,
  sx: {
    // 16px prevents iOS Safari from auto-zooming on focus
    "& .MuiInputBase-input, & .MuiInputBase-inputMultiline": {
      fontSize: { xs: 16, sm: 14 },
    },
  },
};

const EnquiryForm = () => {
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  useEffect(() => {
    if (message && messageType === "success") {
      const timer = setTimeout(() => setMessage(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [message, messageType]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setMessage("");
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!/^[6-9]\d{9}$/.test(formData.mobile.trim())) {
      newErrors.mobile = "Enter a valid 10-digit Indian mobile number";
    }

    if (!formData.address.trim()) {
      newErrors.address = "Address is required";
    }

    if (
      formData.area.trim() === "" ||
      !Number.isFinite(Number(formData.area)) ||
      Number(formData.area) <= 0
    ) {
      newErrors.area = "Enter a valid area greater than zero";
    }

    if (!formData.purchasePlan.trim()) {
      newErrors.purchasePlan = "Purchase plan is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    if (!validateForm()) return;

    setLoading(true);

    try {
      const payload = {
        customer_name: formData.name.trim(),
        mobile: formData.mobile.trim(),
        address: formData.address.trim(),
        required_area: Number(formData.area),
        purchase_plan: formData.purchasePlan,
        remark: formData.remark.trim(),
      };

      const response = await axios.post(API_URL, payload, {
        headers: { "Content-Type": "application/json" },
      });

      setMessage(response.data?.message || "Enquiry submitted successfully!");
      setMessageType("success");

      setFormData({ ...initialFormData });
      setErrors({});
    } catch (error) {
      console.error("Enquiry submission failed:", error);

      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        (error.response?.status
          ? `Request failed with status ${error.response.status}.`
          : error.request
            ? "Unable to connect to the server. Please check whether the backend is running."
            : error.message) ||
        "Unable to submit enquiry. Please try again.";

      setMessage(errorMessage);
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({ ...initialFormData });
    setErrors({});
    setMessage("");
  };

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 850,
        mx: "auto",
        my: { xs: 1, sm: 4 },
        px: { xs: 1, sm: 3 }, // small side gap on mobile
        boxSizing: "border-box",
      }}
    >
      <Paper
        elevation={4}
        sx={{
          width: "100%",
          boxSizing: "border-box",
          p: { xs: 2, sm: 4 },
          borderRadius: { xs: 2, sm: 3 },
          borderTop: "5px solid #424242",
          boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Typography
          variant="h5"
          fontWeight={700}
          color="text.primary"
          gutterBottom
          sx={{
            textAlign: "center",
            fontSize: { xs: "1.25rem", sm: "1.5rem" },
          }}
        >
          Customer Enquiry
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: { xs: 2, sm: 3 }, textAlign: "center" }}
        >
          Enter customer details and tile project requirements.
        </Typography>

        {message && (
          <Alert
            severity={messageType}
            sx={{ mb: { xs: 2, sm: 3 } }}
            onClose={() => setMessage("")}
          >
            {message}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Grid container spacing={{ xs: 2, sm: 3 }}>
            {/* Customer Name */}
            <Grid item xs={12} sm={6}>
              <TextField
                {...fieldProps}
                required
                label="Customer Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                error={Boolean(errors.name)}
                helperText={errors.name}
                placeholder="Enter customer name"
                autoComplete="name"
              />
            </Grid>

            {/* Mobile Number */}
            <Grid item xs={12} sm={6}>
              <TextField
                {...fieldProps}
                required
                label="Mobile Number"
                name="mobile"
                type="tel"
                value={formData.mobile}
                onChange={(event) => {
                  const value = event.target.value.replace(/\D/g, "");
                  if (value.length <= 10) {
                    handleChange({ target: { name: "mobile", value } });
                  }
                }}
                error={Boolean(errors.mobile)}
                helperText={errors.mobile || "Enter 10-digit mobile number"}
                placeholder="9876543210"
                inputProps={{
                  inputMode: "numeric",
                  maxLength: 10,
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">+91</InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Address */}
            <Grid item xs={12}>
              <TextField
                {...fieldProps}
                required
                label="Address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                error={Boolean(errors.address)}
                helperText={errors.address}
                placeholder="Enter village, town or full address"
                multiline
                minRows={2}
              />
            </Grid>

            {/* Required Tile Area */}
            <Grid item xs={12} sm={6}>
              <TextField
                {...fieldProps}
                required
                type="number"
                label="Area Required"
                name="area"
                value={formData.area}
                onChange={handleChange}
                error={Boolean(errors.area)}
                helperText={
                  errors.area || "Enter required tile area in sq. ft."
                }
                placeholder="e.g. 500"
                inputProps={{
                  min: 0,
                  step: "any",
                  inputMode: "decimal",
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">sq. ft.</InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Purchase Plan */}
            <Grid item xs={12} sm={6}>
              <TextField
                {...fieldProps}
                select
                required
                label="Purchase Plan"
                name="purchasePlan"
                value={formData.purchasePlan}
                onChange={handleChange}
                error={Boolean(errors.purchasePlan)}
                helperText={errors.purchasePlan || "Select a purchase plan"}
              >
                <MenuItem value="Immediate">Immediate</MenuItem>
                <MenuItem value="Less Than a Week">Less Than a Week</MenuItem>
                <MenuItem value="In 15 Days">In 15 Days</MenuItem>
                <MenuItem value="Less Than 30 Days">Less Than 30 Days</MenuItem>
                <MenuItem value="Greater Than 30 Days">
                  Greater Than 30 Days
                </MenuItem>
              </TextField>
            </Grid>

            {/* Remark */}
            <Grid item xs={12}>
              <TextField
                {...fieldProps}
                label="Remark"
                name="remark"
                value={formData.remark}
                onChange={handleChange}
                placeholder="e.g. Bathroom, kitchen, floor tiles"
                multiline
                minRows={2}
              />
            </Grid>

            {/* Action Buttons */}
            <Grid item xs={12}>
              <Box
                sx={{
                  display: "flex",
                  // Mobile: stacked, Submit on top. Desktop: side by side, right aligned
                  flexDirection: { xs: "column-reverse", sm: "row" },
                  justifyContent: { sm: "flex-end" },
                  gap: 2,
                  mt: { xs: 0, sm: 2 },
                }}
              >
                <Button
                  variant="outlined"
                  color="inherit"
                  startIcon={<RestartAltIcon />}
                  onClick={handleReset}
                  disabled={loading}
                  fullWidth
                  sx={{
                    width: { sm: "auto" },
                    px: 3,
                    py: { xs: 1.25, sm: 0.75 },
                    borderRadius: 2,
                  }}
                >
                  Reset
                </Button>

                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<SendIcon />}
                  disabled={loading}
                  fullWidth
                  sx={{
                    width: { sm: "auto" },
                    bgcolor: "#424242",
                    px: 3,
                    py: { xs: 1.25, sm: 0.75 },
                    borderRadius: 2,
                    "&:hover": { bgcolor: "#212121" },
                  }}
                >
                  {loading ? "Submitting..." : "Submit Enquiry"}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Box>
  );
};

export default EnquiryForm;