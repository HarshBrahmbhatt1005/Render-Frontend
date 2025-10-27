import React, { useState, useEffect } from "react";
import axios from "axios";
import "../css/BuilderVisitForm.css"; // tumhara CSS

const BuilderVisitForm = () => {
  const API = `${import.meta.env.VITE_API_URL}/api/builder-visits`;

  const initialForm = {
    builderName: "",
    groupName: "",
    projectName: "",
    location: "",
    officePersonDetails: "",
    gentry: "",
    propertySizes: [
      {
        size: "",
        sqft: "",
        selldedAmount: "",
        regularPrice: "",
        downPayment: "",
        maintenance: "",
        aecAuda: "",
        floor: "",
      },
    ],

    floor: "",
    sqft: "",
    aecAuda: "",
    selldedAmount: "",
    regularPrice: "",
    downPayment: "",
    maintenance: "",
    developmentType: "",
    totalUnitsBlocks: "",
    propertySize: "",
    expectedCompletionDate: "",
    financingRequirements: "",
    financingDetails: "",
    residentType: "",
    avgAgreementValue: "",
    marketValue: "",
    nearbyProjects: "",
    surroundingCommunity: "",
    enquiryType: "",
    unitsForSale: "",
    timeLimitMonths: "",
    remark: "",
    payout: "",
    stageOfConstruction: "",
  };
  const exportExcel = (builderName = "", status = "") => {
    let url = "/api/builder-visits/export/excel";
    const params = [];
    if (builderName) params.push(`builderName=${builderName}`);
    if (status) params.push(`status=${status}`);
    if (params.length) url += "?" + params.join("&");

    window.open(url);
  };

  const [formData, setFormData] = useState(initialForm);
  const [visits, setVisits] = useState([]);
  const [password, setPassword] = useState("");

  // Fetch all builder visits
  const fetchVisits = async () => {
    try {
      const res = await axios.get(API);
      // Ensure data is always array
      setVisits(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setVisits([]); // fallback
    }
  };

  useEffect(() => {
    fetchVisits();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePropertyChange = (index, e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newSizes = [...prev.propertySizes];
      newSizes[index][name] = value;
      return { ...prev, propertySizes: newSizes };
    });
  };

  const addPropertySize = () => {
    setFormData((prev) => ({
      ...prev,
      propertySizes: [
        ...prev.propertySizes,
        {
          size: "",
          sqft: "",
          selldedAmount: "",
          regularPrice: "",
          downPayment: "",
          maintenance: "",
          aecAuda: "",
          floor: "",
        },
      ],
    }));
  };

  const removePropertySize = (index) => {
    setFormData((prev) => ({
      ...prev,
      propertySizes: prev.propertySizes.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(API, formData);
      alert("✅ Builder Visit submitted!");
      setFormData(initialForm);
      fetchVisits();
    } catch (err) {
      console.error("Error saving builder visit:", err);
      alert("❌ Failed to submit form.");
    }
  };

  const handleApprove = async (id) => {
    const password = prompt("Enter approval password:");
    if (!password) return;

    try {
      await axios.patch(`${API}/${id}/approve`, { password });
      fetchVisits();
    } catch (err) {
      alert("Approval failed.");
    }
  };

  const handleReject = async (id) => {
    const password = prompt("Enter approval password:");
    if (!password) return;

    try {
      await axios.patch(`${API}/${id}/reject`, { password });
      fetchVisits();
    } catch (err) {
      alert("Rejection failed.");
    }
  };
  const handleExportExcel = async () => {
    try {
      const enteredPassword = prompt("Enter password to download Excel:");
      if (!enteredPassword) return;

      const res = await axios.get(
        `${API}/export/excel?password=${enteredPassword}`,
        { responseType: "blob" }
      );

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "Builder_Visits.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Download failed");
    }
  };

  const formatDate = (iso) =>
    iso ? new Date(iso).toISOString().split("T")[0] : "";

  return (
    <div className="form-container">
      <h2 className="form-title">Project Login Form</h2>
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
            Builder Name:
            <input
              placeholder="Enter Builder Name"
              type="text"
              name="builderName"
              value={formData.builderName}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Group Name:
            <input
              type="text"
              placeholder="Enter Group Name"
              name="groupName"
              value={formData.groupName}
              onChange={handleChange}
            />
          </label>

          <label>
            Project Name:
            <input
              type="text"
              placeholder="Enter Project Name"
              name="projectName"
              value={formData.projectName}
              onChange={handleChange}
            />
          </label>

          <label>
            Location:
            <input
              type="text"
              placeholder="Enter Location"
              name="location"
              value={formData.location}
              onChange={handleChange}
            />
          </label>

          <label className="full-width">
            Developer Office Person Details:
            <input
              type="text"
              placeholder="Name, Designation, Contact"
              name="officePersonDetails"
              value={formData.officePersonDetails}
              onChange={handleChange}
            />
          </label>
          <div className="radio-group full-width">
            <p className="radio-label">Type of Development:</p>

            {["Residential", "Commercial"].map((type) => (
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
            ))}
          </div>

          {formData.propertySizes.map((prop, index) => (
            <div key={index} className="conditional-fields">
              <h4>Property Type {index + 1}</h4>

              {formData.developmentType === "Residential" && (
                <label>
                  Size:
                  <select
                    name="size"
                    value={prop.size}
                    onChange={(e) => handlePropertyChange(index, e)}
                  >
                    <option value="">Select</option>
                    <option>3BHK</option>
                    <option>4BHK</option>
                    <option>5BHK</option>
                  </select>
                </label>
              )}

              {formData.developmentType === "Commercial" && (
                <label>
                  Floor:
                  <select
                    name="floor"
                    value={prop.floor}
                    onChange={(e) => handlePropertyChange(index, e)}
                  >
                    <option value="">Select</option>
                    <option>Ground Floor</option>
                    <option>1st Floor</option>
                    <option>Office</option>
                  </select>
                </label>
              )}

              <label>
                SQ.FT/YD:
                <input
                  type="text"
                  name="sqft"
                  value={prop.sqft}
                  placeholder="Enter size in sq.ft or yard"
                  onChange={(e) => handlePropertyChange(index, e)}
                />
              </label>
              <label>
                AEC / AUDA:
                <input
                  type="text"
                  name="aecAuda"
                  placeholder="Enter AEC/AUDA "
                  value={prop.aecAuda}
                  onChange={(e) => handlePropertyChange(index, e)}
                />
              </label>
              <label>
                Sellded Amount:
                <input
                  type="text"
                  name="selldedAmount"
                  value={prop.selldedAmount}
                  placeholder="Enter Sellded Amount"
                  onChange={(e) => handlePropertyChange(index, e)}
                />
              </label>
              <label>
                Regular Price:
                <input
                  type="text"
                  name="regularPrice"
                  value={prop.regularPrice}
                  placeholder="Enter Regular Price Amount"
                  onChange={(e) => handlePropertyChange(index, e)}
                />
              </label>
              <label>
                Down Payment:
                <input
                  type="text"
                  name="downPayment"
                  value={prop.downPayment}
                  placeholder="Enter Minimum DownPayment Amount"
                  onChange={(e) => handlePropertyChange(index, e)}
                />
              </label>
              <label>
                Maintenance:
                <input
                  type="text"
                  name="maintenance"
                  value={prop.maintenance}
                  placeholder="Enter Maintenance Amount"
                  onChange={(e) => handlePropertyChange(index, e)}
                />
              </label>

              {formData.propertySizes.length > 1 && (
                <button
                  type="button"
                  className="property-btn remove-btn"
                  onClick={() => removePropertySize(index)}
                >
                  Remove
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            className="property-btn add-btn"
            onClick={addPropertySize}
          >
            Add Property Type
          </button>

          <label>
            Total Units & Blocks:
            <input
              placeholder=" Enter Total Units & Blocks"
              type="text"
              name="totalUnitsBlocks"
              value={formData.totalUnitsBlocks}
              onChange={handleChange}
            />
          </label>

          <label>
            Stage of Construction:
            <input
              placeholder=" Enter Stage of Construction"
              type="text"
              name="stageOfConstruction"
              value={formData.stageOfConstruction}
              onChange={handleChange}
            />
          </label>
          {formData.developmentType === "Residential" && (
            <label className="full-width">
              Gentry:
              <input
                placeholder="Enter gentry"
                type="text"
                name="gentry"
                value={formData.gentry}
                onChange={handleChange}
              />
            </label>
          )}
          <label>
            Expected Completion Date:
            <input
              type="date"
              name="expectedCompletionDate"
              value={formatDate(formData.expectedCompletionDate)}
              onChange={handleChange}
            />
          </label>

          <div className="radio-group full-width">
            <p className="radio-label">Financing Requirements:</p>
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

          <label>
            Avg Agreement Value:
            <input
              placeholder=" Enter Avg Agreement Value"
              type="number"
              name="avgAgreementValue"
              value={formData.avgAgreementValue}
              onChange={handleChange}
            />
          </label>

          <label>
            Market Value:
            <input
              placeholder="Enter MKT Value"
              type="number"
              name="marketValue"
              value={formData.marketValue}
              onChange={handleChange}
            />
          </label>

          <label className="full-width">
            Nearby Other Projects:
            <textarea
              placeholder="Enter Nearby Other Projects"
              name="nearbyProjects"
              value={formData.nearbyProjects}
              onChange={handleChange}
            />
          </label>

          <label>
            Enquiry Type:
            <select
              name="enquiryType"
              value={formData.enquiryType}
              onChange={handleChange}
            >
              <option value="">Select</option>
              <option>Salaried</option>
              <option>Self-employed</option>
              <option>Both</option>
            </select>
          </label>

          <label>
            Units Allocated for Sale
            <input
              placeholder="Enter Units to be sold by us"
              type="number"
              name="unitsForSale"
              value={formData.unitsForSale}
              onChange={handleChange}
            />
          </label>

          <label>
            Time Limit for Sale (Months):
            <input
              placeholder="Enter Time Limit for Sale (Months)"
              type="number"
              name="timeLimitMonths"
              value={formData.timeLimitMonths}
              onChange={handleChange}
            />
          </label>

          <label className="full-width">
            Remark:
            <textarea
              name="remark"
              value={formData.remark}
              onChange={handleChange}
              placeholder="Any extra comments or notes"
            />
          </label>
          <label className="full-width">
            Payout (in % or Amount):
            <input
              type="text"
              name="payout"
              value={formData.payout}
              onChange={handleChange}
              placeholder="Enter payout details"
            />
          </label>

          <button type="submit" className="submit-btn">
            Submit Form
          </button>
        </div>
      </form>
      <div className="excel-export-section">
        <button onClick={handleExportExcel} className="download-btn">
          Export Excel
        </button>
      </div>

      {visits.map((v) => (
        <div key={v._id} className="visit-card">
          <h3 className="card-title">{v.projectName}</h3>

          <div className="card-section">
            <p>
              <strong>Builder:</strong> {v.builderName}
            </p>
            <p>
              <strong>Group:</strong> {v.groupName}
            </p>
            <p>
              <strong>Location:</strong> {v.location}
            </p>
            <p>
              <strong>Development Type:</strong> {v.developmentType}
            </p>
          </div>
          <div className="card-section">
            {v.propertySizes?.map((p, i) => (
              <div key={i} className="card-property">
                <p>
                  <strong>Property {i + 1}</strong>
                </p>
                {v.developmentType === "Residential" && <p>Size : {p.size}</p>}
                {v.developmentType === "Commercial" && <p>Floor : {p.floor}</p>}
                <p>SQ.FT/Yard : {p.sqft}</p>
                <p>Regular Price : {p.regularPrice}</p>
                <p>Sellded Amount : {p.selldedAmount}</p>
                {/* stamp duty here add */}
                <p>AEC / AUDA : {p.aecAuda}</p>
                <p>Maintenance : {p.maintenance}</p>
                <p>Down Payment : {p.downPayment}</p>
              </div>
            ))}
          </div>
          <div className="card-section">
            <p>
              <strong>Financing Required:</strong> {v.financingRequirements}
            </p>
            <p>
              <strong>Payout:</strong> {v.payout}
            </p>
            <p>
              <strong>Total Units / Blocks:</strong> {v.totalUnitsBlocks}
            </p>
            <p>
              <strong>Stage Of Construction:</strong> {v.stageOfConstruction}
            </p>
            <p>
              <strong>Completion Date:</strong>{" "}
              {new Date(v.expectedCompletionDate).toLocaleDateString()}
            </p>
            <p>
              <strong>Units for Sale: </strong> {v.unitsForSale}
            </p>
            <p>
              <strong>Time Limit for Sale (Months):</strong> {v.timeLimitMonths}
            </p>
          </div>
            <p style={{fontSize:"20px"}}>
              <strong>Status:</strong>{" "}
              <span
                className={`status ${
                  v.approvalStatus === "Approved"
                    ? "approved"
                    : v.approvalStatus === "Rejected"
                    ? "rejected"
                    : "pending"
                }`}
              >
                {v.approvalStatus}
              </span>
            </p>

          <div className="card-buttons">
            {v.approvalStatus === "Pending" && (
              <>
                <button onClick={() => handleApprove(v._id)}>Approve</button>
                <button onClick={() => handleReject(v._id)}>Reject</button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default BuilderVisitForm;
