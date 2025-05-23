import jsPDF from "jspdf";

interface ReportData {
  machines: any[];
  dashboardSummary: any;
  alerts: any[];
  energyData: any;
  productionInsights: any;
  config: any;
  onProgress?: (progress: number) => void;
}

// Replace the entire generatePDFReport function with this improved version
export async function generatePDFReport(data: ReportData) {
  const { machines, dashboardSummary, alerts, energyData, productionInsights, config, onProgress } = data;

  try {
    // Create new PDF document
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let currentY = 20; // Initial Y position for content

    // Track progress
    const reportProgress = (progress: number) => {
      if (onProgress) {
        onProgress(Math.min(1, Math.max(0, progress)));
      }
    };

    // Helper function to add new page if needed
    // Returns true if a page break occurred, false otherwise.
    // It also resets currentY to the top margin for the new page.
    const checkPageBreak = (requiredHeight: number) => {
      if (currentY + requiredHeight > pageHeight - 20) { // 20mm bottom margin
        pdf.addPage();
        currentY = 20; // Reset Y to top margin for the new page
        return true;
      }
      return false;
    };

    // Helper function to format numbers
    const formatNumber = (value: number, decimals = 2) => {
      if (isNaN(value) || value === null || typeof value === 'undefined') return "0";
      return Number(value.toFixed(decimals)).toString();
    };

    // Helper function to safely add text to PDF
    // This function will be used for most text rendering.
    const safeText = (text: string, x: number, y: number, options?: any) => {
      try {
        // Replace special characters that might cause issues with standard jsPDF fonts
        const safeString = String(text === null || typeof text === 'undefined' ? "" : text).replace(/[^\x00-\x7F]/g, "");
        pdf.text(safeString, x, y, options);
      } catch (error) {
        console.error("Error adding text to PDF:", error, "Original text:", text);
        // Add fallback text if there's an error
        pdf.text("(text error)", x, y, options);
      }
    };

    // 1. HEADER WITH LOGO
    try {
      // Add FaultZero logo (text-based for reliability)
      pdf.setFontSize(24);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(160, 160, 160); // Gray for FAULT
      safeText("FAULT", 20, currentY);

      pdf.setTextColor(0, 160, 255); // Blue for ZERO
      safeText("ZERO", 75, currentY); // Adjusted X for "ZERO" based on "FAULT"

      currentY += 15;

      // Report title
      pdf.setFontSize(18);
      pdf.setTextColor(0, 0, 0);
      safeText(config.reportTitle || "Machine Status Report", 20, currentY);
      currentY += 10;

      // Customer name and date
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      if (config.customerName) {
        safeText(`Customer: ${config.customerName}`, 20, currentY);
        currentY += 6;
      }
      safeText(`Generated: ${new Date().toLocaleDateString()}`, 20, currentY);
      safeText(`Report Period: ${config.dateRange || "Last 30 Days"}`, 20, currentY + 6);
      currentY += 20; // Increased spacing

      // Description if provided
      if (config.reportDescription) {
        pdf.setFontSize(10);
        // Sanitize the description string BEFORE splitting it
        const safeDescriptionString = (config.reportDescription || "").replace(/[^\x00-\x7F]/g, "");
        const splitDescription = pdf.splitTextToSize(safeDescriptionString, pageWidth - 40); // 20mm margin on each side
        
        // Check for page break before rendering description
        // Estimate height: each line is roughly 4mm for font size 10
        const estimatedDescHeight = splitDescription.length * (pdf.getFontSize() * 0.352778 * 1.2); // Approximate height in mm
        checkPageBreak(estimatedDescHeight);

        pdf.text(splitDescription, 20, currentY); // jsPDF handles array of strings for multi-line
        currentY += splitDescription.length * (pdf.getFontSize() * 0.352778 * 1.2) + 10; // More accurate line height + spacing
      }

      reportProgress(0.15); // 15% progress after header
    } catch (error) {
      console.error("Error adding header:", error);
    }

    // 2. EXECUTIVE SUMMARY
    checkPageBreak(40); // Estimate height for section title + some table rows
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    safeText("Executive Summary", 20, currentY);
    currentY += 10;

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");

    const summaryData = [
      ["Total Machines", String(dashboardSummary?.total_machines || 0)],
      ["Healthy Machines", String(dashboardSummary?.healthy_machines || 0)],
      ["Warning Machines", String(dashboardSummary?.warning_machines || 0)],
      ["Critical Machines", String(dashboardSummary?.critical_machines || 0)],
      ["Average Health Score", `${formatNumber(dashboardSummary?.avg_health_score || 0)}%`],
      ["Recent Anomalies", String(dashboardSummary?.recent_anomalies || 0)],
      ["Average Efficiency", `${formatNumber(dashboardSummary?.avg_efficiency || 0)}%`],
      ["Total Energy Consumption", `${formatNumber(dashboardSummary?.total_energy_consumption || 0)} kWh`],
      ["Potential Energy Savings", `${formatNumber(dashboardSummary?.potential_energy_savings || 0)} kWh`],
      ["Estimated ROI", `${dashboardSummary?.estimated_roi_days || 0} days`],
    ];

    let summaryTableY = currentY;
    const summaryRowHeight = 8;
    summaryData.forEach(([label, value], index) => {
      checkPageBreak(summaryRowHeight); // Check page break for each row
      // If page broke, summaryTableY needs to be reset to currentY (which is now top margin)
      // This is implicitly handled as currentY is used for positioning.

      if (index % 2 === 0) {
        pdf.setFillColor(245, 245, 245); // Light gray for even rows
        pdf.rect(20, currentY - 3, pageWidth - 40, summaryRowHeight, "F");
      }
      safeText(label, 25, currentY + 2);
      safeText(value, pageWidth - 60, currentY + 2, { align: 'right' }); // Align value to the right
      currentY += summaryRowHeight;
    });
    currentY += 10; // Spacing after summary table

    reportProgress(0.3);

    // 3. MACHINE STATUS OVERVIEW
    if (config.includeMachineDetails && machines && machines.length > 0) {
      checkPageBreak(30); // For section title + table headers
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      safeText("Machine Status Overview", 20, currentY);
      currentY += 15;

      const machineTableHeaders = ["ID", "Status", "Health", "RUL", "Temp", "Energy", "Idle"];
      const machineColWidths = [20, 30, 20, 20, 25, 25, 20]; // Adjusted for better spacing
      const machineRowHeight = 8;

      const drawMachineTableHeaders = () => {
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        pdf.setFillColor(230, 230, 230); // Header background
        pdf.rect(20, currentY - 5, pageWidth - 40, machineRowHeight, "F");
        let headerX = 22; // Start a bit indented
        machineTableHeaders.forEach((header, index) => {
          safeText(header, headerX, currentY);
          headerX += machineColWidths[index];
        });
        currentY += machineRowHeight;
        pdf.setFont("helvetica", "normal"); // Reset for data rows
        pdf.setFontSize(9); // Ensure data row font size
      };

      drawMachineTableHeaders(); // Initial headers

      machines.forEach((machine, index) => {
        if (checkPageBreak(machineRowHeight)) {
          drawMachineTableHeaders(); // Redraw headers on new page
        }

        if (index % 2 === 0) {
          pdf.setFillColor(250, 250, 250); // Alternating row color
          pdf.rect(20, currentY - 3, pageWidth - 40, machineRowHeight, "F");
        }

        const rowData = [
          String(machine.machine_id || index + 1),
          machine.status || "Unknown",
          `${formatNumber(machine.health_score || 0)}%`,
          `${formatNumber(machine.rul_days || 0, 0)}d`,
          `${formatNumber(machine.temperature || 0)}°C`,
          `${formatNumber(machine.energy_kw || 0)}kW`,
          `${formatNumber(machine.idle_time_pct || 0)}%`,
        ];

        let dataX = 22;
        rowData.forEach((data, i) => {
          pdf.setTextColor(0, 0, 0); // Default text color
          if (i === 1) { // Status column
            const status = machine.status ? machine.status.toLowerCase() : "";
            if (status === "healthy") pdf.setTextColor(34, 139, 34); // ForestGreen
            else if (status === "warning") pdf.setTextColor(255, 165, 0); // Orange
            else if (status === "critical") pdf.setTextColor(220, 20, 60); // Crimson
          }
          safeText(data, dataX, currentY + 2);
          dataX += machineColWidths[i];
        });
        currentY += machineRowHeight;
      });
      currentY += 15; // Spacing after table
      reportProgress(0.5);
    }

    // 4. ALERTS AND ANOMALIES
    if (config.includeAlerts && alerts && alerts.length > 0) {
      checkPageBreak(30); // For section title + first alert
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(0, 0, 0);
      safeText("Active Alerts & Anomalies", 20, currentY);
      currentY += 15;

      const alertItemHeight = 18; // Approximate height for one alert item (title, message, timestamp)
      alerts.slice(0, 10).forEach((alert) => { // Max 10 alerts
        checkPageBreak(alertItemHeight); // Check before drawing each alert

        // Alert details
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        const priority = (alert.priority || "normal").toLowerCase();
        if (priority === "high") pdf.setTextColor(220, 20, 60); // Crimson
        else if (priority === "medium") pdf.setTextColor(255, 165, 0); // Orange
        else pdf.setTextColor(59, 130, 246); // Blue
        safeText(`${(alert.priority || "").toUpperCase()} - Machine ${alert.machine_id || "N/A"}`, 25, currentY);

        pdf.setTextColor(0, 0, 0);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        const alertMessageLines = pdf.splitTextToSize(alert.message || "No message.", pageWidth - 50);
        safeText(alertMessageLines, 25, currentY + 5);
        const messageHeight = alertMessageLines.length * (pdf.getFontSize() * 0.352778 * 1.2);

        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        safeText(alert.timestamp ? new Date(alert.timestamp).toLocaleString() : "No timestamp", 25, currentY + 5 + messageHeight + 2);
        
        currentY += 5 + messageHeight + 2 + 5; // Total height for this alert item + spacing
      });
      currentY += 10; // Spacing after alerts section
      reportProgress(0.65);
    }

    // 5. ENERGY ANALYSIS
    if (config.includeEnergyAnalysis && energyData) {
      checkPageBreak(30); // For section title
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(0, 0, 0);
      safeText("Energy Analysis & ROI", 20, currentY);
      currentY += 15;

      // ROI Data Table
      if (energyData.roi_data) {
        checkPageBreak(20); // For ROI sub-title + first row
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        safeText("Return on Investment (ROI)", 20, currentY);
        currentY += 8;
        
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");

        const roiDataFormatted = [
          ["Initial Investment", `$${formatNumber(energyData.roi_data.initial_investment || 0, 0)}`],
          ["Annual Energy Savings", `$${formatNumber(energyData.roi_data.energy_savings_per_year || 0, 0)}`],
          ["Annual Maintenance Savings", `$${formatNumber(energyData.roi_data.maintenance_savings_per_year || 0, 0)}`],
          ["Total Annual Savings", `$${formatNumber(energyData.roi_data.total_savings_per_year || 0, 0)}`],
          ["ROI Period (Years)", `${formatNumber(energyData.roi_data.roi_years || 0, 1)}`],
          ["Payback Date", energyData.roi_data.payback_date || "N/A"],
        ];
        const roiRowHeight = 8;
        roiDataFormatted.forEach(([label, value], index) => {
          checkPageBreak(roiRowHeight);
          if (index % 2 === 0) {
            pdf.setFillColor(245, 245, 245);
            pdf.rect(20, currentY - 3, pageWidth - 40, roiRowHeight, "F");
          }
          safeText(label, 25, currentY + 2);
          safeText(value, pageWidth - 60, currentY + 2, { align: 'right' });
          currentY += roiRowHeight;
        });
        currentY += 15; // Spacing after ROI table
      }

      // Idle Time Analysis Table
      if (energyData.idle_time_waste && energyData.idle_time_waste.length > 0) {
        checkPageBreak(30); // For sub-title + headers
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        safeText("Idle Time Analysis", 20, currentY);
        currentY += 10;

        const idleHeaders = ["Machine ID", "Idle Time %", "Energy Waste (kWh)", "Potential Savings ($)"];
        const idleColWidths = [35, 35, 45, 45];
        const idleRowHeight = 8;

        const drawIdleTableHeaders = () => {
          pdf.setFontSize(9);
          pdf.setFont("helvetica", "bold");
          pdf.setFillColor(230, 230, 230);
          pdf.rect(20, currentY - 5, pageWidth - 40, idleRowHeight, "F");
          let headerX = 22;
          idleHeaders.forEach((header, i) => {
            safeText(header, headerX, currentY);
            headerX += idleColWidths[i];
          });
          currentY += idleRowHeight;
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(9);
        };

        drawIdleTableHeaders(); // Initial headers

        energyData.idle_time_waste.forEach((item: any, index: number) => {
          if (checkPageBreak(idleRowHeight)) {
            drawIdleTableHeaders(); // Redraw headers on new page
          }

          if (index % 2 === 0) {
            pdf.setFillColor(250, 250, 250);
            pdf.rect(20, currentY - 3, pageWidth - 40, idleRowHeight, "F");
          }

          const idleRowData = [
            String(item.machine_id || "N/A"),
            `${formatNumber(item.idle_time_pct || 0)}%`,
            `${formatNumber(item.energy_waste_kwh || 0)} kWh`,
            `$${formatNumber(item.potential_savings_usd || 0)}`,
          ];

          let idleDataX = 22;
          idleRowData.forEach((data, i) => {
            safeText(data, idleDataX, currentY + 2);
            idleDataX += idleColWidths[i];
          });
          currentY += idleRowHeight;
        });
        currentY += 15; // Spacing after table
      }
      reportProgress(0.8);
    }

    // 6. AI RECOMMENDATIONS
    if (config.includeRecommendations && productionInsights && productionInsights.recommendations && productionInsights.recommendations.length > 0) {
      checkPageBreak(30); // For section title + first recommendation
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(0,0,0);
      safeText("AI-Powered Recommendations", 20, currentY);
      currentY += 15;

      pdf.setFont("helvetica", "normal");
      productionInsights.recommendations.forEach((recommendation: string, index: number) => {
        const recommendationText = recommendation || "No specific recommendation provided.";
        const splitRec = pdf.splitTextToSize(recommendationText, pageWidth - 50); // 25mm left margin + 10mm for number
        const recommendationHeight = splitRec.length * (pdf.getFontSize() * 0.352778 * 1.2) + 5; // text height + spacing

        checkPageBreak(recommendationHeight); // Check before drawing each recommendation

        pdf.setFontSize(10);
        pdf.setTextColor(59, 130, 246); // Blue for numbering
        safeText(`${index + 1}.`, 25, currentY);
        
        pdf.setTextColor(0, 0, 0); // Black for recommendation text
        safeText(splitRec, 35, currentY); // Render split text starting at x=35
        
        currentY += recommendationHeight;
      });
      currentY += 10; // Spacing after recommendations
      reportProgress(0.9);
    }

    // 7. FOOTER
    const totalPages = pdf.getNumberOfPages(); // Correct way to get total pages
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i); // Go to page i
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100); // Gray color for footer
      const footerText = `Page ${i} of ${totalPages} | Generated by FaultZero AI | ${new Date().toLocaleDateString()}`;
      safeText(footerText, 20, pageHeight - 10); // Positioned 10mm from bottom
    }

    reportProgress(0.95);

    // Save the PDF
    const safeCustomerName = config.customerName ? String(config.customerName).replace(/\s+/g, "_").replace(/[^\w.-]/g, "") + "_" : "";
    const fileName = `${safeCustomerName}Machine_Report_${new Date().toISOString().split("T")[0]}.pdf`;
    pdf.save(fileName);

    reportProgress(1); // 100% progress after save
    return true; // Indicate success
  } catch (error) {
    console.error("PDF generation error:", error);
    if (onProgress) onProgress(-1); // Indicate error with progress
    // Rethrow a more specific error or a generic one if the original isn't an Error instance
    throw new Error(error instanceof Error ? `Failed to generate PDF report: ${error.message}` : "Failed to generate PDF report due to an unknown error.");
  }
}
