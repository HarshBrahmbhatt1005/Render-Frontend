import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import logo from "../assets/logo-header.png";
import "../css/AdminLeadUsers.css";

const API = import.meta.env.VITE_API_URL;

const FORM_LABELS = {
  realestate: "Real Estate",
  finance: "Finance",
};

const DEFAULT_MODULES = [
  { key: "realestate", label: "Real Estate" },
  { key: "finance", label: "Finance" },
];

const ACCESS_LABELS = {
  all: "All Leads Access",
  own: "Own Leads Only",
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN");
};

// ── Eye icons ──
const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

// Reusable password input with toggle
const PasswordInput = ({ value, onChange, placeholder = "Password", className = "alu-input", disabled = false }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="alu-pw-wrap">
      <input
        type={show ? "text" : "password"}
        className={`${className} alu-pw-input`}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        autoComplete="new-password"
      />
      <button
        type="button"
        className="alu-eye-btn"
        onClick={() => setShow((v) => !v)}
        tabIndex={-1}
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
};

const toggleListValue = (value, setter) => {
  setter((prev) =>
    prev.includes(value)
      ? prev.filter((item) => item !== value)
      : [...prev, value]
  );
};

const AdminLeadUsers = () => {
  // ── Auth state ──
  const [adminPassword, setAdminPassword] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // ── Users list ──
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [availableModules, setAvailableModules] = useState(DEFAULT_MODULES);

  // ── Create user form ──
  const [newUsername, setNewUsername] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newAllowedForms, setNewAllowedForms] = useState([]);
  const [newLeadAccessType, setNewLeadAccessType] = useState("own");
  const [newCanDownloadExcel, setNewCanDownloadExcel] = useState(false);
  const [newAssignedManager, setNewAssignedManager] = useState("");
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [creating, setCreating] = useState(false);

  // ── Edit user state ──
  const [editingUser, setEditingUser] = useState(null);
  const [editPassword, setEditPassword] = useState("");
  const [editAllowedForms, setEditAllowedForms] = useState([]);
  const [editLeadAccessType, setEditLeadAccessType] = useState("own");
  const [editCanDownloadExcel, setEditCanDownloadExcel] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editAssignedManager, setEditAssignedManager] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  // ── Delete confirm ──
  const [deletingId, setDeletingId] = useState(null);

  // User lead data modal
  const [dataUser, setDataUser] = useState(null);
  const [userLeads, setUserLeads] = useState([]);
  const [loadingUserLeads, setLoadingUserLeads] = useState(false);
  const [userLeadsError, setUserLeadsError] = useState("");
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [importError, setImportError] = useState("");
  const [importSummary, setImportSummary] = useState(null);

  const authHeaders = useCallback(
    () => ({ "x-admin-password": adminPassword }),
    [adminPassword]
  );

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await axios.get(`${API}/api/lead-users`, {
        headers: { "x-admin-password": adminPassword },
      });
      if (Array.isArray(res.data.modules) && res.data.modules.length > 0) {
        setAvailableModules(res.data.modules);
      }
      setUsers(res.data.users || []);
    } catch (err) {
      console.error("Fetch users error:", err);
    } finally {
      setLoadingUsers(false);
    }
  }, [adminPassword]);

  useEffect(() => {
    if (isAuthenticated) fetchUsers();
  }, [isAuthenticated, fetchUsers]);

  // ── Authenticate ──
  const handleAuth = async (e) => {
    e.preventDefault();
    const pwd = passwordInput.trim();
    if (!pwd) {
      setAuthError("Please enter the admin password.");
      return;
    }
    setAuthError("");
    setAuthLoading(true);
    try {
      // Verify by hitting the protected endpoint
      await axios.get(`${API}/api/lead-users`, {
        headers: { "x-admin-password": pwd },
      });
      // If we get here, password is correct
      setAdminPassword(pwd);
      setIsAuthenticated(true);
    } catch (err) {
      console.error("Admin auth error:", err?.response?.status, err?.response?.data);
      if (err?.response?.status === 401) {
        setAuthError("Incorrect admin password.");
      } else if (err?.response?.status === 404) {
        setAuthError("Backend not reachable. Please check the server is deployed.");
      } else {
        setAuthError(`Error: ${err?.response?.data?.message || err.message}`);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // ── Create user ──
  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError("");
    setCreateSuccess("");

    if (!newUsername.trim()) return setCreateError("Username is required.");
    if (!newPassword || newPassword.length < 4)
      return setCreateError("Password must be at least 4 characters.");
    if (newAllowedForms.length === 0)
      return setCreateError("Select at least one module.");

    setCreating(true);
    try {
      await axios.post(
        `${API}/api/lead-users`,
        {
          username: newUsername.trim().toLowerCase(),
          password: newPassword,
          displayName: newDisplayName.trim() || newUsername.trim(),
          allowedForms: newAllowedForms,
          allowedModules: newAllowedForms,
          assignedManager: newAssignedManager.trim(),
          leadAccessType: newLeadAccessType,
          rolePermissions: { canDownloadExcel: newCanDownloadExcel },
        },
        { headers: authHeaders() }
      );
      setCreateSuccess(`✅ User "${newUsername.trim()}" created successfully.`);
      setNewUsername("");
      setNewDisplayName("");
      setNewPassword("");
      setNewAllowedForms([]);
      setNewAssignedManager("");
      setNewCanDownloadExcel(false);
      setNewLeadAccessType("own");
      fetchUsers();
    } catch (err) {
      setCreateError(err?.response?.data?.message || "Failed to create user.");
    } finally {
      setCreating(false);
    }
  };

  // ── Open edit modal ──
  const openEdit = (user) => {
    setEditingUser(user);
    setEditPassword("");
    setEditAllowedForms([...(user.allowedModules || user.allowedForms || [])]);
    setEditLeadAccessType(user.leadAccessType || "own");
    setEditDisplayName(user.displayName || user.username);
    setEditAssignedManager(user.assignedManager || "");
    setEditCanDownloadExcel(!!(user.rolePermissions?.canDownloadExcel || user.canDownloadExcel));
    setEditActive(user.isActive);
    setEditError("");
    setEditSuccess("");
  };

  // ── Save edit ──
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setEditError("");
    setEditSuccess("");
    if (editAllowedForms.length === 0)
      return setEditError("Select at least one module.");
    if (editPassword && editPassword.length < 4)
      return setEditError("Password must be at least 4 characters.");

    setSaving(true);
    try {
      const payload = {
        allowedForms: editAllowedForms,
        allowedModules: editAllowedForms,
        leadAccessType: editLeadAccessType,
        displayName: editDisplayName.trim(),
        assignedManager: editAssignedManager.trim(),
        rolePermissions: { canDownloadExcel: editCanDownloadExcel },
        isActive: editActive,
      };
      if (editPassword) payload.password = editPassword;

      await axios.patch(
        `${API}/api/lead-users/${editingUser._id || editingUser.id}`,
        payload,
        { headers: authHeaders() }
      );
      setEditSuccess("✅ User updated.");
      fetchUsers();
      setTimeout(() => setEditingUser(null), 1200);
    } catch (err) {
      setEditError(err?.response?.data?.message || "Failed to update user.");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete user ──
  const handleDelete = async (userId, username) => {
    if (!window.confirm(`Delete user "${username}"? This cannot be undone.`))
      return;
    setDeletingId(userId);
    try {
      await axios.delete(`${API}/api/lead-users/${userId}`, {
        headers: authHeaders(),
      });
      fetchUsers();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to delete user.");
    } finally {
      setDeletingId(null);
    }
  };

  // ── Auth screen ──
  const handleViewUserData = async (user) => {
    const userId = user._id || user.id;
    setDataUser(user);
    setUserLeads([]);
    setUserLeadsError("");
    setLoadingUserLeads(true);

    try {
      const res = await axios.get(`${API}/api/lead-users/${userId}/leads`, {
        headers: authHeaders(),
      });
      setDataUser(res.data.user || user);
      setUserLeads(res.data.leads || []);
    } catch (err) {
      setUserLeadsError(err?.response?.data?.message || "Failed to fetch user data.");
    } finally {
      setLoadingUserLeads(false);
    }
  };

  const handleImportFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setImportFile(file);
    setImportError("");
    setImportMessage("");
    setImportSummary(null);
  };

  const handleImportLeads = async () => {
    if (!importFile) {
      setImportError("Please choose an Excel file first.");
      return;
    }

    if (!/\.(xlsx)$/i.test(importFile.name)) {
      setImportError("Please upload a .xlsx Excel file.");
      return;
    }

    setImportLoading(true);
    setImportError("");
    setImportMessage("");
    setImportSummary(null);

    try {
      const fileData = await importFile.arrayBuffer();
      const bytes = new Uint8Array(fileData);
      let binary = "";
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
      }
      const base64 = btoa(binary);

      const res = await axios.post(
        `${API}/api/realestate-leads/import`,
        {
          fileName: importFile.name,
          fileData: base64,
        },
        { headers: authHeaders() }
      );

      setImportSummary(res.data?.summary || null);
      setImportMessage(res.data?.message || "Import completed.");
      setImportFile(null);
      await fetchUsers();
    } catch (err) {
      setImportError(err?.response?.data?.message || "Failed to import Excel file.");
      setImportSummary(err?.response?.data?.summary || null);
    } finally {
      setImportLoading(false);
    }
  };

  const handleDownloadTemplate = async (templateType) => {
    try {
      const response = await axios.get(`${API}/api/realestate-leads/template/${templateType}`, {
        headers: authHeaders(),
        responseType: "blob",
      });

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = templateType === "finance" ? "finance-leads-template.xlsx" : "real-estate-leads-template.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setImportMessage(`${templateType === "finance" ? "Finance" : "Real Estate"} template downloaded.`);
      setImportError("");
    } catch (err) {
      setImportError(err?.response?.data?.message || "Failed to download template.");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="alu-root">
        <div className="alu-blob alu-blob-1" />
        <div className="alu-blob alu-blob-2" />
        <div className="alu-auth-card">
          <img src={logo} alt="Logo" className="alu-logo" />
          <h1 className="alu-auth-title">Admin Access</h1>
          <p className="alu-auth-sub">Lead User Management</p>
          <form onSubmit={handleAuth} className="alu-auth-form">
            <PasswordInput
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter admin password"
              disabled={authLoading}
            />
            {authError && <p className="alu-error">{authError}</p>}
            <button type="submit" className="alu-btn-primary" disabled={authLoading}>
              {authLoading ? "Verifying…" : "Unlock"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="alu-root">
      <div className="alu-blob alu-blob-1" />
      <div className="alu-blob alu-blob-2" />

      <div className="alu-page">
        {/* Header */}
        <div className="alu-header">
          <img src={logo} alt="Logo" className="alu-logo-sm" />
          <div>
            <h1 className="alu-page-title">Lead User Management</h1>
            <p className="alu-page-sub">Create and manage lead form users</p>
          </div>
        </div>

        {/* Create User Card */}
        <div className="alu-card">
          <h2 className="alu-card-title">➕ Create New User</h2>
          <form onSubmit={handleCreate} className="alu-create-form">
            <div className="alu-form-row">
              <div className="alu-field">
                <label className="alu-label">Username *</label>
                <input
                  type="text"
                  className="alu-input"
                  placeholder="e.g. john_doe"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                />
              </div>
              <div className="alu-field">
                <label className="alu-label">Display Name</label>
                <input
                  type="text"
                  className="alu-input"
                  placeholder="e.g. John Doe"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                />
              </div>
              <div className="alu-field">
                <label className="alu-label">Password *</label>
                <PasswordInput
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 4 characters"
                />
              </div>
            </div>

            <div className="alu-form-row">
              <div className="alu-field">
                <label className="alu-label">Lead Access Type *</label>
                <select
                  className="alu-input"
                  value={newLeadAccessType}
                  onChange={(e) => setNewLeadAccessType(e.target.value)}
                >
                  <option value="own">{ACCESS_LABELS.own}</option>
                  <option value="all">{ACCESS_LABELS.all}</option>
                </select>
              </div>
              <div className="alu-field">
                <label className="alu-label">Assigned Manager</label>
                <input
                  type="text"
                  className="alu-input"
                  placeholder="e.g. Hardik Bhavsar"
                  value={newAssignedManager}
                  onChange={(e) => setNewAssignedManager(e.target.value)}
                  title="Manager auto-filled in call records for this user"
                />
                <span className="alu-field-hint">Auto-filled in call records. Leave blank for free selection.</span>
              </div>
            </div>

            <div className="alu-field">
              <label className="alu-label">Permissions</label>
              <div className="alu-checkbox-row">
                <label className="alu-checkbox-label">
                  <input
                    type="checkbox"
                    checked={newCanDownloadExcel}
                    onChange={(e) => setNewCanDownloadExcel(e.target.checked)}
                  />
                  Can Download Excel
                </label>
              </div>
            </div>

            <div className="alu-field">
              <label className="alu-label">Module Access *</label>
              <div className="alu-checkbox-row">
                {availableModules.map((module) => (
                  <label key={module.key} className="alu-checkbox-label">
                    <input
                      type="checkbox"
                      checked={newAllowedForms.includes(module.key)}
                      onChange={() => toggleListValue(module.key, setNewAllowedForms)}
                    />
                    {module.label}
                  </label>
                ))}
              </div>
            </div>

            {createError && <p className="alu-error">{createError}</p>}
            {createSuccess && <p className="alu-success">{createSuccess}</p>}

            <button type="submit" className="alu-btn-primary" disabled={creating}>
              {creating ? "Creating…" : "Create User"}
            </button>
          </form>
        </div>

        <div className="alu-card">
          <div className="alu-card-title-row">
            <h2 className="alu-card-title">Lead Excel Import</h2>
          </div>

          <p className="alu-field-hint">
            Download the correct template first, fill only the matching module fields, then upload the `.xlsx` file. Existing duplicate leads will be skipped.
          </p>

          <div className="alu-option-actions" style={{ marginTop: "12px", flexWrap: "wrap", gap: "12px" }}>
            <button type="button" className="alu-btn-secondary" onClick={() => handleDownloadTemplate("realestate")}>
              Download Real Estate Template
            </button>
            <button type="button" className="alu-btn-secondary" onClick={() => handleDownloadTemplate("finance")}>
              Download Finance Template
            </button>
          </div>

          <div className="alu-field" style={{ marginTop: "16px" }}>
            <label className="alu-label">Excel File</label>
            <input
              type="file"
              className="alu-input"
              accept=".xlsx"
              onChange={handleImportFileChange}
              disabled={importLoading}
            />
            <span className="alu-field-hint">
              Required columns: leadDate, customerName, customerNumber, source. Leave unused cells blank.
            </span>
          </div>

          <div className="alu-option-actions" style={{ marginTop: "12px" }}>
            <button
              type="button"
              className="alu-btn-primary"
              onClick={handleImportLeads}
              disabled={importLoading}
            >
              {importLoading ? "Importing…" : "Import Excel"}
            </button>
          </div>

          {importMessage && <p className="alu-success">{importMessage}</p>}
          {importError && <p className="alu-error">{importError}</p>}

          {importSummary && (
            <div className="alu-lead-grid" style={{ marginTop: "16px" }}>
              <span><strong>File:</strong> {importSummary.fileName || importFile?.name || "-"}</span>
              <span><strong>Total Rows:</strong> {importSummary.totalRows ?? 0}</span>
              <span><strong>Inserted:</strong> {importSummary.inserted ?? 0}</span>
              <span><strong>Skipped:</strong> {importSummary.skipped ?? 0}</span>
              <span><strong>Failed:</strong> {importSummary.failed ?? 0}</span>
            </div>
          )}

          {importSummary?.errors?.length > 0 && (
            <div className="alu-call-history" style={{ marginTop: "16px" }}>
              <strong>Import Details</strong>
              <div style={{ display: "grid", gap: "8px", marginTop: "10px" }}>
                {importSummary.errors.map((item, idx) => (
                  <div key={`${item.row}-${idx}`} className="alu-call-row">
                    <span>Row {item.row}</span>
                    <span>{item.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Users List */}
        <div className="alu-card">
          <div className="alu-card-title-row">
            <h2 className="alu-card-title">👥 Existing Users</h2>
            <button className="alu-btn-refresh" onClick={fetchUsers}>
              ↻ Refresh
            </button>
          </div>

          {loadingUsers ? (
            <p className="alu-loading">Loading users…</p>
          ) : users.length === 0 ? (
            <p className="alu-empty">No users created yet.</p>
          ) : (
            <div className="alu-table-wrap">
              <table className="alu-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Display Name</th>
                    <th>Assigned Manager</th>
                    <th>Lead Access</th>
                    <th>Modules</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id || user.id} className={!user.isActive ? "alu-row-inactive" : ""}>
                      <td className="alu-td-username">{user.username}</td>
                      <td>{user.displayName || "—"}</td>
                      <td>
                        {user.assignedManager
                          ? <span className="alu-manager-tag">{user.assignedManager}</span>
                          : <span className="alu-td-muted">Free select</span>}
                      </td>
                      <td>{ACCESS_LABELS[user.leadAccessType || "own"]}</td>
                      <td>
                        <div className="alu-badges">
                          {(user.allowedModules || user.allowedForms || []).map((f) => (
                            <span key={f} className={`alu-badge alu-badge-${f}`}>
                              {FORM_LABELS[f] || f}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span className={`alu-status ${user.isActive ? "alu-status-active" : "alu-status-inactive"}`}>
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="alu-td-date">
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString("en-IN")
                          : "—"}
                      </td>
                      <td>
                        <div className="alu-action-btns">
                          <button className="alu-btn-data" onClick={() => handleViewUserData(user)}>
                            View Data
                          </button>
                          <button className="alu-btn-edit" onClick={() => openEdit(user)}>
                            Edit
                          </button>
                          <button
                            className="alu-btn-delete"
                            onClick={() => handleDelete(user._id || user.id, user.username)}
                            disabled={deletingId === (user._id || user.id)}
                          >
                            {deletingId === (user._id || user.id) ? "…" : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* User Data Modal */}
      {dataUser && (
        <div className="alu-modal-overlay" onClick={() => setDataUser(null)}>
          <div className="alu-data-modal" onClick={(e) => e.stopPropagation()}>
            <div className="alu-modal-header">
              <div>
                <h3 className="alu-modal-title">User Data: {dataUser.displayName || dataUser.username}</h3>
                <p className="alu-modal-sub">
                  {dataUser.username} - {userLeads.length} submitted lead{userLeads.length === 1 ? "" : "s"}
                </p>
              </div>
              <button className="alu-modal-close" onClick={() => setDataUser(null)}>X</button>
            </div>

            {loadingUserLeads ? (
              <p className="alu-loading">Loading user data...</p>
            ) : userLeadsError ? (
              <p className="alu-error">{userLeadsError}</p>
            ) : userLeads.length === 0 ? (
              <p className="alu-empty">No leads submitted by this user yet.</p>
            ) : (
              <div className="alu-lead-list">
                {userLeads.map((lead) => (
                  <div className="alu-lead-card" key={lead._id || lead.id}>
                    <div className="alu-lead-card-head">
                      <div>
                        <h4>{lead.customerName || "Unnamed Customer"}</h4>
                        <p>{lead.customerNumber || "-"}</p>
                      </div>
                      <span className={`alu-badge alu-badge-${lead.leadType || "realestate"}`}>
                        {FORM_LABELS[lead.leadType] || lead.leadType || "Real Estate"}
                      </span>
                    </div>

                    <div className="alu-lead-grid">
                      <span><strong>Lead Date:</strong> {formatDate(lead.leadDate)}</span>
                      <span><strong>Source:</strong> {lead.source || "-"}</span>
                      <span><strong>Project:</strong> {lead.projectName || "-"}</span>
                      <span><strong>Reference:</strong> {lead.referenceOf || "-"}</span>
                      <span><strong>Property:</strong> {lead.propertyType || "-"}</span>
                      <span><strong>Budget:</strong> {lead.budget || "-"}</span>
                      <span><strong>Area:</strong> {lead.preferredArea || "-"}</span>
                      <span><strong>Size:</strong> {lead.residentialSize || "-"}</span>
                      <span><strong>Category:</strong> {lead.residentialCategory || "-"}</span>
                      <span><strong>Commercial:</strong> {lead.commercialType || "-"}</span>
                      <span><strong>Finance Product:</strong> {lead.financeProduct || "-"}</span>
                      <span><strong>Loan Amount:</strong> {lead.loanAmount || "-"}</span>
                      <span><strong>Passed On:</strong> {lead.passedOn || "-"}</span>
                      <span><strong>Created:</strong> {formatDate(lead.createdAt)}</span>
                    </div>

                    <div className="alu-call-history">
                      <strong>Call History</strong>
                      {(lead.calls || []).length === 0 ? (
                        <p>No calls recorded.</p>
                      ) : (
                        (lead.calls || []).map((call, idx) => (
                          <div className="alu-call-row" key={call._id || idx}>
                            <span>{formatDate(call.callingDate)}</span>
                            <span>{call.manager || "-"}</span>
                            <span>{call.status || "-"}</span>
                            <span>{call.remarks || "-"}</span>
                            <span>Follow-up: {formatDate(call.followUpDate)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingUser && (
        <div className="alu-modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="alu-modal" onClick={(e) => e.stopPropagation()}>
            <div className="alu-modal-header">
              <h3 className="alu-modal-title">Edit User: {editingUser.username}</h3>
              <button className="alu-modal-close" onClick={() => setEditingUser(null)}>✕</button>
            </div>

            <form onSubmit={handleSaveEdit} className="alu-modal-form">
              <div className="alu-field">
                <label className="alu-label">Display Name</label>
                <input
                  type="text"
                  className="alu-input"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                />
              </div>

              <div className="alu-field">
                <label className="alu-label">New Password (leave blank to keep current)</label>
                <PasswordInput
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>

              <div className="alu-field">
                <label className="alu-label">Lead Access Type *</label>
                <select
                  className="alu-input"
                  value={editLeadAccessType}
                  onChange={(e) => setEditLeadAccessType(e.target.value)}
                >
                  <option value="own">{ACCESS_LABELS.own}</option>
                  <option value="all">{ACCESS_LABELS.all}</option>
                </select>
              </div>

              <div className="alu-field">
                <label className="alu-label">Assigned Manager</label>
                <input
                  type="text"
                  className="alu-input"
                  placeholder="e.g. Hardik Bhavsar"
                  value={editAssignedManager}
                  onChange={(e) => setEditAssignedManager(e.target.value)}
                  title="Manager auto-filled in call records for this user"
                />
                <span className="alu-field-hint">Auto-filled in call records. Leave blank for free selection.</span>
              </div>

              <div className="alu-field">
                <label className="alu-label">Permissions</label>
                <div className="alu-checkbox-row">
                  <label className="alu-checkbox-label">
                    <input
                      type="checkbox"
                      checked={editCanDownloadExcel}
                      onChange={(e) => setEditCanDownloadExcel(e.target.checked)}
                    />
                    Can Download Excel
                  </label>
                </div>
              </div>

              <div className="alu-field">
                <label className="alu-label">Module Access *</label>
                <div className="alu-checkbox-row">
                  {availableModules.map((module) => (
                    <label key={module.key} className="alu-checkbox-label">
                      <input
                        type="checkbox"
                        checked={editAllowedForms.includes(module.key)}
                        onChange={() => toggleListValue(module.key, setEditAllowedForms)}
                      />
                      {module.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="alu-field">
                <label className="alu-label">Account Status</label>
                <div className="alu-checkbox-row">
                  <label className="alu-checkbox-label">
                    <input
                      type="checkbox"
                      checked={editActive}
                      onChange={(e) => setEditActive(e.target.checked)}
                    />
                    Active
                  </label>
                </div>
              </div>

              {editError && <p className="alu-error">{editError}</p>}
              {editSuccess && <p className="alu-success">{editSuccess}</p>}

              <div className="alu-modal-actions">
                <button type="button" className="alu-btn-cancel" onClick={() => setEditingUser(null)}>
                  Cancel
                </button>
                <button type="submit" className="alu-btn-primary" disabled={saving}>
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLeadUsers;
