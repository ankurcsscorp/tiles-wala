import {Alert} from '@mui/material';
import UserManagement from './components/users/UserManagement';
import {hasPermission} from './utils/permissions';
import {permissionForPath} from './utils/accessRoutes';
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
import DealerProducts from './components/dealer/DealerProducts';
import DealerCart from './components/dealer/DealerCart';
import DealerCheckout from './components/dealer/DealerCheckout';
import DealerOrders from './components/dealer/DealerOrders';
import AdminDealerPayments from './components/dealer/AdminDealerPayments';
import AdminDealerOrders from './components/dealer/AdminDealerOrders';
import DealerDashboard from './components/dealer/DealerDashboard';
import DealerLedger from './components/dealer/DealerLedger';
import DealerAccount from './components/dealer/DealerAccount';
import AdminDealerReports from './components/dealer/AdminDealerReports';
import { DealerCartProvider } from './context/DealerCartContext';

const ProtectedRoute = ({ allowedUserTypes, children }) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  const userType = user.userType.toLowerCase();
  const permission=permissionForPath(location.pathname);
  const allowed=permission&&user.permissions?hasPermission(user,permission):allowedUserTypes.includes(userType);
  if (!allowed) {
    const homePath =
      userType === "admin" || userType === "salesperson"
        ? "/enquiry-management"
        : "/";
    return <Navigate to={permission?'/' :homePath} replace />;
  }

  const manage=permission?.replace(/\.view$/,'.manage');
  return <>{manage&&user.permissions&&Object.prototype.hasOwnProperty.call(user.permissions,manage)&&!hasPermission(user,manage)&&<Alert severity="info" sx={{m:2}}>View-only access. Your administrator has not granted permission to make changes in this module.</Alert>}{children}</>;
};

const AppContent = () => {
  const location = useLocation();
  const isVisualizer = location.pathname === "/visualizer";
  const { isAuthenticated, user } = useAuth();
  const Shell = isAuthenticated && !isVisualizer ? BusinessShell : React.Fragment;

  return (
    <>
      {!isVisualizer && !isAuthenticated && <Header />}
      <Shell>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/" element={<NewCollection />} />
        <Route path="/dealer/dashboard" element={<ProtectedRoute allowedUserTypes={["dealer"]}><DealerDashboard /></ProtectedRoute>} />
        <Route path="/dealer/products" element={<ProtectedRoute allowedUserTypes={["dealer"]}><DealerProducts /></ProtectedRoute>} />
        <Route path="/dealer/cart" element={<ProtectedRoute allowedUserTypes={["dealer"]}><DealerCart /></ProtectedRoute>} />
        <Route path="/dealer/checkout" element={<ProtectedRoute allowedUserTypes={["dealer"]}><DealerCheckout /></ProtectedRoute>} />
        <Route path="/dealer/orders" element={<ProtectedRoute allowedUserTypes={["dealer"]}><DealerOrders /></ProtectedRoute>} />
        <Route path="/dealer/quotations" element={<ProtectedRoute allowedUserTypes={["dealer"]}><DealerAccount view="quotations" /></ProtectedRoute>} />
        <Route path="/dealer/invoices" element={<ProtectedRoute allowedUserTypes={["dealer"]}><DealerAccount view="invoices" /></ProtectedRoute>} />
        <Route path="/dealer/my-payments" element={<ProtectedRoute allowedUserTypes={["dealer"]}><DealerAccount view="payments" /></ProtectedRoute>} />
        <Route path="/dealer/ledger" element={<ProtectedRoute allowedUserTypes={["dealer"]}><DealerLedger /></ProtectedRoute>} />
        <Route path="/dealer/profile" element={<ProtectedRoute allowedUserTypes={["dealer"]}><DealerAccount view="profile" /></ProtectedRoute>} />
        <Route path="/dealer/payments" element={<ProtectedRoute allowedUserTypes={["admin"]}><AdminDealerPayments /></ProtectedRoute>} />
        <Route path="/dealer/orders/manage" element={<ProtectedRoute allowedUserTypes={["admin"]}><AdminDealerOrders /></ProtectedRoute>} />
        <Route path="/dealer/reports" element={<ProtectedRoute allowedUserTypes={["admin"]}><AdminDealerReports /></ProtectedRoute>} />
        <Route path="/visualizer" element={<TileVisualizer />} />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/enquiry" element={<EnquiryForm />} />
        <Route path="/users" element={<ProtectedRoute allowedUserTypes={["admin"]}><UserManagement /></ProtectedRoute>} />
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
        <Route path="/returns/:type/new" element={<ProtectedRoute allowedUserTypes={["admin", "salesperson"]}><ReturnManagement /></ProtectedRoute>} />
        <Route path="/returns/:type/:id/edit" element={<ProtectedRoute allowedUserTypes={["admin", "salesperson"]}><ReturnManagement /></ProtectedRoute>} />
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
        <DealerCartProvider>
          <Router>
            <AppContent />
          </Router>
        </DealerCartProvider>
      </StoreProvider>
    </AuthProvider>
  );
}

export default App;
