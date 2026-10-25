import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import Header from "./components/Header";
import BusinessShell from "./components/layout/BusinessShell";
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
import StoreManagement from "./components/stores/StoreManagement";
import { StoreProvider } from "./context/StoreContext";
import ProductManagement from "./components/products/ProductManagement";
import CustomerManagement from "./components/customers/CustomerManagement";
import SupplierManagement from "./components/suppliers/SupplierManagement";
import InventoryManagement from "./components/inventory/InventoryManagement";
import PurchaseManagement from "./components/purchases/PurchaseManagement";
import InvoiceSettings from "./components/settings/InvoiceSettings";
import SalesBilling from "./components/sales/SalesBilling";
import PaymentManagement from "./components/payments/PaymentManagement";
import StockTransferManagement from "./components/transfers/StockTransferManagement";
import ReturnManagement from "./components/returns/ReturnManagement";
import FinancialReporting from "./components/finance/FinancialReporting";
import Dashboard from "./components/dashboard/Dashboard";

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
  const { isAuthenticated } = useAuth();
  const Shell = isAuthenticated && !isVisualizer ? BusinessShell : React.Fragment;

  return (
    <>
      {!isVisualizer && !isAuthenticated && <Header />}
      <Shell>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/" element={<NewCollection />} />
        <Route path="/visualizer" element={<TileVisualizer />} />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/enquiry" element={<EnquiryForm />} />
        <Route path="/stores" element={<ProtectedRoute allowedUserTypes={["admin"]}><StoreManagement /></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute allowedUserTypes={["admin"]}><ProductManagement /></ProtectedRoute>} />
        <Route path="/customers" element={<ProtectedRoute allowedUserTypes={["admin", "salesperson"]}><CustomerManagement /></ProtectedRoute>} />
        <Route path="/customers/:id" element={<ProtectedRoute allowedUserTypes={["admin", "salesperson"]}><CustomerManagement /></ProtectedRoute>} />
        <Route path="/suppliers" element={<ProtectedRoute allowedUserTypes={["admin", "salesperson"]}><SupplierManagement /></ProtectedRoute>} />
        <Route path="/suppliers/:id" element={<ProtectedRoute allowedUserTypes={["admin", "salesperson"]}><SupplierManagement /></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute allowedUserTypes={["admin", "salesperson"]}><InventoryManagement /></ProtectedRoute>} />
        <Route path="/purchases" element={<ProtectedRoute allowedUserTypes={["admin", "salesperson"]}><PurchaseManagement /></ProtectedRoute>} />
        <Route path="/purchases/:id" element={<ProtectedRoute allowedUserTypes={["admin", "salesperson"]}><PurchaseManagement /></ProtectedRoute>} />
        <Route path="/settings/invoices" element={<ProtectedRoute allowedUserTypes={["admin", "salesperson"]}><InvoiceSettings /></ProtectedRoute>} />
        <Route path="/billing" element={<ProtectedRoute allowedUserTypes={["admin", "salesperson"]}><SalesBilling /></ProtectedRoute>} />
        <Route path="/sales/:id" element={<ProtectedRoute allowedUserTypes={["admin", "salesperson"]}><SalesBilling /></ProtectedRoute>} />
        <Route path="/payments" element={<ProtectedRoute allowedUserTypes={["admin", "salesperson"]}><PaymentManagement /></ProtectedRoute>} />
        <Route path="/transfers" element={<ProtectedRoute allowedUserTypes={["admin", "salesperson"]}><StockTransferManagement /></ProtectedRoute>} />
        <Route path="/transfers/:id" element={<ProtectedRoute allowedUserTypes={["admin", "salesperson"]}><StockTransferManagement /></ProtectedRoute>} />
        <Route path="/returns" element={<ProtectedRoute allowedUserTypes={["admin", "salesperson"]}><ReturnManagement /></ProtectedRoute>} />
        <Route path="/returns/:type/:id" element={<ProtectedRoute allowedUserTypes={["admin", "salesperson"]}><ReturnManagement /></ProtectedRoute>} />
        <Route path="/financial-reports" element={<ProtectedRoute allowedUserTypes={["admin", "salesperson"]}><FinancialReporting /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute allowedUserTypes={["admin", "salesperson"]}><Dashboard /></ProtectedRoute>} />
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
      </Shell>
      {!isVisualizer && !isAuthenticated && <Footer />}
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <Router>
          <AppContent />
        </Router>
      </StoreProvider>
    </AuthProvider>
  );
}

export default App;
