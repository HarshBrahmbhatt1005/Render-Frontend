import { useNavigate } from "react-router-dom";
import "../css/MainPage.css";
import logo from "../assets/logo-header.png";

const CARDS = [
  {
    route: "/customer-login",
    icon: "👤",
    title: "Customer Login",
    desc: "Access and manage customer login records",
    accent: "#6c3fc5",
    light: "#f3eeff",
  },
  {
    route: "/real-estate",
    icon: "🏗️",
    title: "Project Login",
    desc: "Submit and track builder project visits",
    accent: "#0e7490",
    light: "#e0f7fa",
  },
  {
    route: "/realestate-lead-form",
    icon: "📋",
    title: "Lead Form",
    desc: "Capture real estate & finance leads",
    accent: "#0f6b3a",
    light: "#e6f9f0",
  },
  {
    route: "/admin/lead-users",
    icon: "🔐",
    title: "Admin Leads",
    desc: "Manage lead users, options, and Excel import",
    accent: "#9a3412",
    light: "#fff1e6",
  },
  {
    route: "/visit-form",
    icon: "🤝",
    title: "Visit Data",
    desc: "Record and manage client visit details",
    accent: "#2196f3",
    light: "#fdfaf5",
  },
];

const MainPage = () => {
  const navigate = useNavigate();

  return (
    <div className="mp-root">
      {/* Background blobs */}
      <div className="mp-blob mp-blob-1" />
      <div className="mp-blob mp-blob-2" />

      <div className="mp-content">
        {/* Header */}
        <div className="mp-header">
          <img src={logo} alt="Company Logo" className="mp-logo" />
          <div className="mp-header-text">
            <h1 className="mp-title">MIS Portal</h1>
            <p className="mp-subtitle">Management Information System</p>
          </div>
        </div>

        <p className="mp-welcome">Select a module to get started</p>

        {/* Cards */}
        <div className="mp-cards">
          {CARDS.map((card) => (
            <button
              key={card.route}
              className="mp-card"
              onClick={() => navigate(card.route)}
              style={{ "--accent": card.accent, "--light": card.light }}
            >
              <div className="mp-card-icon">{card.icon}</div>
              <div className="mp-card-body">
                <span className="mp-card-title">{card.title}</span>
                <span className="mp-card-desc">{card.desc}</span>
              </div>
              <span className="mp-card-arrow">→</span>
            </button>
          ))}
        </div>

        <p className="mp-footer">© {new Date().getFullYear()} · All rights reserved</p>
      </div>
    </div>
  );
};

export default MainPage;
