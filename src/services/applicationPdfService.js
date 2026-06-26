import jsPDF from "jspdf";
// Import the logo image - make sure to save your logo as 'logo-header.png' or 'logo-header.jpg' in src/assets
import logoImage from "../assets/logo-header.png";

const EMPTY_VALUE = "-";
const MM_TO_PT = 72 / 25.4;
const mm = (value) => value * MM_TO_PT;

const formatDate = (value) => {
  if (!value) return EMPTY_VALUE;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString("en-GB");
};

const formatAmount = (value) => {
  // Handle null, undefined, empty string, and bullet point
  if (value === null || value === undefined || value === "" || value === "•") {
    console.log("formatAmount: returning EMPTY_VALUE for:", value);
    return EMPTY_VALUE;
  }
  
  // Convert to string and remove commas
  const stringValue = String(value).trim();
  if (!stringValue || stringValue === "•") {
    console.log("formatAmount: returning EMPTY_VALUE for stringValue:", stringValue);
    return EMPTY_VALUE;
  }
  
  const cleanedValue = stringValue.replace(/,/g, "");
  const numericValue = Number(cleanedValue);
  
  console.log("formatAmount debug:", { 
    original: value, 
    stringValue, 
    cleanedValue, 
    numericValue,
    isNaN: Number.isNaN(numericValue)
  });
  
  // If it's not a valid number, return empty value
  if (Number.isNaN(numericValue) || numericValue === 0) {
    console.log("formatAmount: returning EMPTY_VALUE - NaN or zero");
    return EMPTY_VALUE;
  }
  
  const formatted = numericValue.toLocaleString("en-IN");
  console.log("formatAmount: returning formatted:", formatted);
  return formatted;
};

const resolveAmountField = (...values) => {
  for (const value of values) {
    if (value !== null && value !== undefined && value !== "") {
      return value;
    }
  }
  return EMPTY_VALUE;
};

const formatFlexibleValue = (value) => {
  const resolved = resolveAmountField(value);
  if (resolved === EMPTY_VALUE) return EMPTY_VALUE;

  const stringValue = String(resolved).trim();
  if (!stringValue) return EMPTY_VALUE;

  const cleanedValue = stringValue.replace(/,/g, "");
  const numericValue = Number(cleanedValue);
  if (!Number.isNaN(numericValue) && cleanedValue !== "" && cleanedValue !== "0") {
    return numericValue.toLocaleString("en-IN");
  }

  return stringValue;
};

const formatText = (value) => {
  if (value === null || value === undefined || value === "" || value === "•") return EMPTY_VALUE;
  if (Array.isArray(value)) return value.length ? value.join(", ") : EMPTY_VALUE;
  return String(value);
};

const resolveOptionValue = (value, otherValue) => {
  if (!value || value === "•") return otherValue || EMPTY_VALUE;
  return value === "Other" ? otherValue || EMPTY_VALUE : value;
};

const computeDynamicRowHeight = (doc, row, colWidths, minRowHeight) => {
  let maxLines = 1;
  row.forEach((cell, colIdx) => {
    if (cell && String(cell).trim().length > 0) {
      doc.setFontSize(colIdx === 0 || colIdx === 2 ? 8 : 8.5);
      const lines = doc.splitTextToSize(String(cell), colWidths[colIdx] - 10);
      maxLines = Math.max(maxLines, lines.length);
    }
  });
  // Reduced padding for more compact layout
  return Math.max(minRowHeight, maxLines * 11 + 8);
};

const drawSectionTable = (doc, title, rows, y, options = {}) => {
  const marginX = mm(10);
  const tableWidth = mm(190); 
  const colWidths = [mm(47.5), mm(47.5), mm(47.5), mm(47.5)];
  const headerHeight = 20;
  const minRowHeight = 16; // Reduced from 20 for compact layout
  const largeRows = options.largeRows || [];
  const dynamicRows = options.dynamicRows || [];

  // Only make specified rows dynamic - default to false for compact layout
  const allDynamic = options.allDynamic === true; // Default to false

  // Precompute row heights
  const rowHeights = rows.map((row, i) => {
    // Only compute dynamic height for specified rows
    if (allDynamic || dynamicRows.includes(i)) {
      return computeDynamicRowHeight(doc, row, colWidths, minRowHeight);
    }
    return largeRows.includes(i) ? 60 : minRowHeight;
  });

  const sectionTotalHeight = headerHeight + rowHeights.reduce((a, b) => a + b, 0);

  if (y + sectionTotalHeight > doc.internal.pageSize.getHeight() - mm(15)) {
    doc.addPage();
    y = mm(15);
  }

  doc.setFillColor(211, 211, 211);
  doc.rect(marginX, y, tableWidth, headerHeight, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(title, marginX + tableWidth / 2, y + 13, { align: "center" });

  let currentY = y + headerHeight;

  rows.forEach((row, rowIndex) => {
    const rowHeight = rowHeights[rowIndex];

    // Column 1 (Label - Bold)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.rect(marginX, currentY, colWidths[0], rowHeight);
    const col1Lines = doc.splitTextToSize(String(row[0] || ""), colWidths[0] - 10);
    doc.text(col1Lines, marginX + 5, currentY + 12);

    // Column 2 (Value - Normal)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.rect(marginX + colWidths[0], currentY, colWidths[1], rowHeight);
    const col2Lines = doc.splitTextToSize(String(row[1] || ""), colWidths[1] - 10);
    doc.text(col2Lines, marginX + colWidths[0] + 5, currentY + 12);

    // Column 3 (Label - Bold)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.rect(marginX + colWidths[0] + colWidths[1], currentY, colWidths[2], rowHeight);
    const col3Lines = doc.splitTextToSize(String(row[2] || ""), colWidths[2] - 10);
    doc.text(col3Lines, marginX + colWidths[0] + colWidths[1] + 5, currentY + 12);

    // Column 4 (Value - Normal)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.rect(marginX + colWidths[0] + colWidths[1] + colWidths[2], currentY, colWidths[3], rowHeight);
    const col4Lines = doc.splitTextToSize(String(row[3] || ""), colWidths[3] - 10);
    doc.text(col4Lines, marginX + colWidths[0] + colWidths[1] + colWidths[2] + 5, currentY + 12);

    currentY += rowHeight;
  });

  return currentY + 12;
};

export const generateApplicationPdf = (application) => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = mm(15);

  // ===== DEBUG: Log entire application object =====
  console.log("=== PDF GENERATION DEBUG ===");
  console.log("Full application object:", application);
  console.log("Insurance fields:", {
    insuranceOption: application.insuranceOption,
    insuranceAmount: application.insuranceAmount,
    subventionAmount: application.subventionAmount,
  });
  console.log("=== END DEBUG ===");

  // Add logo image as header
  // Image dimensions: adjust width and height to match your logo's aspect ratio
  const logoWidth = 160; // Adjust this based on your logo size
  const logoHeight = 50; // Adjust this based on your logo size
  const logoX = (pageWidth - logoWidth) / 2; // Center the logo
  
  doc.addImage(logoImage, "PNG", logoX, y, logoWidth, logoHeight);
  y += logoHeight + 20; // Add spacing after logo

  const sectionsList = [];
  const productDetails = Array.isArray(application.productDetails) && application.productDetails.length
    ? application.productDetails
    : [{
        product: application.product,
        otherProduct: application.otherProduct,
        loginDate: application.loginDate,
        loginDate1: application.loginDate1,
        loginDate2: application.loginDate2,
        category: application.category,
        otherCategory: application.otherCategory,
        amount: application.amount,
        sanctionDate: application.sanctionDate,
        sanctionAmount: application.sanctionAmount,
        sanctionDate1: application.sanctionDate1,
        sanctionAmount1: application.sanctionAmount1,
        sanctionDate2: application.sanctionDate2,
        sanctionAmount2: application.sanctionAmount2,
        disbursedDate: application.disbursedDate,
        disbursedAmount: application.disbursedAmount,
        disbursedDate1: application.disbursedDate1,
        disbursedAmount1: application.disbursedAmount1,
        disbursedDate2: application.disbursedDate2,
        disbursedAmount2: application.disbursedAmount2,
      }];
  sectionsList.push({
    title: "CASE INFORMATION",
    rows: [
      ["Case Code", formatText(application.code), "Status", formatText(application.status)],
      ["Approval Status", formatText(application.approvalStatus), "Login Date", formatDate(application.loginDate)],
      ["Sales Person", formatText(application.sales), "Reference", formatText(application.ref)],
      ["Source Channel", formatText(resolveOptionValue(application.sourceChannel, application.otherSourceChannel)), "", ""],
    ],
    dynamicRows: [3], // Source channel can be long
  });
  sectionsList.push({
    title: "CLIENT DETAILS",
    rows: [
      ["Client Name", formatText(application.name), "Mobile", formatText(application.mobile)],
      ["Email", formatText(application.email), "Category", formatText(resolveOptionValue(application.category, application.otherCategory))],
    ],
    dynamicRows: [], // All fixed height
  });
  sectionsList.push({
    title: "BANK PROCESSING",
    rows: [
      ["Bank Name", formatText(resolveOptionValue(application.bank, application.otherBank)), "Product", formatText(resolveOptionValue(application.product, application.otherProduct))],
      ["Banker Name", formatText(application.bankerName), "Loan Number", formatText(application.loanNumber)],
      ["Banker Contact", formatText(application.bankerContactNumber), "Banker Email", formatText(application.bankerEmail)],
    ],
    dynamicRows: [0, 1, 2], // Bank, product, banker name, loan number can be long
  });

  const isDualProduct = ["HL BT + TOP Up", "Home Loan BT + TOP UP"].includes(resolveOptionValue(application.product, application.otherProduct));

  if (productDetails.length > 1 || isDualProduct) {
    const productRows = productDetails.flatMap((detail, index) => ([
      [`Product ${index + 1}`, formatText(resolveOptionValue(detail.product, detail.otherProduct)), `Category ${index + 1}`, formatText(resolveOptionValue(detail.category, detail.otherCategory))],
      isDualProduct
        ? [`Login Date 1`, formatDate(detail.loginDate1 || detail.loginDate), `Login Date 2`, formatDate(detail.loginDate2 || "")] 
        : [`Login Date ${index + 1}`, formatDate(detail.loginDate), `Req Amount ${index + 1}`, formatAmount(detail.amount)],
      isDualProduct
        ? [`Sanction Date 1`, formatDate(detail.sanctionDate1 || detail.sanctionDate), `Sanction Amount 1`, formatAmount(detail.sanctionAmount1 || detail.sanctionAmount)]
        : [`Sanction Date ${index + 1}`, formatDate(detail.sanctionDate), `Sanction Amount ${index + 1}`, formatAmount(detail.sanctionAmount)],
      isDualProduct
        ? [`Disbursed Date 1`, formatDate(detail.disbursedDate1 || detail.disbursedDate), `Disbursed Amount 1`, formatAmount(detail.disbursedAmount1 || detail.disbursedAmount)]
        : [`Disbursed Date ${index + 1}`, formatDate(detail.disbursedDate), `Disbursed Amount ${index + 1}`, formatAmount(detail.disbursedAmount)],
    ]));
    sectionsList.push({
      title: "PRODUCT DETAILS",
      rows: productRows,
      dynamicRows: [...productRows.keys()],
    });
  }
  
  // PD / INTERNAL CHECK - only remarks row is dynamic
  sectionsList.push({
    title: "PD / INTERNAL CHECK",
    rows: [["Audit Data", formatText(application.auditData), "Remarks", formatText(application.remark)]],
    dynamicRows: [0], // Remarks can be long
  });

  const disbursementRows = [
    ["Required Loan Amount", formatAmount(application.amount), "Sanction Amount", formatAmount(application.sanctionAmount)],
  ];
  if (application.status !== "Part Disbursed" && (application.disbursedDate || application.disbursedAmount)) {
    disbursementRows.push(["Disbursed Date", formatDate(application.disbursedDate), "Disbursed Amount", formatAmount(application.disbursedAmount)]);
  }
  if (Array.isArray(application.partDisbursed)) {
    application.partDisbursed.forEach((part, index) => {
      if (part && (part.date || part.amount)) {
        disbursementRows.push([`Part Disbursement ${index + 1} Date`, formatDate(part.date), "Amount", formatAmount(part.amount)]);
      }
    });
  }
  sectionsList.push({ 
    title: "DISBURSEMENT DETAILS", 
    rows: disbursementRows, 
    dynamicRows: [] // All fixed height
  });

  // Display insurance amount - PRIORITY: Amount value over insuranceOption
  let insuranceAmountDisplay = EMPTY_VALUE;
  
  // Debug logging
  console.log("Insurance Amount Debug:", {
    insuranceOption: application.insuranceOption,
    insuranceAmount: application.insuranceAmount,
    insuranceAmountType: typeof application.insuranceAmount,
    insuranceAmountLength: String(application.insuranceAmount).length,
    insuranceAmountTrimmed: String(application.insuranceAmount).trim(),
  });
  
  // PRIMARY LOGIC: If insuranceAmount exists and is not empty/zero, ALWAYS display it
  // This handles cases where insuranceOption might be "No" but amount still exists
  if (application.insuranceAmount) {
    const amountStr = String(application.insuranceAmount).trim();
    // Check if it's a valid amount (not empty, not "0", not just commas)
    const cleanedForCheck = amountStr.replace(/,/g, "");
    if (cleanedForCheck && cleanedForCheck !== "0" && !isNaN(Number(cleanedForCheck))) {
      console.log("Formatting insurance amount:", amountStr);
      insuranceAmountDisplay = formatAmount(application.insuranceAmount);
      console.log("Formatted result:", insuranceAmountDisplay);
    }
  }
  
  sectionsList.push({
    title: "INSURANCE / SUBVENTION",
    rows: [
      ["Insurance Amount", insuranceAmountDisplay, "Subvention Amount", formatAmount(application.subventionAmount)],
    ],
    dynamicRows: [], // All fixed height
  });
  sectionsList.push({
    title: "FINAL PAYOUT DETAILS",
    rows: [
      ["Payout (Yes/No)", formatText(application.payout), "Expense Paid By", formatAmount(application.expenceAmount)],
      [
        "Fees Refund",
        formatFlexibleValue(
          resolveAmountField(
            application.feesRefundAmount,
            application.feesRefund,
            application.feesRefundAmt
          )
        ),
        "",
        "",
      ],
    ],
    dynamicRows: [0, 1], // Make all rows dynamic to accommodate text
  });
  
  sectionsList.push({
    title: "CONSULTING",
    rows: [
      ["Consulting Received", formatText(application.consultingReceived), "Consulting Shared", formatText(application.consultingShared)],
      ["Consulting Remark", formatText(application.consultingRemark), "Consulting Notes", formatText(application.consulting)],
    ],
    dynamicRows: [0, 1], // Both rows can have long text
  });

  // Add Final Remark section if it exists
  if (application.finalRemark) {
    sectionsList.push({
      title: "FINAL REMARK (ADMIN)",
      rows: [["Admin Remark", formatText(application.finalRemark), "", ""]],
      dynamicRows: [0], // Final remark can be long
    });
  }

  sectionsList.forEach((section) => {
    y = drawSectionTable(doc, section.title, section.rows, y, { dynamicRows: section.dynamicRows });
  });

  const safeName = (application.name || "application").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  doc.save(`${safeName}-loan-case-form.pdf`);
};

export default generateApplicationPdf;
