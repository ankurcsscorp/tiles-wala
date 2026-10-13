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
import Auth from "./components/Auth";
import { PointsManagement } from "./components/Points";
import Footer from "./components/footer/Footer";
import EnquiryForm from "./components/Enquiry/EnquiryForm";
import EnquiryTable from "./components/Enquiry/EnquiryTable";
import { AuthProvider, useAuth } from "./context/AuthContext";

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

function App() {
  return (
    <AuthProvider>
      <Router>
        <Header />
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<NewCollection />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/enquiry" element={<EnquiryForm />} />
          <Route
            path="/points"
            element={
              <ProtectedRoute allowedUserTypes={["admin"]}>
                <PointsManagement />
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
        <Footer />
      </Router>
    </AuthProvider>
  );
}

export default App;
