import React, { useState, useEffect } from "react";
import axios from "axios";
import "../css/BuilderVisitForm.css"; // tumhara CSS

const BuilderVisitForm = () => {
  const API = "https://render-backend-5sur.onrender.com/api/builder-visits";

  const initialForm = {
    builderName: "",
    groupName: "",
    projectName: "",
    location: "",
    dateOfVisit: "",
    personMet: "",
    officePersonDetails: "",
    developmentType: "",
    totalUnitsBlocks: "",
    currentPhase: "",
    propertySize: "",
    expectedCompletionDate: "",
    financingRequirements: "No",
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
  };

  const [formData, setFormData] = useState(initialForm);
  const [visits, setVisits] = useState([]);

  // Fetch all builder visits
  const fetchVisits = async () => {
    try {
      const res = await axios.get(API);
      setVisits(res.data);
    } catch (err) {
      console.error("Error fetching visits:", err);
    }
  };

  useEffect(() => {
    fetchVisits();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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

  return (
    <div className="form-container">
      <h2 className="form-title">Builder Visit Details Form</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>
            Builder Name:
            <input
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
              name="groupName"
              value={formData.groupName}
              onChange={handleChange}
            />
          </label>

          <label>
            Project Name:
            <input
              type="text"
              name="projectName"
              value={formData.projectName}
              onChange={handleChange}
            />
          </label>

          <label>
            Location:
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
            />
          </label>

          <label>
            Date of Visit:
            <input
              type="date"
              name="dateOfVisit"
              value={formData.dateOfVisit}
              onChange={handleChange}
            />
          </label>

          <label>
            Person Who Met:
            <input
              type="text"
              name="personMet"
              value={formData.personMet}
              onChange={handleChange}
            />
          </label>

          <label className="full-width">
            Office Person Details:
            <input
              type="text"
              name="officePersonDetails"
              value={formData.officePersonDetails}
              onChange={handleChange}
            />
          </label>

          <label>
            Type of Development:
            <select
              name="developmentType"
              value={formData.developmentType}
              onChange={handleChange}
            >
              <option value="">Select</option>
              <option>Residential</option>
              <option>Commercial</option>
              <option>Industrial</option>
              <option>Plots</option>
            </select>
          </label>

          <label>
            Total Units & Blocks:
            <input
              type="text"
              name="totalUnitsBlocks"
              value={formData.totalUnitsBlocks}
              onChange={handleChange}
            />
          </label>

          <label>
            Current Phase / Stage:
            <input
              type="text"
              name="currentPhase"
              value={formData.currentPhase}
              onChange={handleChange}
            />
          </label>

          <label>
            Size of Property:
            <select
              name="propertySize"
              value={formData.propertySize}
              onChange={handleChange}
            >
              <option value="">Select</option>
              <option>1BHK</option>
              <option>2BHK</option>
              <option>3BHK</option>
              <option>4BHK</option>
            </select>
          </label>

          <label className="full-width">
            Surrounding Area / Community:
            <input
              type="text"
              name="surroundingCommunity"
              value={formData.surroundingCommunity}
              onChange={handleChange}
            />
          </label>

          <label>
            Expected Completion Date:
            <input
              type="date"
              name="expectedCompletionDate"
              value={formData.expectedCompletionDate}
              onChange={handleChange}
            />
          </label>

          <label>
            Financing Requirements:
            <select
              name="financingRequirements"
              value={formData.financingRequirements}
              onChange={handleChange}
            >
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </label>

          {formData.financingRequirements === "Yes" && (
            <label className="full-width">
              Financing Details:
              <input
                type="text"
                name="financingDetails"
                value={formData.financingDetails}
                onChange={handleChange}
              />
            </label>
          )}

          <label>
            Avg Agreement Value:
            <input
              type="number"
              name="avgAgreementValue"
              value={formData.avgAgreementValue}
              onChange={handleChange}
            />
          </label>

          <label>
            Market Value:
            <input
              type="number"
              name="marketValue"
              value={formData.marketValue}
              onChange={handleChange}
            />
          </label>

          <label className="full-width">
            Nearby Other Projects:
            <textarea
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
            </select>
          </label>

          <label>
            Units to be sold by us:
            <input
              type="number"
              name="unitsForSale"
              value={formData.unitsForSale}
              onChange={handleChange}
            />
          </label>

          <label>
            Time Limit for Sale (Months):
            <input
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

          <button type="submit" className="submit-btn">
            Submit Form
          </button>
        </div>
      </form>

      {/* --------------- CARDS ---------------- */}
<h2 className="mt-10 text-xl font-bold">Submitted Visits</h2>
<div className="visit-cards">
  {visits.map((v) => (
    <div key={v._id} className="visit-card">
      <p>
        <strong>Builder:</strong> {v.builderName} | <strong>Project:</strong>{" "}
        {v.projectName}
      </p>
      <p>
        <strong>Visit Date:</strong> {new Date(v.dateOfVisit).toLocaleDateString()}
      </p>
      <p>
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
        <button className="approve-btn" onClick={() => handleApprove(v._id)}>Approve</button>
        <button className="reject-btn" onClick={() => handleReject(v._id)}>Reject</button>
      </div>
    </div>
  ))}
</div>

    </div>
  );
};

export default BuilderVisitForm;
