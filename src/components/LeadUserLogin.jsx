import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo-header.png";
import "../css/LeadUserLogin.css";

const API = import.meta.env.VITE_API_URL;

// Eye icons as inline SVG — no extra dependency needed
const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const LeadUserLogin = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("Please enter your username.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(
        `${API}/api/lead-users/login`,
        {
          username: username.trim().toLowerCase(),
          password: password,
        },
        { withCredentials: true }
      );

      if (res.data.success) {
        localStorage.removeItem("leadUser");
        navigate("/lead-form");
      } else {
        setError("Invalid username or password.");
      }
    } catch (err) {
      console.error("Login error:", err?.response?.data);
      const msg =
        err?.response?.data?.message ||
        "Login failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lul-root">
      <div className="lul-blob lul-blob-1" />
      <div className="lul-blob lul-blob-2" />

      <div className="lul-card">
        <div className="lul-header">
          <img src={logo} alt="Logo" className="lul-logo" />
          <h1 className="lul-title">Lead Login Form</h1>
          <p className="lul-subtitle">Sign in to access your lead form</p>
        </div>

        <form onSubmit={handleSubmit} className="lul-form" noValidate>
          {/* Username */}
          <div className="lul-field">
            <label className="lul-label">Username</label>
            <input
              type="text"
              className="lul-input"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              disabled={loading}
              autoFocus
            />
          </div>

          {/* Password with toggle */}
          <div className="lul-field">
            <label className="lul-label">Password</label>
            <div className="lul-password-wrap">
              <input
                type={showPassword ? "text" : "password"}
                className="lul-input lul-input-pw"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                className="lul-eye-btn"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {error && <p className="lul-error">{error}</p>}

          <button type="submit" className="lul-btn" disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LeadUserLogin;
