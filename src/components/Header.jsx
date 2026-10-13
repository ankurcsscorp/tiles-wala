import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Points from "./Points";
import "./Header.css";
import { Typography } from "@mui/material";

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation(); // Get the current route

  // User flags - in real app, these would come from auth
  const isLoggedIn = true;
  const isAdmin = true; // Set to true for admin, false for normal user

  // User data state - this would typically come from auth/context
  const [userData, setUserData] = useState({
    name: "John Doe",
    mobileNumber: "9876543210",
    totalSaleValue: 50000,
    date: new Date().toLocaleDateString(),
  });

  // Calculate points: ₹100 = 3 points
  const calculatePoints = (saleValue) => {
    return Math.floor((saleValue || 0) / 100) * 3;
  };

  const points = calculatePoints(userData.totalSaleValue);
  const navigate = useNavigate();

  const handlePointsClick = () => {
    if (isAdmin) {
      navigate("/points");
    }
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
        <Link
          to="https://mybillbook.in/store/johnson_tiles_mahua"
          target="blank"
          onClick={() => setMenuOpen(false)}
          className={location.pathname === "/online-store" ? "active-link" : ""}
        >
          Online Store
        </Link>
        <Link
          to="/contact"
          onClick={() => setMenuOpen(false)}
          className={location.pathname === "/contact" ? "active-link" : ""}
        >
          Contact
        </Link>
        <Link
          to="/enquiry"
          onClick={() => setMenuOpen(false)}
          className={location.pathname === "/enquiry" ? "active-link" : ""}
        >
          Enquiry
        </Link>
        {isAdmin && (
          <>
          <Link
            to="/points"
            onClick={() => setMenuOpen(false)}
            className={location.pathname === "/points" ? "active-link" : ""}
          >
            Points Management
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

      </div>

      <div className="header-right">
        {isLoggedIn ? (
          <div
            className={`points-clickable ${isAdmin ? "admin-points" : ""}`}
            onClick={handlePointsClick}
          >
            <Points
              name={userData.name}
              mobileNumber={userData.mobileNumber}
              totalSaleValue={userData.totalSaleValue}
              date={userData.date}
              points={points}
              isAdmin={isAdmin}
            />
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