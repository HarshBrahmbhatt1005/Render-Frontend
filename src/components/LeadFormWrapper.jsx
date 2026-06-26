import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import RealestateLeadForm from "./RealestateLeadForm";

const API = import.meta.env.VITE_API_URL;

/**
 * Wraps the RealestateLeadForm for lead users.
 * - Checks the server-managed session cookie
 * - Redirects to /lead-login if not authenticated
 * - Passes safe user context to the form
 */
const LeadFormWrapper = () => {
  const navigate = useNavigate();
  const [leadUser, setLeadUser] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const checkSession = async () => {
      localStorage.removeItem("leadUser");

      try {
        const res = await axios.get(`${API}/api/lead-users/me`, {
          withCredentials: true,
        });

        const user = res.data?.user;
        if (!user?.id || !(user?.allowedModules || user?.allowedForms)) {
          throw new Error("Invalid session response");
        }

        if (!cancelled) {
          setLeadUser(user);
          setChecked(true);
        }
      } catch {
        if (!cancelled) {
          navigate("/lead-login", { replace: true });
          setChecked(true);
        }
      }
    };

    checkSession();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await axios.post(`${API}/api/lead-users/logout`, {}, { withCredentials: true });
    } catch (err) {
      console.error("Logout error:", err?.response?.data || err.message);
    }

    localStorage.removeItem("leadUser");
    navigate("/lead-login", { replace: true });
  };

  if (!checked || !leadUser) return null;

  return (
    <RealestateLeadForm
      leadUser={leadUser}
      onLogout={handleLogout}
    />
  );
};

export default LeadFormWrapper;
