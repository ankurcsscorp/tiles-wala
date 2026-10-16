import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./Header.css";
import { Typography } from "@mui/material";
import { useAuth } from "../context/AuthContext";

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation(); // Get the current route
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const userType = user?.userType?.toLowerCase();
  const isAdmin = userType === "admin";
  const canManageEnquiries = isAdmin || userType === "salesperson";

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate("/");
  };

  return (
    <header className="header">
      <div className="logo" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <img
          src="/images/brandlogo.png"
          alt="Tilewala Logo"
          style={{ maxWidth: "40px", borderRadius: "50%" }}
        />
        <Typography variant="body2" sx={{ fontWeight: "bold" }}>
          A & A HOME DECOR
        </Typography>
      </div>

      <div className={`nav-links ${menuOpen ? "active" : ""}`}>
        <Link
          to="/"
          onClick={() => setMenuOpen(false)}
          className={location.pathname === "/" ? "active-link" : ""}
        >
          New Collections
        </Link>

        {isAdmin && (
          <Link
            to="/enquiry"
            onClick={() => setMenuOpen(false)}
            className={location.pathname === "/enquiry" ? "active-link" : ""}
          >
            Enquiry
          </Link>
        )}

        <Link
            to="/sales-bonus"
            onClick={() => setMenuOpen(false)}
            className={location.pathname === "/sales-bonus" ? "active-link" : ""}
          >
            Sales Bonus
          </Link>
        {isAdmin && (
          <>
          <Link
            to="/sales-bonus-management"
            onClick={() => setMenuOpen(false)}
            className={location.pathname === "/sales-bonus-management" ? "active-link" : ""}
          >
            Sales Bonus Management
          </Link>
          
          <Link
          to="/enquiry-management"
          onClick={() => setMenuOpen(false)}
          className={location.pathname === "/enquiry-management" ? "active-link" : ""}
        >
          Enquiry Management
        </Link>
        </>
        )}
        {canManageEnquiries && !isAdmin && (
        <Link
          to="/enquiry-management"
          onClick={() => setMenuOpen(false)}
          className={location.pathname === "/enquiry-management" ? "active-link" : ""}
        >
          Enquiry Management
        </Link>
        
        )}
                <Link
          to="https://mybillbook.in/store/johnson_tiles_mahua"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setMenuOpen(false)}
          className={location.pathname === "/online-store" ? "active-link" : ""}
        >
          Online Store
        </Link>

      </div>

      <div className="header-right">
        {isAuthenticated ? (
        <div className="auth-user">
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {user?.name || user?.mobile}
          </Typography>
          <button className="signin-btn" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
        ) : (
          <button className="signin-btn" onClick={() => navigate("/auth")}>
            Sign In
          </button>
        )}
      </div>

      {/* Mobile Hamburger */}
      <div className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
        ☰
      </div>
    </header>
  );
};

export default Header;