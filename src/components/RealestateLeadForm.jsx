import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import "../css/custForm.css";
import "../css/RealestateLeadForm.css";
import { DEFAULT_LEAD_OPTION_CONFIG, getLeadOptionConfig } from "../utils/leadOptionConfig";

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
  "Other"
];

const REALESTATE_STATUS_OPTIONS = DEFAULT_LEAD_OPTION_CONFIG.realestateStatuses;

const FINANCE_STATUS_OPTIONS = DEFAULT_LEAD_OPTION_CONFIG.financeStatuses;

const INTERESTED_STATUSES = ["Follow-up", "Interested"];
const FINANCE_TRIGGER_STATUSES = ["Reschedule", "Interested", "Follow-up"];
const SCHEDULE_VISIT_STATUS = "Schedule Visit";

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

const PROPERTY_TYPES = ["Residential", "Commercial", "Plot", "Other"];
const COMMERCIAL_TYPES = ["Shop", "Showroom", "Office"];
const MANAGERS = DEFAULT_LEAD_OPTION_CONFIG.managers;

const REMOVED_MANAGERS = ["Khusbu Patel"];

const SENIORS = DEFAULT_LEAD_OPTION_CONFIG.seniors;

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
  "Cgtmse",
  "Msme",
  "CC/OD",
  "Working Capital",
  "Personal Loan",
  "Buisness Loan",
  "Other"
];

const uniqueFilled = (values) => (
  Array.from(new Set(values.filter((value) => value && String(value).trim())))
);

const REMOVED_SENIOR_NAMES = new Set([
  "Dhruvi Soni",
  "Pradeep Sir",
  "Hitendra Sir",
  "Pankaj Sir",
]);

const REMOVED_REALESTATE_STATUS_NAMES = new Set([
  "Interasted",
]);

const filterRemovedSeniorNames = (values = []) => (
  uniqueFilled(values).filter((value) => !REMOVED_SENIOR_NAMES.has(value))
);

const filterRemovedRealestateStatusNames = (values = []) => (
  uniqueFilled(values).filter((value) => !REMOVED_REALESTATE_STATUS_NAMES.has(value))
);

const mergeOptions = (baseOptions, extraOptions = []) => (
  uniqueFilled([...baseOptions, ...extraOptions])
);

const normalizeMobileNumber = (value) => String(value || "").replace(/\D/g, "");

const RealestateLeadForm = ({ leadUser = null, onLogout = null }) => {
  const allowedModules = leadUser?.allowedModules || leadUser?.allowedForms || ["realestate", "finance"];
  const sessionRequestConfig = leadUser ? { withCredentials: true } : {};

  // Caller name assigned to this lead user — auto-filled and locked; empty = admin (free to choose)
  const assignedManager = leadUser?.assignedManager || "";

  // Default lead type: null means not yet selected — user must pick first
  const defaultLeadType = null;

  const [leadType, setLeadType] = useState(defaultLeadType); // null | 'realestate' | 'finance'
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
  const [customPropertyType, setCustomPropertyType] = useState("");
  const [budget, setBudget] = useState("");
  const [preferredArea, setPreferredArea] = useState("");
  const [residentialSize, setResidentialSize] = useState("");
  const [residentialCategory, setResidentialCategory] = useState("");
  const [commercialType, setCommercialType] = useState("");

  // Calls history - default 1 call (auto-fill caller name if assignedManager is set)
  const [calls, setCalls] = useState([
    { callingDate: TODAY, callerName: assignedManager, status: "", remarks: "", followUpDate: "", visitDate: "", visitRemark: "" },
  ]);

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalStatus, setModalStatus] = useState(null); // 'submitting' | 'success' | 'error' | null
  const [serverErrorMsg, setServerErrorMsg] = useState("");
  const [optionConfig, setOptionConfig] = useState(() => getLeadOptionConfig());

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
  // Date filter — mode: "single" (exact date) or "range" (from–to)
  const [dateFilterMode, setDateFilterMode] = useState("range"); // "single" | "range"
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dateSingle, setDateSingle] = useState("");
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  
  // Sort state
  const [sortBy, setSortBy] = useState("date"); // date, lastModified, callCount
  const [sortOrder, setSortOrder] = useState("desc"); // asc, desc

  // Show all leads toggle (default: show only last 30)
  const [showAllLeads, setShowAllLeads] = useState(false);
  const CARDS_LIMIT = 30;
  const cardsTopRef = useRef(null);

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingLeadId, setEditingLeadId] = useState(null);
  
  // Scroll position ref to prevent auto-scroll when cards load
  const scrollPositionRef = useRef(0);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchLeads();
  }, []);

  useEffect(() => {
    const syncOptionConfig = () => {
      setOptionConfig(getLeadOptionConfig());
    };

    window.addEventListener("focus", syncOptionConfig);
    window.addEventListener("storage", syncOptionConfig);

    return () => {
      window.removeEventListener("focus", syncOptionConfig);
      window.removeEventListener("storage", syncOptionConfig);
    };
  }, []);

  useEffect(() => {
    if (isEditMode || !leadType) return undefined;

    const marker = { leadTypeSelectionOpen: true };
    window.history.pushState(marker, "");

    const handlePopState = () => {
      setLeadType(null);
      setErrors({});
      setServerErrorMsg("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [leadType, isEditMode]);

  const savedStatusOptions = useMemo(() => (
    uniqueFilled(leads.flatMap((lead) => (lead.calls || []).map((call) => call.status)))
  ), [leads]);

  const savedRealestateStatusOptions = useMemo(() => (
    uniqueFilled(
      leads
        .filter((lead) => lead.leadType === "realestate" || !lead.leadType)
        .flatMap((lead) => (lead.calls || []).map((call) => call.status))
    ).filter((value) => !REMOVED_REALESTATE_STATUS_NAMES.has(value))
  ), [leads]);

  const savedFinanceStatusOptions = useMemo(() => (
    uniqueFilled(
      leads
        .filter((lead) => lead.leadType === "finance")
        .flatMap((lead) => (lead.calls || []).map((call) => call.status))
    )
  ), [leads]);

  const savedManagerOptions = useMemo(() => (
    uniqueFilled(
      leads.flatMap((lead) => (lead.calls || []).map((call) => call.callerName || call.manager))
    ).filter((m) => !REMOVED_MANAGERS.includes(m))
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

  const statusOptions = useMemo(() => {
    if (leadType === "finance") {
      return FINANCE_STATUS_OPTIONS;
    } else if (leadType === "realestate") {
      return REALESTATE_STATUS_OPTIONS;
    } else {
      return [];
    }
  }, [leadType]);

  const managerOptions = useMemo(() => (
    mergeOptions(optionConfig.managers || MANAGERS, savedManagerOptions)
  ), [optionConfig.managers, savedManagerOptions]);

  const passedOnOptions = useMemo(() => (
    filterRemovedSeniorNames(
      mergeOptions(optionConfig.seniors || SENIORS, savedPassedOnOptions)
    )
  ), [optionConfig.seniors, savedPassedOnOptions]);

  const sourceOptions = useMemo(() => (
    mergeOptions(leadType === "finance" ? FINANCE_SOURCE_OPTIONS : REALESTATE_SOURCE_OPTIONS, savedSourceOptions)
  ), [leadType, savedSourceOptions]);

  const allSourceOptions = useMemo(() => (
    mergeOptions([...REALESTATE_SOURCE_OPTIONS, ...FINANCE_SOURCE_OPTIONS], savedSourceOptions)
  ), [savedSourceOptions]);

  const filterStatusOptions = useMemo(() => {
    if (leadTypeFilter === "All") {
      return [...REALESTATE_STATUS_OPTIONS, ...FINANCE_STATUS_OPTIONS];
    } else if (leadTypeFilter === "finance") {
      return FINANCE_STATUS_OPTIONS;
    } else {
      return REALESTATE_STATUS_OPTIONS;
    }
  }, [leadTypeFilter]);

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

  const duplicateNumberMatches = useMemo(() => (
    /^\d{10}$/.test(normalizeMobileNumber(customerNumber))
      ? leads.filter((lead) => (
          normalizeMobileNumber(lead.customerNumber) === normalizeMobileNumber(customerNumber) &&
          (!editingLeadId || lead._id !== editingLeadId)
        ))
      : []
  ), [customerNumber, leads, editingLeadId]);

  const duplicateNumberWarning = duplicateNumberMatches.length > 0
    ? `This number is already stored in ${duplicateNumberMatches.length} lead${duplicateNumberMatches.length > 1 ? "s" : ""}.`
    : "";

  const fetchLeads = async () => {
    try {
      // Store current scroll position before fetching
      scrollPositionRef.current = window.scrollY;

      let res;
      if (leadUser) {
        // Lead user: backend applies all/own access plus module permissions.
        res = await axios.get(`${import.meta.env.VITE_API_URL}/api/lead-users/my-leads`, {
          withCredentials: true,
        });
      } else {
        // Admin: fetch all leads
        res = await axios.get(API);
      }
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

  // Reset to 30-card view whenever any filter/sort changes
  useEffect(() => {
    setShowAllLeads(false);
  }, [searchTerm, statusFilter, sourceFilter, managerFilter, leadTypeFilter, sortBy, sortOrder, dateFrom, dateTo, dateSingle, dateFilterMode]);

  const filteredLeads = leads.filter((l) => {
    const matchesSearch =
      l.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.customerNumber?.includes(searchTerm);

    const lastCall = l.calls && l.calls.length > 0 ? l.calls[l.calls.length - 1] : null;

    const matchesStatus = statusFilter === "All" || lastCall?.status === statusFilter;
    const matchesSource = sourceFilter === "All" || l.source === sourceFilter;
    const matchesManager = managerFilter === "All" || l.calls?.some(c => (c.callerName || c.manager) === managerFilter);
    const matchesPassedOn = passedOnFilter === "All" || l.passedOn === passedOnFilter;
    const matchesLeadType = leadTypeFilter === "All" || l.leadType === leadTypeFilter;

    // Date filter
    let matchesDate = true;
    if (l.leadDate) {
      const leadDateObj = new Date(l.leadDate);
      leadDateObj.setHours(0, 0, 0, 0);

      if (dateFilterMode === "single" && dateSingle) {
        const single = new Date(dateSingle);
        single.setHours(0, 0, 0, 0);
        matchesDate = leadDateObj.getTime() === single.getTime();
      } else if (dateFilterMode === "range") {
        if (dateFrom) {
          const from = new Date(dateFrom);
          from.setHours(0, 0, 0, 0);
          if (leadDateObj < from) matchesDate = false;
        }
        if (dateTo && matchesDate) {
          const to = new Date(dateTo);
          to.setHours(23, 59, 59, 999);
          if (leadDateObj > to) matchesDate = false;
        }
      }
    } else if (
      (dateFilterMode === "single" && dateSingle) ||
      (dateFilterMode === "range" && (dateFrom || dateTo))
    ) {
      matchesDate = false;
    }

    return matchesSearch && matchesStatus && matchesSource && matchesManager && matchesPassedOn && matchesLeadType && matchesDate;
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
        const callerName = call?.callerName || call?.manager;
        if (callerName) managerSet.add(callerName);
        if (call?.status) statusSet.add(call.status);
      });
    });

    let managers = Array.from(managerSet)
      .filter((manager) => !REMOVED_MANAGERS.includes(manager))
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
      const matchesManager = managerFilter === "All" || l.calls?.some(c => (c.callerName || c.manager) === managerFilter);
      const matchesPassedOn = passedOnFilter === "All" || l.passedOn === passedOnFilter;
      const lastCall = l.calls && l.calls.length > 0 ? l.calls[l.calls.length - 1] : null;
      const matchesStatus = statusFilter === "All" || lastCall?.status === statusFilter;
      return matchesLeadType && matchesSource && matchesManager && matchesPassedOn && matchesStatus;
    });

    leadsToCount.forEach((lead) => {
      if (!lead.calls || lead.calls.length === 0) return;
      const firstCall = lead.calls[0];
      const lastCall = lead.calls[lead.calls.length - 1];
      const firstCallerName = firstCall?.callerName || firstCall?.manager;
      if (!firstCallerName || !lastCall?.status) return;
      if (REMOVED_MANAGERS.includes(firstCallerName)) return;

      if (!matrix[firstCallerName]) {
        matrix[firstCallerName] = {};
        statuses.forEach((status) => { matrix[firstCallerName][status] = 0; });
      }
      if (matrix[firstCallerName][lastCall.status] === undefined) {
        matrix[firstCallerName][lastCall.status] = 0;
      }
      matrix[firstCallerName][lastCall.status] += 1;
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
    calls.some((c) => INTERESTED_STATUSES.includes(c.status));
  const isFinanceProductNeeded =
    calls.some((c) => FINANCE_TRIGGER_STATUSES.includes(c.status)) ||
    (leadType === "finance" && hasFinanceDetails);
  const isPassedOnNeeded = isRequirementNeeded || isFinanceProductNeeded || String(passedOn || "").trim();

  const addCall = () => {
    setCalls((prev) => [...prev, { callingDate: TODAY, callerName: assignedManager, status: "", remarks: "", followUpDate: "", visitDate: "", visitRemark: "" }]);
  };

  const removeCall = (idx) => {
    setCalls((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateCall = (idx, field, value) => {
    setCalls((prev) =>
      prev.map((c, i) => {
        if (i !== idx) return c;

        const updatedCall = { ...c, [field]: value };

        if (field === "status" && value !== SCHEDULE_VISIT_STATUS) {
          updatedCall.visitDate = "";
          updatedCall.visitRemark = "";
        }

        return updatedCall;
      })
    );
    setErrors((p) => {
      const newE = { ...p };
      delete newE[`call_${idx}_${field}`];
      if (field === "status" && value !== SCHEDULE_VISIT_STATUS) {
        delete newE[`call_${idx}_visitDate`];
        delete newE[`call_${idx}_visitRemark`];
      }
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

    calls.forEach((c, i) => {
      if (!c.callingDate) e[`call_${i}_callingDate`] = "Required.";
      if (!c.callerName) e[`call_${i}_callerName`] = "Required.";
      if (!c.status) e[`call_${i}_status`] = "Required.";
      if (leadType === "realestate" && c.status === SCHEDULE_VISIT_STATUS) {
        if (!c.visitDate) e[`call_${i}_visitDate`] = "Required.";
        if (!c.visitRemark?.trim()) e[`call_${i}_visitRemark`] = "Required.";
      }
    });

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
          referenceOf,
          projectName: leadType === "realestate" ? projectName : undefined,
          financeProduct: leadType === "finance" ? (financeProduct === "Other" ? customFinanceProduct : financeProduct) : undefined,
          loanAmount: leadType === "finance" ? loanAmount : undefined,
          passedOn: isPassedOnNeeded ? passedOn : "",
          propertyType: leadType === "realestate" ? (propertyType === "Other" ? customPropertyType : propertyType) : undefined,
          budget: leadType === "realestate" ? budget : undefined,
          preferredArea: leadType === "realestate" ? preferredArea : undefined,
          residentialSize: leadType === "realestate" ? residentialSize : undefined,
          residentialCategory: leadType === "realestate" ? residentialCategory : undefined,
          commercialType: leadType === "realestate" ? commercialType : undefined,
          calls: calls.map((call) => ({
            ...call,
            visitDate: leadType === "realestate" && call.status === SCHEDULE_VISIT_STATUS ? call.visitDate : "",
            visitRemark: leadType === "realestate" && call.status === SCHEDULE_VISIT_STATUS ? call.visitRemark : "",
          })),
        };

        await axios.put(`${API}/${editingLeadId}`, payload, sessionRequestConfig);
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
          propertyType: leadType === "realestate" ? (propertyType === "Other" ? customPropertyType : propertyType) : undefined,
          budget: leadType === "realestate" ? budget : undefined,
          preferredArea: leadType === "realestate" ? preferredArea : undefined,
          residentialSize: leadType === "realestate" ? residentialSize : undefined,
          residentialCategory: leadType === "realestate" ? residentialCategory : undefined,
          commercialType: leadType === "realestate" ? commercialType : undefined,
          calls: calls.map((call) => ({
            ...call,
            visitDate: leadType === "realestate" && call.status === SCHEDULE_VISIT_STATUS ? call.visitDate : "",
            visitRemark: leadType === "realestate" && call.status === SCHEDULE_VISIT_STATUS ? call.visitRemark : "",
          })),
        };

        await axios.post(API, payload, sessionRequestConfig);
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
    setLeadType(defaultLeadType);
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
    setCustomPropertyType("");
    setBudget("");
    setPreferredArea("");
    setResidentialSize("");
    setResidentialCategory("");
    setCommercialType("");
    setCalls([{ callingDate: TODAY, callerName: assignedManager, status: "", remarks: "", followUpDate: "", visitDate: "", visitRemark: "" }]);
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
    setPropertyType(lead.propertyType && !PROPERTY_TYPES.includes(lead.propertyType) ? "Other" : (lead.propertyType || ""));
    setCustomPropertyType(lead.propertyType && !PROPERTY_TYPES.includes(lead.propertyType) ? lead.propertyType : "");
    setBudget(lead.budget || "");
    setPreferredArea(lead.preferredArea || "");
    setResidentialSize(lead.residentialSize || "");
    setResidentialCategory(lead.residentialCategory || "");
    setCommercialType(lead.commercialType || "");

    // Load calls — if lead user has assignedManager, override caller name on all calls
    const formattedCalls = (lead.calls || []).map(c => ({
      callingDate: c.callingDate ? new Date(c.callingDate).toISOString().split("T")[0] : TODAY,
      callerName: assignedManager || c.callerName || c.manager || "",
      status: c.status || "",
      remarks: c.remarks || "",
      followUpDate: c.followUpDate ? new Date(c.followUpDate).toISOString().split("T")[0] : "",
      visitDate: c.visitDate ? new Date(c.visitDate).toISOString().split("T")[0] : "",
      visitRemark: c.visitRemark || "",
    }));
    setCalls(formattedCalls.length > 0 ? formattedCalls : [{ callingDate: TODAY, callerName: assignedManager, status: "", remarks: "", followUpDate: "", visitDate: "", visitRemark: "" }]);

    setErrors({});
  };

  const handleCancelEdit = () => {
    resetForm();
  };

  // canDownloadExcel: true for admin (no leadUser), or lead user with permission
  const canDownloadExcel = !leadUser || leadUser.canDownloadExcel === true;

  const handleExportToExcel = async (exportType) => {
    // exportType: "realestate" | "finance"
    const label = exportType === "finance" ? "Finance" : "Real Estate";
    const password = window.prompt(`Enter download password to export ${label} leads:`);
    if (password === null) return;

    try {
      // Verify password first
      const verify = await axios.post(`${API}/verify-password`, { password });
      if (!verify.data.success) {
        alert("Incorrect password. Export denied.");
        return;
      }

      // Download the filtered Excel
      const baseUrl = import.meta.env.VITE_API_URL;
      const endpoint = exportType === "finance"
        ? `${baseUrl}/api/realestate-leads/export/finance`
        : `${baseUrl}/api/realestate-leads/export/realestate`;

      const response = await axios.get(endpoint, {
        params: { password },
        ...sessionRequestConfig,
        responseType: "blob",
      });

      const fileName = exportType === "finance" ? "finance-leads.xlsx" : "realestate-leads.xlsx";
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err?.response?.data?.message || "Export failed. Please try again.");
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
            <div className="rl-title-actions">
              {isEditMode && (
                <button type="button" className="rl-cancel-edit-btn" onClick={handleCancelEdit}>
                  ✕ Cancel Edit
                </button>
              )}
              {leadUser && onLogout && (
                <div className="rl-user-bar">
                  <span className="rl-user-name">👤 {leadUser.displayName || leadUser.username}</span>
                  <button type="button" className="rl-logout-btn" onClick={onLogout}>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {/* Lead Type Selection — shown as a gate before the form when no type is selected */}
            {!isEditMode && !leadType && (
              <div className="rl-type-gate">
                <p className="rl-type-gate-label">Select Lead Type to continue</p>
                <div className="rl-type-gate-cards">
                  {allowedModules.includes("realestate") && (
                    <button
                      type="button"
                      className="rl-type-gate-card"
                      onClick={() => { setLeadType("realestate"); setFinanceProduct(""); setErrors({}); }}
                    >
                      <span className="rl-type-gate-icon">🏠</span>
                      <span className="rl-type-gate-title">Real Estate</span>
                      <span className="rl-type-gate-desc">Property leads & project visits</span>
                    </button>
                  )}
                  {allowedModules.includes("finance") && (
                    <button
                      type="button"
                      className="rl-type-gate-card rl-type-gate-card--finance"
                      onClick={() => { setLeadType("finance"); setProjectName(""); setErrors({}); }}
                    >
                      <span className="rl-type-gate-icon">💰</span>
                      <span className="rl-type-gate-title">Finance</span>
                      <span className="rl-type-gate-desc">Loan & finance product leads</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Lead Type badge + change button — shown once type is selected, in non-edit mode */}
            {!isEditMode && leadType && (
              <div className="rl-lead-type-row">
                <label className="rl-lead-type-label">Lead Type:</label>
                {allowedModules.includes("realestate") && (
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
                )}
                {allowedModules.includes("finance") && (
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
                )}
              </div>
            )}

            {/* Rest of form — only shown after lead type is selected */}
            {(isEditMode || leadType) && (<>

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
                  {!errors.customerNumber && duplicateNumberWarning && (
                    <span className="rl-warning">{duplicateNumberWarning}</span>
                  )}
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
                    <div className="rl-call-badge-wrap">
                      <span className="rl-call-badge-number">{idx + 1}</span>
                      <div className="rl-call-badge-copy">
                        <span className="rl-call-badge-label">Call Record</span>
                        <span className="rl-call-badge-subtitle">Interaction #{idx + 1}</span>
                      </div>
                    </div>
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
                      <label className="rl-label">Caller Name <span className="required-asterisk">*</span></label>
                      {assignedManager ? (
                        // Lead user with assigned caller name — show as read-only badge
                        <div className="rl-manager-locked">
                          <span className="rl-manager-locked-name">{assignedManager}</span>
                          <span className="rl-manager-locked-badge">Auto-assigned</span>
                        </div>
                      ) : (
                        // Admin or user without assigned caller name — free to choose
                        <select
                          value={call.callerName}
                          onChange={(e) => updateCall(idx, "callerName", e.target.value)}
                          className={`rl-input rl-select${errors[`call_${idx}_callerName`] ? " rl-input-error" : ""}`}
                        >
                          <option value="">Select Caller Name</option>
                          {managerOptions.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                      )}
                      {err(`call_${idx}_callerName`)}
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
                  {leadType === "realestate" && call.status === SCHEDULE_VISIT_STATUS && (
                    <div className="rl-grid-2" style={{ marginTop: "12px" }}>
                      <div className="rl-field">
                        <label className="rl-label">Visit Date <span className="required-asterisk">*</span></label>
                        <input
                          type="date"
                          value={call.visitDate}
                          onChange={(e) => updateCall(idx, "visitDate", e.target.value)}
                          className={`rl-input${errors[`call_${idx}_visitDate`] ? " rl-input-error" : ""}`}
                        />
                        {err(`call_${idx}_visitDate`)}
                      </div>
                      <div className="rl-field">
                        <label className="rl-label">Visit Remark <span className="required-asterisk">*</span></label>
                        <textarea
                          rows={1}
                          placeholder="Visit details..."
                          value={call.visitRemark}
                          onChange={(e) => updateCall(idx, "visitRemark", e.target.value)}
                          className={`rl-input rl-textarea${errors[`call_${idx}_visitRemark`] ? " rl-input-error" : ""}`}
                        />
                        {err(`call_${idx}_visitRemark`)}
                      </div>
                    </div>
                  )}
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
                    <label className="rl-label">Budget</label>
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
                    <label className="rl-label">Preferred Area</label>
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
                    <label className="rl-label">Property Type</label>
                    <select
                      value={propertyType}
                      onChange={(e) => { setPropertyType(e.target.value); if (e.target.value !== "Other") setCustomPropertyType(""); }}
                      className={`rl-input rl-select${errors.propertyType ? " rl-input-error" : ""}`}
                    >
                      <option value="">Select Type</option>
                      {propertyTypeOptions.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                    {propertyType === "Other" && (
                      <input
                        type="text"
                        placeholder="Specify property type"
                        value={customPropertyType}
                        onChange={(e) => setCustomPropertyType(e.target.value)}
                        className={`rl-input rl-other-input${errors.propertyType ? " rl-input-error" : ""}`}
                      />
                    )}
                    {err("propertyType")}
                  </div>
                  <div className="rl-field">
                    <label className="rl-label">Passed On</label>
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
                    <label className="rl-label">Product</label>
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
                      />
                    )}
                  </div>
                  <div className="rl-field">
                    <label className="rl-label">Required Loan Amount</label>
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
                    <label className="rl-label">Passed On</label>
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

            </>)}
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
                <h3>Caller Name Summary</h3>
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
                      <th>Caller Name</th>
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
        <div className="rl-list-section" ref={cardsTopRef}>
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
                {allowedModules.includes("realestate") && <option value="realestate">Real Estate</option>}
                {allowedModules.includes("finance") && <option value="finance">Finance</option>}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rl-input rl-filter-select"
              >
                <option value="All">All Status</option>
                {filterStatusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
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
              {/* ── Date Filter ── */}
              <div className="rl-date-filter-wrap">
                <div className="rl-date-filter-mode">
                  <button
                    type="button"
                    className={`rl-date-mode-btn${dateFilterMode === "range" ? " active" : ""}`}
                    onClick={() => { setDateFilterMode("range"); setDateSingle(""); }}
                  >
                    Range
                  </button>
                  <button
                    type="button"
                    className={`rl-date-mode-btn${dateFilterMode === "single" ? " active" : ""}`}
                    onClick={() => { setDateFilterMode("single"); setDateFrom(""); setDateTo(""); }}
                  >
                    Single
                  </button>
                </div>

                {dateFilterMode === "single" ? (
                  <div className="rl-date-inputs">
                    <input
                      type="date"
                      className="rl-input rl-date-input"
                      value={dateSingle}
                      onChange={(e) => setDateSingle(e.target.value)}
                      title="Filter by exact lead date"
                    />
                    {dateSingle && (
                      <button type="button" className="rl-date-clear" onClick={() => setDateSingle("")} title="Clear date">✕</button>
                    )}
                  </div>
                ) : (
                  <div className="rl-date-inputs">
                    <input
                      type="date"
                      className="rl-input rl-date-input"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      title="From date"
                      placeholder="From"
                    />
                    <span className="rl-date-sep">→</span>
                    <input
                      type="date"
                      className="rl-input rl-date-input"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      title="To date"
                      placeholder="To"
                    />
                    {(dateFrom || dateTo) && (
                      <button type="button" className="rl-date-clear" onClick={() => { setDateFrom(""); setDateTo(""); }} title="Clear dates">✕</button>
                    )}
                  </div>
                )}
              </div>

              {canDownloadExcel && (
                <>
                  <button
                    type="button"
                    onClick={() => handleExportToExcel("realestate")}
                    className="rl-export-btn"
                    title="Export Real Estate leads to Excel"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '5px' }}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    🏠 RE Excel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportToExcel("finance")}
                    className="rl-export-btn rl-export-btn--finance"
                    title="Export Finance leads to Excel"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '5px' }}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    💰 Fin Excel
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setIsSummaryOpen(true)}
                className="rl-summary-btn"
                title="Open caller name vs status call summary"
              >
                Summary
              </button>
            </div>
          </div>

          {!loadingLeads && (
            <div className="rl-results-count">
              Showing <strong>{showAllLeads ? filteredLeads.length : Math.min(CARDS_LIMIT, filteredLeads.length)}</strong> of <strong>{filteredLeads.length}</strong> leads
            </div>
          )}

          {loadingLeads ? (
            <div className="rl-loader-inline">
              <span>Fetching records...</span>
            </div>
          ) : (
            <>
              <div className="rl-record-grid">
                {filteredLeads.length === 0 ? (
                  <div className="rl-empty-list">No matches found.</div>
                ) : (
                  (showAllLeads ? filteredLeads : filteredLeads.slice(0, CARDS_LIMIT)).map((lead) => (
                  <div key={lead._id} className="rl-record-card">
                    {/* Header: First Caller Name */}
                    <div className={`rl-record-header ${lead.leadType === "finance" ? "rl-record-header--finance" : ""}`}>
                      <span className="rl-record-manager">{lead.assignedManager || lead.calls[0]?.callerName || lead.calls[0]?.manager || "No Agent"}</span>
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
                                    <span><span className="rl-history-meta-label">Caller Name: </span>{call.callerName || call.manager || "N/A"}</span>
                                    <span><span className="rl-history-meta-label">Status: </span>{call.status || "N/A"}</span>
                                    {call.followUpDate && <span className="rl-history-followup"><span className="rl-history-meta-label">Follow Up: </span>{formatDate(call.followUpDate)}</span>}
                                    {lead.leadType !== "finance" && call.visitDate && <span className="rl-history-followup"><span className="rl-history-meta-label">Visit Date: </span>{formatDate(call.visitDate)}</span>}
                                  </div>
                                  {call.remarks && <div className="rl-history-remarks"><span className="rl-history-meta-label">Remarks: </span>{call.remarks}</div>}
                                  {lead.leadType !== "finance" && call.visitRemark && <div className="rl-history-remarks"><span className="rl-history-meta-label">Visit Remark: </span>{call.visitRemark}</div>}
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

            {/* Show All / Show Less button */}
            {filteredLeads.length > CARDS_LIMIT && (
              <div style={{ textAlign: "center", margin: "24px 0 8px" }}>
                {!showAllLeads ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowAllLeads(true);
                      setTimeout(() => {
                        cardsTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }, 50);
                    }}
                    style={{
                      padding: "12px 32px",
                      background: "linear-gradient(135deg, #1e3a5f, #0e4d91)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      fontWeight: "700",
                      fontSize: "0.95rem",
                      cursor: "pointer",
                      boxShadow: "0 4px 12px rgba(14,77,145,0.25)",
                      transition: "opacity 0.2s",
                    }}
                    onMouseEnter={(e) => e.target.style.opacity = "0.88"}
                    onMouseLeave={(e) => e.target.style.opacity = "1"}
                  >
                    Show All {filteredLeads.length} Leads
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setShowAllLeads(false); }}
                    style={{
                      padding: "12px 32px",
                      background: "#f1f5f9",
                      color: "#475569",
                      border: "1.5px solid #cbd5e1",
                      borderRadius: "8px",
                      fontWeight: "700",
                      fontSize: "0.95rem",
                      cursor: "pointer",
                      transition: "opacity 0.2s",
                    }}
                    onMouseEnter={(e) => e.target.style.opacity = "0.75"}
                    onMouseLeave={(e) => e.target.style.opacity = "1"}
                  >
                    Show Less
                  </button>
                )}
                <p style={{ marginTop: "8px", fontSize: "0.8rem", color: "#94a3b8" }}>
                  {showAllLeads
                    ? `Showing all ${filteredLeads.length} leads`
                    : `Showing ${Math.min(CARDS_LIMIT, filteredLeads.length)} of ${filteredLeads.length} leads`}
                </p>
              </div>
            )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RealestateLeadForm;
