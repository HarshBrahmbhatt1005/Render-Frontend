import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import "../css/BuilderVisitForm.css"; //CSS
import RejectionModal from "./RejectionModal";
import EmailSendingIndicator from "./EmailSendingIndicator";
import SubmissionLoader from "./SubmissionLoader";
import { sendForm2Notification, sendLevel2ApprovalNotification, validateEmailConfig } from "../services/emailService";

const BuilderVisitForm = () => {
  const API = `${import.meta.env.VITE_API_URL}/api/builder-visits`;
  const RESIDENTIAL_SIZE_OPTIONS = ["1 RK", "1 BHK", "1.5 BHK", "2 BHK", "2.5 BHK", "3 BHK", "4 BHK", "5 BHK", "6 BHK", "7 BHK"];

  const initialForm = {
    builderName: "",
    builderNumber: "",
    groupName: "",
    projectName: "",
    location: "",
    officePersonDetails: "",
    officePersonNumber: "",
    executives: [],
    gentry: "",
    propertySizes: [],
    areaType: "", // Area Type at form level
    floor: "",
    sqft: "",
    aecAuda: "",
    regularPrice: "",
    maintenance: "",
    developmentType: "",
    negotiable: "",
    totalUnitsBlocks: "",
    totalBlocks: "",
    propertySize: "",
    expectedCompletionDate: "",
    financingRequirements: "",
    financingDetails: "",
    residentType: "",
    avgAgreementValue: "",
    boxPrice: "",
    nearbyProjects: "",
    enquiryType: "",
    unitsForSale: "",
    remark: "",
    usps: [], // Multi-select USPs
    totalAmenities: "", // Total Amenities number
    allotedCarParking: "", // Alloted Car Parking dropdown
    payout: "",
    stageOfConstruction: "",
    saiFakiraManager: "",
    submittedAt: "",
    // Clear Floor Height fields (dynamic based on developme+nt type)
    clearFloorHeight: "", // For Residential only
    clearFloorHeightRetail: "", // For Commercial and Resi+Commercial
    clearFloorHeightFlats: "", // For Resi+Commercial
    clearFloorHeightOffices: "", // For Commercial only
    approval: {
      level1: { status: "Pending", by: "", at: "", remarks: "" },
      level2: { status: "Pending", by: "", at: "", remarks: "" },
    },
  };

  const [formData, setFormData] = useState(initialForm);
  const [visits, setVisits] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [cardsUnlocked, setCardsUnlocked] = useState(false);

  // All Properties password gate
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordVerifying, setPasswordVerifying] = useState(false);
  // Session token stored in memory only (not localStorage/cookie)
  const sessionTokenRef = useRef(null);

  // Filter states
  const [filterProjectName, setFilterProjectName] = useState("");
  const [filterGroupName, setFilterGroupName] = useState("");
  const [filterApprovalStatus, setFilterApprovalStatus] = useState("");
  const [filterManager, setFilterManager] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [showAllCards, setShowAllCards] = useState(false);
  const [expandedProps, setExpandedProps] = useState({}); // track which card's properties are expanded
  const [expandedPropFields, setExpandedPropFields] = useState({}); // track which individual property fields are expanded

  // State for rejection remarks modal
  const [rejectionModal, setRejectionModal] = useState({
    isOpen: false,
    visitId: null,
    level: null,
    remarks: ""
  });

  // Email notification states
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // USP dropdown state
  const [uspDropdownOpen, setUspDropdownOpen] = useState(false);
  const uspDropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (uspDropdownRef.current && !uspDropdownRef.current.contains(event.target)) {
        setUspDropdownOpen(false);
      }
    };

    if (uspDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [uspDropdownOpen]);

  // 💡 Format numbers with Indian commas safely
  const formatIndian = (val) => {
    if (!val) return "";
    const num = Number(val.toString().replace(/,/g, ""));
    return isNaN(num) ? val : num.toLocaleString("en-IN");
  };

  // 💡 Format submission date and time
  const formatSubmissionDateTime = (isoString) => {
    if (!isoString) return "Not available";

    const date = new Date(isoString);

    // Format date as DD-MM-YYYY
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    // Format time as HH:MM AM/PM
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    const formattedTime = `${hours}:${minutes} ${ampm}`;

    return `${day}-${month}-${year} at ${formattedTime}`;
  };

  // 🔹 Fetch builder visits (supports 'all' view)
  const fetchVisits = async (isAll = false) => {
    try {
      // ✅ If 'isAll' is true, we request all properties (including approved ones)
      const fetchURL = isAll ? `${API}?view=all` : API;
      const res = await axios.get(fetchURL);
      let data = Array.isArray(res.data) ? res.data : [];

      // Find the earliest date from cards that have submittedAt
      let earliestDate = null;
      data.forEach((card) => {
        if (card.submittedAt) {
          const cardDate = new Date(card.submittedAt);
          if (!earliestDate || cardDate < earliestDate) {
            earliestDate = cardDate;
          }
        }
      });

      // If we found an earliest date, set old cards (without submittedAt) to one day before
      if (earliestDate) {
        const oneDayBefore = new Date(earliestDate);
        oneDayBefore.setDate(oneDayBefore.getDate() - 1);

        data = data.map((card) => {
          if (!card.submittedAt) {
            return {
              ...card,
              submittedAt: oneDayBefore.toISOString()
            };
          }
          return card;
        });
      }

      setVisits(data);
    } catch (err) {
      console.error("Fetch error:", err);
      setVisits([]);
    }
  };

  // ✅ Refetch whenever the 'All Properties' toggle is switched
  useEffect(() => {
    fetchVisits(showAllCards);
  }, [showAllCards]);

  // Helper function to scroll to a field and highlight it
  const scrollToField = (fieldName, propertyIndex = null) => {
    let element;

    if (propertyIndex !== null) {
      // For property-specific fields like PLC, FRC - find the radio group container
      const radioInputs = document.querySelectorAll(`input[name="${fieldName}-${propertyIndex}"]`);
      if (radioInputs.length > 0) {
        // Find the parent radio-group div
        element = radioInputs[0].closest('.radio-group');
      }
    } else {
      // For regular form fields
      element = document.querySelector(`[name="${fieldName}"], input[name="${fieldName}"], select[name="${fieldName}"], textarea[name="${fieldName}"]`);
    }

    if (element) {
      // Scroll to the element
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });

      // Add a red border temporarily to highlight the field
      element.style.border = '2px solid red';
      element.style.boxShadow = '0 0 10px rgba(255, 0, 0, 0.5)';
      element.style.borderRadius = '4px';

      // Focus the first input in the element if it's focusable
      const focusableInput = element.querySelector('input, select, textarea');
      if (focusableInput && focusableInput.focus) {
        setTimeout(() => focusableInput.focus(), 500);
      }

      // Remove the highlight after 3 seconds
      setTimeout(() => {
        element.style.border = '';
        element.style.boxShadow = '';
        element.style.borderRadius = '';
      }, 3000);

      return true;
    }
    return false;
  };

  // --- FORM INPUT HANDLERS ---
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;

    // When development type changes, automatically add first property AND clear floor height fields
    if (name === "developmentType" && value) {
      setFormData((prev) => {
        const prevType = prev.developmentType;

        // Determine which existing properties to keep based on transition
        let keptProperties = [];

        if (value === "Residential" && prevType === "Residential + Commercial") {
          // Keep only Residential properties, drop Commercial
          keptProperties = prev.propertySizes.filter(p => p.type === "Residential");
        } else if (value === "Commercial" && prevType === "Residential + Commercial") {
          // Keep only Commercial properties, drop Residential
          keptProperties = prev.propertySizes.filter(p => p.type === "Commercial");
        } else if (value === "Residential + Commercial" && prevType === "Residential") {
          // Keep existing Residential properties, add a blank Commercial
          keptProperties = [
            ...prev.propertySizes.filter(p => p.type === "Residential"),
            {
              type: "Commercial",
              size: "N/A",
              category: "N/A",
              floor: "",
              frontage: "",
              sqft: "",
              sqyd: "",
              basicRate: "",
              aecAuda: "",
              selldedAmount: "",
              regularPrice: "",
              boxPrice: "",
              maintenance: "",
              maintenanceDeposit: "",
              plc: "",
              frc: "",
            }
          ];
        } else if (value === "Residential + Commercial" && prevType === "Commercial") {
          // Keep existing Commercial properties, add a blank Residential
          keptProperties = [
            {
              type: "Residential",
              size: "",
              customSize: "",
              category: "",
              floor: "",
              sqft: "",
              sqyd: "",
              basicRate: "",
              aecAuda: "",
              selldedAmount: "",
              regularPrice: "",
              boxPrice: "",
              maintenance: "",
              maintenanceDeposit: "",
              plc: "",
              frc: "",
            },
            ...prev.propertySizes.filter(p => p.type === "Commercial"),
          ];
        }

        const newData = {
          ...prev,
          [name]: value,
          propertySizes: keptProperties,
          // Clear all floor height fields
          clearFloorHeight: "",
          clearFloorHeightRetail: "",
          clearFloorHeightFlats: "",
          clearFloorHeightOffices: "",
        };

        // If we already have kept properties, return early
        if (keptProperties.length > 0) {
          return newData;
        }

        // Auto-add first property based on type (fresh start for unrelated transitions)
        if (value === "Residential + Commercial") {
          // Add one Residential and one Commercial property
          return {
            ...newData,
            propertySizes: [
              {
                type: "Residential",
                size: "",
                customSize: "",
                category: "",
                floor: "",
                frontage: "",
                sqft: "",
                sqyd: "",
                basicRate: "",
                aecAuda: "",
                selldedAmount: "",
                regularPrice: "",
                boxPrice: "",
                maintenance: "",
                maintenanceDeposit: "",
                plc: "",
                frc: "",
              },
              {
                type: "Commercial",
                size: "N/A",
                category: "N/A",
                floor: "",
                frontage: "",
                sqft: "",
                sqyd: "",
                basicRate: "",
                aecAuda: "",
                selldedAmount: "",
                regularPrice: "",
                boxPrice: "",
                maintenance: "",
                maintenanceDeposit: "",
                plc: "",
                frc: "",
              }
            ]
          };
        } else if (value === "Plot") {
          // Add one Plot property
          return {
            ...newData,
            propertySizes: [
              {
                type: "Plot",
                size: "N/A",
                category: "N/A",
                floor: "",
                frontage: "",
                sqft: "",
                sqyd: "",
                basicRate: "",
                aecAuda: "",
                selldedAmount: "",
                regularPrice: "",
                boxPrice: "",
                maintenance: "",
                maintenanceDeposit: "",
                plc: "",
                frc: "",
              }
            ]
          };
        } else {
          // Add one property of the selected type (Residential or Commercial)
          return {
            ...newData,
            propertySizes: [
              {
                type: value,
                size: value === "Commercial" ? "N/A" : "",
                customSize: "",
                category: value === "Commercial" ? "N/A" : "",
                floor: "",
                frontage: "",
                sqft: "",
                sqyd: "",
                basicRate: "",
                aecAuda: "",
                selldedAmount: "",
                regularPrice: "",
                boxPrice: "",
                maintenance: "",
                maintenanceDeposit: "",
                plc: "",
                frc: "",
              }
            ]
          };
        }
      });
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handlePhoneChange = useCallback((e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 10);
    setFormData((prev) => ({ ...prev, officePersonNumber: value }));
  }, []);

  const handlePropertyChange = useCallback((index, e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = [...prev.propertySizes];
      const currentProperty = updated[index] || {};

      // Auto-calculate sqyd from sqft (divide by 9)
      if (name === "sqft" && value) {
        // Use regex to find all numbers in the string and convert them
        const convertedValue = value.replace(/\d+\.?\d*/g, (match) => {
          const num = parseFloat(match);
          if (!isNaN(num) && num > 0) {
            return (num / 9).toFixed(2);
          }
          return match;
        });

        updated[index] = {
          ...updated[index],
          sqft: value,
          sqyd: convertedValue
        };
        return { ...prev, propertySizes: updated };
      }

      // Auto-calculate sqft from sqyd (multiply by 9)
      if (name === "sqyd" && value) {
        // Use regex to find all numbers in the string and convert them
        const convertedValue = value.replace(/\d+\.?\d*/g, (match) => {
          const num = parseFloat(match);
          if (!isNaN(num) && num > 0) {
            return (num * 9).toFixed(2);
          }
          return match;
        });

        updated[index] = {
          ...updated[index],
          sqyd: value,
          sqft: convertedValue
        };
        return { ...prev, propertySizes: updated };
      }

      if (name === "frontage") {
        updated[index] = {
          ...currentProperty,
          frontage: value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1"),
        };
        return { ...prev, propertySizes: updated };
      }

      if (name === "size") {
        if (value === "Other") {
          updated[index] = {
            ...currentProperty,
            size: "Other",
            customSize: currentProperty.customSize || "",
          };
        } else {
          updated[index] = {
            ...currentProperty,
            size: value,
            customSize: "",
          };
        }
        return { ...prev, propertySizes: updated };
      }

      // Default behavior for other fields
      updated[index] = { ...updated[index], [name]: value };
      return { ...prev, propertySizes: updated };
    });
  }, []);

  // 🏗️ Add new property block
  const addPropertySize = (type = formData.developmentType) => {
    setFormData((prev) => {
      // Find the first property of the same type to copy values from
      let prefillValues = {
        basicRate: "",
        aecAuda: "",
        selldedAmount: "",
        maintenance: "",
        maintenanceDeposit: "",
        plc: "",
        frc: "",
      };

      // Look for existing property of the same type with filled values
      const firstSameType = prev.propertySizes.find(prop =>
        prop.type === type &&
        (prop.basicRate || prop.aecAuda || prop.selldedAmount || prop.maintenance || prop.maintenanceDeposit || prop.plc || prop.frc)
      );

      if (firstSameType) {
        prefillValues = {
          basicRate: firstSameType.basicRate || "",
          aecAuda: firstSameType.aecAuda || "",
          selldedAmount: firstSameType.selldedAmount || "",
          maintenance: firstSameType.maintenance || "",
          maintenanceDeposit: firstSameType.maintenanceDeposit || "",
          plc: firstSameType.plc || "",
          frc: firstSameType.frc || "",
        };
      }

      return {
        ...prev,
        propertySizes: [
          ...prev.propertySizes,
          {
            type,
            size: type === "Plot" ? "N/A" : "",
            customSize: "",
            category: type === "Plot" ? "N/A" : "",
            floor: "",
            sqft: "",
            sqyd: "",
            basicRate: prefillValues.basicRate,
            aecAuda: prefillValues.aecAuda,
            selldedAmount: prefillValues.selldedAmount,
            regularPrice: "",
            boxPrice: "",
            maintenance: prefillValues.maintenance,
            maintenanceDeposit: prefillValues.maintenanceDeposit,
            plc: prefillValues.plc,
            frc: prefillValues.frc,
          },
        ],
      };
    });
  };

  const removePropertySize = (index, type) => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete this ${type} property?\n\nAll entered data for this property will be lost.`
    );

    if (!confirmed) {
      return; // User cancelled, don't remove
    }

    setFormData((prev) => ({
      ...prev,
      propertySizes: prev.propertySizes.filter((_, i) => i !== index),
    }));
  };

  // ✏️ FIXED: When Editing — ensure property type exists
  const handleEdit = (app) => {
    setEditingId(app._id);

    const formattedPropertySizes = (app.propertySizes || []).map((p) => ({
      ...p,
      customSize:
        p.type === "Residential" && p.size && !RESIDENTIAL_SIZE_OPTIONS.includes(p.size)
          ? p.size
          : p.customSize || "",
      type:
        p.type ||
        (app.developmentType === "Residential + Commercial"
          ? p.floor
            ? "Commercial"
            : "Residential"
          : app.developmentType === "Plot"
            ? "Plot"
            : app.developmentType),
      // Keep boxPrice as-is (can contain text like "1.5 Cr")
      boxPrice: p.boxPrice || "",
    }));

    setFormData({
      ...app,
      propertySizes: formattedPropertySizes,
      executives: Array.isArray(app.executives) && app.executives.length > 0
        ? app.executives
        : [],
      usps: Array.isArray(app.usps) ? app.usps : [], // Ensure usps is an array
      avgAgreementValue: app.avgAgreementValue
        ? Number(app.avgAgreementValue).toLocaleString("en-IN")
        : "",
      // Keep boxPrice as-is (can contain text like "1.5 Cr")
      boxPrice: app.boxPrice || "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  // --- FORM SUBMIT / UPDATE ---
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevent multiple submissions
    if (isSubmitting) {
      console.log("Form is already submitting, ignoring duplicate click");
      return;
    }

    // Validate development type is selected
    if (!formData.developmentType) {
      console.warn("Validation failed: Type of Development not selected");
      scrollToField("developmentType");
      return;
    }

    // Validate Stage of Construction
    if (!formData.stageOfConstruction) {
      console.warn("Validation failed: Stage of Construction not selected");
      scrollToField("stageOfConstruction");
      return;
    }

    // Validate Project Loan Awail
    if (!formData.financingRequirements) {
      console.warn("Validation failed: Project Loan Awail not selected");
      scrollToField("financingRequirements");
      return;
    }

    // Validate Enquiry Type
    if (!formData.enquiryType) {
      console.warn("Validation failed: Enquiry Type not selected");
      scrollToField("enquiryType");
      return;
    }

    // Validate Remark
    if (!formData.remark || formData.remark.trim() === "") {
      console.warn("Validation failed: Remark is empty");
      scrollToField("remark");
      return;
    }

    // Validate Total Amenities
    if (!formData.totalAmenities || formData.totalAmenities === "") {
      console.warn("Validation failed: Total Amenities is empty");
      scrollToField("totalAmenities");
      return;
    }

    // Validate Area Type
    if (!formData.areaType) {
      console.warn("Validation failed: Area Type not selected");
      scrollToField("areaType");
      return;
    }

    // Validate PLC and FRC for all properties
    for (let i = 0; i < formData.propertySizes.length; i++) {
      const prop = formData.propertySizes[i];
      if (prop.type === "Residential" && prop.size === "Other" && !String(prop.customSize || "").trim()) {
        console.warn(`Validation failed: Custom size not entered for Residential Property ${i + 1}`);
        return;
      }
      if (!prop.plc) {
        console.warn(`Validation failed: PLC not selected for Property ${i + 1}`);
        scrollToField("plc", i);
        return;
      }
      if (!prop.frc) {
        console.warn(`Validation failed: FRC not selected for Property ${i + 1}`);
        scrollToField("frc", i);
        return;
      }
    }

    if (formData.officePersonNumber && !/^\d{10}$/.test(formData.officePersonNumber)) {
      console.warn("Validation failed: Invalid phone number");
      return;
    }

    // Set submitting state to disable button and show loading
    setIsSubmitting(true);

    try {
      const cleanPropertySizes = formData.propertySizes.map((p) => ({
        ...p,
        size:
          p.type === "Residential" && p.size === "Other"
            ? String(p.customSize || "").trim()
            : p.size,
        regularPrice: (p.regularPrice || "").replace(/,/g, ""),
        maintenance: (p.maintenance || "").replace(/,/g, ""),
        maintenanceDeposit: (p.maintenanceDeposit || "").replace(/,/g, ""),
        // Keep boxPrice as-is (can contain text like "1.5 Cr")
        boxPrice: p.boxPrice || "",
      }));

      const cleanData = {
        ...formData,
        avgAgreementValue: (formData.avgAgreementValue || "").replace(/,/g, ""),
        // Keep boxPrice as-is (can contain text like "1.5 Cr")
        boxPrice: formData.boxPrice || "",
        propertySizes: cleanPropertySizes,
        submittedAt: editingId ? formData.submittedAt : new Date().toISOString(), // Preserve original submission timestamp on edit
      };

      // Debug: Log to verify data structure including clear floor height
      console.log("Submitting data:", cleanData);
      console.log("Clear Floor Height fields:", {
        clearFloorHeight: cleanData.clearFloorHeight,
        clearFloorHeightRetail: cleanData.clearFloorHeightRetail,
        clearFloorHeightFlats: cleanData.clearFloorHeightFlats,
        clearFloorHeightOffices: cleanData.clearFloorHeightOffices,
      });

      // Reset approvals on edit/submit so both levels require re-approval
      cleanData.approval = {
        level1: { status: "Pending", by: "", at: "", remarks: "" },
        level2: { status: "Pending", by: "", at: "", remarks: "" },
      };

      const isEditing = !!editingId;

      if (editingId) {
        // Wait for backend to complete update (with 20 second timeout)
        await axios.patch(`${API}/${editingId}`, cleanData, {
          timeout: 20000,
          headers: {
            'Content-Type': 'application/json'
          }
        });

        // Clear editing state and reset form after successful update
        setEditingId(null);
        setFormData(initialForm);
        setEmailSent(false);

        // Fetch updated visits list
        await fetchVisits();
      } else {
        // New submission - save to database first and wait for response (with 20 second timeout)
        console.log("Sending POST request to:", API);

        // Start the POST request but don't wait for it
        const postPromise = axios.post(API, cleanData, {
          timeout: 20000,
          headers: {
            'Content-Type': 'application/json'
          }
        });

        // Start polling for new data immediately (check every 2 seconds)
        let dataFound = false;
        const pollInterval = setInterval(async () => {
          if (dataFound) return;

          console.log("Checking if data was saved...");
          const beforeCount = visits.length;
          await fetchVisits();

          // Check if new data appeared
          setTimeout(() => {
            const afterCount = visits.length;
            if (afterCount > beforeCount && !dataFound) {
              dataFound = true;
              clearInterval(pollInterval);

              // Data found! Hide loader
              setIsSubmitting(false);

              // Reset form
              setFormData(initialForm);

              // Send email notification in background
              if (validateEmailConfig() && !emailSent) {
                setEmailSending(true);
                sendForm2Notification(cleanData)
                  .then((emailResult) => {
                    setEmailSending(false);
                    if (emailResult.success) {
                      setEmailSent(true);
                      console.log("✅ Email notification sent successfully");
                    } else {
                      console.warn("⚠️ Email notification failed:", emailResult.message);
                    }
                  })
                  .catch((emailError) => {
                    console.error("❌ Email notification error:", emailError);
                    setEmailSending(false);
                  });
              }
            }
          }, 300);
        }, 2000); // Check every 2 seconds

        // Also wait for the actual response (in case it comes back)
        try {
          await postPromise;

          if (!dataFound) {
            clearInterval(pollInterval);
            dataFound = true;

            // Send email notification
            if (validateEmailConfig() && !emailSent) {
              setEmailSending(true);
              sendForm2Notification(cleanData)
                .then((emailResult) => {
                  setEmailSending(false);
                  if (emailResult.success) {
                    setEmailSent(true);
                    console.log("✅ Email notification sent successfully");
                  } else {
                    console.warn("⚠️ Email notification failed:", emailResult.message);
                  }
                })
                .catch((emailError) => {
                  console.error("❌ Email notification error:", emailError);
                  setEmailSending(false);
                });
            }
          }
        } catch (postError) {
          // If timeout or error, wait a bit for polling to find the data
          if (postError.code === 'ECONNABORTED') {
            console.warn("⚠️ Request timed out, waiting for polling to confirm save...");

            // Give polling 5 more seconds to find the data
            await new Promise(resolve => setTimeout(resolve, 5000));

            if (!dataFound) {
              clearInterval(pollInterval);
              throw new Error("Data was not saved. Please try again.");
            }
            // If dataFound is true, polling already handled success
            return;
          }

          clearInterval(pollInterval);
          throw postError; // Re-throw other errors
        }

        clearInterval(pollInterval);
      }

      // Reset form only after successful new submission (if not already reset by polling or edit)
      if (!isEditing) {
        setFormData(initialForm);
        setEmailSent(false);
      }

      // Fetch updated visits list (if not already fetched)
      if (!isEditing) {
        await fetchVisits();
      }

    } catch (err) {
      console.error("❌ Submit Error:", err);
      console.error("Error details:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        statusText: err.response?.statusText,
        config: {
          url: err.config?.url,
          method: err.config?.method,
          timeout: err.config?.timeout
        }
      });

      // Log error but don't show alert
      if (err.code === 'ECONNABORTED') {
        console.error("❌ Request timeout: The server is taking too long to respond.");
      } else if (err.response) {
        console.error("❌ Backend error:", err.response.data);
      } else if (err.request) {
        console.error("❌ Network error: Unable to reach server.");
      } else {
        console.error("❌ Error:", err.message);
      }
    } finally {
      // Always re-enable the submit button after completion (success or failure)
      setIsSubmitting(false);
    }
  };

  // 🔹 Approve Visit
  const handleApprove = async (id, level = 1) => {
    const password = prompt(`Enter approval password for Level ${level}:`);
    if (!password) return;

    try {
      const response = await axios.patch(`${API}/${id}/approve`, { password, level });

      // ✅ Optimistically update local state immediately for instant UI update
      const now = new Date().toISOString();
      setVisits((prev) =>
        prev.map((v) => {
          if (v._id !== id) return v;
          return {
            ...v,
            approval: {
              ...v.approval,
              [`level${level}`]: {
                ...v.approval?.[`level${level}`],
                status: "Approved",
                at: now,
              },
            },
          };
        })
      );

      // If Level 2 approval successful, send email notification in background (non-blocking)
      if (level === 2 && validateEmailConfig()) {
        const approvedVisit = visits.find(v => v._id === id);

        if (approvedVisit) {
          const emailData = {
            projectName: approvedVisit.projectName,
            groupName: approvedVisit.groupName,
            builderName: approvedVisit.builderName,
            location: approvedVisit.location,
            developmentType: approvedVisit.developmentType,
            totalUnitsBlocks: approvedVisit.totalUnitsBlocks,
            remark: approvedVisit.remark,
            approvedBy: "Admin",
            level1Status: approvedVisit.approval?.level1?.status,
            level1By: approvedVisit.approval?.level1?.by,
            level1At: approvedVisit.approval?.level1?.at,
          };

          sendLevel2ApprovalNotification(emailData)
            .then((emailResult) => {
              if (emailResult.success) {
                console.log(`✅ Level ${level} approval email sent successfully`);
              } else {
                console.warn(`⚠️ Level ${level} approval email failed:`, emailResult.message);
              }
            })
            .catch((emailError) => {
              console.error("❌ Level 2 approval email error:", emailError);
            });
        }
      }

      // Sync with server in background
      fetchVisits();
    } catch (err) {
      console.error("❌ Approval failed:", err);
      if (err.response && err.response.status === 401) {
        alert("Invalid password!");
      } else {
        console.error("Approval error:", err.response?.data?.error || "Approval failed");
      }
    }
  };

  // 🔹 Open rejection modal
  const handleRejectWithRemarks = (id, level = 1) => {
    setRejectionModal({
      isOpen: true,
      visitId: id,
      level: level,
      remarks: ""
    });
  };

  // 🔹 Confirm rejection with remarks
  const confirmRejection = async (remarks) => {
    // Validate remarks are not empty or whitespace-only
    const trimmedRemarks = remarks.trim();
    if (!trimmedRemarks) {
      console.warn("Rejection failed: Remarks cannot be empty");
      return;
    }

    const password = prompt(`Enter approval password to reject Level ${rejectionModal.level}:`);
    if (!password) return;

    try {
      // Call API with password, level, and comment (backend expects 'comment' not 'remarks')
      await axios.patch(`${API}/${rejectionModal.visitId}/reject`, {
        password,
        level: rejectionModal.level,
        comment: trimmedRemarks
      });

      // Close modal and refresh visits on success
      setRejectionModal({
        isOpen: false,
        visitId: null,
        level: null,
        remarks: ""
      });

      fetchVisits();
    } catch (err) {
      console.error("❌ Rejection failed:", err);

      // Display error message on validation failure
      if (err.response && err.response.status === 401) {
        alert("❌ Invalid password!");
      } else {
        console.error("Rejection error:", err.response?.data?.error || "Rejection failed");
      }
    }
  };

  // 🔹 Cancel rejection modal
  const cancelRejection = () => {
    setRejectionModal({
      isOpen: false,
      visitId: null,
      level: null,
      remarks: ""
    });
  };

  // 🔹 Reject Visit (legacy - kept for backward compatibility)
  const handleReject = (id, level = 1) => {
    // Replace direct API call with handleRejectWithRemarks call
    handleRejectWithRemarks(id, level);
  };

  // 🔹 Export Excel
  const handleExportExcel = async () => {
    try {
      const enteredPassword = prompt("Enter password to download Excel:");
      if (!enteredPassword) return;

      const res = await axios.get(
        `${API}/export/excel?password=${enteredPassword}`,
        {
          responseType: "blob",
        }
      );

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "Builder_Visits.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Excel download failed:", err);
      console.error("Error:", err.response?.data?.error || "Download failed");
    }
  };

  // 🔒 Verify Level 2 password for "All Properties" view
  const handleVerifyPassword = async () => {
    if (!passwordInput.trim()) {
      setPasswordError("Please enter the password.");
      return;
    }
    setPasswordVerifying(true);
    setPasswordError("");
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/verify-level2-password`,
        { key: "APPROVE_LEVEL2_PASSWORD", password: passwordInput }
      );
      // Store session token in memory only
      sessionTokenRef.current = res.data?.token || "verified";
      setShowAllCards(true);
      setShowPasswordModal(false);
      setPasswordInput("");
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        setPasswordError("Incorrect Approval Password.");
      } else {
        setPasswordError("Verification failed. Please try again.");
      }
    } finally {
      setPasswordVerifying(false);
    }
  };

  const formatDate = (iso) =>
    iso ? new Date(iso).toISOString().split("T")[0] : "";

  return (
    <div className="form-container">
      <div className="form-title-row">
        <h2 className="form-title">Project Login Form</h2>
      </div>

      {/* Submission Loading Modal */}
      <SubmissionLoader isVisible={isSubmitting} isEditing={!!editingId} />

      {/* Email Sending Indicator */}
      <EmailSendingIndicator isVisible={emailSending} />

      {/* Rejection Modal */}
      <RejectionModal
        isOpen={rejectionModal.isOpen}
        onConfirm={confirmRejection}
        onCancel={cancelRejection}
        level={rejectionModal.level}
      />

      <form
        onSubmit={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const form = e.target.form;
            const index = Array.prototype.indexOf.call(form, e.target);
            form.elements[index + 1]?.focus(); // next input pe focus karega
          }
        }}
      >
        <div className="form-grid">
          <label>
            Developer Group Name:<span className="required-asterisk">*</span>
            <input
              type="text"
              placeholder="Enter Group Name"
              name="groupName"
              value={formData.groupName}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Project Name:<span className="required-asterisk">*</span>
            <input
              type="text"
              placeholder="Enter Project Name"
              name="projectName"
              value={formData.projectName}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Developer Name:
            <input
              placeholder="Enter Builder Name"
              type="text"
              name="builderName"
              value={formData.builderName}
              onChange={handleChange}
            />
          </label>

          <label>
            Developer Number:
            <input
              placeholder="Enter Developer Number"
              type="tel"
              name="builderNumber"
              value={formData.builderNumber}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                setFormData((prev) => ({ ...prev, builderNumber: value }));
              }}
              inputMode="numeric"
              pattern="\d{10}"
              maxLength={10}
            />
          </label>

          <label>
            Location/Address:<span className="required-asterisk">*</span>
            <input
              type="text"
              placeholder="Enter Location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
            />
          </label>

          <label className="full-width">
            Developer Office Person Details:<span className="required-asterisk">*</span>
            <input
              type="text"
              placeholder="Name, Designation"
              name="officePersonDetails"
              value={formData.officePersonDetails}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Developer Office Person Number:<span className="required-asterisk">*</span>
            <input
              type="tel"
              placeholder="Enter Mobile number"
              name="officePersonNumber"
              value={formData.officePersonNumber}
              onChange={handlePhoneChange}
              inputMode="numeric"
              pattern="\d{10}"
              maxLength={10}
              required
            />
          </label>

          {/* -------------------- EXECUTIVES SECTION -------------------- */}
          <div className="full-width" style={{ gridColumn: "span 2", marginBottom: "20px" }}>
            <label style={{
              display: "block",
              marginBottom: "10px",
              fontWeight: "500",
              fontSize: "14px"
            }}>
              Executive Name & Number:
            </label>

            {formData.executives && formData.executives.length > 0 ? (
              <div style={{
                border: "1px solid #ddd",
                padding: "15px",
                borderRadius: "8px",
                backgroundColor: "#f9f9f9"
              }}>
                {formData.executives.map((exec, index) => (
                  <div
                    key={index}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr auto",
                      gap: "12px",
                      marginBottom: index < formData.executives.length - 1 ? "12px" : "0",
                      alignItems: "center",
                      padding: "10px",
                      backgroundColor: "white",
                      borderRadius: "6px",
                      border: "1px solid #e0e0e0"
                    }}
                  >
                    <div>
                      <input
                        type="text"
                        placeholder="Executive Name"
                        value={exec.name || ""}
                        onChange={(e) => {
                          const updated = [...(formData.executives || [])];
                          updated[index] = {
                            ...updated[index],
                            name: e.target.value,
                          };
                          setFormData((prev) => ({
                            ...prev,
                            executives: updated,
                          }));
                        }}
                        style={{
                          width: "100%",
                          padding: "10px",
                          border: "1px solid #ccc",
                          borderRadius: "4px",
                          fontSize: "14px"
                        }}
                      />
                    </div>
                    <div>
                      <input
                        type="tel"
                        placeholder="Executive Number (10 digits)"
                        value={exec.number || ""}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                          const updated = [...(formData.executives || [])];
                          updated[index] = {
                            ...updated[index],
                            number: value,
                          };
                          setFormData((prev) => ({
                            ...prev,
                            executives: updated,
                          }));
                        }}
                        inputMode="numeric"
                        maxLength={10}
                        style={{
                          width: "100%",
                          padding: "10px",
                          border: "1px solid #ccc",
                          borderRadius: "4px",
                          fontSize: "14px"
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = formData.executives.filter(
                          (_, i) => i !== index
                        );
                        setFormData((prev) => ({
                          ...prev,
                          executives: updated,
                        }));
                      }}
                      style={{
                        padding: "10px 16px",
                        backgroundColor: "#dc3545",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "500",
                        transition: "background-color 0.2s",
                        whiteSpace: "nowrap"
                      }}
                      onMouseOver={(e) => e.target.style.backgroundColor = "#c82333"}
                      onMouseOut={(e) => e.target.style.backgroundColor = "#dc3545"}
                    >
                      Remove
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    const updated = [...(formData.executives || [])];
                    updated.push({ name: "", number: "" });
                    setFormData((prev) => ({ ...prev, executives: updated }));
                  }}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#28a745",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    marginTop: "12px",
                    fontSize: "14px",
                    fontWeight: "500",
                    transition: "background-color 0.2s",
                    width: "100%"
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = "#218838"}
                  onMouseOut={(e) => e.target.style.backgroundColor = "#28a745"}
                >
                  + Add Another Executive
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setFormData((prev) => ({
                    ...prev,
                    executives: [{ name: "", number: "" }]
                  }));
                }}
                style={{
                  padding: "12px 24px",
                  backgroundColor: "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  transition: "background-color 0.2s",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = "#0056b3"}
                onMouseOut={(e) => e.target.style.backgroundColor = "#007bff"}
              >
                + Add Executive
              </button>
            )}
          </div>

          {/* -------------------- DEVELOPMENT TYPE -------------------- */}
          <div className="radio-group full-width">
            <p className="radio-label">Type of Development:<span className="required-asterisk">*</span></p>
            {["Residential", "Commercial", "Residential + Commercial", "Plot"].map(
              (type) => (
                <label key={type}>
                  <input
                    type="radio"
                    name="developmentType"
                    value={type}
                    checked={formData.developmentType === type}
                    onChange={handleChange}
                  />
                  {type}
                </label>
              )
            )}
          </div>

          {/* -------------------- PROPERTY SECTION (SHARED TEMPLATE) -------------------- */}
          {["Residential", "Commercial", "Plot"]
            .filter(
              (type) => {
                // For "Residential + Commercial", only show Residential and Commercial (not Plot)
                if (formData.developmentType === "Residential + Commercial") {
                  return type === "Residential" || type === "Commercial";
                }
                // For other types, show only the selected type
                return formData.developmentType === type;
              }
            )
            .map((type) => {
              // Filter properties of this type
              const propertiesOfType = formData.propertySizes.filter(p => p.type === type);

              return (
                <div key={type} className="property-section">
                  <h3 className="section-title">
                    {type === "Residential" ? "🏠 Residential" : type === "Commercial" ? "🏢 Commercial" : "📐 Plot"}{" "}
                    Properties
                  </h3>

                  {propertiesOfType.length > 0 ? (
                    <>
                      {formData.propertySizes.map((prop, index) => {
                        if (prop.type !== type) return null; // Only render matching type

                        // Calculate the correct property number for this type
                        const typeIndex = formData.propertySizes
                          .slice(0, index)
                          .filter(p => p.type === type).length + 1;

                        return (
                          <div key={index} className="conditional-fields">
                            <div style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: "15px"
                            }}>
                              <h4 style={{ margin: 0 }}>
                                {type} Property {typeIndex}
                              </h4>

                              {/* Remove button - only show if more than 1 property of this type */}
                              {propertiesOfType.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removePropertySize(index, type)}
                                  style={{
                                    padding: "8px 16px",
                                    backgroundColor: "#dc3545",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    fontSize: "14px",
                                    fontWeight: "500",
                                    transition: "background-color 0.2s",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px"
                                  }}
                                  onMouseOver={(e) => e.target.style.backgroundColor = "#c82333"}
                                  onMouseOut={(e) => e.target.style.backgroundColor = "#dc3545"}
                                >
                                  <span style={{ fontSize: "16px" }}>🗑️</span>
                                  Remove Property
                                </button>
                              )}
                            </div>

                            {/* Unique field per type */}
                            {type === "Residential" && (
                              <div className="size-category-row">
                                <label>
                                  Size:<span className="required-asterisk">*</span>
                                  <select
                                    name="size"
                                    value={
                                      prop.size === "Other" || (prop.size && !RESIDENTIAL_SIZE_OPTIONS.includes(prop.size))
                                        ? "Other"
                                        : prop.size
                                    }
                                    onChange={(e) => handlePropertyChange(index, e)}
                                    required
                                  >
                                    <option value="">Select</option>
                                    {RESIDENTIAL_SIZE_OPTIONS.map((sizeOption) => (
                                      <option key={sizeOption} value={sizeOption}>{sizeOption}</option>
                                    ))}
                                    <option value="Other">Other</option>
                                  </select>
                                </label>
                                {(prop.size === "Other" || (prop.size && !RESIDENTIAL_SIZE_OPTIONS.includes(prop.size))) && (
                                  <label>
                                    Custom BHK Type:<span className="required-asterisk">*</span>
                                    <input
                                      type="text"
                                      name="customSize"
                                      placeholder="Enter custom size (e.g., 3.5 BHK)"
                                      value={prop.customSize || (prop.size !== "Other" ? prop.size : "")}
                                      onChange={(e) => handlePropertyChange(index, e)}
                                      required
                                    />
                                  </label>
                                )}
                                <label>
                                  Category:<span className="required-asterisk">*</span>
                                  <select
                                    name="category"
                                    value={prop.category}
                                    onChange={(e) => handlePropertyChange(index, e)}
                                    required
                                  >
                                    <option value="">Select</option>
                                    <option>Flats</option>
                                    <option>Bunglow</option>
                                    <option>PentHouse</option>
                                    <option>Duplex</option>
                                    <option>Duplex PentHouse</option>
                                    <option>Triplex</option>
                                    <option>Triplex PentHouse</option>
                                    <option>Weekend Villa</option>
                                  </select>
                                </label>
                              </div>
                            )}
                            {type === "Commercial" && (
                              <>
                                <label>
                                  Floor:<span className="required-asterisk">*</span>
                                  <select
                                    name="floor"
                                    value={prop.floor === "Other" || (prop.floor && !["Ground Floor", "1st Floor", "2nd Floor", "Office"].includes(prop.floor)) ? "Other" : prop.floor}
                                    onChange={(e) => {
                                      if (e.target.value === "Other") {
                                        handlePropertyChange(index, { target: { name: "floor", value: "Other" } });
                                      } else {
                                        handlePropertyChange(index, e);
                                      }
                                    }}
                                    required
                                  >
                                    <option value="">Select</option>
                                    <option>Ground Floor</option>
                                    <option>1st Floor</option>
                                    <option>2nd Floor</option>
                                    <option>Office</option>
                                    <option value="Other">Other</option>
                                  </select>
                                </label>

                                {(prop.floor === "Other" || (prop.floor && !["Ground Floor", "1st Floor", "2nd Floor", "Office", ""].includes(prop.floor))) && (
                                  <label>
                                    Custom Floor Name:<span className="required-asterisk">*</span>
                                    <input
                                      type="text"
                                      name="floor"
                                      placeholder="Enter custom floor name"
                                      value={prop.floor === "Other" ? "" : prop.floor}
                                      onChange={(e) => handlePropertyChange(index, e)}
                                      required
                                      style={{
                                        marginTop: "10px",
                                        borderColor: "#1976d2"
                                      }}
                                    />
                                  </label>
                                )}
                              </>
                            )}
                            {[
                              ["sqft", "SQ.FT", "Enter SQ.FT (auto-fills VAR)"],
                              ["sqyd", "VAR", "Enter VAR (auto-fills SQ.FT)"],
                              ["basicRate", "Basic Rate", "Enter Basic Rate"],
                              ["aecAuda", "AMC & Torrent", "Enter AMC & Torrent"],
                              ["maintenance", "Running Maintenance", "Enter Running Maintenance"],
                              ["maintenanceDeposit", "Maintenance Deposit", "Enter Maintenance Deposit"],
                              ["selldedAmount", "SaleDeed Amount", "Enter SaleDeed Amount"],
                              ["boxPrice", "Box Price", "Enter Box Price"],
                            ].map(([name, label, placeholder]) => (
                              <label key={name}>
                                {label}:<span className="required-asterisk">*</span>
                                <input
                                  type="text"
                                  name={name}
                                  placeholder={placeholder}
                                  value={prop[name]}
                                  required
                                  onChange={(e) => {
                                    let value = e.target.value;

                                    // ✅ Box Price allows free-form text (e.g., "1.5 Cr", "2 Cr", etc.)
                                    if (["boxPrice"].includes(name)) {
                                      // Allow any text input for box price
                                      handlePropertyChange(index, {
                                        target: { name, value: value },
                                      });
                                      return;
                                    }

                                    // 🧾 for sqft, sqyd & aecAuda → plain update (no commas)
                                    handlePropertyChange(index, e);
                                  }}
                                />
                              </label>
                            ))}
                            
                            {/* Frontage field - only for Commercial */}
                            {type === "Commercial" && (
                              <label>
                                Frontage (Ft.):<span className="required-asterisk">*</span>
                                <input
                                  type="text"
                                  name="frontage"
                                  inputMode="decimal"
                                  placeholder="Enter frontage in Ft"
                                  value={prop.frontage || ""}
                                  onChange={(e) => handlePropertyChange(index, e)}
                                  required
                                />
                              </label>
                            )}

                            {/* PLC Radio Buttons */}
                            <div className="radio-group" style={{ gridColumn: "span 1" }}>
                              <p className="radio-label">PLC:<span className="required-asterisk">*</span></p>
                              <label>
                                <input
                                  type="radio"
                                  name={`plc-${index}`}
                                  data-property-index={index}
                                  value="Yes"
                                  checked={prop.plc === "Yes"}
                                  onChange={(e) =>
                                    handlePropertyChange(index, {
                                      target: { name: "plc", value: e.target.value },
                                    })
                                  }
                                />
                                Yes
                              </label>
                              <label>
                                <input
                                  type="radio"
                                  name={`plc-${index}`}
                                  data-property-index={index}
                                  value="No"
                                  checked={prop.plc === "No"}
                                  onChange={(e) =>
                                    handlePropertyChange(index, {
                                      target: { name: "plc", value: e.target.value },
                                    })
                                  }
                                />
                                No
                              </label>
                            </div>

                            {/* FRC Radio Buttons */}
                            <div className="radio-group" style={{ gridColumn: "span 1" }}>
                              <p className="radio-label">FRC:<span className="required-asterisk">*</span></p>
                              <label>
                                <input
                                  type="radio"
                                  name={`frc-${index}`}
                                  data-property-index={index}
                                  value="Yes"
                                  checked={prop.frc === "Yes"}
                                  onChange={(e) =>
                                    handlePropertyChange(index, {
                                      target: { name: "frc", value: e.target.value },
                                    })
                                  }
                                />
                                Yes
                              </label>
                              <label>
                                <input
                                  type="radio"
                                  name={`frc-${index}`}
                                  data-property-index={index}
                                  value="No"
                                  checked={prop.frc === "No"}
                                  onChange={(e) =>
                                    handlePropertyChange(index, {
                                      target: { name: "frc", value: e.target.value },
                                    })
                                  }
                                />
                                No
                              </label>
                            </div>
                          </div>
                        );
                      })}

                      <button
                        type="button"
                        className="property-btn add-btn"
                        onClick={() => addPropertySize(type)}
                      >
                        + Add Another {type} Property
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="property-btn add-btn"
                      onClick={() => addPropertySize(type)}
                      style={{
                        padding: "12px 24px",
                        fontSize: "14px",
                        fontWeight: "500"
                      }}
                    >
                      + Add {type} Property
                    </button>
                  )}
                </div>
              );
            })}

          {/* -------------------- AREA TYPE (FORM LEVEL) -------------------- */}
          <div className="radio-group full-width">
            <p className="radio-label">Area Type:<span className="required-asterisk">*</span></p>
            <label>
              <input
                type="radio"
                name="areaType"
                value="Super Built-up"
                checked={formData.areaType === "Super Built-up"}
                onChange={handleChange}
              />
              Super Built-up
            </label>
            <label>
              <input
                type="radio"
                name="areaType"
                value="Built-Up"
                checked={formData.areaType === "Built-Up"}
                onChange={handleChange}
              />
              Built-Up
            </label>
            <label>
              <input
                type="radio"
                name="areaType"
                value="Carpet"
                checked={formData.areaType === "Carpet"}
                onChange={handleChange}
              />
              Carpet
            </label>
          </div>

          {/* -------------------- CLEAR FLOOR HEIGHT (DYNAMIC BASED ON DEVELOPMENT TYPE) -------------------- */}
          {formData.developmentType === "Residential" && (
            <label className="full-width">
              Clear Floor Height:<span className="required-asterisk">*</span>
              <input
                type="text"
                name="clearFloorHeight"
                placeholder="Enter Clear Floor Height (e.g., 10 ft)"
                value={formData.clearFloorHeight || ""}
                onChange={handleChange}
                required
              />
            </label>
          )}

          {formData.developmentType === "Residential + Commercial" && (
            <>
              <label>
                Retail Clear Floor Height :<span className="required-asterisk">*</span>
                <input
                  type="text"
                  name="clearFloorHeightRetail"
                  placeholder="Enter Clear Floor Height for Retail"
                  value={formData.clearFloorHeightRetail || ""}
                  onChange={handleChange}
                  required
                />
              </label>
              <label>
                Flats Clear Floor Height:<span className="required-asterisk">*</span>
                <input
                  type="text"
                  name="clearFloorHeightFlats"
                  placeholder="Enter Clear Floor Height for Flats"
                  value={formData.clearFloorHeightFlats || ""}
                  onChange={handleChange}
                  required
                />
              </label>
            </>
          )}

          {formData.developmentType === "Commercial" && (
            <>
              <label>
                Retail Clear Floor Height:<span className="required-asterisk">*</span>
                <input
                  type="text"
                  name="clearFloorHeightRetail"
                  placeholder="Enter Clear Floor Height for Retail"
                  value={formData.clearFloorHeightRetail || ""}
                  onChange={handleChange}
                  required
                />
              </label>
              <label>
                Offices Clear Floor Height:<span className="required-asterisk">*</span>
                <input
                  type="text"
                  name="clearFloorHeightOffices"
                  placeholder="Enter Clear Floor Height for Offices"
                  value={formData.clearFloorHeightOffices || ""}
                  onChange={handleChange}
                  required
                />
              </label>
            </>
          )}

          {/* <div className="radio-group full-width">
            <p className="radio-label"> Price Negotiable:</p>
            <label>
              <input
                type="radio"
                name="negotiable"
                value="Yes"
                checked={formData.negotiable === "Yes"}
                onChange={handleChange}
              />
              Yes
            </label>
            <label>
              <input
                type="radio"
                name="negotiable"
                value="No"
                checked={formData.negotiable === "No"}
                onChange={handleChange}
              />
              No
            </label>
          </div> */}
          <label>
            Total No. Units:<span className="required-asterisk">*</span>
            <input
              placeholder=" Enter Total No. Units "
              type="text"
              name="totalUnitsBlocks"
              value={formData.totalUnitsBlocks}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Total No. Blocks:<span className="required-asterisk">*</span>
            <input
              placeholder="Enter Total No. Blocks"
              type="text"
              name="totalBlocks"
              value={formData.totalBlocks}
              onChange={handleChange}
              required
            />
          </label>

          <div className="radio-group full-width">
            <p className="radio-label">Stage of Construction:<span className="required-asterisk">*</span></p>
            {["Under-Construction", "Ready to move", "Pre-launch"].map(
              (stage) => (
                <label key={stage}>
                  <input
                    type="radio"
                    name="stageOfConstruction"
                    value={stage}
                    checked={formData.stageOfConstruction === stage}
                    onChange={handleChange}
                  />
                  {stage}
                </label>
              )
            )}
          </div>
          {(formData.developmentType === "Residential" ||
            formData.developmentType === "Residential + Commercial") && (
              <label className="full-width">
                Community:<span className="required-asterisk">*</span>
                <input
                  placeholder="Enter Community"
                  type="text"
                  name="gentry"
                  value={formData.gentry}
                  onChange={handleChange}
                  required
                />
              </label>
            )}

          <label>
            Expected Soft Possesion:<span className="required-asterisk">*</span>
            <input
              type="month"
              name="expectedCompletionDate"
              value={formData.expectedCompletionDate}
              onChange={handleChange}
              required
            />
          </label>

          <div className="radio-group full-width">
            <p className="radio-label">Project Loan Awail:<span className="required-asterisk">*</span></p>
            <label>
              <input
                type="radio"
                name="financingRequirements"
                value="Yes"
                checked={formData.financingRequirements === "Yes"}
                onChange={handleChange}
              />
              Yes
            </label>
            <label>
              <input
                type="radio"
                name="financingRequirements"
                value="No"
                checked={formData.financingRequirements === "No"}
                onChange={handleChange}
              />
              No
            </label>
          </div>
          <label className="full-width">
            Nearby Similar Projects:<span className="required-asterisk">*</span>
            <textarea
              placeholder="Enter Nearby Other Projects"
              name="nearbyProjects"
              value={formData.nearbyProjects}
              onChange={handleChange}
              required
            />
          </label>

          <div className="radio-group full-width">
            <p className="radio-label">Enquiry Type:<span className="required-asterisk">*</span></p>
            {["Salaried", "Self-employed", "Both"].map(
              (type) => (
                <label key={type}>
                  <input
                    type="radio"
                    name="enquiryType"
                    value={type}
                    checked={formData.enquiryType === type}
                    onChange={handleChange}
                  />
                  {type}
                </label>
              )
            )}
          </div>

          <label>
            Units Available for Sale:<span className="required-asterisk">*</span>
            <input
              placeholder="Enter Units to be sold by us"
              type="string"
              name="unitsForSale"
              value={formData.unitsForSale}
              onChange={handleChange}
              required
            />
          </label>

          <div className="full-width" style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "500", fontSize: "14px" }}>
              USP's:
            </label>
            <div ref={uspDropdownRef} style={{ position: "relative" }}>
              {/* Dropdown Button */}
              <div
                onClick={() => setUspDropdownOpen(!uspDropdownOpen)}
                style={{
                  border: uspDropdownOpen ? "2px solid #1976d2" : "1px solid #d0d0d0",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  backgroundColor: "#fff",
                  cursor: "pointer",
                  minHeight: "48px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "all 0.2s ease",
                  boxShadow: uspDropdownOpen ? "0 0 0 3px rgba(25, 118, 210, 0.1)" : "none",
                }}
                onMouseEnter={(e) => {
                  if (!uspDropdownOpen) {
                    e.currentTarget.style.borderColor = "#999";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!uspDropdownOpen) {
                    e.currentTarget.style.borderColor = "#d0d0d0";
                  }
                }}
              >
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  {formData.usps && formData.usps.length > 0 ? (
                    <>
                      {formData.usps.map((usp, idx) => (
                        <span
                          key={idx}
                          style={{
                            backgroundColor: "#1976d2",
                            color: "white",
                            padding: "4px 12px",
                            borderRadius: "16px",
                            fontSize: "13px",
                            fontWeight: "500",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            boxShadow: "0 2px 4px rgba(25, 118, 210, 0.2)",
                          }}
                        >
                          {usp}
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setFormData((prev) => ({
                                ...prev,
                                usps: prev.usps.filter((u) => u !== usp),
                              }));
                            }}
                            style={{
                              cursor: "pointer",
                              fontSize: "16px",
                              fontWeight: "bold",
                              opacity: 0.8,
                              transition: "opacity 0.2s",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.8")}
                          >
                            ×
                          </span>
                        </span>
                      ))}
                      <span style={{ color: "#666", fontSize: "13px", marginLeft: "4px" }}>
                        ({formData.usps.length} selected)
                      </span>
                    </>
                  ) : (
                    <span style={{ color: "#999", fontSize: "14px" }}>
                      Click to select USP's...
                    </span>
                  )}
                </div>
                <div style={{
                  marginLeft: "12px",
                  fontSize: "18px",
                  color: uspDropdownOpen ? "#1976d2" : "#666",
                  transition: "all 0.2s ease",
                  transform: uspDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                }}>
                  ▼
                </div>
              </div>

              {/* Dropdown Menu */}
              {uspDropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    left: 0,
                    right: 0,
                    border: "1px solid #e0e0e0",
                    borderRadius: "8px",
                    backgroundColor: "#fff",
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.08)",
                    maxHeight: "320px",
                    overflowY: "auto",
                    zIndex: 1000,
                    animation: "slideDown 0.2s ease",
                  }}
                >
                  {/* Header */}
                  <div style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid #e0e0e0",
                    backgroundColor: "#f8f9fa",
                    fontWeight: "600",
                    fontSize: "14px",
                    color: "#333",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}>
                    <span>Select USP's</span>
                    {formData.usps && formData.usps.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormData((prev) => ({ ...prev, usps: [] }));
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#d32f2f",
                          fontSize: "12px",
                          cursor: "pointer",
                          fontWeight: "500",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          transition: "background-color 0.2s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#ffebee")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {/* Options */}
                  <div style={{ padding: "4px 0" }}>
                    {[
                      "DGU Sound Proof Glass",
                      "Italian marble",
                      "360 open view",
                      "Heat pump",
                      "Central AC",
                      "2 road corner Project",
                      "3 road corner Project",
                      "Pure residential",
                      "Nr.Jain Derasar",
                      "No vehicle zone at ground floor",
                      "VRV System",
                      "Seperate Pooja Space",
                      "Fully Vastu Compliant"
                    ].map((usp, index) => {
                      const isChecked = formData.usps?.includes(usp) || false;
                      return (
                        <label
                          key={usp}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            padding: "12px 16px",
                            cursor: "pointer",
                            transition: "background-color 0.15s ease",
                            backgroundColor: isChecked ? "#e3f2fd" : "transparent",
                            borderLeft: isChecked ? "3px solid #1976d2" : "3px solid transparent",
                          }}
                          onMouseEnter={(e) => {
                            if (!isChecked) {
                              e.currentTarget.style.backgroundColor = "#f5f5f5";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isChecked) {
                              e.currentTarget.style.backgroundColor = "transparent";
                            }
                          }}
                        >
                          <input
                            type="checkbox"
                            value={usp}
                            checked={isChecked}
                            onChange={(e) => {
                              const value = e.target.value;
                              setFormData((prev) => {
                                const currentUsps = prev.usps || [];
                                if (e.target.checked) {
                                  return { ...prev, usps: [...currentUsps, value] };
                                } else {
                                  return {
                                    ...prev,
                                    usps: currentUsps.filter((u) => u !== value),
                                  };
                                }
                              });
                            }}
                            style={{
                              marginRight: "12px",
                              width: "18px",
                              height: "18px",
                              cursor: "pointer",
                              accentColor: "#1976d2",
                            }}
                          />
                          <span style={{
                            fontSize: "14px",
                            color: isChecked ? "#1976d2" : "#333",
                            fontWeight: isChecked ? "500" : "400",
                          }}>
                            {usp}
                          </span>
                          {isChecked && (
                            <span style={{
                              marginLeft: "auto",
                              color: "#1976d2",
                              fontSize: "16px",
                              fontWeight: "bold",
                            }}>
                              ✓
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <style>
              {`
                @keyframes slideDown {
                  from {
                    opacity: 0;
                    transform: translateY(-10px);
                  }
                  to {
                    opacity: 1;
                    transform: translateY(0);
                  }
                }
              `}
            </style>
          </div>

          <label className="full-width">
            Remark:<span className="required-asterisk">*</span>
            <textarea
              name="remark"
              value={formData.remark}
              onChange={handleChange}
              placeholder="Any extra comments or notes"
              required
            />
          </label>

          {/* Total Amenities Field */}
          <label>
            Total Amenities:<span className="required-asterisk">*</span>
            <input
              type="number"
              name="totalAmenities"
              value={formData.totalAmenities}
              onChange={handleChange}
              placeholder="Enter total amenities"
              min="0"
              required
              style={{
                padding: "10px",
                fontSize: "14px",
                borderRadius: "6px",
                border: "1px solid #d0d0d0",
              }}
            />
          </label>

          {/* Alloted Car Parking Field */}
          <label>
            Alloted Car Parking:
            <select
              name="allotedCarParking"
              value={formData.allotedCarParking}
              onChange={handleChange}
              style={{
                padding: "10px",
                fontSize: "14px",
                borderRadius: "6px",
                border: "1px solid #d0d0d0",
                backgroundColor: "#fff",
                cursor: "pointer",
              }}
            >
              <option value="">Select parking</option>
              <option value="0">0</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
              <option value="6">6</option>
              <option value="7">7</option>
            </select>
          </label>

          <label className="full-width">
            Payout (Group Project):<span className="required-asterisk">*</span>
            <input
              type="text"
              name="payout"
              value={formData.payout}
              onChange={handleChange}
              placeholder="Enter payout details"
              required
            />
          </label>

          <label className="full-width">
            Sai-Fakira Manager:<span className="required-asterisk">*</span>
            <select
              name="saiFakiraManager"
              value={formData.saiFakiraManager}
              onChange={handleChange}
              required
            >
              <option value="">Select Manager</option>
              <option>Dharmesh Bhavsar</option>
              <option>Robins Kapadia</option>
              <option>Vinay Mishra</option>
              <option>Harsh Brahmbhatt</option>
              <option>Niraj Gelot</option>
              <option>Mehul Prajapati</option>
            </select>
          </label>

          <button
            type="submit"
            className="submit-btn"
            disabled={isSubmitting}
            style={{
              opacity: isSubmitting ? 0.6 : 1,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              position: 'relative'
            }}
          >
            {isSubmitting ? (
              <>
                <span style={{ marginRight: '8px' }}>⏳</span>
                {editingId ? "Updating..." : "Submitting..."}
              </>
            ) : (
              editingId ? "Update Form" : "Submit Form"
            )}
          </button>
        </div>
      </form>
      <div className="excel-export-section">
        <button onClick={handleExportExcel} className="download-btn">
          Export Excel (Level 2 Approved Only)
        </button>
      </div>

      <div className="view-toggle-container">
        <div className="view-toggle">
          <button
            type="button"
            className={`view-toggle-btn ${!showAllCards ? 'active' : ''}`}
            onClick={() => {
              setShowAllCards(false);
              sessionTokenRef.current = null;
            }}
          >
            📋 Pending Approval
          </button>
          <button
            type="button"
            className={`view-toggle-btn ${showAllCards ? 'active' : ''}`}
            onClick={() => {
              if (showAllCards) {
                setShowAllCards(false);
                sessionTokenRef.current = null;
                return;
              }
              setPasswordInput("");
              setPasswordError("");
              setShowPasswordModal(true);
            }}
          >
            🔒 All Properties
          </button>
        </div>
      </div>

      {/* Password Gate Modal */}
      {showPasswordModal && (
        <div style={{
          position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
        }}>
          <div style={{
            background: "#fff", borderRadius: "12px", padding: "32px 28px",
            width: "100%", maxWidth: "380px", boxShadow: "0 8px 32px rgba(0,0,0,0.18)"
          }}>
            <h3 style={{ margin: "0 0 6px", color: "#0369a1", fontSize: "18px" }}>🔒 Enter Approval Password</h3>
            <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#64748b" }}>
              Use your Level 2 approval password to access all properties.
            </p>
            <input
              type="password"
              autoFocus
              placeholder="Enter password"
              value={passwordInput}
              onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleVerifyPassword()}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: "8px",
                border: passwordError ? "1.5px solid #dc2626" : "1.5px solid #bae6fd",
                fontSize: "15px", outline: "none", boxSizing: "border-box", marginBottom: "8px"
              }}
            />
            {passwordError && (
              <p style={{ color: "#dc2626", fontSize: "13px", margin: "0 0 12px" }}>❌ {passwordError}</p>
            )}
            <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
              <button
                onClick={() => { setShowPasswordModal(false); setPasswordInput(""); setPasswordError(""); }}
                style={{
                  flex: 1, padding: "10px", borderRadius: "8px", border: "1.5px solid #e2e8f0",
                  background: "#f8fafc", cursor: "pointer", fontWeight: "600", fontSize: "14px"
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyPassword}
                disabled={passwordVerifying}
                style={{
                  flex: 1, padding: "10px", borderRadius: "8px", border: "none",
                  background: passwordVerifying ? "#93c5fd" : "#0369a1",
                  color: "#fff", cursor: passwordVerifying ? "not-allowed" : "pointer",
                  fontWeight: "600", fontSize: "14px"
                }}
              >
                {passwordVerifying ? "Verifying..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Section */}
      <div className="filter-section">
        <h3 className="filter-title">🔍 Search Properties</h3>
        <div className="filter-inputs">
          <div className="filter-input-group">
            <label htmlFor="filterProject">Project Name:</label>
            <input
              id="filterProject"
              type="text"
              placeholder="Search by Project Name..."
              value={filterProjectName}
              onChange={(e) => setFilterProjectName(e.target.value)}
              className="filter-input"
            />
          </div>
          <div className="filter-input-group">
            <label htmlFor="filterGroup">Group Name:</label>
            <input
              id="filterGroup"
              type="text"
              placeholder="Search by Group Name..."
              value={filterGroupName}
              onChange={(e) => setFilterGroupName(e.target.value)}
              className="filter-input"
            />
          </div>
          <div className="filter-input-group">
            <label htmlFor="filterApproval">Approval Status:</label>
            <select
              id="filterApproval"
              value={filterApprovalStatus}
              onChange={(e) => setFilterApprovalStatus(e.target.value)}
              className="filter-input"
            >
              <option value="">All</option>
              <option value="l1-pending">L1 Pending</option>
              <option value="l2-pending">L2 Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="filter-input-group">
            <label htmlFor="filterManager">Sai-Fakira Manager:</label>
            <select
              id="filterManager"
              value={filterManager}
              onChange={(e) => setFilterManager(e.target.value)}
              className="filter-input"
            >
              <option value="">All Managers</option>
              <option value="Dharmesh Bhavsar">Dharmesh Bhavsar</option>
              <option value="Robins Kapadia">Robins Kapadia</option>
              <option value="Vinay Mishra">Vinay Mishra</option>
              <option value="Harsh Brahmbhatt">Harsh Brahmbhatt</option>
              <option value="Niraj Gelot">Niraj Gelot</option>
              <option value="Mehul Prajapati">Mehul Prajapati</option>
            </select>
          </div>
          <div className="filter-input-group">
            <label htmlFor="filterDate">Submitted Date:</label>
            <input
              id="filterDate"
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="filter-input"
            />
          </div>
          {(filterProjectName || filterGroupName || filterApprovalStatus || filterManager || filterDate) && (
            <button
              onClick={() => {
                setFilterProjectName("");
                setFilterGroupName("");
                setFilterApprovalStatus("");
                setFilterManager("");
                setFilterDate("");
              }}
              className="clear-filters-btn"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {(() => {
        // Calculate filtered visits
        const filteredVisits = visits
          .filter((v) => showAllCards || v.approval?.level2?.status !== "Approved") // Show all if toggled, otherwise hide L2 approved
          .filter((v) => {
            // Filter by project name
            const matchesProject = filterProjectName
              ? v.projectName?.toLowerCase().includes(filterProjectName.toLowerCase())
              : true;

            // Filter by group name
            const matchesGroup = filterGroupName
              ? v.groupName?.toLowerCase().includes(filterGroupName.toLowerCase())
              : true;

            // Filter by approval status
            let matchesApproval = true;
            if (filterApprovalStatus) {
              const l1 = v.approval?.level1?.status || "Pending";
              const l2 = v.approval?.level2?.status || "Pending";
              switch (filterApprovalStatus) {
                case "l1-pending":
                  // L1 not yet approved
                  matchesApproval = l1 === "Pending";
                  break;
                case "l2-pending":
                  // L1 must be Approved AND L2 still Pending
                  matchesApproval = l1 === "Approved" && l2 === "Pending";
                  break;
                case "approved":
                  // Both L1 and L2 must be Approved
                  matchesApproval = l1 === "Approved" && l2 === "Approved";
                  break;
                case "rejected":
                  // Either L1 or L2 is Rejected
                  matchesApproval = l1 === "Rejected" || l2 === "Rejected";
                  break;
                default:
                  matchesApproval = true;
              }
            }

            // Filter by manager
            const matchesManager = filterManager
              ? v.saiFakiraManager === filterManager
              : true;

            // Filter by date (submitted date)
            let matchesDate = true;
            if (filterDate) {
              const submittedDate = v.submittedAt ? new Date(v.submittedAt).toISOString().split("T")[0] : null;
              matchesDate = submittedDate === filterDate;
            }

            return matchesProject && matchesGroup && matchesApproval && matchesManager && matchesDate;
          });

        // Check if any filters are active
        const hasActiveFilters = filterProjectName || filterGroupName || filterApprovalStatus || filterManager || filterDate;

        return (
          <>
            {/* Results Counter - Only show when filters are active or showAllCards is enabled */}
            {(hasActiveFilters || showAllCards) && (
              <div style={{
                textAlign: 'center',
                margin: '20px 0',
                padding: '10px',
                backgroundColor: '#f0f8ff',
                border: '1px solid #007bff',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#007bff'
              }}>
                📊 {filteredVisits.length} result{filteredVisits.length !== 1 ? 's' : ''} found
              </div>
            )}

            {/* Render filtered visits */}
            {filteredVisits.map((v) => (
              <div key={v._id} className={`visit-card ${v.approval?.level2?.status === "Approved" ? "approved-card" : ""}`}>

                {/* ── Title ── */}
                <h3 className="vc-title">
                  {v.projectName}
                  {v.approval?.level2?.status === "Approved" && <span className="approved-label">APPROVED</span>}
                </h3>

                {/* ── Approval Status Bar (top of card) ── */}
                <div className="vc-approval-bar">
                  <div className="vc-approval-badge">
                    <span className="vc-approval-badge-label">L1</span>
                    <span className={`vc-approval-badge-status vc-approval-badge-status--${v.approval?.level1?.status === "Approved" ? "approved" : v.approval?.level1?.status === "Rejected" ? "rejected" : "pending"}`}>
                      {v.approval?.level1?.status || "Pending"}
                    </span>
                  </div>
                  <div className="vc-approval-divider" />
                  <div className="vc-approval-badge">
                    <span className="vc-approval-badge-label">L2</span>
                    <span className={`vc-approval-badge-status vc-approval-badge-status--${v.approval?.level2?.status === "Approved" ? "approved" : v.approval?.level2?.status === "Rejected" ? "rejected" : "pending"}`}>
                      {v.approval?.level2?.status || "Pending"}
                    </span>
                  </div>
                </div>

                {/* ── Rejection Remarks (shown only when a level is Rejected) ── */}
                {(v.approval?.level1?.status === "Rejected" && v.approval?.level1?.comment) && (
                  <div style={{
                    margin: "8px 0 4px",
                    padding: "10px 14px",
                    backgroundColor: "#fff5f5",
                    border: "1px solid #fca5a5",
                    borderLeft: "4px solid #dc2626",
                    borderRadius: "6px",
                    fontSize: "13px",
                    color: "#7f1d1d",
                    lineHeight: "1.5",
                  }}>
                    <strong style={{ color: "#dc2626" }}>❌ L1 Rejection Remark:</strong>{" "}
                    {v.approval.level1.comment}
                  </div>
                )}
                {(v.approval?.level2?.status === "Rejected" && v.approval?.level2?.comment) && (
                  <div style={{
                    margin: "4px 0 4px",
                    padding: "10px 14px",
                    backgroundColor: "#fff5f5",
                    border: "1px solid #fca5a5",
                    borderLeft: "4px solid #dc2626",
                    borderRadius: "6px",
                    fontSize: "13px",
                    color: "#7f1d1d",
                    lineHeight: "1.5",
                  }}>
                    <strong style={{ color: "#dc2626" }}>❌ L2 Rejection Remark:</strong>{" "}
                    {v.approval.level2.comment}
                  </div>
                )}

                {/* ── Section 1: Project Info ── */}
                <div className="vc-section">
                  <div className="vc-section-title">🏗️ Project Information</div>
                  <div className="vc-grid">
                    <div className="vc-field"><span className="vc-label">Sai-Fakira Manager</span><span className="vc-value vc-value--highlight">{v.saiFakiraManager}</span></div>
                    <div className="vc-field"><span className="vc-label">Group Name</span><span className="vc-value vc-value--highlight">{v.groupName}</span></div>
                    <div className="vc-field"><span className="vc-label">Developer Name</span><span className="vc-value">{v.builderName}</span></div>
                    <div className="vc-field"><span className="vc-label">Developer Number</span><span className="vc-value vc-value--highlight">{v.builderNumber}</span></div>
                    <div className="vc-field"><span className="vc-label">Location</span><span className="vc-value">{v.location}</span></div>
                    <div className="vc-field"><span className="vc-label">Development Type</span><span className="vc-value">{v.developmentType}</span></div>
                  </div>
                </div>

                {/* ── Section 2: Contact ── */}
                <div className="vc-section">
                  <div className="vc-section-title">📞 Contact Details</div>
                  <div className="vc-grid">
                    <div className="vc-field"><span className="vc-label">Office Person</span><span className="vc-value">{v.officePersonDetails}</span></div>
                    <div className="vc-field"><span className="vc-label">Office Contact</span><span className="vc-value vc-value--highlight">{v.officePersonNumber}</span></div>
                  </div>
                  {v.executives && v.executives.length > 0 && (
                    <div className="vc-field" style={{ borderRight: "none" }}>
                      <span className="vc-label">Executives</span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
                        {v.executives.map((exec, idx) => (
                          <span key={idx} className="vc-value--blue" style={{ fontSize: "0.78rem" }}>{exec.name} — {exec.number}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Section 3: Property Details ── */}
                <div className="vc-section">
                  <div className="vc-section-title">🏠 Property Details</div>
                  <div style={{ padding: "12px" }}>
                    {v.propertySizes?.map((p, i) => {
                      const propKey = `${v._id}_${i}`;
                      const isFieldsExpanded = !!expandedPropFields[propKey];
                      return (
                        <div key={i} className="vc-prop-card">
                          <div className="vc-prop-title">
                            {v.developmentType === "Residential + Commercial"
                              ? `Property ${i + 1} — ${p.type === "Commercial" || p.floor ? "🏢 Commercial" : "🏠 Residential"}`
                              : `Property ${i + 1} (${p.type || v.developmentType})`}
                          </div>

                          {/* ── Always visible: Size, Category, SQ.FT, Box Price ── */}
                          <div className="vc-grid">
                            {(p.size && p.size !== "N/A") && <div className="vc-field"><span className="vc-label">Size</span><span className="vc-value vc-value--highlight">{p.size}</span></div>}
                            {p.floor && <div className="vc-field"><span className="vc-label">Floor</span><span className="vc-value vc-value--highlight">{p.floor}</span></div>}
                            {p.frontage && <div className="vc-field"><span className="vc-label">Frontage</span><span className="vc-value vc-value--highlight">{p.frontage}</span></div>}
                            {p.category && p.category !== "N/A" && <div className="vc-field"><span className="vc-label">Category</span><span className="vc-value vc-value--highlight">{p.category}</span></div>}
                            {p.sqft && <div className="vc-field"><span className="vc-label">SQ.FT</span><span className="vc-value vc-value--highlight">{p.sqft}</span></div>}
                            <div className="vc-field"><span className="vc-label">Box Price</span><span className="vc-value vc-value--highlight">{p.boxPrice}</span></div>
                          </div>

                          {/* ── Expanded fields ── */}
                          {isFieldsExpanded && (
                            <div className="vc-grid">
                              <div className="vc-field"><span className="vc-label">SQ.YD</span><span className="vc-value vc-value--highlight">{p.sqyd}</span></div>
                              <div className="vc-field"><span className="vc-label">Basic Rate</span><span className="vc-value vc-value--highlight">{p.basicRate}</span></div>
                              <div className="vc-field"><span className="vc-label">PLC</span><span className="vc-value">{p.plc}</span></div>
                              <div className="vc-field"><span className="vc-label">FRC</span><span className="vc-value">{p.frc}</span></div>
                              <div className="vc-field"><span className="vc-label">Sale Deed</span><span className="vc-value">{p.selldedAmount}</span></div>
                              <div className="vc-field"><span className="vc-label">AEC/AUDA</span><span className="vc-value">{p.aecAuda}</span></div>
                              <div className="vc-field"><span className="vc-label">Maintenance</span><span className="vc-value">{p.maintenance}</span></div>
                              <div className="vc-field"><span className="vc-label">Main Deposit</span><span className="vc-value">{p.maintenanceDeposit}</span></div>
                            </div>
                          )}

                          {/* ── Toggle button ── */}
                          <button
                            className="vc-prop-expand-btn"
                            onClick={() => setExpandedPropFields(prev => ({ ...prev, [propKey]: !prev[propKey] }))}
                          >
                            {isFieldsExpanded ? "▲ Show Less" : "▼ Show More Details"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── Clear Floor Height ── */}
                {(v.clearFloorHeight || v.clearFloorHeightRetail || v.clearFloorHeightFlats || v.clearFloorHeightOffices) && (
                  <div className="vc-floor-block">
                    <div className="vc-label" style={{ marginBottom: "6px" }}>Clear Floor Height</div>
                    <div className="vc-grid">
                      {v.developmentType === "Residential" && v.clearFloorHeight && (
                        <div className="vc-field" style={{ border: "none", padding: "2px 0" }}><span className="vc-label">Height</span><span className="vc-value">{v.clearFloorHeight}</span></div>
                      )}
                      {v.clearFloorHeightRetail && <div className="vc-field" style={{ border: "none", padding: "2px 0" }}><span className="vc-label">Retail</span><span className="vc-value">{v.clearFloorHeightRetail}</span></div>}
                      {v.clearFloorHeightFlats && <div className="vc-field" style={{ border: "none", padding: "2px 0" }}><span className="vc-label">Flats</span><span className="vc-value">{v.clearFloorHeightFlats}</span></div>}
                      {v.clearFloorHeightOffices && <div className="vc-field" style={{ border: "none", padding: "2px 0" }}><span className="vc-label">Offices</span><span className="vc-value">{v.clearFloorHeightOffices}</span></div>}
                    </div>
                  </div>
                )}

                {/* ── Section 4: Project Stats ── */}
                <div className="vc-section">
                  <div className="vc-section-title">📊 Project Stats</div>
                  <div className="vc-grid">
                    <div className="vc-field"><span className="vc-label">Project Loan</span><span className="vc-value">{v.financingRequirements}</span></div>
                    <div className="vc-field"><span className="vc-label">Community</span><span className="vc-value">{v.gentry}</span></div>
                    <div className="vc-field"><span className="vc-label">Payout</span><span className="vc-value vc-value--highlight">{v.payout}</span></div>
                    <div className="vc-field"><span className="vc-label">Total Units</span><span className="vc-value">{v.totalUnitsBlocks}</span></div>
                    <div className="vc-field"><span className="vc-label">Total Blocks</span><span className="vc-value">{v.totalBlocks}</span></div>
                    <div className="vc-field"><span className="vc-label">Construction Stage</span><span className="vc-value vc-value--highlight">{v.stageOfConstruction}</span></div>
                    {v.areaType && <div className="vc-field"><span className="vc-label">Area Type</span><span className="vc-value vc-value--blue">{v.areaType}</span></div>}
                    <div className="vc-field"><span className="vc-label">Completion</span><span className="vc-value">{v.expectedCompletionDate ? new Date(v.expectedCompletionDate + "-01").toLocaleDateString("en-GB", { month: "long", year: "numeric" }) : ""}</span></div>
                    <div className="vc-field"><span className="vc-label">Units for Sale</span><span className="vc-value">{v.unitsForSale}</span></div>
                    {v.totalAmenities && <div className="vc-field"><span className="vc-label">Amenities</span><span className="vc-value">{v.totalAmenities}</span></div>}
                    {v.allotedCarParking && <div className="vc-field"><span className="vc-label">Car Parking</span><span className="vc-value">{v.allotedCarParking}</span></div>}
                  </div>
                </div>

                {/* ── USPs ── */}
                {v.usps && v.usps.length > 0 && (
                  <div className="vc-usp-block">
                    <div className="vc-usp-label">USP's</div>
                    <div className="vc-usp-tags">
                      {v.usps.map((usp, idx) => <span key={idx} className="vc-usp-tag">{usp}</span>)}
                    </div>
                  </div>
                )}

                {/* ── Remark ── */}
                <div className="vc-remark"><strong>Remark:</strong> {v.remark}</div>

                {/* ── Submitted ── */}
                <div className="vc-submitted">📅 <strong>Submitted:</strong> {formatSubmissionDateTime(v.submittedAt)}</div>

                {/* ── Action Buttons ── */}
                <div className="vc-actions">
                  {v.approval?.level1?.status !== "Approved" && (<>
                    <button className="vc-btn vc-btn--approve" onClick={() => handleApprove(v._id, 1)}>Approve L1</button>
                    <button className="vc-btn vc-btn--reject" onClick={() => handleRejectWithRemarks(v._id, 1)}>Reject L1</button>
                    <button className="vc-btn vc-btn--edit" onClick={() => handleEdit(v)}>Edit</button>
                  </>)}
                  {v.approval?.level1?.status === "Approved" && v.approval?.level2?.status !== "Approved" && (<>
                    <button className="vc-btn vc-btn--approve" onClick={() => handleApprove(v._id, 2)}>Approve L2</button>
                    <button className="vc-btn vc-btn--reject" onClick={() => handleRejectWithRemarks(v._id, 2)}>Reject L2</button>
                    <button className="vc-btn vc-btn--edit" onClick={() => handleEdit(v)}>Edit</button>
                  </>)}
                </div>

              </div>
            ))}
          </>
        );
      })()}
    </div>
  );
};

export default BuilderVisitForm;
