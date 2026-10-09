import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Points from "./Points";
import "./Header.css";

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  
  // User flags - in real app, these would come from auth
  const isLoggedIn = false;
  const isAdmin = false; // Set to true for admin, false for normal user
  
  // User data state - this would typically come from auth/context
  const [userData, setUserData] = useState({
    name: "John Doe",
    mobileNumber: "9876543210",
    totalSaleValue: 50000,
    date: new Date().toLocaleDateString()
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
      <div className="logo">🏠 Tiles Wala</div>

      <div className={`nav-links ${menuOpen ? "active" : ""}`}>
        <Link to="/" onClick={() => setMenuOpen(false)}>New Collections</Link>
        <Link to="https://mybillbook.in/store/johnson_tiles_mahua" target="blank" onClick={() => setMenuOpen(false)}>Online Store</Link>
        <Link to="/contact" onClick={() => setMenuOpen(false)}>Contact</Link>
        {isAdmin && <Link to="/points" onClick={() => setMenuOpen(false)}>Points Management</Link>}
      </div>

      <div className="header-right">
        {isLoggedIn ? (
          <div 
            className={`points-clickable ${isAdmin ? 'admin-points' : ''}`}
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
          <button className="signin-btn" onClick={() => navigate("/auth")}>Sign In</button>
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

