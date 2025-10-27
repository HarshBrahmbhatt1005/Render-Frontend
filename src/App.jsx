import "./App.css";
import MainPage from "./components/mainPage";
import {  HashRouter, Route, Router, Routes } from "react-router-dom";
import BuilderVisitForm from "./components/real-Estate-form";
import CustForm from "./components/cust-login-form";

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/customer-login" element={<CustForm />} />
        <Route path="/real-estate" element={<BuilderVisitForm />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
