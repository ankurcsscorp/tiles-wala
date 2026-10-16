import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import Header from "./components/Header";
import OnlineStore from "./components/OnlineStore";
import ContactUs from "./components/ContactUs";
import NewCollection from "./components/NewCollection";
import TileVisualizer from "./components/TileVisualizer";
import Auth from "./components/Auth";
import Footer from "./components/footer/Footer";
import EnquiryForm from "./components/Enquiry/EnquiryForm";
import EnquiryTable from "./components/Enquiry/EnquiryTable";
import { AuthProvider, useAuth } from "./context/AuthContext";
import SaleBonusManagement from "./components/sales/SaleBonusManagement";
import SaleBonus from "./components/sales/SaleBonus";

const ProtectedRoute = ({ allowedUserTypes, children }) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  const userType = user.userType.toLowerCase();
  if (!allowedUserTypes.includes(userType)) {
    const homePath =
      userType === "admin" || userType === "salesperson"
        ? "/enquiry-management"
        : "/";
    return <Navigate to={homePath} replace />;
  }

  return children;
};

const AppContent = () => {
  const location = useLocation();
  const isVisualizer = location.pathname === "/visualizer";

  return (
    <>
      {!isVisualizer && <Header />}
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/" element={<NewCollection />} />
        <Route path="/visualizer" element={<TileVisualizer />} />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/enquiry" element={<EnquiryForm />} />
        <Route
          path="/sales-bonus"
          element={
            <ProtectedRoute allowedUserTypes={["admin", "salesperson", "tile mistire"]}>
              <SaleBonus />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sales-bonus-management"
          element={
            <ProtectedRoute allowedUserTypes={["admin"]}>
              <SaleBonusManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/enquiry-management"
          element={
            <ProtectedRoute allowedUserTypes={["admin", "salesperson"]}>
              <EnquiryTable />
            </ProtectedRoute>
          }
        />
      </Routes>
      {!isVisualizer && <Footer />}
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
