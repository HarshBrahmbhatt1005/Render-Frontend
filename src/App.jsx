import "./App.css";
import MainPage from "./components/mainPage";
import {  BrowserRouter, Route, Router, Routes } from "react-router-dom";
import BuilderVisitForm from "./components/real-Estate-form";
import CustForm from "./components/cust-login-form";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/customer-login" element={<CustForm />} />
        <Route path="/real-estate" element={<BuilderVisitForm />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
