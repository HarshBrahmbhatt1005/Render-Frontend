import React, { useEffect, useState, useCallback, useRef } from "react";
import ChangesModal from "./ChangesModal";
import "../css/custForm.css";
import { FaCloudDownloadAlt, FaFilePdf } from "react-icons/fa";
import axios from "axios";
import generateApplicationPdf from "../services/applicationPdfService";



const CustForm = () => {

  const API = import.meta.env.VITE_API_URL;
  const initialFormData = {
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
    bankerContactNumber: "",
    bankerEmail: "",
    status: "",
    loginDate: "",
    sanctionDate: "",
    sanctionAmount: "",
    disbursedDate: "",
    loanNumber: "",
    disbursedAmount: "",
    insuranceOption: "",
    insuranceAmount: "",
    subventionOption: "",
    subventionAmount: "",
    sales: "",
    ref: "",
    sourceChannel: "",
    otherSourceChannel: "",
    remark: "", 
    approvalStatus: "",
    payout: "",
    expenceAmount: "",
    feesRefundAmount: "",
    propertyType: "",
    otherPropertyType: "",
    propertyDetails: "",
    mktValue: "",
    roi: "",
    processingFees: "",
    category: "",
    otherCategory: "",
    auditData: "",
    consulting: "",
    finalRemark: "", // Admin-only field
    consultingReceived: "", // Admin-only consulting fields
    consultingShared: "",
    consultingRemark: "",
    invoiceGeneratedBy: "", // Admin-only financial fields
    invoiceGeneratedByOther: "",
    payoutPercentage: "",
    subventionShortPayment: "",
    subventionRemark: "",
    // Financial Tracking fields
    invoiceGroupList: [{ 
      invoiceRaisedAmount: "", invoiceRaisedInvoiceNumber: "", invoiceRaisedDate: "",
      payoutReceivedAmount: "", payoutReceivedInvoiceNumber: "", payoutReceivedDate: "",
      gstReceivedAmount: "", gstReceivedInvoiceNumber: "", gstReceivedDate: "" 
    }],
    insurancePayoutStatus: "",
    insurancePayout: "",
    insurancePayoutInvoiceNumber: "",
    insurancePayoutDate: "",
    payoutPaidStatus: "",
    payoutPaidList: [{ 
      payoutPaidAmount: "", payoutPaidInvoiceNumber: "", payoutPaidDate: "", payoutPaidVendorName: "" 
    }],
    expensePaidStatus: "",
    expensePaid: "",
    expensePaidInvoiceNumber: "",
    expensePaidDate: "",
    expensePaidVendorName: "",
    hsApprovalStatus: "Pending", // HS approval status
    hsApprovedBy: "",
    hsApprovedAt: "",
    reloginReason: "",
    pdStatus: "",
    pdDate: "",
    rejectedRemark: "",
    withdrawRemark: "",
    holdRemark: "",
  };

  const safeFormatDate = (value) => {
    if (!value) return "";

    // yyyy-mm or yyyy-mm-dd both allowed
    if (value.length === 7) {
      const [year, month] = value.split("-");
      return `${month}-${year}`; // MM-YYYY
    }

    const d = new Date(value);
    if (isNaN(d)) return value; // show raw value if not parseable

    return d.toLocaleDateString("en-GB"); // dd/mm/yyyy
  };

  const [isApprovedLock, setIsApprovedLock] = useState(false);
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD for max date
  const [formData, setFormData] = useState(initialFormData);
  const [applications, setApplications] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    sales: "",
    status: "",
    customerName: "",
  });
  const [refFilter, setRefFilter] = useState("");
  const [importantChangeMsg, setImportantChangeMsg] = useState("");
  const [resetApproval, setResetApproval] = useState(false);
  const [showSanctionFields, setShowSanctionFields] = useState(false);
  const [pdfLoadingId, setPdfLoadingId] = useState(null);
  const [accountEditMode, setAccountEditMode] = useState(false); // Account edit mode
  const [accountEditId, setAccountEditId] = useState(null); // ID of record being edited in account mode
  const [expandedCards, setExpandedCards] = useState({}); // track which cards are expanded
  const [formChanges, setFormChanges] = useState({}); // store the diff: { field: { oldVal, newVal } }
  const [isChangesModalOpen, setIsChangesModalOpen] = useState(false);
  const initialDataRef = useRef(null);
  // map of appId -> changes diff, persists for the session so cards show their last edit
  const [recentChangesMap, setRecentChangesMap] = useState({});
  // the diff to display in the modal (set when user clicks View Changes on a card)
  const [selectedCardChanges, setSelectedCardChanges] = useState({});

  const importantFields = [
    "remark",
    "feesRefundAmount",
    "expenceAmount",
    "consulting",
    "processingFees",
    "payout",
    "status",
    "bankerContactNumber",
    "bankerEmail",
  ];

  const getDisplayChanges = useCallback((changes) => {
    if (!changes || typeof changes !== "object") return {};
    if (changes.status) {
      return { status: changes.status };
    }
    return changes;
  }, []);

  // Utility to format date (ISO → DD-MM-YYYY)
  const formatDateToIndian = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date)) return "";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear());
    return `${day}-${month}-${year}`;
  };

  // Utility to reverse (DD-MM-YYYY → YYYY-MM-DD) for input fields
  const parseIndianDate = (str) => {
    if (!str) return "";
    // If already in ISO format YYYY-MM-DD, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

    // If in DD-MM-YYYY convert to YYYY-MM-DD
    if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
      const [day, month, year] = str.split("-");
      return `${year}-${month}-${day}`;
    }

    // Fallback: try Date parsing and return ISO date part
    const d = new Date(str);
    if (!isNaN(d)) return d.toISOString().split("T")[0];

    // Unknown format, return original
    return str;
  };
  const formatIndianNumber = (numStr) => {
    if (!numStr) return "";
    const clean = numStr.toString().replace(/,/g, "");
    if (isNaN(clean) || clean === "") return "";
    return Number(clean).toLocaleString("en-IN");
  };

  

  const isFieldDisabled = (fieldName) => {
    // ✅ In account edit mode, only finalRemark and consulting fields are editable
    if (accountEditMode) {
      const accountEditableFields = ["finalRemark", "consultingReceived", "consultingShared", "consultingRemark", "invoiceGeneratedBy", "invoiceGeneratedByOther", "payoutPercentage", "subventionShortPayment", "subventionRemark", "invoiceGroupList", "insurancePayoutStatus", "insurancePayout", "insurancePayoutInvoiceNumber", "insurancePayoutDate", "payoutPaidStatus", "payoutPaid", "payoutPaidInvoiceNumber", "payoutPaidDate", "payoutPaidVendorName", "expensePaidStatus", "expensePaid", "expensePaidInvoiceNumber", "expensePaidDate", "expensePaidVendorName"];
      return !accountEditableFields.includes(fieldName);
    }

    // ✅ only run locking logic if record is actually approved
    if (isApprovedLock) {
      // these fields will still be editable even when approved
      const alwaysEditable = [
        "remark",
        "feesRefundAmount",
        "expenceAmount",
        "consulting",
        "processingFees",
        "payout",
        "status",
        "sanctionDate",
        "sanctionAmount",
        "disbursedDate",
        "loanNumber",
        "disbursedAmount",
        "bankerContactNumber",
        "bankerEmail",
        "insuranceOption",
        "insuranceAmount",
        "subventionOption",
        "subventionAmount",
        "partDisbursed",
        "reloginReason",
        "pdStatus",
        "pdDate",
        "rejectedRemark",
        "withdrawRemark",
        "holdRemark",
      ];
      return !alwaysEditable.includes(fieldName); // all others disabled
    }
    return false; // if not approved, everything editable
  };

  // =================== Helpers ===================
  const getFieldValue = (field, otherField) => {
    if (!field) return "";
    return field === "Other" ? otherField || "" : field;
  };

  const maskMobile = (mobile) => {
    if (!mobile) return "";
    const mobileStr = String(mobile);
    return mobileStr.length >= 4 ? "XXXXXX" + mobileStr.slice(-4) : mobileStr;
  };

  const finalFormData = () => ({
    ...formData,
    code: getFieldValue(formData.code, formData.otherCode),
    product: getFieldValue(formData.product, formData.otherProduct),
    sourceChannel: getFieldValue(
      formData.sourceChannel,
      formData.otherSourceChannel
    ),
    bank: getFieldValue(formData.bank, formData.otherBank),
    approvalStatus: resetApproval ? "" : formData.approvalStatus,
  });

  // =================== Fetch ===================
  const fetchApplications = async () => {
    try {
      console.log("Fetching applications from:", `${API}/api/applications`);
      const res = await axios.get(`${API}/api/applications`);
      console.log("Applications fetched:", res.data);
      setApplications(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching applications:", err);
      console.error("Error details:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      setApplications([]);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const filteredApps = applications.filter((app) => {
    // ✅ First check: loginDate must exist and be valid
    if (!app.loginDate) return false;
    
    const appDate = new Date(app.loginDate);
    
    // ✅ Check if date is valid
    if (isNaN(appDate.getTime())) return false;
    
    const from = filters.fromDate ? new Date(filters.fromDate) : null;
    const to = filters.toDate ? new Date(filters.toDate) : null;

    // ✅ Date range filtering - compare dates properly
    if (from) {
      // Set from date to start of day (00:00:00)
      from.setHours(0, 0, 0, 0);
      if (appDate < from) return false;
    }
    
    if (to) {
      // Set to date to end of day (23:59:59)
      to.setHours(23, 59, 59, 999);
      if (appDate > to) return false;
    }
    
    if (filters.sales && app.sales !== filters.sales) return false;
    if (filters.status && app.status !== filters.status) return false;
    
    // Customer name filter (case-insensitive, partial match)
    if (filters.customerName && !app.name?.toLowerCase().includes(filters.customerName.toLowerCase())) {
      return false;
    }

    return true;
  });

  // =================== Handlers ===================
  const handleChange = useCallback((e, index, field) => {
    const { name, value } = e.target;

    // ✅ Allow these fields even if approved
    const alwaysEditable = [
      "remark",
      "feesRefundAmount",
      "payout",
      "expenceAmount",
      "status",
      "sanctionDate",
      "sanctionAmount",
      "disbursedDate",
      "loanNumber",
      "disbursedAmount",
      "bankerContactNumber",
      "bankerEmail",
      "insuranceOption",
      "insuranceAmount",
      "subventionOption",
      "subventionAmount",
      "partDisbursed", // ✅ important
      "reloginReason",
      "pdStatus",
      "pdDate",
      "rejectedRemark",
      "withdrawRemark",
      "holdRemark",
    ];

    if (isApprovedLock && !alwaysEditable.includes(name)) return;

    // ✅ Amount fields that need Indian comma formatting
    const amountFields = [
      "amount",
      "sanctionAmount",
      "disbursedAmount",
      "insuranceAmount",
      "subventionAmount",
      "mktValue",
    ];

    // ✅ Handle amount fields
    if (amountFields.includes(name)) {
      let cleaned = value.replace(/,/g, ""); // remove commas
      if (!isNaN(cleaned) && cleaned !== "") {
        const formatted = Number(cleaned).toLocaleString("en-IN");
        setFormData((prev) => ({ ...prev, [name]: formatted }));
      } else if (cleaned === "") {
        setFormData((prev) => ({ ...prev, [name]: "" }));
      }
      return;
    }

    // ✅ Special logic for Part Disbursed inputs (date/amount)
    if (name === "partDisbursed") {
      setFormData((prev) => {
        const updated = [...(prev.partDisbursed || [])];
        updated[index] = {
          ...updated[index],
          [field]: value,
        };
        return { ...prev, partDisbursed: updated };
      });
      return;
    }

    // ✅ Mobile field (only digits, max 10)
    if (name === "mobile") {
      const onlyNums = value.replace(/[^0-9]/g, "");
      if (onlyNums.length <= 10)
        setFormData((prev) => ({ ...prev, [name]: onlyNums }));
      return;
    }

    // ✅ Default case (simple fields)
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, [isApprovedLock]);

  // Comparison helper to detect changes
  useEffect(() => {
    if (!initialDataRef.current || !editingId) {
      setFormChanges({});
      return;
    }

    const newChanges = {};
    const currentData = { ...formData };
    const initialData = { ...initialDataRef.current };

    // Standard fields comparison
    Object.keys(currentData).forEach(key => {
      // Skip internal fields or arrays (handled separately)
      if (key === 'partDisbursed' || key === 'auditData') return;
      
      const currentVal = String(currentData[key] || "").trim();
      const initialVal = String(initialData[key] || "").trim();
      
      if (currentVal !== initialVal) {
        newChanges[key] = { oldVal: initialVal, newVal: currentVal };
      }
    });

    // Special comparison for partDisbursed array
    const currentPD = currentData.partDisbursed || [];
    const initialPD = initialData.partDisbursed || [];
    
    if (JSON.stringify(currentPD) !== JSON.stringify(initialPD)) {
      newChanges['partDisbursed'] = { 
        oldVal: `${initialPD.length} part(s)`, 
        newVal: `${currentPD.length} part(s) changed` 
      };
    }

    setFormChanges(newChanges);
  }, [formData, editingId]);

  // ✅ Add new Part Disbursed row
  const handleAddPartDisbursed = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      partDisbursed: [
        ...(prev.partDisbursed || []),
        { date: "", amount: "" }, // use consistent key names
      ],
    }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.mobile && formData.mobile.length !== 10) {
      alert("Mobile number must be exactly 10 digits.");
      return;
    }

    // ✅ Handle Account Edit Mode - Only save finalRemark, consulting fields and set HG approval to pending
    if (accountEditMode) {
      // Validate consulting fields if consultingReceived is Yes
      if (formData.consultingReceived === "Yes") {
        if (!formData.consultingShared) {
          alert("Please select Consulting Shared (Yes/No).");
          return;
        }
        if (!formData.consultingRemark || !formData.consultingRemark.trim()) {
          alert("Please enter a Consulting Remark.");
          return;
        }
      }

      try {
        await axios.patch(`${API}/api/applications/${accountEditId}`, {
          finalRemark: formData.finalRemark,
          consultingReceived: formData.consultingReceived,
          consultingShared: formData.consultingReceived === "Yes" ? formData.consultingShared : "",
          consultingRemark: formData.consultingReceived === "Yes" ? formData.consultingRemark : "",
          hsApprovalStatus: "Pending", // Set HG approval to pending
          // Financial fields
          invoiceGeneratedBy: formData.invoiceGeneratedBy || "",
          invoiceGeneratedByOther: formData.invoiceGeneratedBy === "Other" ? formData.invoiceGeneratedByOther || "" : "",
          payoutPercentage: formData.payoutPercentage !== "" && formData.payoutPercentage !== null && formData.payoutPercentage !== undefined ? Number(formData.payoutPercentage) : null,
          subventionShortPayment: formData.subventionShortPayment || "",
          subventionRemark: formData.subventionShortPayment === "Yes" ? formData.subventionRemark || "" : "",
          // Financial tracking fields
          invoiceGroupList: (formData.invoiceGroupList || []).map((item) => ({
            invoiceRaisedAmount: item.invoiceRaisedAmount !== "" ? Number(item.invoiceRaisedAmount) || null : null,
            invoiceRaisedInvoiceNumber: item.invoiceRaisedInvoiceNumber || "",
            invoiceRaisedDate: item.invoiceRaisedDate || "",
            payoutReceivedAmount: item.payoutReceivedAmount !== "" ? Number(item.payoutReceivedAmount) || null : null,
            payoutReceivedInvoiceNumber: item.payoutReceivedInvoiceNumber || "",
            payoutReceivedDate: item.payoutReceivedDate || "",
            gstReceivedAmount: item.gstReceivedAmount !== "" ? Number(item.gstReceivedAmount) || null : null,
            gstReceivedInvoiceNumber: item.gstReceivedInvoiceNumber || "",
            gstReceivedDate: item.gstReceivedDate || "",
          })),
          insurancePayoutStatus: formData.insurancePayoutStatus || "",
          insurancePayout: formData.insurancePayout !== "" ? Number(formData.insurancePayout) || null : null,
          insurancePayoutInvoiceNumber: formData.insurancePayoutInvoiceNumber || "",
          insurancePayoutDate: formData.insurancePayoutDate || "",
          payoutPaidStatus: formData.payoutPaidStatus || "",
          payoutPaid: formData.payoutPaid !== "" ? Number(formData.payoutPaid) || null : null,
          payoutPaidInvoiceNumber: formData.payoutPaidInvoiceNumber || "",
          payoutPaidDate: formData.payoutPaidDate || "",
          payoutPaidVendorName: formData.payoutPaidVendorName || "",
          expensePaidStatus: formData.expensePaidStatus || "",
          expensePaid: formData.expensePaid !== "" ? Number(formData.expensePaid) || null : null,
          expensePaidInvoiceNumber: formData.expensePaidInvoiceNumber || "",
          expensePaidDate: formData.expensePaidDate || "",
          expensePaidVendorName: formData.expensePaidVendorName || "",
        });
        alert("✅ Final remark and financial data saved! HG approval is now pending.");
        setAccountEditMode(false);
        setAccountEditId(null);
        setFormData(initialFormData);
        fetchApplications();
      } catch (err) {
        console.error("❌ Error saving final remark:", err);
        alert("Failed to save final remark.");
      }
      return;
    }

    let resetApprovalLocal = false;
    let changedFields = [];
    let importantMsg = "";

    if (editingId) {
      const originalApp = applications.find((app) => app._id === editingId);

      if (originalApp) {
        importantFields.forEach((field) => {
          const newVal = (formData[field] || "").trim();
          const oldVal = (originalApp[field] || "").trim();
          if (newVal !== oldVal) {
            resetApprovalLocal = true;
            changedFields.push(field);
          }
        });

        if (resetApprovalLocal) {
          importantMsg = `⚠️ Important field changed (${changedFields.join(
            ", "
          )}), re-approval required.`;
        }
      }
    }

    const finalData = {
      ...formData,
      product:
        formData.product === "Other" && formData.otherProduct
          ? formData.otherProduct
          : formData.product,
      code:
        formData.code === "Other" && formData.otherCode
          ? formData.otherCode
          : formData.code,
      bank:
        formData.bank === "Other" && formData.otherBank
          ? formData.otherBank
          : formData.bank,
      sourceChannel:
        formData.sourceChannel === "Other" && formData.otherSourceChannel
          ? formData.otherSourceChannel
          : formData.sourceChannel,
      category:
        formData.category === "Other" && formData.otherCategory
          ? formData.otherCategory
          : formData.category,
      // normalize dates to ISO YYYY-MM-DD for backend
      loginDate: parseIndianDate(formData.loginDate),
      sanctionDate: parseIndianDate(formData.sanctionDate),
      disbursedDate: parseIndianDate(formData.disbursedDate),
      // ensure reloginReason is only sent when status is Re-Login
      reloginReason: formData.status === "Re-Login" ? formData.reloginReason || "" : "",
      // ensure pdStatus and pdDate are only sent when status is PD
      pdStatus: formData.status === "PD" ? formData.pdStatus || "" : "",
      pdDate: formData.status === "PD" ? parseIndianDate(formData.pdDate) : "",
      // ensure status-specific remarks are only sent when respective status is selected
      rejectedRemark: formData.status === "Rejected" ? formData.rejectedRemark || "" : "",
      withdrawRemark: formData.status === "Withdraw" ? formData.withdrawRemark || "" : "",
      holdRemark: formData.status === "Hold" ? formData.holdRemark || "" : "",
      // clean insurance amount - remove commas and ensure it's numeric
      insuranceAmount: formData.insuranceAmount ? formData.insuranceAmount.replace(/,/g, "") : "",
      // clean subvention amount - remove commas and ensure it's numeric
      subventionAmount: formData.subventionAmount ? formData.subventionAmount.replace(/,/g, "") : "",
      // new financial fields
      invoiceGeneratedBy: formData.invoiceGeneratedBy || "",
      invoiceGeneratedByOther: formData.invoiceGeneratedBy === "Other" ? formData.invoiceGeneratedByOther || "" : "",
      payoutPercentage: formData.payoutPercentage !== "" && formData.payoutPercentage !== null && formData.payoutPercentage !== undefined ? Number(formData.payoutPercentage) : null,
      subventionShortPayment: formData.subventionShortPayment || "",
      subventionRemark: formData.subventionShortPayment === "Yes" ? formData.subventionRemark || "" : "",
      // financial tracking fields
      invoiceGroupList: (formData.invoiceGroupList || []).map((item) => ({
        invoiceRaisedAmount: item.invoiceRaisedAmount !== "" ? Number(item.invoiceRaisedAmount) || null : null,
        invoiceRaisedInvoiceNumber: item.invoiceRaisedInvoiceNumber || "",
        invoiceRaisedDate: item.invoiceRaisedDate || "",
        payoutReceivedAmount: item.payoutReceivedAmount !== "" ? Number(item.payoutReceivedAmount) || null : null,
        payoutReceivedInvoiceNumber: item.payoutReceivedInvoiceNumber || "",
        payoutReceivedDate: item.payoutReceivedDate || "",
        gstReceivedAmount: item.gstReceivedAmount !== "" ? Number(item.gstReceivedAmount) || null : null,
        gstReceivedInvoiceNumber: item.gstReceivedInvoiceNumber || "",
        gstReceivedDate: item.gstReceivedDate || "",
      })),
      insurancePayoutStatus: formData.insurancePayoutStatus || "",
      insurancePayout: formData.insurancePayout !== "" ? Number(formData.insurancePayout) || null : null,
      insurancePayoutInvoiceNumber: formData.insurancePayoutInvoiceNumber || "",
      insurancePayoutDate: formData.insurancePayoutDate || "",
      payoutPaidStatus: formData.payoutPaidStatus || "",
      payoutPaidList: (formData.payoutPaidList || []).map((item) => ({
        payoutPaidAmount: item.payoutPaidAmount !== "" ? Number(item.payoutPaidAmount) || null : null,
        payoutPaidInvoiceNumber: item.payoutPaidInvoiceNumber || "",
        payoutPaidDate: item.payoutPaidDate || "",
        payoutPaidVendorName: item.payoutPaidVendorName || "",
      })),
      expensePaidStatus: formData.expensePaidStatus || "",
      expensePaid: formData.expensePaid !== "" ? Number(formData.expensePaid) || null : null,
      expensePaidInvoiceNumber: formData.expensePaidInvoiceNumber || "",
      expensePaidDate: formData.expensePaidDate || "",
      expensePaidVendorName: formData.expensePaidVendorName || "",
    };

    // Debug: show payload sent to server (remove in production)
    console.debug("Submitting application payload:", finalData);

    try {
      if (editingId) {
        const originalApp = applications.find((app) => app._id === editingId);
        
        // CUMULATIVE CHANGES LOGIC:
        // Merge the session's formChanges into any existing lastChanges on the record
        const existingChanges = originalApp?.lastChanges || {};
        const sessionChanges = formChanges;
        const mergedChanges = { ...existingChanges };

        Object.entries(sessionChanges).forEach(([field, diff]) => {
          if (mergedChanges[field]) {
            // If the user changed the field back to the very first 'oldVal', remove the change marker
            if (mergedChanges[field].oldVal === diff.newVal) {
              delete mergedChanges[field];
            } else {
              // Update the newest newVal, but keep the core original oldVal
              mergedChanges[field] = {
                oldVal: mergedChanges[field].oldVal,
                newVal: diff.newVal
              };
            }
          } else {
            // New field change detected this session
            mergedChanges[field] = diff;
          }
        });

        const hasAnyChanges = Object.keys(mergedChanges).length > 0;

        await axios.patch(`${API}/api/applications/${editingId}`, {
          ...finalData,
          approvalStatus: resetApprovalLocal
            ? "Pending"
            : formData.approvalStatus,
          importantMsg,
          // ✅ Persist merged cumulative changes
          lastChanges: hasAnyChanges ? mergedChanges : null,
          lastChangedAt: hasAnyChanges ? new Date().toISOString() : null,
        });
        alert("✅ Application updated!");
      } else if (accountEditMode && accountEditId) {
        await axios.patch(`${API}/api/applications/${accountEditId}`, finalData);
        alert("✅ Account Details Updated!");
      } else {
        await axios.post(`${API}/api/applications`, finalData);
        alert("✅ Application saved!");
      }

      setFormData(initialFormData);
      setEditingId(null);
      setAccountEditMode(false);
      setAccountEditId(null);
      setIsApprovedLock(false);
      initialDataRef.current = null;
      setFormChanges({});
      fetchApplications();
    } catch (err) {
      console.error("❌ Error saving application:", err);
      alert("Failed to save form.");
    }
  };

  const handleEdit = async (app) => {
    const salesName = app.sales || "";
    const password = prompt(`Enter password for ${salesName}:`);
    if (!password) return;

    try {
      const res = await axios.post(`${API}/api/verify-edit`, {
        sales: salesName,
        password,
      });

      if (res.data?.ok) {
        setEditingId(app._id);

        const formatDateForInput = (dateStr) => {
          if (!dateStr) return "";
          const d = new Date(dateStr);
          if (isNaN(d)) return "";
          return d.toISOString().split("T")[0]; // ✅ 'YYYY-MM-DD'
        };

        const formattedLoginDate = formatDateForInput(app.loginDate);
        const formattedDisbursedDate = formatDateForInput(app.disbursedDate);
        const formattedSanctionDate = formatDateForInput(app.sanctionDate);

        // ✅ Check approval lock
        const approved = app.approvalStatus === "Approved by SB";
        setIsApprovedLock(approved);

        // ✅ Format amount fields with Indian commas for display
        const formatAmountForDisplay = (value) => {
          if (!value || value === "") return "";
          const num = Number(String(value).replace(/,/g, ""));
          return isNaN(num) ? "" : num.toLocaleString("en-IN");
        };

        // ✅ Known option lists for each "Other" select field
        const knownCodes = ["Aadrika", "PARKER", "Sai Fakira"];
        const knownBanks = ["HDFC Bank HL","Aditya Birla Capital","Aditya Birla HFL","Axis Bank LTD","Bajaj Housing","Bank Of Baroda","HDFC Bank LAP","ICICI Bank LTD","ICICI HFC","IDBI Bank Ltd","Kotak Bank HL","Kotak Bank LAP","PNB Housing Finance LTD","Union Bank of India","Dutch Bank LTD","Godrej Finance LTD","HSBC Bank LTD","Jio Credit LTD","TATA Capital HFC"];
        const knownProducts = ["Home Loan","HL Top Up","HL BT + TOP Up","Commercial Purchase","LAP","Lap Top Up","Land PUR","PLOT + CONSTRUCTION","LRD Pur","Industrial Purchase","Inventory Funding","Project Loan"];
        const knownSourceChannels = ["Sai Fakira","Sahdev Bhavsar","Ravi Mandaliya","Hitendra Goswami","Pradeep Trivedi","Vinay Mishra","Dharmesh Bhavsar","Robins Kapadia","Hardik Bhavsar","Parag Shah","Dhaval Kataria","Niraj Gelot"];
        const knownCategories = ["salaried","self-employed"];

        // Helper: if saved value isn't in known list, treat as "Other" + populate otherX
        const resolveOtherField = (value, knownList) => {
          if (!value) return { select: "", other: "" };
          if (knownList.includes(value)) return { select: value, other: "" };
          return { select: "Other", other: value };
        };

        const resolvedCode = resolveOtherField(app.code, knownCodes);
        const resolvedBank = resolveOtherField(app.bank, knownBanks);
        const resolvedProduct = resolveOtherField(app.product, knownProducts);
        const resolvedSource = resolveOtherField(app.sourceChannel, knownSourceChannels);
        const resolvedCategory = resolveOtherField(app.category, knownCategories);

        // ✅ Always initialize partDisbursed properly
        setFormData({
          ...app,
           reloginReason: app.reloginReason || "",
           pdStatus: app.pdStatus || "",
           pdDate: app.pdDate ? formatDateForInput(app.pdDate) : "",
           rejectedRemark: app.rejectedRemark || "",
           withdrawRemark: app.withdrawRemark || "",
           holdRemark: app.holdRemark || "",
          loginDate: formattedLoginDate,
          sanctionDate: formattedSanctionDate,
          disbursedDate: formattedDisbursedDate,
          propertyType: app.propertyType || "",
          status: app.status || "",
          // ✅ Restore "Other" selects properly
          code: resolvedCode.select,
          otherCode: resolvedCode.other,
          bank: resolvedBank.select,
          otherBank: resolvedBank.other,
          product: resolvedProduct.select,
          otherProduct: resolvedProduct.other,
          sourceChannel: resolvedSource.select,
          otherSourceChannel: resolvedSource.other,
          category: resolvedCategory.select,
          otherCategory: resolvedCategory.other,
          // ✅ Format insurance and subvention amounts with commas
          insuranceAmount: formatAmountForDisplay(app.insuranceAmount),
          subventionAmount: formatAmountForDisplay(app.subventionAmount),
          // ✅ Format other amount fields
          amount: formatAmountForDisplay(app.amount),
          sanctionAmount: formatAmountForDisplay(app.sanctionAmount),
          disbursedAmount: formatAmountForDisplay(app.disbursedAmount),
          expenceAmount: app.expenceAmount || "",
          feesRefundAmount: app.feesRefundAmount || "",
          mktValue: formatAmountForDisplay(app.mktValue),
          partDisbursed: Array.isArray(app.partDisbursed)
            ? app.partDisbursed.map(part => ({
                ...part,
                date: part.date ? formatDateForInput(part.date) : "",
                amount: formatAmountForDisplay(part.amount)
              }))
            : [],
          invoiceGroupList: Array.isArray(app.invoiceGroupList) && app.invoiceGroupList.length > 0 
            ? app.invoiceGroupList.map(grp => ({
                invoiceRaisedAmount: grp.invoiceRaisedAmount || "",
                invoiceRaisedInvoiceNumber: grp.invoiceRaisedInvoiceNumber || "",
                invoiceRaisedDate: grp.invoiceRaisedDate ? formatDateForInput(grp.invoiceRaisedDate) : "",
                payoutReceivedAmount: grp.payoutReceivedAmount || "",
                payoutReceivedInvoiceNumber: grp.payoutReceivedInvoiceNumber || "",
                payoutReceivedDate: grp.payoutReceivedDate ? formatDateForInput(grp.payoutReceivedDate) : "",
                gstReceivedAmount: grp.gstReceivedAmount || "",
                gstReceivedInvoiceNumber: grp.gstReceivedInvoiceNumber || "",
                gstReceivedDate: grp.gstReceivedDate ? formatDateForInput(grp.gstReceivedDate) : ""
              }))
            : [{ 
                invoiceRaisedAmount: "", invoiceRaisedInvoiceNumber: "", invoiceRaisedDate: "",
                payoutReceivedAmount: "", payoutReceivedInvoiceNumber: "", payoutReceivedDate: "",
                gstReceivedAmount: "", gstReceivedInvoiceNumber: "", gstReceivedDate: "" 
              }],
          insurancePayoutStatus: app.insurancePayoutStatus || "",
          insurancePayout: app.insurancePayout || "",
          insurancePayoutInvoiceNumber: app.insurancePayoutInvoiceNumber || "",
          insurancePayoutDate: app.insurancePayoutDate ? formatDateForInput(app.insurancePayoutDate) : "",
          payoutPaidStatus: app.payoutPaidStatus || "",
          payoutPaidList: Array.isArray(app.payoutPaidList) && app.payoutPaidList.length > 0
            ? app.payoutPaidList.map(p => ({
                payoutPaidAmount: p.payoutPaidAmount || "",
                payoutPaidInvoiceNumber: p.payoutPaidInvoiceNumber || "",
                payoutPaidDate: p.payoutPaidDate ? formatDateForInput(p.payoutPaidDate) : "",
                payoutPaidVendorName: p.payoutPaidVendorName || ""
              }))
            : [{ payoutPaidAmount: "", payoutPaidInvoiceNumber: "", payoutPaidDate: "", payoutPaidVendorName: "" }],
          expensePaidStatus: app.expensePaidStatus || "",
          expensePaid: app.expensePaid || "",
          expensePaidInvoiceNumber: app.expensePaidInvoiceNumber || "",
          expensePaidDate: app.expensePaidDate ? formatDateForInput(app.expensePaidDate) : "",
          expensePaidVendorName: app.expensePaidVendorName || "",
        });

        // ✅ Capture the snapshot for change-tracking
        const snapshot = {
          ...app,
          reloginReason: app.reloginReason || "",
          pdStatus: app.pdStatus || "",
          pdDate: app.pdDate ? formatDateForInput(app.pdDate) : "",
          rejectedRemark: app.rejectedRemark || "",
          withdrawRemark: app.withdrawRemark || "",
          holdRemark: app.holdRemark || "",
          loginDate: formattedLoginDate,
          sanctionDate: formattedSanctionDate,
          disbursedDate: formattedDisbursedDate,
          propertyType: app.propertyType || "",
          status: app.status || "",
          code: resolvedCode.select,
          otherCode: resolvedCode.other,
          bank: resolvedBank.select,
          otherBank: resolvedBank.other,
          product: resolvedProduct.select,
          otherProduct: resolvedProduct.other,
          sourceChannel: resolvedSource.select,
          otherSourceChannel: resolvedSource.other,
          category: resolvedCategory.select,
          otherCategory: resolvedCategory.other,
          insuranceAmount: formatAmountForDisplay(app.insuranceAmount),
          subventionAmount: formatAmountForDisplay(app.subventionAmount),
          amount: formatAmountForDisplay(app.amount),
          sanctionAmount: formatAmountForDisplay(app.sanctionAmount),
          disbursedAmount: formatAmountForDisplay(app.disbursedAmount),
          expenceAmount: app.expenceAmount || "",
          feesRefundAmount: app.feesRefundAmount || "",
          mktValue: formatAmountForDisplay(app.mktValue),
          partDisbursed: Array.isArray(app.partDisbursed)
            ? app.partDisbursed.map(part => ({
                ...part,
                date: part.date ? formatDateForInput(part.date) : "",
                amount: formatAmountForDisplay(part.amount)
              }))
            : [],
          invoiceGroupList: Array.isArray(app.invoiceGroupList) ? JSON.parse(JSON.stringify(app.invoiceGroupList)) : [],
          insurancePayoutStatus: app.insurancePayoutStatus || "",
          insurancePayout: app.insurancePayout || "",
          insurancePayoutInvoiceNumber: app.insurancePayoutInvoiceNumber || "",
          insurancePayoutDate: app.insurancePayoutDate ? formatDateForInput(app.insurancePayoutDate) : "",
          payoutPaidStatus: app.payoutPaidStatus || "",
          payoutPaidList: Array.isArray(app.payoutPaidList) ? JSON.parse(JSON.stringify(app.payoutPaidList)) : [],
          expensePaidStatus: app.expensePaidStatus || "",
          expensePaid: app.expensePaid || "",
          expensePaidInvoiceNumber: app.expensePaidInvoiceNumber || "",
          expensePaidDate: app.expensePaidDate ? formatDateForInput(app.expensePaidDate) : "",
          expensePaidVendorName: app.expensePaidVendorName || "",
        };
        initialDataRef.current = snapshot;
        setFormChanges({});

        setImportantChangeMsg("");
        setResetApproval(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        alert("Verification failed. Try again or contact admin.");
      }
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) {
        alert("❌ Invalid password. You are not allowed to edit this record.");
      } else if (status === 404) {
        alert(
          `⚠️ No password configured for ${salesName}. Contact admin to set a password.`
        );
      } else {
        console.error("verify-edit error:", err);
        alert("Server error while verifying. Please try again later.");
      }
    }
  };

  // =================== ACCOUNT EDIT (for Disbursed/Part Disbursed) ===================
  const handleAccountEdit = async (app) => {
    const password = prompt("Enter admin password for account edit:");
    if (!password) return;

    try {
      // Verify admin password using dedicated endpoint
      const response = await axios.post(`${API}/api/verify-admin`, { 
        password: password 
      });
      
      if (response.data.ok) {
        // Password correct, enable account edit mode
        setAccountEditMode(true);
        setAccountEditId(app._id);

        // Format dates and amounts
        const formatDateForInput = (dateStr) => {
          if (!dateStr) return "";
          const d = new Date(dateStr);
          if (isNaN(d)) return "";
          return d.toISOString().split("T")[0];
        };

        const formatAmountForDisplay = (value) => {
          if (!value || value === "") return "";
          const num = Number(String(value).replace(/,/g, ""));
          return isNaN(num) ? "" : num.toLocaleString("en-IN");
        };

        // Load the application data
        setFormData({
          ...app,
          loginDate: formatDateForInput(app.loginDate),
          sanctionDate: formatDateForInput(app.sanctionDate),
          disbursedDate: formatDateForInput(app.disbursedDate),
          pdDate: app.pdDate ? formatDateForInput(app.pdDate) : "",
          insuranceAmount: formatAmountForDisplay(app.insuranceAmount),
          subventionAmount: formatAmountForDisplay(app.subventionAmount),
          amount: formatAmountForDisplay(app.amount),
          sanctionAmount: formatAmountForDisplay(app.sanctionAmount),
          disbursedAmount: formatAmountForDisplay(app.disbursedAmount),
          expenceAmount: app.expenceAmount || "",
          feesRefundAmount: app.feesRefundAmount || "",
          mktValue: formatAmountForDisplay(app.mktValue),
          partDisbursed: Array.isArray(app.partDisbursed)
            ? app.partDisbursed.map(part => ({
                ...part,
                date: part.date ? formatDateForInput(part.date) : "",
                amount: formatAmountForDisplay(part.amount)
              }))
            : [],
          // Load existing consulting fields
          consultingReceived: app.consultingReceived || "",
          consultingShared: app.consultingShared || "",
          consultingRemark: app.consultingRemark || "",
          invoiceGroupList: Array.isArray(app.invoiceGroupList) && app.invoiceGroupList.length > 0 
            ? app.invoiceGroupList.map(grp => ({
                invoiceRaisedAmount: grp.invoiceRaisedAmount || "",
                invoiceRaisedInvoiceNumber: grp.invoiceRaisedInvoiceNumber || "",
                invoiceRaisedDate: grp.invoiceRaisedDate ? formatDateForInput(grp.invoiceRaisedDate) : "",
                payoutReceivedAmount: grp.payoutReceivedAmount || "",
                payoutReceivedInvoiceNumber: grp.payoutReceivedInvoiceNumber || "",
                payoutReceivedDate: grp.payoutReceivedDate ? formatDateForInput(grp.payoutReceivedDate) : "",
                gstReceivedAmount: grp.gstReceivedAmount || "",
                gstReceivedInvoiceNumber: grp.gstReceivedInvoiceNumber || "",
                gstReceivedDate: grp.gstReceivedDate ? formatDateForInput(grp.gstReceivedDate) : ""
              }))
            : [{ 
                invoiceRaisedAmount: "", invoiceRaisedInvoiceNumber: "", invoiceRaisedDate: "",
                payoutReceivedAmount: "", payoutReceivedInvoiceNumber: "", payoutReceivedDate: "",
                gstReceivedAmount: "", gstReceivedInvoiceNumber: "", gstReceivedDate: "" 
              }],
          insurancePayoutStatus: app.insurancePayoutStatus || "",
          insurancePayout: app.insurancePayout || "",
          insurancePayoutInvoiceNumber: app.insurancePayoutInvoiceNumber || "",
          insurancePayoutDate: app.insurancePayoutDate ? formatDateForInput(app.insurancePayoutDate) : "",
          payoutPaidStatus: app.payoutPaidStatus || "",
          payoutPaidList: Array.isArray(app.payoutPaidList) && app.payoutPaidList.length > 0
            ? app.payoutPaidList.map(p => ({
                payoutPaidAmount: p.payoutPaidAmount || "",
                payoutPaidInvoiceNumber: p.payoutPaidInvoiceNumber || "",
                payoutPaidDate: p.payoutPaidDate ? formatDateForInput(p.payoutPaidDate) : "",
                payoutPaidVendorName: p.payoutPaidVendorName || ""
              }))
            : [{ payoutPaidAmount: "", payoutPaidInvoiceNumber: "", payoutPaidDate: "", payoutPaidVendorName: "" }],
          expensePaidStatus: app.expensePaidStatus || "",
          expensePaid: app.expensePaid || "",
          expensePaidInvoiceNumber: app.expensePaidInvoiceNumber || "",
          expensePaidDate: app.expensePaidDate ? formatDateForInput(app.expensePaidDate) : "",
          expensePaidVendorName: app.expensePaidVendorName || "",
        });

        setTimeout(() => {
          const el = document.getElementById("admin-edit-section");
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      } else {
        alert("❌ Invalid admin password.");
      }
    } catch (err) {
      console.error("Account edit verification failed:", err);
      if (err.response?.status === 401) {
        alert("❌ Invalid admin password. Access denied.");
      } else if (err.response?.status === 404) {
        alert("❌ Admin password verification endpoint not found. Please contact support.");
      } else {
        alert("❌ Admin password verification failed. Please try again.");
      }
    }
  };

  const handleApprove = async (id) => {
    const password = prompt("Enter approval password:");
    if (!password) return;

    try {
      await axios.patch(`${API}/api/applications/${id}/approve`, { password });
      // clear important message after approval
      await axios.patch(`${API}/api/applications/${id}`, { importantMsg: "" });
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

  // =================== HG APPROVAL (Hitendra Goswami) ===================
  const handleHSApprove = async (id) => {
    const password = prompt("Enter HG approval password:");
    if (!password) return;

    try {
      const response = await axios.post(`${API}/api/verify-hs`, { 
        password: password 
      });
      
      if (response.data.ok) {
        // Password correct, approve the record
        await axios.patch(`${API}/api/applications/${id}`, {
          hsApprovalStatus: "Approved",
          hsApprovedBy: "HS",
          hsApprovedAt: new Date().toISOString(),
        });
        alert("✅ HG Approval granted!");
        fetchApplications();
      } else {
        alert("❌ Invalid HG password.");
      }
    } catch (err) {
      console.error("HG approval failed:", err);
      if (err.response?.status === 401) {
        alert("❌ Invalid HG password.");
      } else {
        alert("❌ HG approval failed. Please try again.");
      }
    }
  };

  const handleHSReject = async (id) => {
    const password = prompt("Enter HG approval password:");
    if (!password) return;

    try {
      const response = await axios.post(`${API}/api/verify-hs`, { 
        password: password 
      });
      
      if (response.data.ok) {
        // Password correct, reject the record
        const reason = prompt("Enter rejection reason:");
        if (!reason) return;
        
        await axios.patch(`${API}/api/applications/${id}`, {
          hsApprovalStatus: "Rejected",
          hsApprovedBy: "HS",
          hsApprovedAt: new Date().toISOString(),
          hsRejectionReason: reason,
        });
        alert("❌ HG Approval rejected!");
        fetchApplications();
      } else {
        alert("❌ Invalid HG password.");
      }
    } catch (err) {
      console.error("HG rejection failed:", err);
      if (err.response?.status === 401) {
        alert("❌ Invalid HG password.");
      } else {
        alert("❌ HG rejection failed. Please try again.");
      }
    }
  };

  // =================== Account Excel Download ===================
  const handleAccountExcelDownload = async () => {
    const password = prompt("Enter download password:");
    if (!password) return;

    try {
      const response = await axios.get(`${API}/api/export/account-excel`, {
        params: { password },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `account_data_${new Date().toISOString().split("T")[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || "Unknown error";
      alert("Account Excel export failed: " + errorMessage);
    }
  };

  // =================== Excel Downloads ===================
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

  // =================== PDF Download ===================
  const handlePdfDownload = async (id) => {
    try {
      setPdfLoadingId(id);
      console.log("Fetching application with ID:", id);
      const response = await axios.get(`${API}/api/applications/${id}`);
      console.log("Backend response data:", response.data);
      console.log("Insurance data from backend:", {
        insuranceOption: response.data.insuranceOption,
        insuranceAmount: response.data.insuranceAmount,
      });
      generateApplicationPdf(response.data);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Unable to generate PDF. Please try again after the application data loads.");
    } finally {
      setPdfLoadingId(null);
    }
  };

  const handleExportRef = async () => {
    if (!refFilter) {
      alert("Select a Sales to download Excel.");
      return;
    }
    
    // Trim whitespace to ensure clean value
    const salesPerson = refFilter.trim();
    
    if (!salesPerson) {
      alert("Sales person name cannot be empty.");
      return;
    }
    
    const password = prompt(`Enter password for ${salesPerson}:`);
    if (!password) return;

    try {
      console.log("Exporting Excel for sales person:", salesPerson); // Debug log
      
      const response = await axios.get(`${API}/api/export/excel`, {
        params: { 
          password: password.trim(), 
          ref: salesPerson,
          salesPerson: salesPerson,
          sales: salesPerson
        },
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
      console.error("Export error details:", err.response || err); // Enhanced debug log
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || "Unknown error occurred";
      alert("Export failed: " + errorMessage);
    }
  };

  // =================== Monthly Excel Download ===================
  const [selectedMonth, setSelectedMonth] = useState("");
  const [monthlyExcelLoading, setMonthlyExcelLoading] = useState(false);

  const handleMonthlyExcelDownload = async () => {
    // Validate month is selected
    if (!selectedMonth) {
      alert("Please select a month");
      return;
    }

    // Validate month format (YYYY-MM)
    const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
    if (!monthRegex.test(selectedMonth)) {
      alert("Invalid month format. Please use YYYY-MM format.");
      return;
    }

    // Prompt for password (consistent with other Excel exports)
    const password = prompt("Enter password to download monthly report:");
    if (!password) return;

    setMonthlyExcelLoading(true);

    try {
      const response = await axios.get(`${API}/api/customer/monthly-excel`, {
        params: { 
          month: selectedMonth,
          password: password.trim()
        },
        responseType: "blob",
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Customer_Report_${selectedMonth}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      // Clean up
      window.URL.revokeObjectURL(url);
      
      alert(`✅ Monthly report for ${selectedMonth} downloaded successfully!`);
    } catch (err) {
      console.error("Monthly Excel download error:", err);
      
      // Handle blob error response (backend sends JSON error in blob format)
      if (err.response && err.response.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const errorData = JSON.parse(text);
          alert(`❌ Export failed: ${errorData.error || errorData.message || "Unknown error"}`);
        } catch (parseError) {
          alert(`❌ Export failed: Server returned status ${err.response.status}. The monthly Excel endpoint may not be implemented on the backend yet.`);
        }
      } else {
        const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || "Failed to generate monthly report";
        alert(`❌ Export failed: ${errorMessage}\n\nNote: If this persists, the backend endpoint may need to be implemented. See MONTHLY_EXCEL_BACKEND_GUIDE.txt for implementation details.`);
      }
    } finally {
      setMonthlyExcelLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.keyCode === 13) {
      e.preventDefault();
      const form = e.target.form;
      const index = Array.prototype.indexOf.call(form, e.target);
      const nextInput = form.elements[index + 1];
      if (nextInput) {
        nextInput.focus();
      } else {
        e.target.blur(); // last field me keyboard band ho jaye
      }
    }
  };
const formatAmount = (value) => {
  if (!value) return "0";
  return new Intl.NumberFormat("en-IN").format(Number(value));
};

  const hasChanges = editingId && Object.keys(formChanges).length > 0;
  const changeCount = Object.keys(formChanges).length;

  return (
    <div className="form-container">
      <div className="form-title-row">
        <h2 className="form-title">Customer Login Form</h2>
        {hasChanges && (
          <div className="change-tracker-area">
            <span className="change-indicator-badge">
              <span className="change-dot"></span>
              {changeCount} unsaved change{changeCount !== 1 ? 's' : ''}
            </span>
            <button
              type="button"
              className="view-changes-btn"
              onClick={() => setIsChangesModalOpen(true)}
            >
              👁 View Changes
            </button>
          </div>
        )}
      </div>
      
      {/* Add CSS for PDF button spinner animation */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      
      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>

        {/* ── Section: Applicant Info ── */}
        <div className="cf-section-card">
        <div className="cf-section-header">👤 Applicant Information</div>
        <div className="cf-grid">
          <div>
            {/* Name */} <label>Applicant Name</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Enter applicant name" disabled={isFieldDisabled("name")} required />
          </div>
          <div>
            {/* Mobile */} <label>Applicant Mobile No</label>
            <input type="tel" name="mobile" placeholder="Enter applicant Mobile num" value={formData.mobile} onChange={handleChange} disabled={isFieldDisabled("mobile")} required />
          </div>
          <div>
            {/* Email */} <label>Email</label>
            <input type="email" name="email" placeholder="Enter Email" value={formData.email} onChange={handleChange} disabled={isFieldDisabled("email")} required />
          </div>
        </div>

        {/* Sales */}
        <div style={{padding: "0 20px 20px"}}>
        <label>Sales</label>
        <div className="radio-group">
          {[
            "Vinay Mishra",
            "Robins Kapadia",
            "Dharmesh Bhavsar",
            "Hardik Bhavsar",
            "Dhaval Kataria",
            "Parag Shah",
          ].map((salesPerson) => (
            <label key={salesPerson}>
              <input
                className="sales-radio"
                type="radio"
                name="sales"
                value={salesPerson}
                checked={formData.sales === salesPerson}
                disabled={isFieldDisabled("sales")}
                onChange={handleChange}
              />
              {salesPerson}
            </label>
          ))}
        </div>
        </div>
        </div>{/* end cf-section-card: Applicant Info */}

        {/* ── Section: Loan Details ── */}
        <div className="cf-section-card">
        <div className="cf-section-header">🏦 Loan Details</div>
        <div className="cf-grid">
          <div>
            {/* Ref */} <label>Reference</label>
            <input list="Options" name="ref" value={formData.ref} onChange={handleChange} placeholder="Select or type reference" disabled={isFieldDisabled("ref")} required />
          </div>
          <div>
            {/* Source Channel */}
            <label>Source Channel</label>
            <select name="sourceChannel" value={formData.sourceChannel} onChange={handleChange} disabled={isFieldDisabled("sourceChannel")} required>
              <option value="">Select Source</option>
              <option value="Sai Fakira">Sai Fakira</option>
              <option value="Sahdev Bhavsar">Sahdev Bhavsar</option>
              <option value="Ravi Mandaliya">Ravi Mandaliya</option>
              <option value="Hitendra Goswami">Hitendra Goswami</option>
              <option value="Pradeep Trivedi">Pradeep Trivedi</option>
              <option value="Vinay Mishra">Vinay Mishra</option>
              <option value="Dharmesh Bhavsar">Dharmesh Bhavsar</option>
              <option value="Robins Kapadia">Robins Kapadia</option>
              <option value="Hardik Bhavsar">Hardik Bhavsar</option>
              <option value="Parag Shah">Parag Shah</option>
              <option value="Dhaval Kataria">Dhaval Kataria</option>
              <option value="Other">Other</option>
            </select>
            {formData.sourceChannel === "Other" && (
              <input type="text" placeholder="Enter other Source" name="otherSourceChannel" value={formData.otherSourceChannel} disabled={isApprovedLock} onChange={(e) => setFormData({ ...formData, otherSourceChannel: e.target.value })} required />
            )}
          </div>
          <div>
            {/* Code */} <label>Code</label>
            <select name="code" value={formData.code} onChange={handleChange} disabled={isFieldDisabled("code")} required>
              <option value="">Select Code</option>
              <option value="Aadrika">AADRIKA</option>
              <option value="PARKER">PARKER</option>
              <option value="Sai Fakira">SAI FAKIRA</option>
              <option value="Other">Other</option>
            </select>
            {formData.code === "Other" && (
              <input type="text" name="otherCode" placeholder="Enter Other Code" value={formData.otherCode || ""} onChange={handleChange} disabled={isFieldDisabled("otherCode")} required />
            )}
          </div>
        </div>
        <div className="cf-grid">
          <div>
            {/* Bank */} <label>Bank</label>
            <select
          name="bank"
          value={formData.bank}
          onChange={handleChange}
          disabled={isFieldDisabled("bank")}
          required
        >
          <option value="">Select Bank</option>
          <option value="HDFC Bank HL">HDFC Bank HL</option>
          <option value="Aditya Birla Capital">Aditya Birla Capital</option>
          <option value="Aditya Birla HFL">Aditya Birla HFL</option>
          <option value="Axis Bank LTD">Axis Bank LTD</option>
          <option value="Bajaj Housing">Bajaj Housing</option>
          <option value="Bank Of Baroda">Bank Of Baroda</option>
          <option value="HDFC Bank LAP">HDFC Bank LAP</option>
          <option value="ICICI Bank LTD">ICICI Bank LTD</option>
          <option value="ICICI HFC">ICICI HFC</option>
          <option value="IDBI Bank Ltd">IDBI Bank Ltd</option>
          <option value="Kotak Bank HL">Kotak Bank HL</option>
          <option value="Kotak Bank LAP">Kotak Bank LAP</option>
          <option value="PNB Housing Finance LTD">PNB Housing Finance LTD</option>
          <option value="Union Bank of India">Union Bank of India</option>
          <option value="Dutch Bank LTD">Dutch Bank LTD</option>
          <option value="Godrej Finance LTD">Godrej Finance LTD</option>
          <option value="HSBC Bank LTD">HSBC Bank LTD</option>
          <option value="Jio Credit LTD">Jio Credit LTD</option>
          <option value="TATA Capital HFC">TATA Capital HFC</option>
          <option value="Other">Other</option>
        </select>
        {formData.bank === "Other" && (
          <input type="text" placeholder="Enter Bank" value={formData.otherBank} disabled={isFieldDisabled("otherBank")} onChange={(e) => setFormData({ ...formData, otherBank: e.target.value })} />
        )}
          </div>
          <div>
            {/* Banker Name */} <label>Banker Name</label>
            <input name="bankerName" placeholder="Enter Banker Name" value={formData.bankerName} onChange={handleChange} disabled={isFieldDisabled("bankerName")} required />
          </div>
          <div>
            {/* Banker Contact Number */}
            <label>Banker Contact Number</label>
            <input type="tel" name="bankerContactNumber" placeholder="Enter Banker Contact Number" value={formData.bankerContactNumber}
              onChange={(e) => { const value = e.target.value.replace(/\D/g, "").slice(0, 10); setFormData((prev) => ({ ...prev, bankerContactNumber: value })); }}
              inputMode="numeric" pattern="\d{10}" maxLength={10} disabled={isFieldDisabled("bankerContactNumber")} />
          </div>
          <div>
            {/* Banker Email */}
            <label>Banker Email</label>
            <input type="email" name="bankerEmail" placeholder="Enter Banker Email" value={formData.bankerEmail} onChange={handleChange} disabled={isFieldDisabled("bankerEmail")} />
          </div>
        </div>
        </div>{/* end cf-section-card: Loan Details */}

        {/* ── Section: Status ── */}
        <div className="cf-section-card">
        <div className="cf-section-header">📋 Status</div>
        {/* ===== STATUS ===== */}
        <label>Status</label>
        <div className="radio-group">
          {[
            "Login",
            "PD",
            "Sanction",
            "Disbursed",
            "Part Disbursed",
            "Re-Login",
            "Rejected",
            "Withdraw",
            "Hold",
          ].map((opt) => {
            // Determine which statuses are selectable based on workflow rules
            let statusDisabled = isFieldDisabled("status");
            if (!statusDisabled) {
              if (!editingId) {
                // New entry: only Login allowed
                statusDisabled = opt !== "Login";
              } else {
                // Editing: enforce progression rules
                const currentStatus = applications.find(a => a._id === editingId)?.status || formData.status;
                const pdDone = ["PD", "Sanction", "Disbursed", "Part Disbursed"].includes(currentStatus);
                const sanctionDone = ["Sanction", "Disbursed", "Part Disbursed"].includes(currentStatus);
                if (opt === "Sanction" && !pdDone) statusDisabled = true;
                if ((opt === "Disbursed" || opt === "Part Disbursed") && !sanctionDone) statusDisabled = true;
              }
            }
            return (
              <label key={opt} style={statusDisabled && opt !== formData.status ? { opacity: 0.4, cursor: "not-allowed" } : {}}>
                <input
                  className="sales-radio"
                  type="radio"
                  name="status"
                  value={opt}
                  checked={formData.status === opt}
                  onChange={handleChange}
                  disabled={statusDisabled}
                />
                {opt}
              </label>
            );
          })}
        </div>
        {/* ===== PD SECTION (only when status = PD) ===== */}
        {formData.status === "PD" && (
          <>
            <label>PD Status</label>
            <div className="radio-group">
              {["Yes", "No"].map((opt) => (
                <label key={opt}>
                  <input
                    type="radio"
                    name="pdStatus"
                    value={opt}
                    checked={formData.pdStatus === opt}
                    onChange={handleChange}
                    disabled={isFieldDisabled("pdStatus")}
                  />
                  {opt}
                </label>
              ))}
            </div>

            <label>PD Date</label>
            <input
              type="date"
              name="pdDate"
              value={formData.pdDate || ""}
              max={today}
              onChange={handleChange}
              disabled={isFieldDisabled("pdDate")}
              required
            />
          </>
        )}
        {/* ===== REJECTED REMARK (only when status = Rejected) ===== */}
        {formData.status === "Rejected" && (
          <>
            <label>Rejected Remark</label>
            <textarea
              name="rejectedRemark"
              placeholder="Enter reason for rejection"
              value={formData.rejectedRemark || ""}
              onChange={handleChange}
              disabled={isFieldDisabled("rejectedRemark")}
              rows="3"
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #ccc",
                fontSize: "14px",
              }}
              required
            />
          </>
        )}
        {/* ===== WITHDRAW REMARK (only when status = Withdraw) ===== */}
        {formData.status === "Withdraw" && (
          <>
            <label>Withdraw Remark</label>
            <textarea
              name="withdrawRemark"
              placeholder="Enter reason for withdrawal"
              value={formData.withdrawRemark || ""}
              onChange={handleChange}
              disabled={isFieldDisabled("withdrawRemark")}
              rows="3"
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #ccc",
                fontSize: "14px",
              }}
              required
            />
          </>
        )}
        {/* ===== HOLD REMARK (only when status = Hold) ===== */}
        {formData.status === "Hold" && (
          <>
            <label>Hold Remark</label>
            <textarea
              name="holdRemark"
              placeholder="Enter reason for hold"
              value={formData.holdRemark || ""}
              onChange={handleChange}
              disabled={isFieldDisabled("holdRemark")}
              rows="3"
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #ccc",
                fontSize: "14px",
              }}
              required
            />
          </>
        )}
        {/* ===== SANCTION FIELDS (only when status = Sanction) ===== */}
        {formData.status === "Sanction" && (
          <>
            <label>Sanction Date</label>
            <input
              type="date"
              name="sanctionDate"
              value={formData.sanctionDate || ""}
              max={today}
              onChange={handleChange}
              disabled={isFieldDisabled("sanctionDate")}
              required
            />

            <label>Sanction Amount</label>
            <input
              type="text"
              inputMode="numeric"
              name="sanctionAmount"
              placeholder="Enter sanction amount"
              value={formData.sanctionAmount || ""}
              onChange={handleChange}
              disabled={isFieldDisabled("sanctionAmount")}
              required
            />
          </>
        )}
        {/* ===== DISBURSED SECTION ===== */}
        {formData.status === "Disbursed" && (
          <>
            <label>Disbursed Date</label>
            <input
              type="date"
              name="disbursedDate"
              value={formData.disbursedDate || ""}
              max={today}
              onChange={handleChange}
              disabled={isFieldDisabled("disbursedDate")}
              required
            />

            <label>Disbursed Amount</label>
            <input
              type="text"
              inputMode="numeric"
              name="disbursedAmount"
              placeholder="Enter disbursed amount"
              value={formData.disbursedAmount || ""}
              onChange={handleChange}
              disabled={isFieldDisabled("disbursedAmount")}
              required
            />
            {/* ✅ New Field: Loan Amount (alphanumeric) */}
            <label>Loan Account Number</label>
            <input
              type="text"
              name="loanNumber"
              placeholder="Enter LAN (e.g., ABC123/456.789)"
              value={formData.loanNumber || ""}
              onChange={handleChange}
              disabled={isFieldDisabled("loanNumber")}
              title="Alphanumeric with symbols (/, ., -, etc.) allowed"
              required
            />
            <label>Insurance Amount?</label>
            <div className="radio-group">
              {["Yes", "No"].map((opt) => (
                <label key={opt}>
                  <input
                    type="radio"
                    name="insuranceOption"
                    value={opt}
                    checked={formData.insuranceOption === opt}
                    onChange={handleChange}
                    disabled={isFieldDisabled("insuranceOption")}
                  />
                  {opt}
                </label>
              ))}
            </div>

            {formData.insuranceOption === "Yes" && (
              <>
                <label>Insurance Amount</label>
                <input
                  type="text"
                  inputMode="numeric"
                  name="insuranceAmount"
                  placeholder="Enter insurance amount"
                  value={formData.insuranceAmount || ""}
                  onChange={handleChange}
                  disabled={isFieldDisabled("insuranceAmount")}
                  required
                />
              </>
            )}
            {/* ===== SUBVENTION SECTION ===== */}
            <label>Subvention?</label>
            <div className="radio-group">
              {["Yes", "No"].map((opt) => (
                <label key={opt}>
                  <input
                    type="radio"
                    name="subventionOption"
                    value={opt}
                    checked={formData.subventionOption === opt}
                    onChange={handleChange}
                    disabled={isFieldDisabled("subventionOption")}
                  />
                  {opt}
                </label>
              ))}
            </div>

            {formData.subventionOption === "Yes" && (
              <>
                <label>Subvention Amount</label>
                <input
                  type="text"
                  inputMode="numeric"
                  name="subventionAmount"
                  placeholder="Enter subvention amount"
                  value={formData.subventionAmount || ""}
                  onChange={handleChange}
                  disabled={isFieldDisabled("subventionAmount")}
                  required
                />
              </>
            )}
          </>
        )}
        {/* ===== PART DISBURSED SECTION ===== */}
        {formData.status === "Part Disbursed" && (
          <>
            <label style={{ fontWeight: "600", marginTop: "10px" }}>
              Part Disbursed Details
            </label>

            {(formData.partDisbursed || []).map((part, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  gap: "10px",
                  alignItems: "center",
                  marginBottom: "8px",
                  flexWrap: "wrap",
                  background: "#f9f9f9",
                  padding: "10px",
                  borderRadius: "6px",
                }}
              >
                <div style={{ flex: "1" }}>
                  <label>Part {index + 1} Date</label>
                  <input
                    type="date"
                    value={part.date || ""}
                    max={today}
                    onChange={(e) => {
                      const updated = [...(formData.partDisbursed || [])];
                      updated[index] = {
                        ...updated[index],
                        date: e.target.value,
                      };
                      setFormData((prev) => ({
                        ...prev,
                        partDisbursed: updated,
                      }));
                    }}
                    disabled={isFieldDisabled("partDisbursed")}
                    required
                  />
                </div>

                <div style={{ flex: "1" }}>
                  <label>Part {index + 1} Amount</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter amount"
                    value={part.amount || ""}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/,/g, "");
                      const formatted = raw === "" ? "" : isNaN(raw) ? part.amount : Number(raw).toLocaleString("en-IN");
                      const updated = [...(formData.partDisbursed || [])];
                      updated[index] = { ...updated[index], amount: formatted };
                      setFormData((prev) => ({ ...prev, partDisbursed: updated }));
                    }}
                    disabled={isFieldDisabled("partDisbursed")}
                    required
                  />
                </div>

                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const updated = formData.partDisbursed.filter(
                        (_, i) => i !== index
                      );
                      setFormData((prev) => ({
                        ...prev,
                        partDisbursed: updated,
                      }));
                    }}
                    style={{
                      background: "#dc3545",
                      color: "#fff",
                      border: "none",
                      borderRadius: "4px",
                      padding: "6px 10px",
                      cursor: "pointer",
                      marginTop: "22px",
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={() => {
                const updated = [...(formData.partDisbursed || [])];
                updated.push({ date: "", amount: "" });
                setFormData((prev) => ({ ...prev, partDisbursed: updated }));
              }}
              style={{
                background: "#007bff",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "8px 12px",
                cursor: "pointer",
                marginTop: "5px",
              }}
            >
              ➕ Add Another Part Disbursed
            </button>
          </>
        )}
        {/* ===== RE-LOGIN SECTION ===== */}
{formData.status === "Re-Login" && (
  <>
    <label style={{ fontWeight: "600", marginTop: "10px" }}>
      Re-Login Reason
    </label>

    <input
      type="text"
      name="reloginReason"
      placeholder="Enter re-login reason"
      value={formData.reloginReason || ""}
      onChange={handleChange}
      disabled={isFieldDisabled("reloginReason")}
      required
    />
  </>
)}

        {/* ── Section: Product & Loan Details ── */}
        </div>{/* end cf-section-card: Status */}
        <div className="cf-section-card">
        <div className="cf-section-header">💰 Product & Loan Details</div>
        <div className="cf-grid">
          <div>
            {/* Product */} <label>Product</label>
            <select name="product" value={formData.product} onChange={handleChange} disabled={isFieldDisabled("product")} required>
              <option value="">Select Product</option>
              <option value="Home Loan">Home Loan</option>
              <option value="HL Top Up">Home Loan TOP UP</option>
              <option value="HL BT + TOP Up">Home Loan BT + TOP UP</option>
              <option value="Commercial Purchase">Commercial Purchase</option>
              <option value="LAP">Loan Against Property</option>
              <option value="Lap Top Up">Loan Against Property BT + TOP UP</option>
              <option value="Land PUR">Land Purchase</option>
              <option value="PLOT + CONSTRUCTION">Plot Purchase + Construction</option>
              <option value="LRD Pur">Lease Rental Discount Purchase</option>
              <option value="Industrial Purchase">Industrial Purchase</option>
              <option value="Inventory Funding">Inventory Funding</option>
              <option value="Project Loan">Project Loan</option>
              <option value="Other">Other</option>
            </select>
            {formData.product === "Other" && (
              <input type="text" placeholder="Enter Product" value={formData.otherProduct} disabled={isFieldDisabled("otherProduct")} onChange={(e) => setFormData({ ...formData, otherProduct: e.target.value })} />
            )}
          </div>
          <div>
            {/* Login Date */} <label>Login Date</label>
            <input type="date" name="loginDate" value={formData.loginDate} max={today} onChange={handleChange} disabled={isFieldDisabled("loginDate")} required />
          </div>
          <div>
            {/* Category */} <label>Category</label>
            <select name="category" value={formData.category} onChange={handleChange} disabled={isFieldDisabled("category")} required>
              <option value="">Select Category</option>
              <option value="salaried">Salaried</option>
              <option value="self-employed">Self-Employed</option>
              <option value="Other">Other</option>
            </select>
            {formData.category === "Other" && (
              <input type="text" placeholder="Enter other Category" value={formData.otherCategory} disabled={isFieldDisabled("otherCategory")} onChange={(e) => setFormData({ ...formData, otherCategory: e.target.value })} />
            )}
          </div>
        </div>
        </div>{/* end cf-section-card: Product */}

        {/* ── Section: Property Details ── */}
        <div className="cf-section-card">
        <div className="cf-section-header">🏠 Property Details</div>
        <div className="cf-grid">
          <div>
            <label>Property Type</label>
            <select name="propertyType" value={formData.propertyType} onChange={handleChange} disabled={isFieldDisabled("propertyType")} required>
              <option value="">Select Property Type</option>
              <option value="Residential + Builder Purchase">Residential (Builder Purchase)</option>
              <option value="Residential(Resale)">Residential (Resale)</option>
              <option value="Commercial(Builder Purchase)">Commercial (Builder Purchase)</option>
              <option value="Commercial(Resale)">Commercial (Resale)</option>
              <option value="Plot Purchase">Plot Purchase</option>
              <option value="Plot + Construction">Plot + Construction</option>
              <option value="Industrial">Industrial</option>
              <option value="Property Not Decide">Property Not Decide</option>
            </select>
          </div>
          <div>
            <label>Property Details</label>
            <input type="text" name="propertyDetails" value={formData.propertyDetails} onChange={handleChange} placeholder="Enter Property Details" disabled={isFieldDisabled("propertyDetails")} required />
          </div>
          <div>
            <label>Property Market Value</label>
            <input type="text" inputMode="numeric" name="mktValue" placeholder="Enter MKT Value" value={formData.mktValue} onChange={handleChange} disabled={isFieldDisabled("mktValue")} required />
          </div>
          <div>
            <label>Required Loan Amount</label>
            <input type="text" name="amount" placeholder="Enter Amount" value={formData.amount} onChange={handleChange} disabled={isFieldDisabled("amount")} required />
          </div>
          <div>
            <label>Rate of Interest Offer</label>
            <input type="text" name="roi" value={formData.roi} onChange={(e) => setFormData({ ...formData, roi: e.target.value })} placeholder="Enter ROI" disabled={isFieldDisabled("roi")} required />
          </div>
          <div>
            <label>Processing Fees</label>
            <input type="text" name="processingFees" placeholder="Enter Processing Fees" value={formData.processingFees} onChange={handleChange} disabled={isFieldDisabled("processingFees")} required />
          </div>
        </div>
        </div>{/* end cf-section-card: Property */}

        {/* ── Section: Financial Info ── */}
        <div className="cf-section-card">
        <div className="cf-section-header">📊 Financial Info</div>
        <div className="cf-grid">
          <div>
            <label>Audit Data</label>
            <select name="auditData" value={formData.auditData} onChange={handleChange} disabled={isFieldDisabled("auditData")} required>
              <option value="">Select</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
          <div>
            <label>Consulting</label>
            <input type="text" name="consulting" placeholder="Enter Consulting" value={formData.consulting} onChange={handleChange} disabled={isFieldDisabled("consulting")} required />
          </div>
          <div>
            <label>Payout Pass On (%)</label>
            <input type="text" name="payout" value={formData.payout} onChange={handleChange} placeholder="Enter payout amount" disabled={isFieldDisabled("payout")} required />
          </div>
          <div>
            <label>Expense Amount</label>
            <input type="text" name="expenceAmount" value={formData.expenceAmount} onChange={handleChange} disabled={isFieldDisabled("expenceAmount")} placeholder="Enter Expense amount" />
          </div>
          <div>
            <label>Fees Refund Amount</label>
            <input type="text" name="feesRefundAmount" value={formData.feesRefundAmount} onChange={handleChange} disabled={isFieldDisabled("feesRefundAmount")} placeholder="Enter Fees Refund amount" />
          </div>
          <div>
            <label>Remark</label>
            <input type="text" name="remark" value={formData.remark} onChange={handleChange} placeholder="Enter any remark" disabled={isFieldDisabled("remark")} required />
          </div>
        </div>
        </div>{/* end cf-section-card: Financial Info */}

        {/* Admin Edit Fields - Only visible in account edit mode */}
        {accountEditMode && (
          <div id="admin-edit-section" style={{ border: "2px dashed #0284c7", backgroundColor: "#f0f9ff", padding: "20px", borderRadius: "10px", marginTop: "30px", marginBottom: "20px" }}>
            <div style={{ color: "#0369a1", fontWeight: "900", fontSize: "16px", textTransform: "uppercase", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>🔒</span> Admin Privileged Fields
            </div>
            
            {/* Consulting Received */}
            <label style={{ color: "#475569", fontWeight: "600", fontSize: "13px", marginTop: "12px", display: "block", marginBottom: "8px" }}>
              Consulting Received
            </label>
            <div style={{ display: "flex", gap: "20px", marginBottom: "12px" }}>
              <label style={{ fontWeight: "normal", display: "flex", alignItems: "center", gap: "6px" }}>
                <input
                  type="radio"
                  name="consultingReceived"
                  value="Yes"
                  checked={formData.consultingReceived === "Yes"}
                  onChange={handleChange}
                />
                Yes
              </label>
              <label style={{ fontWeight: "normal", display: "flex", alignItems: "center", gap: "6px" }}>
                <input
                  type="radio"
                  name="consultingReceived"
                  value="No"
                  checked={formData.consultingReceived === "No"}
                  onChange={handleChange}
                />
                No
              </label>
            </div>

            {/* Consulting Shared + Remark — only if Consulting Received = Yes */}
            {formData.consultingReceived === "Yes" && (
              <>
                <label style={{ color: "#475569", fontWeight: "600", fontSize: "13px", display: "block", marginBottom: "8px" }}>
                  Consulting Shared
                </label>
                <div style={{ display: "flex", gap: "20px", marginBottom: "10px" }}>
                  <label style={{ fontWeight: "normal", display: "flex", alignItems: "center", gap: "6px" }}>
                    <input
                      type="radio"
                      name="consultingShared"
                      value="Yes"
                      checked={formData.consultingShared === "Yes"}
                      onChange={handleChange}
                      required
                    />
                    Yes
                  </label>
                  <label style={{ fontWeight: "normal", display: "flex", alignItems: "center", gap: "6px" }}>
                    <input
                      type="radio"
                      name="consultingShared"
                      value="No"
                      checked={formData.consultingShared === "No"}
                      onChange={handleChange}
                      required
                    />
                    No
                  </label>
                </div>

                <label style={{ color: "#475569", fontWeight: "600", fontSize: "13px", display: "block", marginBottom: "8px" }}>
                  Consulting Remark
                </label>
                <textarea
                  name="consultingRemark"
                  placeholder="Enter consulting remark"
                  value={formData.consultingRemark}
                  onChange={handleChange}
                  rows="3"
                  required
                  style={{ width: "100%", padding: "8px", borderRadius: "4px", marginBottom: "10px" }}
                />
              </>
            )}

            {/* Invoice Generated By */}
            <label style={{ color: "#475569", fontWeight: "600", fontSize: "13px", marginTop: "12px", display: "block", marginBottom: "8px" }}>
              Invoice Generate By
            </label>
            <select
              name="invoiceGeneratedBy"
              value={formData.invoiceGeneratedBy}
              onChange={(e) => {
                const val = e.target.value;
                setFormData((prev) => ({
                  ...prev,
                  invoiceGeneratedBy: val,
                  invoiceGeneratedByOther: val !== "Other" ? "" : prev.invoiceGeneratedByOther,
                }));
              }}
              style={{ width: "100%", padding: "8px", borderRadius: "4px", marginBottom: "10px" }}
            >
              <option value="">Select</option>
              <option value="ICICI">ICICI</option>
              <option value="HDFC">HDFC</option>
              <option value="Deutsche">Deutsche</option>
              <option value="Aadrika">Aadrika</option>
              <option value="Other">Other</option>
            </select>
            {formData.invoiceGeneratedBy === "Other" && (
              <>
                <label style={{ color: "#475569", fontWeight: "600", fontSize: "13px", display: "block", marginBottom: "8px" }}>
                  Specify Invoice Generator
                </label>
                <input
                  type="text"
                  name="invoiceGeneratedByOther"
                  placeholder="Specify invoice generator"
                  value={formData.invoiceGeneratedByOther}
                  onChange={handleChange}
                  style={{ width: "100%", padding: "8px", borderRadius: "4px", marginBottom: "10px" }}
                />
              </>
            )}

            {/* Payout % */}
            <label style={{ color: "#475569", fontWeight: "600", fontSize: "13px", display: "block", marginBottom: "8px" }}>
              Payout %
            </label>
            <input
              type="number"
              name="payoutPercentage"
              placeholder="Enter payout %"
              value={formData.payoutPercentage}
              onChange={handleChange}
              step="any"
              style={{ width: "100%", padding: "8px", borderRadius: "4px", marginBottom: "10px" }}
            />

            {/* Subvention / Short Payment */}
            <label style={{ color: "#475569", fontWeight: "600", fontSize: "13px", display: "block", marginBottom: "8px" }}>
              Subvention / Short Payment
            </label>
            <div style={{ display: "flex", gap: "20px", marginBottom: "10px" }}>
              <label style={{ fontWeight: "normal", display: "flex", alignItems: "center", gap: "6px" }}>
                <input
                  type="radio"
                  name="subventionShortPayment"
                  value="Yes"
                  checked={formData.subventionShortPayment === "Yes"}
                  onChange={(e) => setFormData((prev) => ({ ...prev, subventionShortPayment: e.target.value }))}
                />
                Yes
              </label>
              <label style={{ fontWeight: "normal", display: "flex", alignItems: "center", gap: "6px" }}>
                <input
                  type="radio"
                  name="subventionShortPayment"
                  value="No"
                  checked={formData.subventionShortPayment === "No"}
                  onChange={(e) => setFormData((prev) => ({ ...prev, subventionShortPayment: e.target.value, subventionRemark: "" }))}
                />
                No
              </label>
            </div>
            {formData.subventionShortPayment === "Yes" && (
              <>
                <label style={{ color: "#475569", fontWeight: "600", fontSize: "13px", display: "block", marginBottom: "8px" }}>
                  Subvention / Short Payment Remark
                </label>
                <textarea
                  name="subventionRemark"
                  placeholder="Enter reason for subvention or short payment"
                  value={formData.subventionRemark}
                  onChange={handleChange}
                  rows="3"
                  required
                  style={{ width: "100%", padding: "8px", borderRadius: "4px", marginBottom: "10px" }}
                />
              </>
            )}

            {/* Financial Tracking */}
            <div style={{ marginTop: "16px", borderTop: "2px solid #e2e8f0", paddingTop: "12px" }}>
              <label style={{ color: "#1e293b", fontWeight: "bold", fontSize: "15px", display: "block", marginBottom: "16px" }}>
                Financial Tracking
              </label>

              {/* Grouped Invoices */}
              {formData.invoiceGroupList.map((group, index) => (
                <div key={index} style={{ marginBottom: "20px", padding: "15px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <span style={{ fontWeight: "bold", color: "#1e293b" }}>Invoice Group {index + 1}</span>
                    {index > 0 && (
                      <button 
                        type="button" 
                        onClick={() => {
                          const updated = formData.invoiceGroupList.filter((_, i) => i !== index);
                          setFormData(prev => ({ ...prev, invoiceGroupList: updated }));
                        }}
                        style={{ background: "#ef4444", color: "white", border: "none", borderRadius: "4px", padding: "4px 8px", cursor: "pointer", fontSize: "12px" }}
                      >
                        Remove Group
                      </button>
                    )}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "15px" }}>
                    {/* Invoice Raised */}
                    <div style={{ background: "#fff", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}>
                      <label style={{ fontSize: "12px", fontWeight: "600", color: "#475569", display: "block", marginBottom: "5px" }}>Invoice Raised</label>
                      <input 
                        type="number" placeholder="Amount" value={group.invoiceRaisedAmount} 
                        onChange={(e) => {
                          const updated = [...formData.invoiceGroupList];
                          updated[index].invoiceRaisedAmount = e.target.value;
                          setFormData(prev => ({ ...prev, invoiceGroupList: updated }));
                        }}
                        style={{ width: "100%", padding: "6px", marginBottom: "5px", borderRadius: "4px", border: "1px solid #e2e8f0" }}
                      />
                      <input 
                        type="text" placeholder="Invoice #" value={group.invoiceRaisedInvoiceNumber} 
                        onChange={(e) => {
                          const val = e.target.value;
                          const updated = [...formData.invoiceGroupList];
                          updated[index].invoiceRaisedInvoiceNumber = val;
                          // Autofill Payout Received and GST Received invoice numbers
                          updated[index].payoutReceivedInvoiceNumber = val;
                          updated[index].gstReceivedInvoiceNumber = val;
                          setFormData(prev => ({ ...prev, invoiceGroupList: updated }));
                        }}
                        style={{ width: "100%", padding: "6px", marginBottom: "5px", borderRadius: "4px", border: "1px solid #e2e8f0" }}
                      />
                      <input 
                        type="date" value={group.invoiceRaisedDate} 
                        onChange={(e) => {
                          const updated = [...formData.invoiceGroupList];
                          updated[index].invoiceRaisedDate = e.target.value;
                          setFormData(prev => ({ ...prev, invoiceGroupList: updated }));
                        }}
                        style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #e2e8f0" }}
                      />
                    </div>

                    {/* Payout Received */}
                    <div style={{ background: "#fff", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}>
                      <label style={{ fontSize: "12px", fontWeight: "600", color: "#475569", display: "block", marginBottom: "5px" }}>Payout Received</label>
                      <input 
                        type="number" placeholder="Amount" value={group.payoutReceivedAmount} 
                        onChange={(e) => {
                          const updated = [...formData.invoiceGroupList];
                          updated[index].payoutReceivedAmount = e.target.value;
                          setFormData(prev => ({ ...prev, invoiceGroupList: updated }));
                        }}
                        style={{ width: "100%", padding: "6px", marginBottom: "5px", borderRadius: "4px", border: "1px solid #e2e8f0" }}
                      />
                      <input 
                        type="text" placeholder="Invoice #" value={group.payoutReceivedInvoiceNumber} 
                        onChange={(e) => {
                          const updated = [...formData.invoiceGroupList];
                          updated[index].payoutReceivedInvoiceNumber = e.target.value;
                          setFormData(prev => ({ ...prev, invoiceGroupList: updated }));
                        }}
                        style={{ width: "100%", padding: "6px", marginBottom: "5px", borderRadius: "4px", border: "1px solid #e2e8f0" }}
                      />
                      <input 
                        type="date" value={group.payoutReceivedDate} 
                        onChange={(e) => {
                          const updated = [...formData.invoiceGroupList];
                          updated[index].payoutReceivedDate = e.target.value;
                          setFormData(prev => ({ ...prev, invoiceGroupList: updated }));
                        }}
                        style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #e2e8f0" }}
                      />
                    </div>

                    {/* GST Received */}
                    <div style={{ background: "#fff", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}>
                      <label style={{ fontSize: "12px", fontWeight: "600", color: "#475569", display: "block", marginBottom: "5px" }}>GST Received</label>
                      <input 
                        type="number" placeholder="Amount" value={group.gstReceivedAmount} 
                        onChange={(e) => {
                          const updated = [...formData.invoiceGroupList];
                          updated[index].gstReceivedAmount = e.target.value;
                          setFormData(prev => ({ ...prev, invoiceGroupList: updated }));
                        }}
                        style={{ width: "100%", padding: "6px", marginBottom: "5px", borderRadius: "4px", border: "1px solid #e2e8f0" }}
                      />
                      <input 
                        type="text" placeholder="Invoice #" value={group.gstReceivedInvoiceNumber} 
                        onChange={(e) => {
                          const updated = [...formData.invoiceGroupList];
                          updated[index].gstReceivedInvoiceNumber = e.target.value;
                          setFormData(prev => ({ ...prev, invoiceGroupList: updated }));
                        }}
                        style={{ width: "100%", padding: "6px", marginBottom: "5px", borderRadius: "4px", border: "1px solid #e2e8f0" }}
                      />
                      <input 
                        type="date" value={group.gstReceivedDate} 
                        onChange={(e) => {
                          const updated = [...formData.invoiceGroupList];
                          updated[index].gstReceivedDate = e.target.value;
                          setFormData(prev => ({ ...prev, invoiceGroupList: updated }));
                        }}
                        style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #e2e8f0" }}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {formData.status === "Part Disbursed" && (
                <button 
                  type="button" 
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      invoiceGroupList: [
                        ...prev.invoiceGroupList,
                        { 
                          invoiceRaisedAmount: "", invoiceRaisedInvoiceNumber: "", invoiceRaisedDate: "",
                          payoutReceivedAmount: "", payoutReceivedInvoiceNumber: "", payoutReceivedDate: "",
                          gstReceivedAmount: "", gstReceivedInvoiceNumber: "", gstReceivedDate: "" 
                        }
                      ]
                    }));
                  }}
                  style={{ background: "#0369a1", color: "white", border: "none", borderRadius: "6px", padding: "8px 15px", cursor: "pointer", marginBottom: "20px", fontWeight: "bold" }}
                >
                  + Add More Entries
                </button>
              )}

              {/* Payout Paid Section */}
              <div style={{ marginBottom: "20px", padding: "15px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <span style={{ fontWeight: "bold", color: "#1e293b" }}>Payout Paid</span>
                  <div style={{ display: "flex", gap: "20px" }}>
                    <label style={{ fontWeight: "normal", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                      <input type="radio" name="payoutPaidStatus" value="Yes" checked={formData.payoutPaidStatus === "Yes"} onChange={handleChange} /> Yes
                    </label>
                    <label style={{ fontWeight: "normal", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                      <input type="radio" name="payoutPaidStatus" value="No" checked={formData.payoutPaidStatus === "No"} onChange={(e) => {
                        setFormData(prev => ({ ...prev, payoutPaidStatus: "No", payoutPaidList: [{ payoutPaidAmount: "", payoutPaidInvoiceNumber: "", payoutPaidDate: "", payoutPaidVendorName: "" }] }));
                      }} /> No
                    </label>
                  </div>
                </div>
                {formData.payoutPaidStatus === "Yes" && (
                  <>
                    {(formData.payoutPaidList || []).map((payout, payoutIdx) => (
                      <div key={payoutIdx} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "15px", paddingBottom: "15px", borderBottom: payoutIdx < (formData.payoutPaidList || []).length - 1 ? "1px solid #e2e8f0" : "none" }}>
                        <div>
                          <label style={{ fontSize: "13px", fontWeight: "500", color: "#333", display: "block", marginBottom: "5px" }}>Amount</label>
                          <input type="number" placeholder="Enter Amount" value={payout.payoutPaidAmount} onChange={(e) => { const updated = [...(formData.payoutPaidList || [])]; updated[payoutIdx].payoutPaidAmount = e.target.value; setFormData(prev => ({ ...prev, payoutPaidList: updated })); }} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e1" }} />
                        </div>
                        <div>
                          <label style={{ fontSize: "13px", fontWeight: "500", color: "#333", display: "block", marginBottom: "5px" }}>Invoice #</label>
                          <input type="text" placeholder="Enter Invoice #" value={payout.payoutPaidInvoiceNumber} onChange={(e) => { const updated = [...(formData.payoutPaidList || [])]; updated[payoutIdx].payoutPaidInvoiceNumber = e.target.value; setFormData(prev => ({ ...prev, payoutPaidList: updated })); }} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e1" }} />
                        </div>
                        <div>
                          <label style={{ fontSize: "13px", fontWeight: "500", color: "#333", display: "block", marginBottom: "5px" }}>Date</label>
                          <input type="date" value={payout.payoutPaidDate} onChange={(e) => { const updated = [...(formData.payoutPaidList || [])]; updated[payoutIdx].payoutPaidDate = e.target.value; setFormData(prev => ({ ...prev, payoutPaidList: updated })); }} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e1" }} />
                        </div>
                        <div>
                          <label style={{ fontSize: "13px", fontWeight: "500", color: "#333", display: "block", marginBottom: "5px" }}>Vendor Name</label>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <input type="text" placeholder="Enter Vendor Name" value={payout.payoutPaidVendorName} onChange={(e) => { const updated = [...(formData.payoutPaidList || [])]; updated[payoutIdx].payoutPaidVendorName = e.target.value; setFormData(prev => ({ ...prev, payoutPaidList: updated })); }} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e1" }} />
                            {payoutIdx > 0 && (
                              <button type="button" onClick={() => { const updated = (formData.payoutPaidList || []).filter((_, i) => i !== payoutIdx); setFormData(prev => ({ ...prev, payoutPaidList: updated })); }} style={{ background: "#dc3545", color: "white", border: "none", borderRadius: "4px", padding: "0 10px", cursor: "pointer" }}>✕</button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={() => { setFormData(prev => ({ ...prev, payoutPaidList: [...(prev.payoutPaidList || []), { payoutPaidAmount: "", payoutPaidInvoiceNumber: "", payoutPaidDate: "", payoutPaidVendorName: "" }] })); }} style={{ background: "#0f172a", color: "white", border: "none", borderRadius: "4px", padding: "6px 12px", fontSize: "12px", cursor: "pointer", marginTop: "5px" }}>+ Add Another Payout</button>
                  </>
                )}
              </div>

              {/* Expense Paid Section */}
              <div style={{ marginBottom: "20px", padding: "15px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <span style={{ fontWeight: "bold", color: "#1e293b" }}>Expense Paid</span>
                  <div style={{ display: "flex", gap: "20px" }}>
                    <label style={{ fontWeight: "normal", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                      <input type="radio" name="expensePaidStatus" value="Yes" checked={formData.expensePaidStatus === "Yes"} onChange={handleChange} /> Yes
                    </label>
                    <label style={{ fontWeight: "normal", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                      <input type="radio" name="expensePaidStatus" value="No" checked={formData.expensePaidStatus === "No"} onChange={(e) => {
                        setFormData(prev => ({ ...prev, expensePaidStatus: "No", expensePaid: "", expensePaidInvoiceNumber: "", expensePaidDate: "", expensePaidVendorName: "" }));
                      }} /> No
                    </label>
                  </div>
                </div>
                {formData.expensePaidStatus === "Yes" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <label style={{ fontSize: "13px", fontWeight: "600", color: "#334155", display: "block", marginBottom: "4px" }}>Amount</label>
                      <input type="number" name="expensePaid" placeholder="Enter Amount" value={formData.expensePaid} onChange={handleChange} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e1" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: "13px", fontWeight: "600", color: "#334155", display: "block", marginBottom: "4px" }}>Invoice #</label>
                      <input type="text" name="expensePaidInvoiceNumber" placeholder="Enter Invoice #" value={formData.expensePaidInvoiceNumber} onChange={handleChange} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e1" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: "13px", fontWeight: "600", color: "#334155", display: "block", marginBottom: "4px" }}>Date</label>
                      <input type="date" name="expensePaidDate" value={formData.expensePaidDate} onChange={handleChange} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e1" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: "13px", fontWeight: "600", color: "#334155", display: "block", marginBottom: "4px" }}>Vendor Name</label>
                      <input type="text" name="expensePaidVendorName" placeholder="Enter Vendor Name" value={formData.expensePaidVendorName} onChange={handleChange} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e1" }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Insurance Payout Section */}
              <div style={{ marginBottom: "20px", padding: "15px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <span style={{ fontWeight: "bold", color: "#1e293b" }}>Insurance Payout</span>
                  <div style={{ display: "flex", gap: "20px" }}>
                    <label style={{ fontWeight: "normal", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                      <input type="radio" name="insurancePayoutStatus" value="Yes" checked={formData.insurancePayoutStatus === "Yes"} onChange={handleChange} /> Yes
                    </label>
                    <label style={{ fontWeight: "normal", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                      <input type="radio" name="insurancePayoutStatus" value="No" checked={formData.insurancePayoutStatus === "No"} onChange={(e) => {
                        setFormData(prev => ({ ...prev, insurancePayoutStatus: "No", insurancePayout: "", insurancePayoutInvoiceNumber: "", insurancePayoutDate: "" }));
                      }} /> No
                    </label>
                  </div>
                </div>
                {formData.insurancePayoutStatus === "Yes" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <label style={{ fontSize: "13px", fontWeight: "600", color: "#334155", display: "block", marginBottom: "4px" }}>Amount</label>
                      <input type="number" name="insurancePayout" placeholder="Enter Amount" value={formData.insurancePayout} onChange={handleChange} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e1" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: "13px", fontWeight: "600", color: "#334155", display: "block", marginBottom: "4px" }}>Invoice #</label>
                      <input type="text" name="insurancePayoutInvoiceNumber" placeholder="Enter Invoice #" value={formData.insurancePayoutInvoiceNumber} onChange={handleChange} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e1" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: "13px", fontWeight: "600", color: "#334155", display: "block", marginBottom: "4px" }}>Date</label>
                      <input type="date" name="insurancePayoutDate" value={formData.insurancePayoutDate} onChange={handleChange} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e1" }} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <label style={{ color: "#333", fontWeight: "600", fontSize: "14px", display: "block", marginTop: "16px", marginBottom: "8px" }}>
              Final Remark (Admin Only)
            </label>
            <textarea
              name="finalRemark"
              placeholder="Enter final remarks (admin only)"
              value={formData.finalRemark}
              onChange={handleChange}
              disabled={isFieldDisabled("finalRemark")}
              rows="4"
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "#fff" }}
            />
          </div>
        )}
        <button type="submit" className="submit-btn">
          {accountEditMode ? "Save Final Remark" : editingId ? "Update" : "Submit"}
        </button>
        
        {/* Cancel button for account edit mode */}
        {accountEditMode && (
          <button 
            type="button" 
            className="submit-btn" 
            onClick={() => {
              setAccountEditMode(false);
              setAccountEditId(null);
              setFormData(initialFormData);
            }}
            style={{ backgroundColor: "#999", marginLeft: "10px" }}
          >
            Cancel
          </button>
        )}
      </form>

      {/* ── Export Toolbar ── */}
      <div className="export-toolbar">

        {/* Master Excel */}
        <div className="export-card export-card--simple">
          <div className="export-card-icon">📊</div>
          <div className="export-card-info">
            <span className="export-card-title">Master Export</span>
            <span className="export-card-desc">All applications data</span>
          </div>
          <button onClick={handleExcelDownload} className="export-btn export-btn--green export-btn--full">
            <FaCloudDownloadAlt /> Download
          </button>
        </div>

        {/* Sales Excel */}
        <div className="export-card">
          <div className="export-card-icon">👤</div>
          <div className="export-card-info">
            <span className="export-card-title">Sales Export</span>
            <span className="export-card-desc">Filter by sales person</span>
          </div>
          <div className="export-card-controls">
            <select
              className="export-select"
              value={refFilter}
              onChange={(e) => setRefFilter(e.target.value)}
            >
              <option value="">Select Sales</option>
              {["Vinay Mishra","Robins Kapadia","Dharmesh Bhavsar","Hardik Bhavsar","Dhaval Kataria","Parag Shah"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button onClick={handleExportRef} className="export-btn export-btn--green">
              <FaCloudDownloadAlt /> Download
            </button>
          </div>
        </div>

        {/* Monthly Excel */}
        <div className="export-card">
          <div className="export-card-icon">📅</div>
          <div className="export-card-info">
            <span className="export-card-title">Monthly Report</span>
            <span className="export-card-desc">Generate by month</span>
          </div>
          <div className="export-card-controls">
            <input
              type="month"
              className="export-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
            <button
              onClick={handleMonthlyExcelDownload}
              className="export-btn export-btn--green"
              disabled={monthlyExcelLoading}
            >
              <FaCloudDownloadAlt /> {monthlyExcelLoading ? "Generating..." : "Generate"}
            </button>
          </div>
        </div>

        {/* Account Excel */}
        <div className="export-card export-card--simple">
          <div className="export-card-icon">🧾</div>
          <div className="export-card-info">
            <span className="export-card-title">Account Export</span>
            <span className="export-card-desc">Financial records</span>
          </div>
          <button onClick={handleAccountExcelDownload} className="export-btn export-btn--green export-btn--full">
            <FaCloudDownloadAlt /> Download
          </button>
        </div>

      </div>

      {/* ── Applications List Header ── */}
      <div className="apps-list-header">
        <h2 className="apps-list-title">Applications List</h2>
      </div>
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
        <label>
          Customer Name:
          <input
            type="text"
            placeholder="Search by name..."
            value={filters.customerName}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, customerName: e.target.value }))
            }
          />
        </label>
        {(filters.fromDate || filters.toDate || filters.sales || filters.status || filters.customerName) && (
          <button
            type="button"
            onClick={() => {
              setFilters({
                fromDate: "",
                toDate: "",
                sales: "",
                status: "",
                customerName: "",
              });
            }}
            style={{
              padding: "8px 16px",
              backgroundColor: "#ef4444",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "14px",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = "#dc2626"}
            onMouseLeave={(e) => e.target.style.backgroundColor = "#ef4444"}
          >
            ✕ Clear All Filters
          </button>
        )}
      </div>
      <div className="card-container">
  {filteredApps.length === 0 ? (
    <div style={{
      padding: "40px",
      textAlign: "center",
      backgroundColor: "#f5f5f5",
      borderRadius: "8px",
      margin: "20px 0"
    }}>
      <p style={{ fontSize: "18px", color: "#666", marginBottom: "10px" }}>
        📋 No applications found
      </p>
      <p style={{ fontSize: "14px", color: "#999" }}>
        {applications.length === 0 
          ? "No applications have been submitted yet. Submit the form above to create your first application."
          : "No applications match your current filters. Try adjusting the filter criteria."}
      </p>
    </div>
  ) : (
    filteredApps.map((app) => {
    // ✅ LAST PART DISBURSED (SAFE WAY)
    const lastPart =
      Array.isArray(app.partDisbursed) && app.partDisbursed.length > 0
        ? app.partDisbursed[app.partDisbursed.length - 1]
        : null;
    const visibleLastChanges = getDisplayChanges(app.lastChanges);

    return (
      <div key={app._id} className="card">
        <div className="card-header">
           <div className="header-top-row">
             <h2 className="card-sales-name">{app.sales}</h2>
             
             <div className="header-actions">
               {(app.status === "Disbursed" || app.status === "Part Disbursed") && (
                 <button
                   className="pdf-download-badge"
                   onClick={() => handlePdfDownload(app._id)}
                   disabled={pdfLoadingId === app._id}
                   title={pdfLoadingId === app._id ? "Generating PDF..." : "Download PDF"}
                 >
                   {pdfLoadingId === app._id ? (
                      <div className="spinner-small" />
                   ) : (
                      <FaFilePdf size={14} />
                   )}
                 </button>
               )}
               
               <div className={`status-badge ${
                 app.status === "Login" ? "status-bg-gray" :
                 app.status === "PD" ? "status-bg-purple" :
                 app.status === "Sanction" ? "status-bg-blue" :
                 app.status === "Disbursed" ? "status-bg-green" :
                 app.status === "Part Disbursed" ? "status-bg-green" :
                 app.status === "Rejected" ? "status-bg-red" :
                 app.status === "Withdraw" ? "status-bg-red" :
                 "status-bg-orange"
               }`}>
                 {app.status}
               </div>
             </div>
           </div>
        </div>

        <div className="card-body">
          <div className="card-section cust-header-section">
            <div className="cust-row-top">
              <div className="cust-name-group">
                <div className="info-row">
                  <span className="info-label">Cust Name</span>
                  <span className="info-value highlight-yellow">{app.name}</span>
                </div>
              </div>
              
              <div className="cust-mobile-group">
                <div className="info-row">
                   <span className="info-label">Mobile</span>
                   <span className="info-value">{maskMobile(app.mobile)}</span>
                </div>
              </div>
            </div>
            
            <div className="cust-row-bottom">
              <div className="cust-ref-group">
                <div className="info-row">
                   <span className="info-label">Ref</span>
                   <span className="info-value highlight-yellow">{app.ref}</span>
                </div>
              </div>
              <div className="cust-source-group">
                <div className="info-row">
                   <span className="info-label">Source</span>
                   <span className="info-value highlight-yellow">{app.sourceChannel === "Other" ? app.otherSourceChannel : app.sourceChannel}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card-section two-column-layout">
            <div className="layout-col-left">
              <div className="info-row">
                <span className="info-label">Product</span>
                <span className="info-value highlight-yellow">{app.product}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Req Amount</span>
                <span className="info-value highlight-yellow">{app.amount}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Bank</span>
                <span className="info-value highlight-yellow">{app.bank}</span>
              </div>
            </div>
            <div className="layout-col-right">
              <div className="info-row">
                <span className="info-label">Property Type</span>
                <span className="info-value">{app.propertyType}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Banker Name</span>
                <span className="info-value">{app.bankerName}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Login Date</span>
                <span className="info-value">{safeFormatDate(app.loginDate)}</span>
              </div>
            </div>
          </div>

          {(app.status !== "Login") && (
            <div className="card-section">
               {app.status === "Disbursed" && (
                 <div className="status-box disbursed">
                   <div className="info-row">
                      <span className="info-label">Disbursed Dt</span>
                      <span className="info-value">{safeFormatDate(app.disbursedDate)}</span>
                   </div>
                   <div className="info-row">
                      <span className="info-label">Disbursed Amt</span>
                      <span className="info-value">{app.disbursedAmount}</span>
                   </div>
                   {app.loanNumber && (
                      <div className="info-row">
                        <span className="info-label">Loan A/C No</span>
                        <span className="info-value">{app.loanNumber}</span>
                      </div>
                   )}
                 </div>
               )}

               {app.status === "Sanction" && (
                 <div className="status-box sanction">
                    <div className="info-row">
                      <span className="info-label">Sanction Dt</span>
                      <span className="info-value">{safeFormatDate(app.sanctionDate)}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Sanction Amt</span>
                      <span className="info-value">{app.sanctionAmount}</span>
                    </div>
                 </div>
               )}

               {app.status === "Part Disbursed" && lastPart && (
                 <div className="status-box part-disbursed">
                     <div className="info-row">
                        <span className="info-label">Last Part Dt</span>
                        <span className="info-value">{safeFormatDate(lastPart.date)}</span>
                     </div>
                     <div className="info-row">
                        <span className="info-label">Last Part Amt</span>
                        <span className="info-value">{formatAmount(lastPart.amount)}</span>
                     </div>
                 </div>
               )}

               {app.status === "PD" && (
                  <div className="status-box pd">
                     <div className="info-row">
                        <span className="info-label">PD Status</span>
                        <span className="info-value">{app.pdStatus || "—"}</span>
                     </div>
                     <div className="info-row">
                        <span className="info-label">PD Date</span>
                        <span className="info-value">{app.pdDate ? formatDateToIndian(app.pdDate) : "—"}</span>
                     </div>
                  </div>
               )}

               {app.status === "Re-Login" && (
                  <div className="status-box">
                    <div className="info-row">
                        <span className="info-label">Re-Login Rsn</span>
                        <span className="info-value text-danger">{app.reloginReason || "—"}</span>
                    </div>
                  </div>
               )}

               {app.status === "Rejected" && (
                  <div className="status-box rejected">
                    <div className="info-row full-width">
                        <span className="info-label">Rejected Rmk</span>
                        <span className="info-value">{app.rejectedRemark || "—"}</span>
                    </div>
                  </div>
               )}
               {app.status === "Withdraw" && (
                  <div className="status-box withdraw">
                     <div className="info-row full-width">
                        <span className="info-label">Withdraw Rmk</span>
                        <span className="info-value">{app.withdrawRemark || "—"}</span>
                     </div>
                  </div>
               )}
               {app.status === "Hold" && (
                  <div className="status-box hold">
                     <div className="info-row full-width">
                        <span className="info-label">Hold Remark</span>
                        <span className="info-value">{app.holdRemark || "—"}</span>
                     </div>
                  </div>
               )}
            </div>
          )}

          <div className="card-section">
             <div className="info-row full-width">
                <span className="info-label">PayOut</span>
                <span className="info-value highlight-yellow">{app.payout}</span>
             </div>
             
             <div className="two-column-layout">
               <div className="layout-col-left">
                  <div className="info-row">
                     <span className="info-label">Consulting</span>
                     <span className="info-value">{app.consulting}</span>
                  </div>
                  <div className="info-row">
                     <span className="info-label">Fees Refund</span>
                     <span className="info-value">{app.feesRefundAmount}</span>
                  </div>
               </div>
               
               <div className="layout-col-right">
                  <div className="info-row">
                     <span className="info-label">Expense</span>
                     <span className="info-value">{app.expenceAmount}</span>
                  </div>
                  <div className="info-row">
                     <span className="info-label">Remark</span>
                     <span className="info-value">{app.remark}</span>
                  </div>
               </div>
             </div>
          </div>

          {/* Admin Details Section */}
          {(app.status === "Disbursed" || app.status === "Part Disbursed") && (() => {
            const hasInvoiceGroupData = Array.isArray(app.invoiceGroupList) && app.invoiceGroupList.some(g => g.invoiceRaisedAmount || g.payoutReceivedAmount || g.gstReceivedAmount);
            const hasPayoutPaid = Array.isArray(app.payoutPaidList) && app.payoutPaidList.some(p => p.payoutPaidAmount);

            const hasAdminData = !!(
              app.finalRemark ||
              app.consultingReceived ||
              app.invoiceGeneratedBy ||
              (app.payoutPercentage && app.payoutPercentage !== "") ||
              (app.subventionShortPayment && app.subventionShortPayment === "Yes") ||
              app.insurancePayout ||
              hasInvoiceGroupData ||
              hasPayoutPaid ||
              app.expensePaid
            );

            return (
              <div className="card-section">
                <button
                  type="button"
                  className={`admin-details-toggle${expandedCards[app._id] ? " open" : ""}`}
                  onClick={() => setExpandedCards(prev => ({ ...prev, [app._id]: !prev[app._id] }))}
                >
                  {expandedCards[app._id] ? "▲ Hide Admin Details" : "▼ Show Admin Details"}
                </button>

                 {expandedCards[app._id] && (
                  <div className="admin-details-body">
                    {!hasAdminData ? (
                      <p className="no-admin-data">⏳ No details available</p>
                    ) : (
                      <div className="admin-grid">
                        {app.finalRemark && (
                          <div className="admin-status-group admin-final-remark-group">
                            <div className="admin-section-title">💬 Final Remark</div>
                            <div className="info-row">
                              <span className="info-value admin-final-remark-text">{app.finalRemark}</span>
                            </div>
                          </div>
                        )}

                        {(app.consultingReceived || app.consultingRemark) && (
                          <div className="admin-status-group">
                            <div className="admin-section-title">📋 Consulting</div>
                            <div className="admin-consulting-row">
                              {app.consultingReceived && (
                                <div className="info-row">
                                  <span className="info-label">Status</span>
                                  <span className="info-value">{app.consultingReceived}</span>
                                </div>
                              )}
                              {app.consultingReceived === "Yes" && app.consultingShared && (
                                <div className="info-row">
                                  <span className="info-label">Shared</span>
                                  <span className="info-value">{app.consultingShared}</span>
                                </div>
                              )}
                            </div>
                            {app.consultingRemark && (
                              <div className="info-row">
                                <span className="info-label">Remarks</span>
                                <span className="info-value">{app.consultingRemark}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {(app.invoiceGeneratedBy || app.payoutPercentage || app.subventionShortPayment === "Yes") && (
                          <div className="admin-status-group">
                            <div className="admin-section-title">🧾 Inv & Payout</div>
                            {app.invoiceGeneratedBy && (
                              <div className="info-row">
                                <span className="info-label">Invoice By</span>
                                <span className="info-value">{app.invoiceGeneratedBy === "Other" ? app.invoiceGeneratedByOther : app.invoiceGeneratedBy}</span>
                              </div>
                            )}
                            {app.payoutPercentage && (
                              <div className="info-row">
                                <span className="info-label">Payout %</span>
                                <span className="info-value">{app.payoutPercentage}%</span>
                              </div>
                            )}
                            {app.subventionShortPayment === "Yes" && (
                              <div className="info-row full-width">
                                <span className="info-label">Subvention Rmk</span>
                                <span className="info-value">{app.subventionRemark || "—"}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {(app.insurancePayout || hasInvoiceGroupData || hasPayoutPaid || app.expensePaid) && (
                          <div className="admin-status-group full-width" style={{ borderRight: "none" }}>
                            <div className="admin-section-title">💰 Financial Tracking (Grouped)</div>
                            <div className="financials-grid">
                              {/* INVOICE GROUPS */}
                              {hasInvoiceGroupData && app.invoiceGroupList.filter(g => g.invoiceRaisedAmount || g.payoutReceivedAmount || g.gstReceivedAmount).map((g, idx, arr) => (
                                <div key={`inv-group-${idx}`} style={{ borderBottom: "1px solid #e2e8f0", padding: "12px 14px" }}>
                                  <div style={{ fontSize: "11px", fontWeight: "700", color: "#0284c7", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
                                    Invoice Group {arr.length > 1 ? `#${idx + 1}` : ""}
                                  </div>
                                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                                    {g.invoiceRaisedAmount && (
                                      <div>
                                        <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>Invoice Raised</div>
                                        <div style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a", marginTop: "2px" }}>₹{Number(g.invoiceRaisedAmount).toLocaleString("en-IN")}</div>
                                        <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>Inv: {g.invoiceRaisedInvoiceNumber || "—"}</div>
                                        <div style={{ fontSize: "10px", color: "#94a3b8" }}>{safeFormatDate(g.invoiceRaisedDate)}</div>
                                      </div>
                                    )}
                                    {g.payoutReceivedAmount && (
                                      <div>
                                        <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>Payout Received</div>
                                        <div style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a", marginTop: "2px" }}>₹{Number(g.payoutReceivedAmount).toLocaleString("en-IN")}</div>
                                        <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>Inv: {g.payoutReceivedInvoiceNumber || "—"}</div>
                                        <div style={{ fontSize: "10px", color: "#94a3b8" }}>{safeFormatDate(g.payoutReceivedDate)}</div>
                                      </div>
                                    )}
                                    {g.gstReceivedAmount && (
                                      <div>
                                        <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>GST Received</div>
                                        <div style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a", marginTop: "2px" }}>₹{Number(g.gstReceivedAmount).toLocaleString("en-IN")}</div>
                                        <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>Inv: {g.gstReceivedInvoiceNumber || "—"}</div>
                                        <div style={{ fontSize: "10px", color: "#94a3b8" }}>{safeFormatDate(g.gstReceivedDate)}</div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}

                              {/* OTHER FINANCIAL ITEMS IN GRID */}
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0" }}>
                                {/* PAYOUT PAID LIST */}
                                {hasPayoutPaid && app.payoutPaidList.filter(p => p.payoutPaidAmount).map((p, idx, arr) => (
                                  <div key={`pp-${idx}`} style={{ borderRight: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", padding: "10px 12px" }}>
                                    <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>Payout Paid {arr.length > 1 ? `#${idx + 1}` : ""}</div>
                                    <div style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a", marginTop: "2px" }}>₹{Number(p.payoutPaidAmount).toLocaleString("en-IN")}</div>
                                    <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>
                                      {p.payoutPaidInvoiceNumber && `Inv: ${p.payoutPaidInvoiceNumber}`}
                                    </div>
                                    <div style={{ fontSize: "10px", color: "#94a3b8" }}>
                                      {p.payoutPaidDate && safeFormatDate(p.payoutPaidDate)}
                                    </div>
                                    {p.payoutPaidVendorName && (
                                      <div style={{ fontSize: "10px", color: "#0284c7", fontWeight: "600", marginTop: "2px" }}>
                                        Vendor: {p.payoutPaidVendorName}
                                      </div>
                                    )}
                                  </div>
                                ))}

                                {/* EXPENSE PAID */}
                                {app.expensePaid && (
                                  <div style={{ borderRight: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", padding: "10px 12px" }}>
                                    <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>Expense Paid</div>
                                    <div style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a", marginTop: "2px" }}>₹{Number(app.expensePaid).toLocaleString("en-IN")}</div>
                                    <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>
                                      {app.expensePaidInvoiceNumber && `Inv: ${app.expensePaidInvoiceNumber}`}
                                    </div>
                                    <div style={{ fontSize: "10px", color: "#94a3b8" }}>
                                      {app.expensePaidDate && safeFormatDate(app.expensePaidDate)}
                                    </div>
                                    {app.expensePaidVendorName && (
                                      <div style={{ fontSize: "10px", color: "#0284c7", fontWeight: "600", marginTop: "2px" }}>
                                        Vendor: {app.expensePaidVendorName}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* INSURANCE PAYOUT */}
                                {app.insurancePayout && (
                                  <div style={{ borderRight: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", padding: "10px 12px" }}>
                                    <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>Insurance Payout</div>
                                    <div style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a", marginTop: "2px" }}>₹{Number(app.insurancePayout).toLocaleString("en-IN")}</div>
                                    <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>
                                      {app.insurancePayoutInvoiceNumber && `Inv: ${app.insurancePayoutInvoiceNumber}`}
                                    </div>
                                    <div style={{ fontSize: "10px", color: "#94a3b8" }}>
                                      {app.insurancePayoutDate && safeFormatDate(app.insurancePayoutDate)}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Change Tracker Bar - Persists until Approved */}
          {Object.keys(visibleLastChanges).length > 0 && app.approvalStatus !== "Approved by SB" && (
            <div className="card-change-bar" style={{ margin: "4px 0 0 0", borderRadius: "0", borderLeft: "none", borderRight: "none" }}>
              <div className="card-change-left">
                <span className="card-change-badge">
                  <span className="change-dot"></span>
                  {Object.keys(visibleLastChanges).length} change{Object.keys(visibleLastChanges).length !== 1 ? 's' : ''}
                </span>
                {app.lastChangedAt && (
                  <span className="card-change-time">
                    {new Date(app.lastChangedAt).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit', hour12:true })}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="card-view-changes-btn"
                onClick={() => {
                  setSelectedCardChanges(visibleLastChanges);
                  setIsChangesModalOpen(true);
                }}
              >
                👁 View Changes
              </button>
            </div>
          )}
        </div>

        <div className="card-footer">
          {app.importantMsg && app.approvalStatus !== "Approved" && (
            <div className="approval-msg pending" style={{fontSize: "0.85rem", whiteSpace: "pre-wrap", textAlign: "left"}}>
              {app.importantMsg}
            </div>
          )}

          {app.approvalStatus === "Approved by SB" ? (
            <div className="approval-msg approved" style={{textAlign: "left", display:"flex", alignItems:"center", gap:"6px"}}>
              <span style={{fontSize:"16px"}}>✅</span> Approved by SB
            </div>
          ) : app.approvalStatus === "Rejected by SB" ? (
            <div className="approval-msg rejected" style={{textAlign: "left", display:"flex", alignItems:"center", gap:"6px"}}>
              <span style={{fontSize:"16px"}}>❌</span> Rejected by SB
            </div>
          ) : (
            <div className="approval-buttons" style={{marginTop:"0"}}>
              <button
                className="approve-btn"
                style={{flex: 1, padding: "10px"}}
                onClick={() => handleApprove(app._id)}
              >
                Approve
              </button>
              <button
                className="reject-btn"
                style={{flex: 1, padding: "10px"}}
                onClick={() => handleReject(app._id)}
              >
                Reject
              </button>
            </div>
          )}

          {/* HG Approval Section (Hitendra Goswami) */}
          {(app.status === "Disbursed" || app.status === "Part Disbursed") && (
            <div style={{ marginTop: "4px" }}>
              {app.hsApprovalStatus === "Approved" ? (
                <div className="approval-msg approved" style={{textAlign: "left", display:"flex", alignItems:"center", gap:"6px"}}>
                  <span style={{fontSize:"16px"}}>✅</span> HG Approved <span style={{fontWeight:"600", fontSize:"0.8rem", marginLeft:"auto"}}>{app.hsApprovedAt ? formatDateToIndian(app.hsApprovedAt) : ""}</span>
                </div>
              ) : app.hsApprovalStatus === "Rejected" ? (
                <div className="approval-msg rejected" style={{textAlign: "left", display:"flex", alignItems:"center", gap:"6px"}}>
                  <span style={{fontSize:"16px"}}>❌</span> HG Rejected <span style={{fontWeight:"600", fontSize:"0.8rem", marginLeft:"auto"}}>{app.hsApprovedAt ? formatDateToIndian(app.hsApprovedAt) : ""}</span>
                </div>
              ) : (
                <>
                  <div className="approval-msg pending" style={{textAlign: "left", display:"flex", alignItems:"center", gap:"6px"}}>
                    <span style={{fontSize:"16px"}}>🕐</span> HG Approval Pending
                  </div>
                  <div className="approval-buttons" style={{marginTop:"8px"}}>
                    <button
                      className="approve-btn"
                      onClick={() => handleHSApprove(app._id)}
                      style={{ backgroundColor: "#4caf50", flex: 1, padding: "10px" }}
                    >
                      HG Approve
                    </button>
                    <button
                      className="reject-btn"
                      onClick={() => handleHSReject(app._id)}
                      style={{ backgroundColor: "#f44336", flex: 1, padding: "10px" }}
                    >
                      HG Reject
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          <div style={{display: "flex", gap: "10px", marginTop: "4px"}}>
            {app.approvalStatus !== "Rejected by SB" && (
              <button className="edit-btn" style={{flex: 1, padding: "10px", fontSize: "15px"}} onClick={() => handleEdit(app)}>
                ✏️ Edit
              </button>
            )}
            
            {(app.status === "Disbursed" || app.status === "Part Disbursed") && (
              <button 
                className="edit-btn" 
                onClick={() => handleAccountEdit(app)}
                style={{ backgroundColor: "#FF9800", flex: 1, padding: "10px", fontSize: "15px" }}
                title="Edit account details"
              >
                💳 Acc Edit
              </button>
            )}
          </div>
        </div>
      </div>

    );
  })
  )}
</div>

      {/* Excel Downloads */}

      {/* Change Tracker Modal */}
      <ChangesModal
        isOpen={isChangesModalOpen}
        onClose={() => { setIsChangesModalOpen(false); setSelectedCardChanges({}); }}
        changes={selectedCardChanges}
      />
    </div>
  );
};

export default CustForm;
