import React, { useState, useEffect } from "react";
import axios from "axios";
import "../css/VisitForm.css";

const API_BASE_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/visits` : "http://localhost:5000/api/visits";

const SVG_CHEVRON = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6"/>
  </svg>
);

const SVG_CALENDAR = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
  </svg>
);

const SVG_SEARCH = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
  </svg>
);

const SEGMENTS = ["Customer", "CA", "Builder /Salesperson", "Broker", "DSA"];
const OPTIONS = [
  "Sai Fakira",
  "Sahdev Bhavsar",
  "Hitendra Goswami",
  "Pradeep Trivedi",
  "Vinay Mishra",
  "Dharmesh Bhavsar",
  "Robins Kapadia",
  "Hardik Bhavsar",
  "Pankaj Dave",
  "Dhaval Kataria",
  "Amar Desai",
  "Other",
];

const CustomSelect = ({ label, name, value, options, onChange, minimal }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!isOpen) setIsOpen(true);
      else if (highlightedIndex >= 0) {
        onChange({ target: { name, value: options[highlightedIndex] } });
        setIsOpen(false);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) setIsOpen(true);
      else setHighlightedIndex(prev => Math.min(prev + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div 
      className={minimal ? "custom-date-wrapper" : "form-group"} 
      ref={containerRef} 
      style={minimal ? { width: '100%' } : {}}
      tabIndex="0"
      onKeyDown={handleKeyDown}
      onFocus={() => !isOpen && setHighlightedIndex(-1)}
    >
      {!minimal && <label>{label}</label>}
      <div className="custom-select-wrapper">
        <div className="custom-select-trigger" onClick={() => setIsOpen(!isOpen)} style={minimal ? { background: 'var(--input-bg)' } : {}}>
          {value || `Select ${label}`}
          <span style={{ opacity: 0.5, display: 'flex' }}>{SVG_CHEVRON}</span>
        </div>
        {isOpen && (
          <div className="custom-options-dropdown">
            {options.map((o, i) => (
              <div
                key={o}
                className={`custom-option ${highlightedIndex === i ? "highlighted" : ""}`}
                onMouseEnter={() => setHighlightedIndex(i)}
                onClick={() => {
                  onChange({ target: { name, value: o } });
                  setIsOpen(false);
                }}
              >
                {o}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const CustomDatePicker = ({ label, name, value, onChange, minimal }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const containerRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const daysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

  const handleDateSelect = (day) => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const dateStr = d.toISOString().split("T")[0];
    onChange({ target: { name, value: dateStr } });
    setIsOpen(false);
  };

  const renderDays = () => {
    const month = currentMonth.getMonth();
    const year = currentMonth.getFullYear();
    const totalDays = daysInMonth(month, year);
    const startDay = firstDayOfMonth(month, year);
    const days = [];

    for (let i = 0; i < startDay; i++) days.push(<div key={`empty-${i}`} className="calendar-day muted" />);
    for (let d = 1; d <= totalDays; d++) {
      const dayDate = new Date(year, month, d).toISOString().split("T")[0];
      const isSelected = value === dayDate;
      days.push(
        <div
          key={d}
          className={`calendar-day ${isSelected ? "selected" : ""}`}
          onClick={() => handleDateSelect(d)}
        >
          {d}
        </div>
      );
    }
    return days;
  };

  const dateDisplay = value ? new Date(value).toLocaleDateString() : (label ? (minimal ? label : `Pick ${label}`) : "Add Follow-up");

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsOpen(!isOpen);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div 
      className={minimal ? "custom-date-wrapper" : "form-group"} 
      ref={containerRef} 
      style={minimal ? { width: '100%' } : {}}
      tabIndex="0"
      onKeyDown={handleKeyDown}
    >
      {!minimal && <label>{label}</label>}
      <div className="custom-date-wrapper">
        <div 
          className="custom-date-trigger" 
          onClick={() => setIsOpen(!isOpen)}
          style={minimal ? { padding: '0.6rem 1.15rem', fontSize: '0.85rem', borderRadius: '100px', background: 'var(--input-bg)' } : {}}
        >
          {dateDisplay}
          <span style={{ opacity: 0.5, marginLeft: '0.5rem', display: 'flex' }}>{SVG_CALENDAR}</span>
        </div>
        {isOpen && (
          <div className="custom-calendar-dropdown" style={minimal ? { width: "260px", right: 0, left: 'auto' } : { width: "100%" }}>
            <div className="custom-calendar-header">
              <button type="button" onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}>‹</button>
              <strong>{currentMonth.toLocaleString("default", { month: "long", year: "numeric" })}</strong>
              <button type="button" onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}>›</button>
            </div>
            <div className="calendar-grid">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => <div key={d} className="calendar-day-header">{d}</div>)}
              {renderDays()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const toTitleCase = (str) => {
  if (!str) return "";
  return str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
};

const EditModal = ({ visit, onUpdate, onClose }) => {
  const [editData, setEditData] = useState({ ...visit });
  
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    if ((name === "contactNumber" || name === "alternativeNumber") && value.length > 10) return;
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddRevisitInEdit = (date) => {
    if (!date) return;
    setEditData(prev => ({
      ...prev,
      revisitDates: [...prev.revisitDates, date],
    }));
  };

  const removeRevisitInEdit = (index) => {
    setEditData(prev => ({
      ...prev,
      revisitDates: prev.revisitDates.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Modify Visit Entry</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label>Client Name</label>
            <input type="text" name="clientName" value={editData.clientName} onChange={handleEditChange} />
          </div>
          <div className="form-group">
            <label>Company Name</label>
            <input type="text" name="companyName" value={editData.companyName} onChange={handleEditChange} />
          </div>
          <CustomSelect label="Segment" name="segment" value={editData.segment} options={SEGMENTS} onChange={handleEditChange} />
          <div className="form-group">
            <label>Contact Number (10 Digits)</label>
            <input type="number" name="contactNumber" value={editData.contactNumber} onChange={handleEditChange} />
          </div>
          <div className="form-group">
            <label>Alternative Number</label>
            <input type="number" name="alternativeNumber" value={editData.alternativeNumber} onChange={handleEditChange} />
          </div>
          <div className="form-group">
            <label>Area</label>
            <input type="text" name="area" value={editData.area} onChange={handleEditChange} />
          </div>
          <CustomSelect label="Reference By" name="referenceBy" value={editData.referenceBy} options={OPTIONS} onChange={handleEditChange} />
          <CustomSelect label="Source" name="source" value={editData.source} options={OPTIONS} onChange={handleEditChange} />
          <CustomSelect label="Meeting With" name="meetingWith" value={editData.meetingWith} options={OPTIONS} onChange={handleEditChange} />
          <CustomDatePicker label="Meeting Date" name="meetingDate" value={editData.meetingDate} onChange={handleEditChange} />
          
          <div className="revisit-dates-section">
            <div className="revisit-header">
              <h3>Follow-up Schedule</h3>
              <CustomDatePicker minimal name="revisit" value="" onChange={(e) => handleAddRevisitInEdit(e.target.value)} />
            </div>
            {editData.revisitDates.length > 0 ? (
              <div className="revisit-grid">
                {editData.revisitDates.map((date, index) => (
                  <div key={index} className="revisit-item">
                    {new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    <button type="button" onClick={() => removeRevisitInEdit(index)}>×</button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ opacity: 0.5, fontSize: '0.8rem', fontStyle: 'italic' }}>No additional dates set.</p>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="cancel-btn" onClick={onClose}>Discard Changes</button>
          <button className="save-btn" onClick={() => onUpdate(editData)}>Persist Changes</button>
        </div>
      </div>
    </div>
  );
};

const VisitForm = () => {
  const [formData, setFormData] = useState({
    clientName: "",
    companyName: "",
    segment: "",
    contactNumber: "",
    alternativeNumber: "",
    area: "",
    referenceBy: "",
    source: "",
    meetingWith: "",
    meetingDate: "",
    revisitDates: [],
  });
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cardsLoading, setCardsLoading] = useState(false);
  
  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSegment, setFilterSegment] = useState("All");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [activeEditingId, setActiveEditingId] = useState(null);
  const [editingVisit, setEditingVisit] = useState(null);

  useEffect(() => {
    fetchVisits();
  }, []);

  const fetchVisits = async () => {
    setCardsLoading(true);
    try {
      const res = await axios.get(API_BASE_URL);
      setVisits(res.data);
    } catch (err) {
      console.error("Error fetching visits:", err);
    } finally {
      setCardsLoading(false);
    }
  };

  const filteredVisits = visits.filter(v => {
    const matchesSearch = 
      v.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      v.contactNumber.toString().includes(searchTerm);
    
    const matchesSegment = filterSegment === "All" || v.segment === filterSegment;
    
    let matchesDate = true;
    if (dateRange.start) {
      matchesDate = matchesDate && new Date(v.meetingDate) >= new Date(dateRange.start);
    }
    if (dateRange.end) {
      matchesDate = matchesDate && new Date(v.meetingDate) <= new Date(dateRange.end);
    }
    
    return matchesSearch && matchesSegment && matchesDate;
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Strict 10-digit limit for phone fields
    if ((name === "contactNumber" || name === "alternativeNumber") && value.length > 10) {
      return;
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterSegment("All");
    setDateRange({ start: "", end: "" });
  };

  const isFiltered = searchTerm !== "" || filterSegment !== "All" || dateRange.start !== "" || dateRange.end !== "";

  const handleAddRevisit = (date) => {
    if (!date) return;
    setFormData(prev => ({
      ...prev,
      revisitDates: [...prev.revisitDates, date],
    }));
  };

  const removeRevisitDate = (index) => {
    setFormData(prev => ({
      ...prev,
      revisitDates: prev.revisitDates.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.contactNumber && formData.contactNumber.length !== 10) {
      alert("Primary contact number must be exactly 10 digits.");
      return;
    }
    setLoading(true);
    try {
      await axios.post(API_BASE_URL, formData);
      alert("Visit added successfully!");
      setFormData({
        clientName: "",
        companyName: "",
        segment: "",
        contactNumber: "",
        alternativeNumber: "",
        area: "",
        referenceBy: "",
        source: "",
        meetingWith: "",
        meetingDate: "",
        revisitDates: [],
      });
      fetchVisits();
    } catch (err) {
      alert(err.response?.data?.error || "Error adding visit");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (updatedData) => {
    try {
      await axios.patch(`${API_BASE_URL}/${updatedData._id}`, updatedData);
      alert("Record updated successfully!");
      setEditingVisit(null);
      fetchVisits();
    } catch (err) {
      alert("Error updating record.");
    }
  };

  const maskPhone = (phone) => {
    if (!phone) return "";
    const p = phone.toString();
    return p.substring(0, 5) + "XXXXX";
  };

  const handleDownload = async () => {
    const password = prompt("Enter password to download Excel:");
    if (!password) return;
    try {
      window.open(`${API_BASE_URL}/export/excel?password=${encodeURIComponent(password)}`, "_blank");
    } catch (err) {
      alert("Download failed.");
    }
  };



  return (
    <div className="visit-form-container">
      <div className="visit-form-header">
        <h1>Visit Data Form</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-grid-wrapper">
          <div className="form-grid">
            <div className="form-group">
              <label>Client Name</label>
              <input type="text" name="clientName" value={formData.clientName} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Company Name</label>
              <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} />
            </div>
            <CustomSelect label="Segment" name="segment" value={formData.segment} options={SEGMENTS} onChange={handleChange} />
            <div className="form-group">
              <label>Contact Number (10 Digits)</label>
              <input 
                type="number" 
                name="contactNumber" 
                value={formData.contactNumber} 
                onChange={handleChange}
                className={formData.contactNumber && formData.contactNumber.length !== 10 ? "input-error" : ""}
              />
              {formData.contactNumber && formData.contactNumber.length !== 10 && (
                <span className="error-hint">Must be exactly 10 digits</span>
              )}
            </div>
            <div className="form-group">
              <label>Alternative Number</label>
              <input type="number" name="alternativeNumber" value={formData.alternativeNumber} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Area</label>
              <input type="text" name="area" value={formData.area} onChange={handleChange} />
            </div>
            <CustomSelect label="Reference By" name="referenceBy" value={formData.referenceBy} options={OPTIONS} onChange={handleChange} />
            <CustomSelect label="Source" name="source" value={formData.source} options={OPTIONS} onChange={handleChange} />
            <CustomSelect label="Meeting With" name="meetingWith" value={formData.meetingWith} options={OPTIONS} onChange={handleChange} />
            <CustomDatePicker label="Meeting Date" name="meetingDate" value={formData.meetingDate} onChange={handleChange} />

            <div className="revisit-dates-section">
              <div className="revisit-header">
                <h3>Post-Visit Schedule</h3>
                <CustomDatePicker minimal name="revisit" value="" onChange={(e) => handleAddRevisit(e.target.value)} />
              </div>
              
              {formData.revisitDates.length > 0 ? (
                <div className="revisit-grid">
                  {formData.revisitDates.map((date, index) => (
                    <div key={index} className="revisit-item">
                      {new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      <button type="button" onClick={() => removeRevisitDate(index)}>×</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.8rem', opacity: 0.5, fontStyle: 'italic' }}>No follow-ups booked.</div>
              )}
            </div>
          </div>
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? "PROCESSING..." : "Complete Visit Entry"}
          <div className="btn-icon">→</div>
        </button>
      </form>

      <div className="filters-section-container">
        <div className="filters-section">
          <div className="filter-group-main">
            <label className="filter-label">Search</label>
            <div className="search-box">
              <span className="search-icon">{SVG_SEARCH}</span>
              <input 
                type="text" 
                placeholder="Name or number..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="filter-group-tier">
            <label className="filter-label">Tier</label>
            <CustomSelect 
              minimal
              name="segmentFilter" 
              value={filterSegment} 
              options={["All", ...SEGMENTS]} 
              onChange={(e) => setFilterSegment(e.target.value)} 
            />
          </div>
          
          <div className="filter-group-date">
            <label className="filter-label">Timeline</label>
            <div className="date-range-inputs">
              <CustomDatePicker minimal label="Start" name="start" value={dateRange.start} onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))} />
              <span className="date-separator">→</span>
              <CustomDatePicker minimal label="End" name="end" value={dateRange.end} onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))} />
            </div>
          </div>

          <div className="filter-group-action" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button onClick={handleDownload} className="download-cta-inline">
              <span>Download Excel</span>
              <div className="cta-icon-pill">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
                </svg>
              </div>
            </button>
          </div>
        </div>

        {isFiltered && (
          <button onClick={clearFilters} className="clear-floating-btn">
            Clear all filters
          </button>
        )}
      </div>

      <div className="visit-cards-container">
        {cardsLoading ? (
          <div className="cards-loading-placeholder">
            <div className="spinner-ring"></div>
            <span>Fetching visit records...</span>
          </div>
        ) : filteredVisits.length === 0 ? (
          <div className="no-cards-placeholder">
            No records found matching your filters.
          </div>
        ) : (
          filteredVisits.map((v) => (
            <div key={v._id} className="visit-card">
              <div className="card-top-row">
                <div className="card-client-info">
                  <h4>{toTitleCase(v.clientName)}</h4>
                  <p>{toTitleCase(v.companyName) || "No Company"}</p>
                </div>
                <span className="card-badge-id">REC_{v.srNo}</span>
              </div>
              
              <div className="card-details-grid">
                <div className="detail-item">
                  <span className="detail-label">Segment</span>
                  <span className="detail-value">{v.segment}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Contact</span>
                  <span className="detail-value">{maskPhone(v.contactNumber)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Location / Area</span>
                  <span className="detail-value">{v.area || "N/A"}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Source</span>
                  <span className="detail-value">{v.source || "Direct"}</span>
                </div>
              </div>

              <div className="card-footer-new">
                <div className="footer-date-row">
                  <span className="calendar-icon">{SVG_CALENDAR}</span>
                  <span>Visit Date: {new Date(v.meetingDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>
                <div className="footer-actions-row">
                  {v.revisitDates && v.revisitDates.length > 0 ? (
                    <span className="footer-pill-badge">{v.revisitDates.length} Follow-ups</span>
                  ) : (
                    <span className="footer-pill-badge empty">No Follow-ups</span>
                  )}
                  <button className="edit-record-btn" onClick={() => setEditingVisit(v)}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Edit Record
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {editingVisit && (
        <EditModal 
          visit={editingVisit} 
          onUpdate={handleUpdate} 
          onClose={() => setEditingVisit(null)} 
        />
      )}
    </div>
  );
};

export default VisitForm;
