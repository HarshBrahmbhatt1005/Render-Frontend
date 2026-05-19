import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import "../css/custForm.css";
import "./RealestateLeadForm.css";

const API = `${import.meta.env.VITE_API_URL}/api/realestate-leads`;

const TODAY = new Date().toISOString().split("T")[0];

const REALESTATE_SOURCE_OPTIONS = [
  "Existing Customer",
  "Paid Marketing",
  "Refer & Earn",
  "WhatsApp Paid Marketing",
  "Channel Partner Lead",
  "Self Source",
];

const FINANCE_SOURCE_OPTIONS = [
  "Existing Customer",
  "Paid Marketing",
  "Refer & Earn",
  "WhatsApp Paid Marketing",
  "Sai Fakira",
  "Google Platform",
  "Tele-calling",
  "Self Source",
];

const STATUS_OPTIONS = [
  "Ringing",
  "Call Not Connected",
  "Not Interested",
  "Reschedule",
  "Follow-up",
  "Interested",
  "Purchase the property",
];

const INTERESTED_STATUSES = ["Follow-up", "Interested"];
const FINANCE_TRIGGER_STATUSES = ["Reschedule", "Interested", "Follow-up"];

const RESIDENTIAL_SIZES = ["1 RK", "1 BHK", "2 BHK", "2.5 BHK", "3 BHK", "4 BHK", "5 BHK", "6+ BHK"];

const RESIDENTIAL_CATEGORIES = [
  "Flats",
  "Bungalow",
  "PentHouse",
  "Duplex",
  "Duplex PentHouse",
  "Triplex",
  "Triplex PentHouse",
  "Weekend Villa",
];

const PROPERTY_TYPES = ["Residential", "Commercial", "Plot"];
const COMMERCIAL_TYPES = ["Shop", "Showroom", "Office"];
const MANAGERS = [
  "Dharmesh Bhavsar",
  "Dhaval Kataria",
  "Dhruvi Soni",
  "Hardik Bhavsar",
  "Harsh Brahmbhatt",
  "Khusboo Patel",
  "Mehul Prajapati",
  "Nidhi Tank",
  "Parag Shah",
  "Pradeep Trivedi",
  "Robins Kapadia",
  "Sonali Pol",
  "Unnati Raval",
  "Vinay Mishra",
];

const SENIORS = [
  "Pradeep Sir",
  "Pankaj Sir",
  "Hitendra Sir",
  "Dhruvi Maam",
];

const FINANCE_PRODUCTS = [
  "Home Loan",
  "Home Loan TOP UP",
  "Home Loan BT + TOP UP",
  "Commercial Purchase",
  "Loan Against Property",
  "Loan Against Property BT + TOP UP",
  "Land Purchase",
  "Plot Purchase + Construction",
  "Lease Rental Discount Purchase",
  "Industrial Purchase",
  "Inventory Funding",
  "Project Loan",
  "Cgtmsc",
  "Other"
];

const uniqueFilled = (values) => (
  Array.from(new Set(values.filter((value) => value && String(value).trim())))
);

const mergeOptions = (baseOptions, extraOptions = []) => (
  uniqueFilled([...baseOptions, ...extraOptions])
);

const RealestateLeadForm = () => {
  const [leadType, setLeadType] = useState("realestate"); // 'realestate' | 'finance'
  const [leadDate, setLeadDate] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerNumber, setCustomerNumber] = useState("");
  const [projectName, setProjectName] = useState("");
  const [source, setSource] = useState("");
  const [referenceOf, setReferenceOf] = useState("");
  const [financeProduct, setFinanceProduct] = useState("");
  const [customFinanceProduct, setCustomFinanceProduct] = useState("");
  const [loanAmount, setLoanAmount] = useState("");
  const [passedOn, setPassedOn] = useState("");

  // Universal Property Requirements (Root level)
  const [propertyType, setPropertyType] = useState("");
  const [budget, setBudget] = useState("");
  const [preferredArea, setPreferredArea] = useState("");
  const [residentialSize, setResidentialSize] = useState("");
  const [residentialCategory, setResidentialCategory] = useState("");
  const [commercialType, setCommercialType] = useState("");

  // Calls history - default 1 call
  const [calls, setCalls] = useState([
    { callingDate: TODAY, manager: "", status: "", remarks: "", followUpDate: "" },
  ]);

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalStatus, setModalStatus] = useState(null); // 'submitting' | 'success' | 'error' | null
  const [serverErrorMsg, setServerErrorMsg] = useState("");

  // Leads list state
  const [leads, setLeads] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedHistory, setExpandedHistory] = useState({});
  const [statusFilter, setStatusFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [managerFilter, setManagerFilter] = useState("All");
  const [passedOnFilter, setPassedOnFilter] = useState("All");
  const [leadTypeFilter, setLeadTypeFilter] = useState("All");
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  
  // Sort state
  const [sortBy, setSortBy] = useState("date"); // date, lastModified, callCount
  const [sortOrder, setSortOrder] = useState("desc"); // asc, desc

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingLeadId, setEditingLeadId] = useState(null);
  
  // Scroll position ref to prevent auto-scroll when cards load
  const scrollPositionRef = useRef(0);

  useEffect(() => {
    fetchLeads();
  }, []);

  const savedStatusOptions = useMemo(() => (
    uniqueFilled(leads.flatMap((lead) => (lead.calls || []).map((call) => call.status)))
  ), [leads]);

  const savedManagerOptions = useMemo(() => (
    uniqueFilled(leads.flatMap((lead) => (lead.calls || []).map((call) => call.manager)))
  ), [leads]);

  const savedPassedOnOptions = useMemo(() => (
    uniqueFilled(leads.map((lead) => lead.passedOn))
  ), [leads]);

  const savedSourceOptions = useMemo(() => (
    uniqueFilled(leads.map((lead) => lead.source))
  ), [leads]);

  const savedResidentialSizeOptions = useMemo(() => (
    uniqueFilled(leads.map((lead) => lead.residentialSize))
  ), [leads]);

  const savedPropertyTypeOptions = useMemo(() => (
    uniqueFilled(leads.map((lead) => lead.propertyType))
  ), [leads]);

  const savedResidentialCategoryOptions = useMemo(() => (
    uniqueFilled(leads.map((lead) => lead.residentialCategory))
  ), [leads]);

  const savedCommercialTypeOptions = useMemo(() => (
    uniqueFilled(leads.map((lead) => lead.commercialType))
  ), [leads]);

  const savedFinanceProductOptions = useMemo(() => (
    uniqueFilled(leads.map((lead) => lead.financeProduct))
  ), [leads]);

  const statusOptions = useMemo(() => (
    mergeOptions(STATUS_OPTIONS, savedStatusOptions)
  ), [savedStatusOptions]);

  const managerOptions = useMemo(() => (
    mergeOptions(MANAGERS, savedManagerOptions)
  ), [savedManagerOptions]);

  const passedOnOptions = useMemo(() => (
    mergeOptions(SENIORS, savedPassedOnOptions)
  ), [savedPassedOnOptions]);

  const sourceOptions = useMemo(() => (
    mergeOptions(leadType === "finance" ? FINANCE_SOURCE_OPTIONS : REALESTATE_SOURCE_OPTIONS, savedSourceOptions)
  ), [leadType, savedSourceOptions]);

  const allSourceOptions = useMemo(() => (
    mergeOptions([...REALESTATE_SOURCE_OPTIONS, ...FINANCE_SOURCE_OPTIONS], savedSourceOptions)
  ), [savedSourceOptions]);

  const residentialSizeOptions = useMemo(() => (
    mergeOptions(RESIDENTIAL_SIZES, savedResidentialSizeOptions)
  ), [savedResidentialSizeOptions]);

  const propertyTypeOptions = useMemo(() => (
    mergeOptions(PROPERTY_TYPES, savedPropertyTypeOptions)
  ), [savedPropertyTypeOptions]);

  const residentialCategoryOptions = useMemo(() => (
    mergeOptions(RESIDENTIAL_CATEGORIES, savedResidentialCategoryOptions)
  ), [savedResidentialCategoryOptions]);

  const commercialTypeOptions = useMemo(() => (
    mergeOptions(COMMERCIAL_TYPES, savedCommercialTypeOptions)
  ), [savedCommercialTypeOptions]);

  const financeProductOptions = useMemo(() => {
    const merged = mergeOptions(
      FINANCE_PRODUCTS.filter(p => p !== "Other"),
      savedFinanceProductOptions.filter(p => p !== "Other")
    );
    return [...merged, "Other"]; // always keep "Other" last
  }, [savedFinanceProductOptions]);

  const fetchLeads = async () => {
    try {
      // Store current scroll position before fetching
      scrollPositionRef.current = window.scrollY;
      
      const res = await axios.get(API);
      setLeads(res.data);
      
      // Restore scroll position after state updates
      setTimeout(() => {
        window.scrollTo(0, scrollPositionRef.current);
      }, 0);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoadingLeads(false);
    }
  };

  const filteredLeads = leads.filter((l) => {
    const matchesSearch =
      l.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.customerNumber?.includes(searchTerm);

    const lastCall = l.calls && l.calls.length > 0 ? l.calls[l.calls.length - 1] : null;

    const matchesStatus = statusFilter === "All" || lastCall?.status === statusFilter;
    const matchesSource = sourceFilter === "All" || l.source === sourceFilter;
    const matchesManager = managerFilter === "All" || l.calls?.some(c => c.manager === managerFilter);
    const matchesPassedOn = passedOnFilter === "All" || l.passedOn === passedOnFilter;
    const matchesLeadType = leadTypeFilter === "All" || l.leadType === leadTypeFilter;

    return matchesSearch && matchesStatus && matchesSource && matchesManager && matchesPassedOn && matchesLeadType;
  }).sort((a, b) => {
    let compareValue = 0;

    switch (sortBy) {
      case "date":
        // Sort by lead date
        compareValue = new Date(b.leadDate || 0) - new Date(a.leadDate || 0);
        break;
      case "lastModified":
        // Sort by last call date (most recent first)
        const lastCallA = a.calls && a.calls.length > 0 ? a.calls[a.calls.length - 1] : null;
        const lastCallB = b.calls && b.calls.length > 0 ? b.calls[b.calls.length - 1] : null;
        compareValue = new Date(lastCallB?.callingDate || 0) - new Date(lastCallA?.callingDate || 0);
        break;
      case "callCount":
        // Sort by number of calls
        compareValue = (b.calls?.length || 0) - (a.calls?.length || 0);
        break;
      default:
        compareValue = 0;
    }

    // Apply sort order (ascending or descending)
    return sortOrder === "asc" ? -compareValue : compareValue;
  });

  const { summaryManagers, summaryStatuses, summaryMatrix } = useMemo(() => {
    const managerSet = new Set(managerOptions);
    const statusSet = new Set(statusOptions);

    // Build sets from ALL leads (so all managers/statuses appear as columns)
    leads.forEach((lead) => {
      (lead.calls || []).forEach((call) => {
        if (call?.manager) managerSet.add(call.manager);
        if (call?.status) statusSet.add(call.status);
      });
    });

    let managers = Array.from(managerSet)
      .filter((manager) => manager !== "Khusbu Patel")
      .sort((a, b) => a.localeCompare(b));

    const statuses = [...statusOptions, ...Array.from(statusSet).filter((s) => !statusOptions.includes(s))];

    const matrix = {};
    managers.forEach((manager) => {
      matrix[manager] = {};
      statuses.forEach((status) => { matrix[manager][status] = 0; });
    });

    // Count only from leads that match current filters
    const leadsToCount = leads.filter((l) => {
      const matchesLeadType = leadTypeFilter === "All" || l.leadType === leadTypeFilter;
      const matchesSource = sourceFilter === "All" || l.source === sourceFilter;
      const matchesManager = managerFilter === "All" || l.calls?.some(c => c.manager === managerFilter);
      const matchesPassedOn = passedOnFilter === "All" || l.passedOn === passedOnFilter;
      const lastCall = l.calls && l.calls.length > 0 ? l.calls[l.calls.length - 1] : null;
      const matchesStatus = statusFilter === "All" || lastCall?.status === statusFilter;
      return matchesLeadType && matchesSource && matchesManager && matchesPassedOn && matchesStatus;
    });

    leadsToCount.forEach((lead) => {
      if (!lead.calls || lead.calls.length === 0) return;
      const lastCall = lead.calls[lead.calls.length - 1];
      if (!lastCall?.manager || !lastCall?.status) return;
      if (lastCall.manager === "Khusbu Patel") return;

      if (!matrix[lastCall.manager]) {
        matrix[lastCall.manager] = {};
        statuses.forEach((status) => { matrix[lastCall.manager][status] = 0; });
      }
      if (matrix[lastCall.manager][lastCall.status] === undefined) {
        matrix[lastCall.manager][lastCall.status] = 0;
      }
      matrix[lastCall.manager][lastCall.status] += 1;
    });

    return { summaryManagers: managers, summaryStatuses: statuses, summaryMatrix: matrix };
  }, [leads, leadTypeFilter, sourceFilter, managerFilter, passedOnFilter, statusFilter, managerOptions, statusOptions]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const truncate = (str, len) => {
    if (!str) return "";
    return str.length > len ? str.substring(0, len) + "..." : str;
  };

  // Auto-hide modal on success/error
  useEffect(() => {
    if (modalStatus === "success") {
      const timer = setTimeout(() => {
        setModalStatus(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [modalStatus]);

  const hasRealestateRequirementDetails = [
    propertyType,
    budget,
    preferredArea,
    residentialSize,
    residentialCategory,
    commercialType,
  ].some((value) => String(value || "").trim());
  const hasFinanceDetails = [financeProduct, loanAmount].some((value) => String(value || "").trim());
  const isRequirementNeeded =
    calls.some((c) => INTERESTED_STATUSES.includes(c.status)) ||
    (leadType === "realestate" && hasRealestateRequirementDetails);
  const isFinanceProductNeeded =
    calls.some((c) => FINANCE_TRIGGER_STATUSES.includes(c.status)) ||
    (leadType === "finance" && hasFinanceDetails);
  const isPassedOnNeeded = isRequirementNeeded || isFinanceProductNeeded || String(passedOn || "").trim();

  const addCall = () => {
    setCalls((prev) => [...prev, { callingDate: TODAY, manager: "", status: "", remarks: "", followUpDate: "" }]);
  };

  const removeCall = (idx) => {
    setCalls((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateCall = (idx, field, value) => {
    setCalls((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c))
    );
    setErrors((p) => {
      const newE = { ...p };
      delete newE[`call_${idx}_${field}`];
      return newE;
    });
  };

  const validate = () => {
    const e = {};

    // Only validate customer info in create mode
    if (!isEditMode) {
      if (!leadDate) e.leadDate = "Required.";
      if (!customerName.trim()) e.customerName = "Required.";
      if (!customerNumber) {
        e.customerNumber = "Required.";
      } else if (!/^\d{10}$/.test(customerNumber)) {
        e.customerNumber = "10 digits.";
      }
      if (!source) e.source = "Required.";

    }

    // Finance Lead: product required when triggered by call status
    if (leadType === "finance" && isFinanceProductNeeded && !financeProduct) {
      e.financeProduct = "Required.";
    }
    // If "Other" is selected, custom product name is required
    if (leadType === "finance" && isFinanceProductNeeded && financeProduct === "Other" && !customFinanceProduct.trim()) {
      e.financeProduct = "Custom product name required.";
    }
    if (leadType === "finance" && isFinanceProductNeeded && !loanAmount.trim()) {
      e.loanAmount = "Required.";
    }

    if (isPassedOnNeeded && !passedOn) {
      e.passedOn = "Required.";
    }

    calls.forEach((c, i) => {
      if (!c.callingDate) e[`call_${i}_callingDate`] = "Required.";
      if (!c.manager) e[`call_${i}_manager`] = "Required.";
      if (!c.status) e[`call_${i}_status`] = "Required.";
    });

    if (isRequirementNeeded && leadType === "realestate") {
      if (!propertyType) e.propertyType = "Required.";
      if (!budget.trim()) e.budget = "Required.";
      if (!preferredArea.trim()) e.preferredArea = "Required.";
    }

    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerErrorMsg("");
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setIsSubmitting(true);
    setModalStatus("submitting");

    try {
      if (isEditMode) {
        // Update existing lead
        const payload = {
          leadType,
          projectName: leadType === "realestate" ? projectName : undefined,
          financeProduct: leadType === "finance" ? (financeProduct === "Other" ? customFinanceProduct : financeProduct) : undefined,
          loanAmount: leadType === "finance" ? loanAmount : undefined,
          passedOn: isPassedOnNeeded ? passedOn : "",
          propertyType: leadType === "realestate" ? propertyType : undefined,
          budget: leadType === "realestate" ? budget : undefined,
          preferredArea: leadType === "realestate" ? preferredArea : undefined,
          residentialSize: leadType === "realestate" ? residentialSize : undefined,
          residentialCategory: leadType === "realestate" ? residentialCategory : undefined,
          commercialType: leadType === "realestate" ? commercialType : undefined,
          calls,
        };

        await axios.put(`${API}/${editingLeadId}`, payload);
        setModalStatus("success");
      } else {
        // Create new lead
        const payload = {
          leadDate,
          customerName,
          customerNumber,
          projectName: leadType === "realestate" ? projectName : undefined,
          source,
          referenceOf,
          leadType,
          financeProduct: leadType === "finance" ? (financeProduct === "Other" ? customFinanceProduct : financeProduct) : undefined,
          loanAmount: leadType === "finance" ? loanAmount : undefined,
          passedOn: isPassedOnNeeded ? passedOn : "",
          propertyType: leadType === "realestate" ? propertyType : undefined,
          budget: leadType === "realestate" ? budget : undefined,
          preferredArea: leadType === "realestate" ? preferredArea : undefined,
          residentialSize: leadType === "realestate" ? residentialSize : undefined,
          residentialCategory: leadType === "realestate" ? residentialCategory : undefined,
          commercialType: leadType === "realestate" ? commercialType : undefined,
          calls,
        };

        await axios.post(API, payload);
        setModalStatus("success");
      }

      // Reset form
      resetForm();

      // Refresh list
      fetchLeads();
    } catch (err) {
      console.error("Submit error:", err);
      setModalStatus("error");
      setServerErrorMsg(err?.response?.data?.message || `❌ Failed to ${isEditMode ? 'update' : 'submit'} lead.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setLeadType("realestate");
    setCustomerName("");
    setCustomerNumber("");
    setProjectName("");
    setSource("");
    setReferenceOf("");
    setFinanceProduct("");
    setCustomFinanceProduct("");
    setLoanAmount("");
    setPassedOn("");
    setPropertyType("");
    setBudget("");
    setPreferredArea("");
    setResidentialSize("");
    setResidentialCategory("");
    setCommercialType("");
    setCalls([{ callingDate: TODAY, manager: "", status: "", remarks: "", followUpDate: "" }]);
    setErrors({});
    setIsEditMode(false);
    setEditingLeadId(null);
  };

  const handleEdit = (lead) => {
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Set edit mode
    setIsEditMode(true);
    setEditingLeadId(lead._id);

    // Load customer details (read-only in edit mode)
    setLeadType(lead.leadType || "realestate");
    setLeadDate(lead.leadDate ? new Date(lead.leadDate).toISOString().split("T")[0] : TODAY);
    setCustomerName(lead.customerName || "");
    setCustomerNumber(lead.customerNumber || "");
    setProjectName(lead.projectName || "");
    setSource(lead.source || "");
    setReferenceOf(lead.referenceOf || "");
    
    // Restore finance product — if saved value isn't in the known list, treat as "Other"
    const savedProduct = lead.financeProduct || "";
    if (savedProduct && !FINANCE_PRODUCTS.includes(savedProduct)) {
      setFinanceProduct("Other");
      setCustomFinanceProduct(savedProduct);
    } else {
      setFinanceProduct(savedProduct);
      setCustomFinanceProduct("");
    }
    
    setLoanAmount(lead.loanAmount || "");
    setPassedOn(lead.passedOn || "");

    // Load editable fields
    setPropertyType(lead.propertyType || "");
    setBudget(lead.budget || "");
    setPreferredArea(lead.preferredArea || "");
    setResidentialSize(lead.residentialSize || "");
    setResidentialCategory(lead.residentialCategory || "");
    setCommercialType(lead.commercialType || "");

    // Load calls
    const formattedCalls = (lead.calls || []).map(c => ({
      callingDate: c.callingDate ? new Date(c.callingDate).toISOString().split("T")[0] : TODAY,
      manager: c.manager || "",
      status: c.status || "",
      remarks: c.remarks || "",
      followUpDate: c.followUpDate ? new Date(c.followUpDate).toISOString().split("T")[0] : "",
    }));
    setCalls(formattedCalls.length > 0 ? formattedCalls : [{ callingDate: TODAY, manager: "", status: "", remarks: "", followUpDate: "" }]);

    setErrors({});
  };

  const handleCancelEdit = () => {
    resetForm();
  };

  const handleExportToExcel = async () => {
    const password = window.prompt("Enter download password to export Excel:");
    if (password === null) return; // user cancelled

    try {
      const verify = await axios.post(`${API}/verify-password`, { password });
      if (!verify.data.success) {
        alert("Incorrect password. Export denied.");
        return;
      }

      const response = await axios.get(`${API}/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `realestate-leads-${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err?.response?.data?.message || "Incorrect password. Export denied.");
    }
  };

  const err = (key) =>
    errors[key] ? <span className="rl-error">{errors[key]}</span> : null;

  return (
    <div className="rl-page-container">
      {/* ── Decorative blobs ── */}
      <div className="rl-blob rl-blob-1"></div>
      <div className="rl-blob rl-blob-2"></div>
      {/* ── Center Container for Form ── */}
      <div className="rl-main-center-wrap">
        <div className="form-container rl-form-container">
          <div className="form-title-row">
            <h1 className="rl-title">
              {isEditMode
                ? (leadType === "finance" ? "Edit Finance Lead" : "Edit Real-Estate Lead")
                : (leadType === "finance" ? "Finance Lead Form" : "Real-Estate Lead Form")}
            </h1>
            {isEditMode && (
              <button type="button" className="rl-cancel-edit-btn" onClick={handleCancelEdit}>
                ✕ Cancel Edit
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {/* Lead Type Selection */}
            {!isEditMode && (
              <div className="rl-lead-type-row">
                <label className="rl-lead-type-label">Lead Type:</label>
                <label className="rl-radio-label">
                  <input
                    type="radio"
                    name="leadType"
                    value="realestate"
                    checked={leadType === "realestate"}
                    onChange={() => { setLeadType("realestate"); setFinanceProduct(""); setErrors({}); }}
                    className="rl-radio-input"
                  />
                  Real Estate 
                </label>
                <label className="rl-radio-label">
                  <input
                    type="radio"
                    name="leadType"
                    value="finance"
                    checked={leadType === "finance"}
                    onChange={() => { setLeadType("finance"); setProjectName(""); setErrors({}); }}
                    className="rl-radio-input"
                  />
                  Finance
                </label>
              </div>
            )}

            {/* SECTION 1 — Customer Info */}
            <div className="rl-section-card">
              <div className="rl-section-header">
                <span className="rl-section-badge">1</span>
                <span className="rl-section-title">Customer Information</span>
                {isEditMode && <span className="rl-readonly-badge">Read-Only</span>}
              </div>
              <div className="rl-grid-3">
                <div className="rl-field">
                  <label className="rl-label">Lead Date <span className="required-asterisk">*</span></label>
                  <input
                    type="date"
                    value={leadDate || ""}
                    onChange={(e) => setLeadDate(e.target.value)}
                    className={`rl-input${errors.leadDate ? " rl-input-error" : ""}`}
                    disabled={isEditMode}
                  />
                  {err("leadDate")}
                </div>
                <div className="rl-field">
                  <label className="rl-label">Customer Name <span className="required-asterisk">*</span></label>
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className={`rl-input${errors.customerName ? " rl-input-error" : ""}`}
                    disabled={isEditMode}
                  />
                  {err("customerName")}
                </div>
                <div className="rl-field">
                  <label className="rl-label">Customer Number <span className="required-asterisk">*</span></label>
                  <input
                    type="text"
                    maxLength="10"
                    placeholder="10-digit mobile"
                    value={customerNumber}
                    onChange={(e) => setCustomerNumber(e.target.value.replace(/\D/g, ""))}
                    className={`rl-input${errors.customerNumber ? " rl-input-error" : ""}`}
                    disabled={isEditMode}
                  />
                  {err("customerNumber")}
                </div>
                <div className="rl-field">
                  <label className="rl-label">Source <span className="required-asterisk">*</span></label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className={`rl-input rl-select${errors.source ? " rl-input-error" : ""}`}
                    disabled={isEditMode}
                  >
                    <option value="">Select Source</option>
                    {sourceOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {err("source")}
                </div>
                <div className="rl-field">
                  <label className="rl-label">Reference Of</label>
                  <input
                    type="text"
                    placeholder="Reference Name"
                    value={referenceOf}
                    onChange={(e) => setReferenceOf(e.target.value)}
                    className="rl-input"
                    disabled={isEditMode}
                  />
                </div>
                {/* Project Name — Real Estate only */}
                {leadType === "realestate" && (
                  <div className="rl-field">
                    <label className="rl-label">Project Name</label>
                    <input
                      type="text"
                      placeholder="Project Name"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      className="rl-input"
                      disabled={isEditMode}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="rl-calls-wrapper">
              <div className="rl-calls-header">
                <div className="rl-calls-title-row">
                  <span className="rl-section-badge">2</span>
                  <span className="rl-section-title">Call Records</span>
                  <span className="rl-call-count">{calls.length} Call(s)</span>
                </div>
                <button type="button" className="rl-add-call-btn" onClick={addCall}>+ Add Call</button>
              </div>

              {calls.map((call, idx) => (
                <div key={idx} className="rl-call-card">
                  <div className="rl-call-card-header">
                    <span className="rl-call-badge">Call #{idx + 1}</span>
                    {idx > 0 && (
                      <button type="button" className="rl-remove-btn" onClick={() => removeCall(idx)}>✕ Remove</button>
                    )}
                  </div>
                  <div className="rl-grid-3">
                    <div className="rl-field">
                      <label className="rl-label">Calling Date <span className="required-asterisk">*</span></label>
                      <input
                        type="date"
                        value={call.callingDate}
                        onChange={(e) => updateCall(idx, "callingDate", e.target.value)}
                        className={`rl-input${errors[`call_${idx}_callingDate`] ? " rl-input-error" : ""}`}
                      />
                      {err(`call_${idx}_callingDate`)}
                    </div>
                    <div className="rl-field">
                      <label className="rl-label">Manager <span className="required-asterisk">*</span></label>
                      <select
                        value={call.manager}
                        onChange={(e) => updateCall(idx, "manager", e.target.value)}
                        className={`rl-input rl-select${errors[`call_${idx}_manager`] ? " rl-input-error" : ""}`}
                      >
                        <option value="">Select Manager</option>
                        {managerOptions.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                      {err(`call_${idx}_manager`)}
                    </div>
                    <div className="rl-field">
                      <label className="rl-label">Status <span className="required-asterisk">*</span></label>
                      <select
                        value={call.status}
                        onChange={(e) => updateCall(idx, "status", e.target.value)}
                        className={`rl-input rl-select${errors[`call_${idx}_status`] ? " rl-input-error" : ""}`}
                      >
                        <option value="">Select Status</option>
                        {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      {err(`call_${idx}_status`)}
                    </div>
                  </div>
                  <div className="rl-grid-2" style={{ marginTop: "12px" }}>
                    <div className="rl-field">
                      <label className="rl-label">Follow Up Date</label>
                      <input
                        type="date"
                        value={call.followUpDate}
                        onChange={(e) => updateCall(idx, "followUpDate", e.target.value)}
                        className="rl-input"
                      />
                    </div>
                    <div className="rl-field">
                      <label className="rl-label">Remarks</label>
                      <textarea
                        rows={1}
                        placeholder="Notes..."
                        value={call.remarks}
                        onChange={(e) => updateCall(idx, "remarks", e.target.value)}
                        className="rl-input rl-textarea"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* SECTION 3 — Universal Requirements (Conditional, Real Estate only) */}
            {isRequirementNeeded && leadType === "realestate" && (
              <div className="rl-section-card rl-animate-in" style={{ borderTop: "2px solid #1e3a5f" }}>
                <div className="rl-section-header">
                  <span className="rl-section-badge">3</span>
                  <span className="rl-section-title">Requirements Details</span>
                </div>
                <div className="rl-grid-3">
                  <div className="rl-field">
                    <label className="rl-label">Budget <span className="required-asterisk">*</span></label>
                    <input
                      type="text"
                      placeholder="e.g. 80 Lacs"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      className={`rl-input${errors.budget ? " rl-input-error" : ""}`}
                    />
                    {err("budget")}
                  </div>
                  <div className="rl-field">
                    <label className="rl-label">Preferred Area <span className="required-asterisk">*</span></label>
                    <input
                      type="text"
                      placeholder="e.g. Bodakdev"
                      value={preferredArea}
                      onChange={(e) => setPreferredArea(e.target.value)}
                      className={`rl-input${errors.preferredArea ? " rl-input-error" : ""}`}
                    />
                    {err("preferredArea")}
                  </div>
                  <div className="rl-field">
                    <label className="rl-label">Property Type <span className="required-asterisk">*</span></label>
                    <select
                      value={propertyType}
                      onChange={(e) => setPropertyType(e.target.value)}
                      className={`rl-input rl-select${errors.propertyType ? " rl-input-error" : ""}`}
                    >
                      <option value="">Select Type</option>
                      {propertyTypeOptions.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                    {err("propertyType")}
                  </div>
                  <div className="rl-field">
                    <label className="rl-label">Passed On <span className="required-asterisk">*</span></label>
                    <select
                      value={passedOn}
                      onChange={(e) => { setPassedOn(e.target.value); setErrors(p => { const n = { ...p }; delete n.passedOn; return n; }); }}
                      className={`rl-input rl-select${errors.passedOn ? " rl-input-error" : ""}`}
                    >
                      <option value="">Select Senior</option>
                      {passedOnOptions.map((name) => <option key={name} value={name}>{name}</option>)}
                    </select>
                    {err("passedOn")}
                  </div>
                </div>

                {propertyType === "Residential" && (
                  <div className="rl-grid-2 rl-animate-in" style={{ marginTop: "15px" }}>
                    <div className="rl-field">
                      <label className="rl-label">Size</label>
                      <select
                        value={residentialSize}
                        onChange={(e) => setResidentialSize(e.target.value)}
                        className="rl-input rl-select"
                      >
                        <option value="">Select Size</option>
                        {residentialSizeOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="rl-field">
                      <label className="rl-label">Category</label>
                      <select
                        value={residentialCategory}
                        onChange={(e) => setResidentialCategory(e.target.value)}
                        className="rl-input rl-select"
                      >
                        <option value="">Select Category</option>
                        {residentialCategoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {propertyType === "Commercial" && (
                  <div className="rl-field rl-animate-in" style={{ marginTop: "15px", maxWidth: "33%" }}>
                    <label className="rl-label">Commercial Type</label>
                    <select
                      value={commercialType}
                      onChange={(e) => setCommercialType(e.target.value)}
                      className="rl-input rl-select"
                    >
                      <option value="">Select Type</option>
                      {commercialTypeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* SECTION 3 — Finance Product (Conditional, Finance Lead only) */}
            {leadType === "finance" && isFinanceProductNeeded && (
              <div className="rl-section-card rl-animate-in" style={{ borderTop: "2px solid #1e3a5f" }}>
                <div className="rl-section-header">
                  <span className="rl-section-badge">3</span>
                  <span className="rl-section-title">Finance Details</span>
                </div>
                <div className="rl-grid-3">
                  <div className="rl-field">
                    <label className="rl-label">Product <span className="required-asterisk">*</span></label>
                    <select
                      value={financeProduct}
                      onChange={(e) => { 
                        setFinanceProduct(e.target.value); 
                        if (e.target.value !== "Other") {
                          setCustomFinanceProduct("");
                        }
                        setErrors(p => { const n = { ...p }; delete n.financeProduct; return n; }); 
                      }}
                      className={`rl-input rl-select${errors.financeProduct ? " rl-input-error" : ""}`}
                    >
                      <option value="">Select Product</option>
                      {financeProductOptions.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                    {err("financeProduct")}
                    
                    {/* Custom Finance Product Input - shown when "Other" is selected */}
                    {financeProduct === "Other" && (
                      <input
                        type="text"
                        placeholder="Enter custom product name"
                        value={customFinanceProduct}
                        onChange={(e) => setCustomFinanceProduct(e.target.value)}
                        className="rl-input"
                        style={{ marginTop: "10px" }}
                        required
                      />
                    )}
                  </div>
                  <div className="rl-field">
                    <label className="rl-label">Required Loan Amount <span className="required-asterisk">*</span></label>
                    <input
                      type="text"
                      placeholder="e.g. 50 Lacs"
                      value={loanAmount}
                      onChange={(e) => { setLoanAmount(e.target.value); setErrors(p => { const n = { ...p }; delete n.loanAmount; return n; }); }}
                      className={`rl-input${errors.loanAmount ? " rl-input-error" : ""}`}
                    />
                    {err("loanAmount")}
                  </div>
                  <div className="rl-field">
                    <label className="rl-label">Passed On <span className="required-asterisk">*</span></label>
                    <select
                      value={passedOn}
                      onChange={(e) => { setPassedOn(e.target.value); setErrors(p => { const n = { ...p }; delete n.passedOn; return n; }); }}
                      className={`rl-input rl-select${errors.passedOn ? " rl-input-error" : ""}`}
                    >
                      <option value="">Select Senior</option>
                      {passedOnOptions.map((name) => <option key={name} value={name}>{name}</option>)}
                    </select>
                    {err("passedOn")}
                  </div>
                </div>
              </div>
            )}

            <button type="submit" className="rl-submit-btn" disabled={isSubmitting}>
              {isSubmitting ? (isEditMode ? "Updating..." : "Submitting...") : (isEditMode ? "Update Lead" : "Submit Lead")}
            </button>
          </form>
        </div>

        {/* ── Submission Feedback Modal ── */}
        {modalStatus && (
          <div
            className="rl-modal-overlay"
            onClick={() => {
              if (modalStatus !== "submitting") setModalStatus(null);
            }}
          >
            <div className="rl-modal-content" onClick={(e) => e.stopPropagation()}>
              {modalStatus === "submitting" && (
                <>
                  <div className="rl-spinner"></div>
                  <div className="rl-modal-title">{isEditMode ? "Updating Lead" : "Submitting Lead"}</div>
                  <div className="rl-modal-text">Please wait while we save your data...</div>
                </>
              )}
              {modalStatus === "success" && (
                <>
                  <span className="rl-modal-icon">✅</span>
                  <div className="rl-modal-title">Success!</div>
                  <div className="rl-modal-text">The lead has been {isEditMode ? "updated" : "recorded"} successfully.</div>
                </>
              )}
              {modalStatus === "error" && (
                <>
                  <span className="rl-modal-icon">❌</span>
                  <div className="rl-modal-title">Submission Failed</div>
                  <div className="rl-modal-text">{serverErrorMsg}</div>
                  <button
                    type="button"
                    className="rl-modal-close-btn"
                    onClick={() => setModalStatus(null)}
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {isSummaryOpen && (
          <div className="rl-modal-overlay" onClick={() => setIsSummaryOpen(false)}>
            <div className="rl-summary-modal" onClick={(e) => e.stopPropagation()}>
              <div className="rl-summary-header">
                <h3>Calling Manager Summary</h3>
                <button
                  type="button"
                  className="rl-summary-close"
                  onClick={() => setIsSummaryOpen(false)}
                >
                  Close
                </button>
              </div>

              <div className="rl-summary-table-wrap">
                <table className="rl-summary-table">
                  <thead>
                    <tr>
                      <th>Manager</th>
                      {summaryStatuses.map((status) => (
                        <th key={status}>{status}</th>
                      ))}
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryManagers.map((manager) => (
                      <tr key={manager}>
                        <td>{manager}</td>
                        {summaryStatuses.map((status) => (
                          <td key={`${manager}-${status}`}>{summaryMatrix[manager]?.[status] || 0}</td>
                        ))}
                        <td style={{ fontWeight: "bold" }}>
                          {summaryStatuses.reduce((sum, status) => sum + (summaryMatrix[manager]?.[status] || 0), 0)}
                        </td>
                      </tr>
                    ))}
                    <tr style={{ backgroundColor: "#f0f0f0", fontWeight: "bold" }}>
                      <td>Total</td>
                      {summaryStatuses.map((status) => {
                        const total = summaryManagers.reduce((sum, manager) => sum + (summaryMatrix[manager]?.[status] || 0), 0);
                        return <td key={`total-${status}`}>{total}</td>;
                      })}
                      <td>
                        {summaryManagers.reduce((grandTotal, manager) =>
                          grandTotal + summaryStatuses.reduce((sum, status) => sum + (summaryMatrix[manager]?.[status] || 0), 0), 0
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Leads Gallery display (Vertical Record Grid - Redesigned) ── */}
        <div className="rl-list-section">
          <div className="rl-list-header">
            <div className="rl-list-title-row">
              <h2 className="rl-list-title">Existing Lead Records</h2>
              {!loadingLeads && (
                <span className="rl-results-count">
                  Showing <strong>{filteredLeads.length}</strong> of <strong>{leads.length}</strong> leads
                </span>
              )}
            </div>
            
            {/* Row 1: Search Bar */}
            <div className="rl-search-row">
              <div className="rl-search-wrapper">
                <svg className="rl-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
                <input
                  type="text"
                  placeholder="Search by name or mobile..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="rl-input rl-search-bar"
                />
              </div>
            </div>
            
            {/* Row 2: All Filters and Buttons */}
            <div className="rl-filters-row">
              <select
                value={leadTypeFilter}
                onChange={(e) => setLeadTypeFilter(e.target.value)}
                className="rl-input rl-filter-select"
              >
                <option value="All">All Lead Types</option>
                <option value="realestate">Real Estate</option>
                <option value="finance">Finance</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rl-input rl-filter-select"
              >
                <option value="All">All Status</option>
                {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="rl-input rl-filter-select"
              >
                <option value="All">All Sources</option>
                {allSourceOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                value={managerFilter}
                onChange={(e) => setManagerFilter(e.target.value)}
                className="rl-input rl-filter-select"
              >
                <option value="All">All Managers</option>
                {managerOptions.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <select
                value={passedOnFilter}
                onChange={(e) => setPassedOnFilter(e.target.value)}
                className="rl-input rl-filter-select"
              >
                <option value="All">All Passed On</option>
                {passedOnOptions.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rl-input rl-filter-select"
                title="Sort leads by different criteria"
              >
                <option value="date">Date</option>
                <option value="lastModified">Last Modified</option>
                <option value="callCount">Number of Calls</option>
              </select>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="rl-input rl-filter-select"
                title="Sort order"
              >
                <option value="desc">Descending ↓</option>
                <option value="asc">Ascending ↑</option>
              </select>
              <button
                onClick={handleExportToExcel}
                className="rl-export-btn"
                title="Export all leads to Excel"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Export
              </button>
              <button
                type="button"
                onClick={() => setIsSummaryOpen(true)}
                className="rl-summary-btn"
                title="Open manager vs status call summary"
              >
                Summary
              </button>
            </div>
          </div>

          {!loadingLeads && (
            <div className="rl-results-count">
              Showing <strong>{filteredLeads.length}</strong> of <strong>{leads.length}</strong> leads
            </div>
          )}

          {loadingLeads ? (
            <div className="rl-loader-inline">
              <span>Fetching records...</span>
            </div>
          ) : (
            <div className="rl-record-grid">
              {filteredLeads.length === 0 ? (
                <div className="rl-empty-list">No matches found.</div>
              ) : (
                filteredLeads.map((lead) => (
                  <div key={lead._id} className="rl-record-card">
                    {/* Header: Latest Manager */}
                    <div className={`rl-record-header ${lead.leadType === "finance" ? "rl-record-header--finance" : ""}`}>
                      <span className="rl-record-manager">{lead.calls[lead.calls.length - 1]?.manager || "No Agent"}</span>
                      <span className={`rl-record-badge ${lead.leadType === "finance" ? "rl-badge-finance" : "rl-badge-realestate"}`}>
                        {lead.leadType === "finance" ? "Finance Lead" : "Real Estate Lead"}
                      </span>
                    </div>

                    <div className="rl-record-body">
                      {/* Row 1: Cust Name & Mobile */}
                      <div className="rl-record-row-2">
                        <div className="rl-record-cell">
                          <label className="rl-record-label">CUST NAME</label>
                          <span className="rl-record-val">{lead.customerName}</span>
                        </div>
                        <div className="rl-record-cell">
                          <label className="rl-record-label">MOBILE</label>
                          <span className="rl-record-val">{lead.customerNumber}</span>
                        </div>
                      </div>

                      {/* Row 2: Ref & Lead Date — Real Estate shows Project Name too */}
                      {lead.leadType !== "finance" ? (
                        <div className="rl-record-row-3">
                          <div className="rl-record-cell">
                            <label className="rl-record-label">PROJECT NAME</label>
                            <span className="rl-record-val">{lead.projectName || "N/A"}</span>
                          </div>
                          <div className="rl-record-cell">
                            <label className="rl-record-label">REF</label>
                            <span className="rl-record-val">{lead.referenceOf || "N/A"}</span>
                          </div>
                          <div className="rl-record-cell">
                            <label className="rl-record-label">LEAD GENERATED ON</label>
                            <span className="rl-record-val">{formatDate(lead.leadDate)}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="rl-record-row-2">
                          <div className="rl-record-cell">
                            <label className="rl-record-label">REF</label>
                            <span className="rl-record-val">{lead.referenceOf || "N/A"}</span>
                          </div>
                          <div className="rl-record-cell">
                            <label className="rl-record-label">LEAD GENERATED ON</label>
                            <span className="rl-record-val">{formatDate(lead.leadDate)}</span>
                          </div>
                        </div>
                      )}

                      {/* Row 3: Source */}
                      <div className="rl-record-row-2">
                        <div className="rl-record-cell">
                          <label className="rl-record-label">SOURCE</label>
                          <span className="rl-record-val">{lead.source}</span>
                        </div>

                        {/* Real Estate: Property Type | Finance: Loan Amount */}
                        {lead.leadType !== "finance" ? (
                          <div className="rl-record-cell">
                            <label className="rl-record-label">PROPERTY TYPE</label>
                            <span className="rl-record-val">{lead.propertyType || "N/A"}</span>
                          </div>
                        ) : (
                          <div className="rl-record-cell">
                            <label className="rl-record-label">LOAN AMOUNT</label>
                            <span className="rl-record-val">{lead.loanAmount || "N/A"}</span>
                          </div>
                        )}
                      </div>

                      {/* Real Estate only: Budget & Area */}
                      {lead.leadType !== "finance" && (
                        <div className="rl-record-row-2">
                          <div className="rl-record-cell">
                            <label className="rl-record-label">BUDGET</label>
                            <span className="rl-record-val">{lead.budget || "N/A"}</span>
                          </div>
                          <div className="rl-record-cell">
                            <label className="rl-record-label">PREFERRED AREA</label>
                            <span className="rl-record-val">{lead.preferredArea || "N/A"}</span>
                          </div>
                        </div>
                      )}

                      {/* Real Estate only: Size & Category (Residential) */}
                      {lead.leadType !== "finance" && lead.propertyType === "Residential" && (lead.residentialSize || lead.residentialCategory) && (
                        <div className="rl-record-row-2">
                          <div className="rl-record-cell">
                            <label className="rl-record-label">SIZE</label>
                            <span className="rl-record-val">{lead.residentialSize || "N/A"}</span>
                          </div>
                          <div className="rl-record-cell">
                            <label className="rl-record-label">CATEGORY</label>
                            <span className="rl-record-val">{lead.residentialCategory || "N/A"}</span>
                          </div>
                        </div>
                      )}

                      {/* Real Estate only: Commercial Type */}
                      {lead.leadType !== "finance" && lead.propertyType === "Commercial" && lead.commercialType && (
                        <div className="rl-record-row-1">
                          <div className="rl-record-cell">
                            <label className="rl-record-label">COMMERCIAL TYPE</label>
                            <span className="rl-record-val">{lead.commercialType}</span>
                          </div>
                        </div>
                      )}

                      {/* Finance only: Product */}
                      {lead.leadType === "finance" && lead.financeProduct && (
                        <div className="rl-record-row-1">
                          <div className="rl-record-cell">
                            <label className="rl-record-label">PRODUCT</label>
                            <span className="rl-record-val">{lead.financeProduct}</span>
                          </div>
                        </div>
                      )}

                      {/* Row 6 & 7: Last Status & Next Follow Up in same row */}
                      <div className="rl-record-row-3">
                        <div className="rl-record-cell">
                          <label className="rl-record-label">LAST STATUS</label>
                          <span className={`rl-record-val rl-status-text status-${(lead.calls[lead.calls.length - 1]?.status || "unknown").toLowerCase().replace(/\s+/g, '-')}`}>
                            {lead.calls[lead.calls.length - 1]?.status || "N/A"}
                          </span>
                        </div>
                        <div className="rl-record-cell">
                          <label className="rl-record-label">NEXT FOLLOW UP</label>
                          <span className="rl-record-val rl-followup-alert">
                            {lead.calls.some(c => c.followUpDate) ? formatDate([...lead.calls].reverse().find(c => c.followUpDate)?.followUpDate) : "N/A"}
                          </span>
                        </div>
                        <div className="rl-record-cell">
                          <label className="rl-record-label">PASSED ON</label>
                          <span className="rl-record-val">{lead.passedOn || "N/A"}</span>
                        </div>
                      </div>

                      {/* Call History - Collapsible */}
                      {lead.calls.length > 0 && (
                        <div className="rl-history-wrap">
                          <button
                            onClick={() => setExpandedHistory(prev => ({ ...prev, [lead._id]: !prev[lead._id] }))}
                            className="rl-history-toggle"
                          >
                            <span>Call History ({lead.calls.length})</span>
                            <span>{expandedHistory[lead._id] ? "▲" : "▼"}</span>
                          </button>
                          {expandedHistory[lead._id] && (
                            <div className="rl-history-content">
                              {lead.calls.map((call, idx) => (
                                <div key={idx} className="rl-history-item">
                                  <div className="rl-history-item-title">
                                    Call #{idx + 1} — {formatDate(call.callingDate)}
                                  </div>
                                  <div className="rl-history-item-meta">
                                    <span><span className="rl-history-meta-label">Manager: </span>{call.manager || "N/A"}</span>
                                    <span><span className="rl-history-meta-label">Status: </span>{call.status || "N/A"}</span>
                                    {call.followUpDate && <span className="rl-history-followup"><span className="rl-history-meta-label">Follow Up: </span>{formatDate(call.followUpDate)}</span>}
                                  </div>
                                  {call.remarks && <div className="rl-history-remarks"><span className="rl-history-meta-label">Remarks: </span>{call.remarks}</div>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="rl-record-footer">
                      <button className="rl-edit-btn" onClick={() => handleEdit(lead)}>✎ Edit</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RealestateLeadForm;
