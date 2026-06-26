import "./App.css";
import MainPage from "./components/mainPage";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import BuilderVisitForm from "./components/real-Estate-form";
import CustForm from "./components/cust-login-form";
import LeadUserLogin from "./components/LeadUserLogin";
import LeadFormWrapper from "./components/LeadFormWrapper";
import RealestateLeadForm from "./components/RealestateLeadForm";
import AdminLeadUsers from "./components/AdminLeadUsers";
import VisitForm from "./components/VisitForm";

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/customer-login" element={<CustForm />} />
        <Route path="/lead-login" element={<LeadUserLogin />} />
        <Route path="/lead-form" element={<LeadFormWrapper />} />
        <Route path="/real-estate" element={<BuilderVisitForm />} />
        <Route path="/realestate-lead-form" element={<RealestateLeadForm />} />
        <Route path="/admin/lead-users" element={<AdminLeadUsers />} />
        <Route path="/visit-form" element={<VisitForm />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
