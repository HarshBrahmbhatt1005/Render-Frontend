import React from "react";
import { useNavigate } from "react-router-dom";
import "../css/MainPage.css"; // import external CSS

const MainPage = () => {
  const navigate = useNavigate();

  return (
    <div className="main-page">
      <h1 className="main-title">Welcome to MIS Integration</h1>

      <div className="button-container">
        <button
          onClick={() => navigate("/customer-login")}
          className="btn customer-btn"
        >
          Customer Login Form
        </button>

        <button
          onClick={() => navigate("/real-estate")}
          className="btn project-btn"
        >
          Project Login Form
        </button>
      </div>
    </div>
  );
};

export default MainPage;
