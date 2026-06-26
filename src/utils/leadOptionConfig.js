export const LEAD_OPTION_CONFIG_KEY = "leadOptionConfig";

const REMOVED_SENIOR_NAMES = new Set([
  "Dhruvi Soni",
  "Pradeep Sir",
  "Hitendra Sir",
  "Pankaj Sir",
]);

const REMOVED_REALESTATE_STATUS_NAMES = new Set([
  "Interasted",
]);

export const DEFAULT_LEAD_OPTION_CONFIG = {
  managers: [
    "Dharmesh Bhavsar",
    "Dhaval Kataria",
    "Dhruvi Soni",
    "Hardik Bhavsar",
    "Harsh Brahmbhatt",
    "Sahdev Bhavsar",
    "Hitendra Goswami",
    "Nidhi Tank",
    "Pradeep Trivedi",
    "Robins Kapadia",
    "Sonali Pol",
    "Unnati Raval",
    "Vinay Mishra",
  ],
  seniors: [
    "Sahdev Bhavsar",
    "Pradeep Trivedi",
    "Hitendra Goswami",
    "Dharmesh Bhavsar",
    "Vinay Mishra",
    "Robins Kapadia",
    "Pankaj Dave",
  ],
  realestateStatuses: [
    "Ringing",
    "Call Not Connected",
    "Connected",
    "Not Interested",
    "Reschedule",
    "Schedule Visit",
    "Follow-up",
    "Interested",
    "Property Purchased",
    "Preferred Someone",
    "Not In Budget",
    "New Lead",
    "Other",
  ],
  financeStatuses: [
    "Ringing",
    "Call Not Connected",
    "Connected",
    "Not Interested",
    "Reschedule",
    "Follow-up",
    "Interested",
    "New Lead"
  ],
};

const uniqueFilled = (values = []) => (
  Array.from(new Set(values.filter((value) => value && String(value).trim()))).map((value) => String(value).trim())
);

const filterRemovedSeniorNames = (values = []) => (
  uniqueFilled(values).filter((value) => !REMOVED_SENIOR_NAMES.has(value))
);

const filterRemovedRealestateStatusNames = (values = []) => (
  uniqueFilled(values).filter((value) => !REMOVED_REALESTATE_STATUS_NAMES.has(value))
);

const getRemovedValues = (values = [], removedSet) => (
  uniqueFilled(values).filter((value) => removedSet.has(value))
);

const mergeWithDefaults = (storedValues, defaultValues) => uniqueFilled([
  ...defaultValues,
  ...(Array.isArray(storedValues) ? storedValues : []),
]);

export const getLeadOptionConfig = () => {
  if (typeof window === "undefined") {
    return DEFAULT_LEAD_OPTION_CONFIG;
  }

  try {
    const raw = window.localStorage.getItem(LEAD_OPTION_CONFIG_KEY);
    if (!raw) {
      return DEFAULT_LEAD_OPTION_CONFIG;
    }

    const parsed = JSON.parse(raw);
    const removedSeniorValues = getRemovedValues(parsed.seniors, REMOVED_SENIOR_NAMES);
    const removedRealestateStatusValues = getRemovedValues(parsed.realestateStatuses, REMOVED_REALESTATE_STATUS_NAMES);
    const normalized = {
      managers: mergeWithDefaults(parsed.managers, DEFAULT_LEAD_OPTION_CONFIG.managers),
      seniors: filterRemovedSeniorNames(mergeWithDefaults(parsed.seniors, DEFAULT_LEAD_OPTION_CONFIG.seniors)),
      realestateStatuses: Array.isArray(parsed.realestateStatuses)
        ? filterRemovedRealestateStatusNames(parsed.realestateStatuses)
        : DEFAULT_LEAD_OPTION_CONFIG.realestateStatuses,
      financeStatuses: Array.isArray(parsed.financeStatuses)
        ? uniqueFilled(parsed.financeStatuses)
        : DEFAULT_LEAD_OPTION_CONFIG.financeStatuses,
    };

    // Persist cleaned values so old browser storage cannot keep reintroducing removed items.
    window.localStorage.setItem(LEAD_OPTION_CONFIG_KEY, JSON.stringify(normalized));
    if (removedSeniorValues.length || removedRealestateStatusValues.length) {
      console.info("leadOptionConfig cleanup applied", {
        removedSeniorValues,
        removedRealestateStatusValues,
      });
    }
    return normalized;
  } catch (error) {
    console.error("Failed to read lead option config:", error);
    return DEFAULT_LEAD_OPTION_CONFIG;
  }
};

export const saveLeadOptionConfig = (config) => {
  if (typeof window === "undefined") return;

  const normalized = {
    managers: uniqueFilled(config.managers),
    seniors: filterRemovedSeniorNames(config.seniors),
    realestateStatuses: filterRemovedRealestateStatusNames(config.realestateStatuses),
    financeStatuses: uniqueFilled(config.financeStatuses),
  };

  window.localStorage.setItem(LEAD_OPTION_CONFIG_KEY, JSON.stringify(normalized));
};
