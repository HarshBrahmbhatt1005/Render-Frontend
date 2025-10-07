import React, { useEffect, useState } from "react";
import "./Form.css";
import { FaCloudDownloadAlt } from "react-icons/fa";
import axios from "axios";

const Form = () => {
  const API = "https://render-backend-5sur.onrender.com"; // Your backend URL

  const [formData, setFormData] = useState({
    code: "",
    otherCode: "",
    name: "",
    mobile: "",
    email: "",
    product: "",
    otherProduct: "",
    amount: "",
    bank: "",
    otherBank: "",
    bankerName: "",
    status: "",
    loginDate: "",
    sales: "",
    ref: "",
    sourceChannel: "",
    remark: "",
    approvalStatus: "",
  });

  const [applications, setApplications] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    sales: "",
    status: "",
  });
  const [refFilter, setRefFilter] = useState("");
  const [importantChangeMsg, setImportantChangeMsg] = useState("");
  const [resetApproval, setResetApproval] = useState(false);

  const importantFields = ["amount", "bank", "product"];

  // Fetch all applications
  const fetchApplications = async () => {
    try {
      const res = await axios.get(`${API}/api/applications`);
      setApplications(res.data);
    } catch (err) {
      console.error("Error fetching applications:", err);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  // Mask mobile numbers
  const maskMobile = (mobile) => (mobile ? "XXXXXX" + mobile.slice(-4) : "");

  // Filtered applications
  const filteredApps = applications.filter((app) => {
    const appDate = new Date(app.loginDate);
    const from = filters.fromDate ? new Date(filters.fromDate) : null;
    const to = filters.toDate ? new Date(filters.toDate) : null;

    if (from && appDate < from) return false;
    if (to && appDate > to) return false;
    if (filters.sales && app.sales !== filters.sales) return false;
    if (filters.status && app.status !== filters.status) return false;

    return true;
  });

  // Handle form input change
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "mobile") {
      const onlyNums = value.replace(/[^0-9]/g, "");
      if (onlyNums.length <= 10)
        setFormData((prev) => ({ ...prev, [name]: onlyNums }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    // if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    //   alert("Please enter a valid email address.");
    //   return;
    // }
    if (formData.mobile && formData.mobile.length !== 10) {
      alert("Mobile number must be exactly 10 digits.");
      return;
    }

    // Check important fields for editing
    let resetApprovalLocal = false;
    let changedFields = [];

    if (editingId) {
      const originalApp = applications.find((app) => app._id === editingId);
      importantFields.forEach((field) => {
        if (formData[field] !== originalApp[field]) {
          resetApprovalLocal = true;
          changedFields.push(field);
        }
      });
    }

    if (resetApprovalLocal) {
      setResetApproval(true);
      setImportantChangeMsg(
        `⚠️ Important field changed (${changedFields.join(
          ", "
        )}), re-approval required.`
      );
    } else {
      setResetApproval(false);
      setImportantChangeMsg("");
    }

    const finalData = {
      ...formData,
      code: formData.code === "Other" ? formData.otherCode : formData.code,
      product:
        formData.product === "Other" ? formData.otherProduct : formData.product,
      bank: formData.bank === "Other" ? formData.otherBank : formData.bank,
      approvalStatus: resetApprovalLocal ? "" : formData.approvalStatus,
    };

    try {
      if (editingId) {
        await axios.patch(`${API}/api/applications/${editingId}`, finalData);
        alert("Application updated!");
      } else {
        await axios.post(`${API}/api/applications`, finalData);
        alert("Application saved!");
      }
      setFormData({
        code: "",
        otherCode: "",
        name: "",
        mobile: "",
        email: "",
        product: "",
        otherProduct: "",
        amount: "",
        bank: "",
        otherBank: "",
        bankerName: "",
        status: "",
        loginDate: "",
        sales: "",
        ref: "",
        sourceChannel: "",
        remark: "",
        approvalStatus: "",
      });
      setEditingId(null);
      setImportantChangeMsg("");
      setResetApproval(false);
      fetchApplications();
    } catch (err) {
      console.error("Error saving application:", err);
      alert("Failed to save form.");
    }
  };

  // Edit application
  const handleEdit = (app) => {
    setEditingId(app._id);
    setFormData({ ...app, approvalStatus: "", status: app.status || "" });
    setImportantChangeMsg("");
    setResetApproval(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Approve / Reject functions
  const handleApprove = async (id) => {
    const password = prompt("Enter approval password:");
    if (!password) return;

    try {
      await axios.patch(`${API}/api/applications/${id}/approve`, { password });
      alert("✅ Approved successfully!");
      fetchApplications();
    } catch (err) {
      console.error(err);
      alert("Approval failed. Wrong password or server error.");
    }
  };

  const handleReject = async (id) => {
    const password = prompt("Enter approval password:");
    if (!password) return;

    try {
      await axios.patch(`${API}/api/applications/${id}/reject`, { password });
      alert("❌ Rejected successfully!");
      fetchApplications();
    } catch (err) {
      console.error(err);
      alert("Rejection failed. Wrong password or server error.");
    }
  };

  // Excel download
  const handleExcelDownload = async () => {
    const password = prompt("Enter download password:");
    if (!password) return;

    try {
      const response = await axios.get(`${API}/api/export/excel`, {
        params: { password },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `applications_All.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert("Export failed: " + (err.response?.data?.error || err.message));
    }
  };

  const handleExportRef = async () => {
    if (!refFilter) {
      alert("Select a Sales to download Excel.");
      return;
    }
    const password = prompt(`Enter password for ${refFilter}:`);
    if (!password) return;

    try {
      const response = await axios.get(`${API}/api/export/excel`, {
        params: { password, ref: refFilter },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `applications_${refFilter}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert("Export failed: " + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="form-container">
      <h2 className="form-title">MIS Integration Form</h2>
      <form onSubmit={handleSubmit}>
        {/* Code */} <label>Code</label>
        <select name="code" value={formData.code} onChange={handleChange}>
          <option value="">Select Code</option>
          <option value="Sai Fakira">SAI FAKIRA</option>
          <option value="Aadrika">AADRIKA</option>
          <option value="Other">Other</option>
        </select>
        {/* If "Other" selected, show input field */}
        {formData.code === "Other" && (
          <input
            type="text"
            name="otherCode"
            placeholder="Enter Other Code"
            value={formData.otherCode || ""}
            onChange={handleChange}
          />
        )}
        {/* Name */} <label>Name</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Enter your name"
          required
        />
        {/* Mobile */} <label>Mobile No</label>
        <input
          type="tel"
          name="mobile"
          placeholder="Enter 10 Digit Mobile"
          value={formData.mobile}
          onChange={handleChange}
        />
        {/* Email */} <label>Email</label>
        <input
          type="email"
          name="email"
          placeholder="Enter Email"
          value={formData.email}
          onChange={handleChange}
        />
        {/* Product */} <label>Product</label>
        <select name="product" value={formData.product} onChange={handleChange}>
          <option value="">Select Product</option>
          <option value="Home Loan">HL</option> <option value="LAP">LAP</option>
          <option value="Top Up">TOP UP</option>
          <option value="Cum Pur">CUM PUR</option>
          <option value="HL Top Up">HL TOP UP</option>
          <option value="Lap Top Up">LAP TOP UP</option>
          <option value="LRD Pur">LRD PUR</option>
          <option value="Land PUR">LAND PUR</option>
          <option value="HL BT + TOP Up">HL BT + TOP UP</option>
          <option value="PLOT + CONSTRUCTION">PLOT + CONSTRUCTION</option>
          <option value="RESI LAP">RESI LAP</option>
          <option value="Other">Other</option>
        </select>
        {formData.product === "Other" && (
          <input
            type="text"
            placeholder="Enter Product"
            value={formData.otherProduct}
            onChange={(e) =>
              setFormData({ ...formData, otherProduct: e.target.value })
            }
          />
        )}
        <br />
        {/* Loan Amount */} <label>Req Loan Amt</label>
        <input
          type="number"
          name="amount"
          placeholder="Enter Amount"
          value={formData.amount}
          onChange={handleChange}
        />
        {/* Bank */} <label>Bank</label>
        <select name="bank" value={formData.bank} onChange={handleChange}>
          <option value="">Select Bank</option>
          <option value="HDFC">HDFC</option>
          <option value="ICICI">ICICI</option>
          <option value="Aaditya Birla">Aaditya Birla</option>
          <option value="Aavas Finance">Aavas Finance</option>
          <option value="Aadhar Housing">Aadhar Housing</option>
          <option value="Axis">Axis</option> <option value="BOB">BOB</option>
          <option value="IDFC">IDFC</option> <option value="IDBI">IDBI</option>
          <option value="KOTAK">KOTAK</option> <option value="YES">YES</option>
          <option value="SMFG">SMFG</option>
          <option value="Other">Other</option>
        </select>
        {formData.bank === "Other" && (
          <input
            type="text"
            placeholder="Enter Bank"
            value={formData.otherBank}
            onChange={(e) =>
              setFormData({ ...formData, otherBank: e.target.value })
            }
          />
        )}
        <br />
        {/* Banker Name */} <label>Banker Name</label>
        <input
          name="bankerName"
          placeholder="Enter Banker Name"
          value={formData.bankerName}
          onChange={handleChange}
        ></input>
        {/* Status */} <label>Status</label>
        <div className="radio-group">
          <label>
            <input
              className="sales-radio"
              type="radio"
              name="status"
              value="Login"
              checked={formData.status === "Login"}
              onChange={handleChange}
            />
            Login
          </label>
          <label>
            <input
              className="sales-radio"
              type="radio"
              name="status"
              value="Sanction"
              checked={formData.status === "Sanction"}
              onChange={handleChange}
            />
            Sanction
          </label>
          <label>
            <input
              className="sales-radio"
              type="radio"
              name="status"
              value="Disbursed"
              checked={formData.status === "Disbursed"}
              onChange={handleChange}
            />
            Disbursed
          </label>
          <label>
            <input
              className="sales-radio"
              type="radio"
              name="status"
              value="Part Disbursed"
              checked={formData.status === "Part Disbursed"}
              onChange={handleChange}
            />
            Part Disbursed
          </label>
          <label>
            <input
              className="sales-radio"
              type="radio"
              name="status"
              value="Re-Login"
              checked={formData.status === "Re-Login"}
              onChange={handleChange}
            />
            Re-Login
          </label>
          <label>
            <input
              className="sales-radio"
              type="radio"
              name="status"
              value="Rejected"
              checked={formData.status === "Rejected"}
              onChange={handleChange}
            />
            Rejected
          </label>
        </div>
        {/* Login Date */} <label>Login Date</label>
        <input
          type="date"
          name="loginDate"
          value={formData.loginDate}
          onChange={handleChange}
        />
        {/* Sales */} <label>Sales</label>
        <div className="radio-group">
          <label>
            <input
              className="sales-radio"
              type="radio"
              name="sales"
              value="Vinay Mishra"
              checked={formData.sales === "Vinay Mishra"}
              onChange={handleChange}
            />
            Vinay Mishra
          </label>
          <label>
            <input
              className="sales-radio"
              type="radio"
              name="sales"
              value="Robins Kapadia"
              checked={formData.sales === "Robins Kapadia"}
              onChange={handleChange}
            />
            Robins Kapadia
          </label>
          <label>
            <input
              className="sales-radio"
              type="radio"
              name="sales"
              value="Dharmesh Bhavsar"
              checked={formData.sales === "Dharmesh Bhavsar"}
              onChange={handleChange}
            />
            Dharmesh Bhavsar
          </label>
          <label>
            <input
              className="sales-radio"
              type="radio"
              name="sales"
              value="Hardik Bhavsar"
              checked={formData.sales === "Hardik Bhavsar"}
              onChange={handleChange}
            />
            Hardik Bhavsar
          </label>
          <label>
            <input
              className="sales-radio"
              type="radio"
              name="sales"
              value="Dhaval Kataria"
              checked={formData.sales === "Dhaval Kataria"}
              onChange={handleChange}
            />
            Dhaval Kataria
          </label>
          <label>
            <input
              className="sales-radio"
              type="radio"
              name="sales"
              value="Parag Shah"
              checked={formData.sales === "Parag Shah"}
              onChange={handleChange}
            />
            Parag Shah
          </label>
          <label>
            <input
              className="sales-radio"
              type="radio"
              name="sales"
              value="Anshul Purohit"
              checked={formData.sales === "Anshul Purohit"}
              onChange={handleChange}
            />
            Anshul Purohit
          </label>
        </div>
        {/* Ref */} <label>Ref.</label>
        <input
          list="Options"
          name="ref"
          value={formData.ref}
          onChange={handleChange}
          placeholder="Select or type reference"
        />
        {/* Source Channel */} <label>Source Channel</label>
        <select
          name="sourceChannel"
          value={formData.sourceChannel}
          onChange={handleChange}
        >
          <option value="">Select Source</option>
          <option value="Vinay Mishra">Sahdev Bhavsar</option>
          <option value="Vinay Mishra">Ravi Mandaliya</option>
          <option value="Vinay Mishra">Hitendra Goswami</option>
          <option value="Vinay Mishra">Vinay Mishra</option>
          <option value="Robins Kapadia">Robins Kapadia</option>
          <option value="Dharmesh Bhavsar">Dharmesh Bhavsar</option>
          <option value="Hardik Bhavsar">Hardik Bhavsar</option>
          <option value="Dhaval Kataria">Dhaval Kataria</option>
          <option value="Parag Shah">Parag Shah</option>
          <option value="Anshul Purohit">Anshul Purohit</option>
          <option value="Other">Other</option>
        </select>
        <label>Remark:</label>
        <input
          type="text"
          name="remark"
          value={formData.remark}
          onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
          placeholder="Enter any remark"
          required
        />
        <button type="submit" className="submit-btn">
          {editingId ? "Update" : "Submit"}
        </button>
      </form>
      {/* Filters */}
      <button onClick={handleExcelDownload} className="download-btn">
        <FaCloudDownloadAlt />
        Download Master Excel
      </button>

      <div className="sales-excel-download">
        <label className=".excel-label">Select Sales for Excel:</label>
        <select
          className="excel-select"
          value={refFilter}
          onChange={(e) => setRefFilter(e.target.value)}
        >
          <option value="">Select Sales</option>
          {[
            "Vinay Mishra",
            "Robins Kapadia",
            "Dharmesh Bhavsar",
            "Hardik Bhavsar",
            "Dhaval Kataria",
            "Parag Shah",
            "Anshul Purohit",
          ].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button onClick={handleExportRef} className="download-btn ">
          <FaCloudDownloadAlt />
          Download {refFilter || "Selected"} Excel
        </button>
      </div>
      <h2 style={{ display: "flex", justifyContent: "center" }}>
        Applications List
      </h2>
      <div className="filters">
        <label>
          From:
          <input
            type="date"
            value={filters.fromDate}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, fromDate: e.target.value }))
            }
          />
        </label>
        <label>
          To:
          <input
            type="date"
            value={filters.toDate}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, toDate: e.target.value }))
            }
          />
        </label>
        <label>
          Filter by Sales:
          <select
            value={filters.sales}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, sales: e.target.value }))
            }
          >
            <option value="">All Sales</option>
            {[
              "Vinay Mishra",
              "Robins Kapadia",
              "Dharmesh Bhavsar",
              "Hardik Bhavsar",
              "Dhaval Kataria",
              "Parag Shah",
              "Anshul Purohit",
            ].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status:
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All</option>
            <option value="Login">Login</option>
            <option value="Sanction">Sanction</option>
            <option value="Disbursed">Disbursed</option>
            <option value="Part Disbursed">Part Disbursed</option>
            <option value="Re-Login">Re-Login</option>
            <option value="Rejected">Rejected</option>
          </select>
        </label>
      </div>
      <div className="card-container">
  {[...filteredApps].reverse().map((app) => (
    <div key={app._id} className="card">
      <h2
        style={{
          margin: "5px auto",
          display: "flex",
          justifyContent: "center",
          color: "blueviolet",
          fontSize: "24px",
        }}
      >
        {app.sales}
      </h2>

      <p className="list-p"><b>Cust Name:</b> {app.name}</p>
      <p className="list-p"><b>Mobile:</b> {maskMobile(app.mobile)}</p>
      <p className="list-p"><b>Ref:</b> {app.ref}</p>
      <p className="list-p"><b>Source:</b> {app.sourceChannel}</p>
      <p className="list-p"><b>Product:</b> {app.product}</p>
      <p className="list-p"><b>Amount:</b> {app.amount}</p>
      <p className="list-p"><b>Status:</b> {app.status}</p>
      <p className="list-p"><b>Date:</b> {app.loginDate}</p>
      <p className="list-p"><b>Remark:</b> {app.remark}</p>

      {app.approvalStatus !== "Rejected by SB" && (
        <button className="edit-btn" onClick={() => handleEdit(app)}>
          ✏️ Edit
        </button>
      )}

      {/* ⚠️ Show red message only when important field changed */}
      {/* {app.approvalStatus === "" && (
        <p style={{ color: "red", fontSize: "12px", marginTop: "5px" }}>
          ⚠️ Important field changed — re-approval required.
        </p>
      )} */}

      {/* ✅ Approval / Reject Section */}
      {app.approvalStatus === "Approved by SB" ? (
        <p style={{ color: "green", fontWeight: "bold" }}>✅ Approved by SB</p>
      ) : app.approvalStatus === "Rejected by SB" ? (
        <p style={{ color: "red", fontWeight: "bold" }}>❌ Rejected by SB</p>
      ) : (
        <div className="approval-buttons">
          <button
            className="approve-btn"
            onClick={() => handleApprove(app._id)}
          >
            Approve
          </button>
          <button
            className="reject-btn"
            onClick={() => handleReject(app._id)}
          >
            Reject
          </button>
        </div>
      )}
    </div>
  ))}
</div>

          </div>
  );
};

export default Form;
