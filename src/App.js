import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import OnlineStore from "./components/OnlineStore";
import ContactUs from "./components/ContactUs";
import NewCollection from "./components/NewCollection";
import Auth from "./components/Auth";
import { PointsManagement } from "./components/Points";
import Footer from "./components/footer/Footer";

function App() {
  return (
    <Router>
      <Header />
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/" element={<NewCollection />} />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/points" element={<PointsManagement />} />
      </Routes>
      <Footer/>
    </Router>
  );
}

export default App;
