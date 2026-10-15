import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Auth.css";

const INITIAL_FORM_DATA = {
  name: "",
  mobile: "",
  password: "",
  confirmPassword: "",
  userType: "",
  areaLocation: "",
  adminKey: "",
};

const MISTIRI_USER_TYPES = ["Tile Mistire", "Plumber Mistiri"];

const getHomeForUserType = (userType) => {
  const normalizedUserType = userType?.toLowerCase();
  if (normalizedUserType === "admin" || normalizedUserType === "salesperson") {
    return "/enquiry-management";
  }
  return "/";
};

const Auth = ({
  onSignupSuccess,
  onCancel,
  hideToggle = false,
  initialMode = "login",
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, signup } = useAuth();
  const [isLogin, setIsLogin] = useState(initialMode === "login");
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: "" }));
    setSubmitError("");
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.mobile.trim()) {
      newErrors.mobile = "Mobile number is required";
    }
    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    if (!isLogin) {
      if (!formData.name.trim()) {
        newErrors.name = "Name is required";
      }
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = "Confirm password is required";
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
      if (!formData.userType) {
        newErrors.userType = "User type is required";
      }
      if (
        MISTIRI_USER_TYPES.includes(formData.userType) &&
        !formData.areaLocation.trim()
      ) {
        newErrors.areaLocation = "Area/Location is required";
      } else if (formData.areaLocation.trim().length > 200) {
        newErrors.areaLocation = "Area/Location must be 200 characters or fewer";
      }
      if (formData.userType === "Admin" && !formData.adminKey.trim()) {
        newErrors.adminKey = "Admin key is required";
      }
    }

    return newErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");

    const validationErrors = validateForm();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    try {
      const authenticatedUser = isLogin
        ? await login({
            mobile: formData.mobile.trim(),
            password: formData.password,
          })
        : await signup(
            {
              name: formData.name.trim(),
              mobile: formData.mobile.trim(),
              password: formData.password,
              userType: formData.userType,
              ...(MISTIRI_USER_TYPES.includes(formData.userType)
                ? { areaLocation: formData.areaLocation.trim() }
                : {}),
              ...(formData.userType === "Admin"
                ? { adminKey: formData.adminKey }
                : {}),
            },
            { persistAuth: typeof onSignupSuccess !== "function" }
          );

      if (!isLogin && typeof onSignupSuccess === "function") {
        onSignupSuccess(authenticatedUser);
        return;
      }

      const requestedPath = location.state?.from?.pathname;
      navigate(requestedPath || getHomeForUserType(authenticatedUser.userType), {
        replace: true,
      });
    } catch (error) {
      setSubmitError(
        error.response?.data?.message ||
          error.message ||
          `Unable to ${isLogin ? "sign in" : "sign up"}. Please try again.`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMode = () => {
    const nextMode = !isLogin;
    setIsLogin(nextMode);
    setFormData(INITIAL_FORM_DATA);
    setErrors({});
    setSubmitError("");
  };

  const handleCancel = () => {
    if (typeof onCancel === "function") {
      onCancel();
      return;
    }

    navigate(location.state?.from || -1);
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>{isLogin ? "Sign In" : "Sign Up"}</h2>

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="auth-name">Name</label>
              <input
                id="auth-name"
                type="text"
                name="name"
                autoComplete="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your name"
                required
              />
              {errors.name && <span className="error">{errors.name}</span>}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="auth-mobile">Mobile Number</label>
            <input
              id="auth-mobile"
              type="tel"
              name="mobile"
              autoComplete="tel"
              value={formData.mobile}
              onChange={handleChange}
              placeholder="Enter mobile number"
              required
            />
            {errors.mobile && <span className="error">{errors.mobile}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              name="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter password"
              required
            />
            {errors.password && <span className="error">{errors.password}</span>}
          </div>

          {!isLogin && (
            <>
              <div className="form-group">
                <label htmlFor="auth-confirm-password">Confirm Password</label>
                <input
                  id="auth-confirm-password"
                  type="password"
                  name="confirmPassword"
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm password"
                  required
                />
                {errors.confirmPassword && (
                  <span className="error">{errors.confirmPassword}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="auth-user-type">User Type</label>
                <select
                  id="auth-user-type"
                  name="userType"
                  value={formData.userType}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select user type</option>
                  <option value="Admin">Admin</option>
                  <option value="Salesperson">Salesperson</option>
                  <option value="Tile Mistire">Tiles Misti</option>
                  <option value="Plumber Mistiri">Plumber Mistiri</option>
                </select>
                {errors.userType && (
                  <span className="error">{errors.userType}</span>
                )}
              </div>

              {MISTIRI_USER_TYPES.includes(formData.userType) && (
                <div className="form-group">
                  <label htmlFor="auth-area-location">Area/Location</label>
                  <input
                    id="auth-area-location"
                    type="text"
                    name="areaLocation"
                    autoComplete="address-level2"
                    maxLength={200}
                    value={formData.areaLocation}
                    onChange={handleChange}
                    placeholder="Enter area or location"
                    required
                  />
                  {errors.areaLocation && (
                    <span className="error">{errors.areaLocation}</span>
                  )}
                </div>
              )}

              {formData.userType === "Admin" && (
                <div className="form-group">
                  <label htmlFor="auth-admin-key">Admin Key</label>
                  <input
                    id="auth-admin-key"
                    type="password"
                    name="adminKey"
                    autoComplete="off"
                    value={formData.adminKey}
                    onChange={handleChange}
                    placeholder="Enter admin key"
                    required
                  />
                  {errors.adminKey && (
                    <span className="error">{errors.adminKey}</span>
                  )}
                </div>
              )}
            </>
          )}

          {submitError && (
            <p className="error" role="alert">
              {submitError}
            </p>
          )}

          <button type="submit" className="auth-btn" disabled={submitting}>
            {submitting
              ? "Please wait..."
              : isLogin
                ? "Sign In"
                : "Complete Sign Up"}
          </button>
          {!isLogin && (
            <button
              type="button"
              className="auth-cancel-btn"
              onClick={handleCancel}
              disabled={submitting}
            >
              Cancel
            </button>
          )}
        </form>

        {!hideToggle && (
          <p className="toggle-text">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              className="toggle-btn"
              onClick={toggleMode}
              disabled={submitting}
            >
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default Auth;
