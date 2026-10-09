import React, { useState } from "react";
import "./Points.css";

const Points = ({ name, mobileNumber, totalSaleValue, date, points, isAdmin }) => {
  return (
    <div className="points-container">
      {points !== undefined ? (
        <div className="points-info">
          <span className="points-label">Points:</span>
          <span className="points-value">{points}</span>
        </div>
      ) : (
        <div className="points-info">
          <span className="points-label">Points</span>
          <span className="points-value">0</span>
        </div>
      )}
      
      {name && (
        <div className="user-info">
          <span className="user-name">{name}</span>
          {isAdmin && <span className="user-mobile">{mobileNumber}</span>}
        </div>
      )}
      
      {totalSaleValue !== undefined && (
        <div className="sale-info">
          <span className="sale-label">Total Sale:</span>
          <span className="sale-value">₹{totalSaleValue}</span>
        </div>
      )}
      
      {date && (
        <div className="date-info">
          <span className="date-label">Date:</span>
          <span className="date-value">{date}</span>
        </div>
      )}
    </div>
  );
};

// Admin Points Management Page
export const PointsManagement = () => {
  const [formData, setFormData] = useState({
    name: "",
    mobileNumber: "",
    totalSaleValue: "",
    date: new Date().toLocaleDateString()
  });

  const [existingPoints, setExistingPoints] = useState(100);
  const [sales, setSales] = useState([
    { id: 1, name: "John Doe", mobileNumber: "9876543210", totalSaleValue: 50000, date: "27/02/2026", points: 1500 },
    { id: 2, name: "Jane Smith", mobileNumber: "9876543211", totalSaleValue: 25000, date: "26/02/2026", points: 750 },
  ]);

  // Calculate points: ₹100 = 3 points
  const calculatePoints = (saleValue) => {
    return Math.floor((saleValue || 0) / 100) * 3;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const newPoints = calculatePoints(parseFloat(formData.totalSaleValue));
    
    const newSale = {
      id: sales.length + 1,
      name: formData.name,
      mobileNumber: formData.mobileNumber,
      totalSaleValue: parseFloat(formData.totalSaleValue),
      date: formData.date,
      points: newPoints
    };

    setSales([...sales, newSale]);
    setExistingPoints(existingPoints + newPoints);
    
    // Reset form
    setFormData({
      name: "",
      mobileNumber: "",
      totalSaleValue: "",
      date: new Date().toLocaleDateString()
    });
  };

  return (
    <div className="points-management">
      <h2>Points Management</h2>
      
      <div className="total-points-summary">
        <h3>Total Points in System: {existingPoints}</h3>
      </div>

      <div className="add-sale-form">
        <h3>Add New Sale</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name:</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Mobile Number:</label>
            <input
              type="tel"
              name="mobileNumber"
              value={formData.mobileNumber}
              onChange={handleInputChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Total Sale (₹):</label>
            <input
              type="number"
              name="totalSaleValue"
              value={formData.totalSaleValue}
              onChange={handleInputChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Date:</label>
            <input
              type="text"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              required
            />
          </div>

          <button type="submit" className="submit-btn">
            Add Sale (Points: {calculatePoints(parseFloat(formData.totalSaleValue) || 0)})
          </button>
        </form>
      </div>

      <div className="sales-history">
        <h3>Sales History</h3>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Mobile</th>
              <th>Sale (₹)</th>
              <th>Date</th>
              <th>Points</th>
            </tr>
          </thead>
          <tbody>
            {sales.map(sale => (
              <tr key={sale.id}>
                <td>{sale.name}</td>
                <td>{sale.mobileNumber}</td>
                <td>₹{sale.totalSaleValue}</td>
                <td>{sale.date}</td>
                <td>{sale.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Points;

