import jsPDF from "jspdf"

interface ReportData {
  machines: any[]
  dashboardSummary: any
  alerts: any[]
  energyData: any
  productionInsights: any
  config: any
  onProgress?: (progress: number) => void
}

// Replace the entire generatePDFReport function with this improved version
export async function generatePDFReport(data: ReportData) {
  const { machines, dashboardSummary, alerts, energyData, productionInsights, config, onProgress } = data

  try {
    // Create new PDF document
    const pdf = new jsPDF("p", "mm", "a4")
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    let currentY = 20

    // Track progress
    const reportProgress = (progress: number) => {
      if (onProgress) {
        onProgress(Math.min(1, Math.max(0, progress)))
      }
    }

    // Helper function to add new page if needed
    const checkPageBreak = (requiredHeight: number) => {
      if (currentY + requiredHeight > pageHeight - 20) {
        pdf.addPage()
        currentY = 20
        return true
      }
      return false
    }

    // Helper function to format numbers
    const formatNumber = (value: number, decimals = 2) => {
      if (isNaN(value)) return "0"
      return Number(value.toFixed(decimals)).toString()
    }

    // Helper function to safely add text to PDF
    const safeText = (text: string, x: number, y: number) => {
      try {
        // Replace special characters that might cause issues
        const safeString = text.replace(/[^\x00-\x7F]/g, "")
        pdf.text(safeString, x, y)
      } catch (error) {
        console.error("Error adding text to PDF:", error)
        // Add fallback text if there's an error
        pdf.text("(text rendering error)", x, y)
      }
    }

    // 1. HEADER WITH LOGO
    try {
      // Add FaultZero logo (text-based for reliability)
      pdf.setFontSize(24)
      pdf.setFont("helvetica", "bold")
      pdf.setTextColor(160, 160, 160) // Gray for FAULT
      safeText("FAULT", 20, currentY)

      pdf.setTextColor(0, 160, 255) // Blue for lightning and ZERO
      safeText("ZERO", 75, currentY)

      currentY += 15

      // Report title
      pdf.setFontSize(18)
      pdf.setTextColor(0, 0, 0)
      safeText(config.reportTitle || "Machine Status Report", 20, currentY)
      currentY += 10

      // Customer name and date
      pdf.setFontSize(12)
      pdf.setFont("helvetica", "normal")
      if (config.customerName) {
        safeText(`Customer: ${config.customerName}`, 20, currentY)
        currentY += 6
      }
      safeText(`Generated: ${new Date().toLocaleDateString()}`, 20, currentY)
      safeText(`Report Period: ${config.dateRange || "Last 30 Days"}`, 20, currentY + 6)
      currentY += 20

      // Description if provided
      if (config.reportDescription) {
        pdf.setFontSize(10)
        const splitDescription = pdf.splitTextToSize(config.reportDescription, pageWidth - 40)
        pdf.text(splitDescription, 20, currentY)
        currentY += splitDescription.length * 4 + 10
      }

      reportProgress(0.15) // 15% progress after header
    } catch (error) {
      console.error("Error adding header:", error)
    }

    // 2. EXECUTIVE SUMMARY
    checkPageBreak(40)
    pdf.setFontSize(16)
    pdf.setFont("helvetica", "bold")
    safeText("Executive Summary", 20, currentY)
    currentY += 10

    pdf.setFontSize(10)
    pdf.setFont("helvetica", "normal")

    // Summary statistics - ensure all values are valid
    const summaryData = [
      ["Total Machines", String(dashboardSummary.total_machines || 0)],
      ["Healthy Machines", String(dashboardSummary.healthy_machines || 0)],
      ["Warning Machines", String(dashboardSummary.warning_machines || 0)],
      ["Critical Machines", String(dashboardSummary.critical_machines || 0)],
      ["Average Health Score", `${formatNumber(dashboardSummary.avg_health_score || 0)}%`],
      ["Recent Anomalies", String(dashboardSummary.recent_anomalies || 0)],
      ["Average Efficiency", `${formatNumber(dashboardSummary.avg_efficiency || 0)}%`],
      ["Total Energy Consumption", `${formatNumber(dashboardSummary.total_energy_consumption || 0)} kWh`],
      ["Potential Energy Savings", `${formatNumber(dashboardSummary.potential_energy_savings || 0)} kWh`],
      ["Estimated ROI", `${dashboardSummary.estimated_roi_days || 0} days`],
    ]

    // Create summary table
    let tableY = currentY
    summaryData.forEach(([label, value], index) => {
      if (index % 2 === 0) {
        pdf.setFillColor(245, 245, 245)
        pdf.rect(20, tableY - 3, pageWidth - 40, 8, "F")
      }
      safeText(label, 25, tableY + 2)
      safeText(value, pageWidth - 60, tableY + 2)
      tableY += 8
    })
    currentY = tableY + 10

    reportProgress(0.3) // 30% progress after executive summary

    // 3. MACHINE STATUS OVERVIEW
    if (config.includeMachineDetails) {
      checkPageBreak(60)
      pdf.setFontSize(16)
      pdf.setFont("helvetica", "bold")
      safeText("Machine Status Overview", 20, currentY)
      currentY += 15

      // Machine table headers
      pdf.setFontSize(9)
      pdf.setFont("helvetica", "bold")
      pdf.setFillColor(230, 230, 230)
      pdf.rect(20, currentY - 5, pageWidth - 40, 8, "F")

      const headers = ["ID", "Status", "Health", "RUL", "Temp", "Energy", "Idle"]
      const colWidths = [15, 25, 20, 20, 20, 20, 20]
      let headerX = 25

      headers.forEach((header, index) => {
        safeText(header, headerX, currentY)
        headerX += colWidths[index]
      })
      currentY += 10

      // Machine data rows
      pdf.setFont("helvetica", "normal")
      machines.forEach((machine, index) => {
        if (checkPageBreak(8)) {
          // Repeat headers on new page
          pdf.setFont("helvetica", "bold")
          pdf.setFillColor(230, 230, 230)
          pdf.rect(20, currentY - 5, pageWidth - 40, 8, "F")
          let headerX = 25
          headers.forEach((header, i) => {
            safeText(header, headerX, currentY)
            headerX += colWidths[i]
          })
          currentY += 10
          pdf.setFont("helvetica", "normal")
        }

        if (index % 2 === 0) {
          pdf.setFillColor(250, 250, 250)
          pdf.rect(20, currentY - 3, pageWidth - 40, 8, "F")
        }

        const rowData = [
          String(machine.machine_id || index + 1),
          machine.status || "Unknown",
          `${formatNumber(machine.health_score || 0)}%`,
          `${formatNumber(machine.rul_days || 0, 0)}d`,
          `${formatNumber(machine.temperature || 0)}°C`,
          `${formatNumber(machine.energy_kw || 0)}kW`,
          `${formatNumber(machine.idle_time_pct || 0)}%`,
        ]

        let dataX = 25
        rowData.forEach((data, i) => {
          // Set color based on status for certain columns
          if (i === 1) {
            // Status column
            pdf.setTextColor(
              machine.status === "Healthy"
                ? [34, 197, 94]
                : machine.status === "Warning"
                  ? [245, 158, 11]
                  : [239, 68, 68],
            )
          } else {
            pdf.setTextColor(0, 0, 0)
          }

          safeText(data, dataX, currentY + 2)
          dataX += colWidths[i]
        })
        currentY += 8
      })
      currentY += 15

      reportProgress(0.5) // 50% progress after machine details
    }

    // 4. ALERTS AND ANOMALIES
    if (config.includeAlerts && alerts && alerts.length > 0) {
      checkPageBreak(40)
      pdf.setFontSize(16)
      pdf.setFont("helvetica", "bold")
      pdf.setTextColor(0, 0, 0)
      safeText("Active Alerts & Anomalies", 20, currentY)
      currentY += 15

      alerts.slice(0, 10).forEach((alert, index) => {
        if (checkPageBreak(12)) return

        pdf.setFontSize(10)
        pdf.setFont("helvetica", "bold")

        // Alert priority color
        const priorityColor =
          alert.priority === "high" ? [239, 68, 68] : alert.priority === "medium" ? [245, 158, 11] : [59, 130, 246]
        pdf.setTextColor(...priorityColor)
        safeText(`${(alert.priority || "").toUpperCase()} - Machine ${alert.machine_id || ""}`, 25, currentY)

        pdf.setTextColor(0, 0, 0)
        pdf.setFont("helvetica", "normal")
        safeText(alert.message || "", 25, currentY + 5)
        pdf.setFontSize(8)
        pdf.setTextColor(100, 100, 100)
        safeText(alert.timestamp || "", 25, currentY + 9)

        currentY += 15
      })
      currentY += 10

      reportProgress(0.65) // 65% progress after alerts
    }

    // 5. ENERGY ANALYSIS
    if (config.includeEnergyAnalysis && energyData) {
      checkPageBreak(50)
      pdf.setFontSize(16)
      pdf.setFont("helvetica", "bold")
      pdf.setTextColor(0, 0, 0)
      safeText("Energy Analysis & ROI", 20, currentY)
      currentY += 15

      if (energyData.roi_data) {
        const roiData = [
          ["Initial Investment", `$${(energyData.roi_data.initial_investment || 0).toLocaleString()}`],
          ["Annual Energy Savings", `$${energyData.roi_data.energy_savings_per_year || "0"}`],
          ["Annual Maintenance Savings", `$${energyData.roi_data.maintenance_savings_per_year || "0"}`],
          ["Total Annual Savings", `$${energyData.roi_data.total_savings_per_year || "0"}`],
          ["ROI Period", `${energyData.roi_data.roi_years || "0"} years`],
          ["Payback Date", energyData.roi_data.payback_date || "N/A"],
        ]

        pdf.setFontSize(10)
        pdf.setFont("helvetica", "normal")

        roiData.forEach(([label, value], index) => {
          if (index % 2 === 0) {
            pdf.setFillColor(245, 245, 245)
            pdf.rect(20, currentY - 3, pageWidth - 40, 8, "F")
          }
          safeText(label, 25, currentY + 2)
          safeText(value, pageWidth - 60, currentY + 2)
          currentY += 8
        })
        currentY += 15
      }

      // Idle time analysis
      if (energyData.idle_time_waste) {
        pdf.setFontSize(14)
        pdf.setFont("helvetica", "bold")
        safeText("Idle Time Analysis", 20, currentY)
        currentY += 10

        pdf.setFontSize(9)
        pdf.setFont("helvetica", "bold")
        pdf.setFillColor(230, 230, 230)
        pdf.rect(20, currentY - 5, pageWidth - 40, 8, "F")

        const idleHeaders = ["Machine", "Idle Time", "Energy Waste", "Potential Savings"]
        const idleColWidths = [30, 30, 40, 40]
        let idleHeaderX = 25

        idleHeaders.forEach((header, index) => {
          safeText(header, idleHeaderX, currentY)
          idleHeaderX += idleColWidths[index]
        })
        currentY += 10

        pdf.setFont("helvetica", "normal")
        energyData.idle_time_waste.forEach((item: any, index: number) => {
          if (checkPageBreak(8)) return

          if (index % 2 === 0) {
            pdf.setFillColor(250, 250, 250)
            pdf.rect(20, currentY - 3, pageWidth - 40, 8, "F")
          }

          const idleRowData = [
            `Machine ${item.machine_id || ""}`,
            `${item.idle_time_pct || "0"}%`,
            `${item.energy_waste_kwh || "0"} kWh`,
            `$${item.potential_savings_usd || "0"}`,
          ]

          let idleDataX = 25
          idleRowData.forEach((data, i) => {
            safeText(data, idleDataX, currentY + 2)
            idleDataX += idleColWidths[i]
          })
          currentY += 8
        })
        currentY += 15
      }

      reportProgress(0.8) // 80% progress after energy analysis
    }

    // 6. AI RECOMMENDATIONS
    if (config.includeRecommendations && productionInsights && productionInsights.recommendations) {
      checkPageBreak(40)
      pdf.setFontSize(16)
      pdf.setFont("helvetica", "bold")
      safeText("AI-Powered Recommendations", 20, currentY)
      currentY += 15

      pdf.setFontSize(10)
      pdf.setFont("helvetica", "normal")

      productionInsights.recommendations.forEach((recommendation: string, index: number) => {
        if (checkPageBreak(15)) return

        pdf.setTextColor(59, 130, 246)
        safeText(`${index + 1}.`, 25, currentY)
        pdf.setTextColor(0, 0, 0)

        const splitRec = pdf.splitTextToSize(recommendation || "", pageWidth - 50)
        pdf.text(splitRec, 35, currentY)
        currentY += splitRec.length * 4 + 5
      })
      currentY += 10

      reportProgress(0.9) // 90% progress after recommendations
    }

    // 7. FOOTER
    const totalPages = pdf.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i)
      pdf.setFontSize(8)
      pdf.setTextColor(100, 100, 100)
      safeText(
        `Page ${i} of ${totalPages} | Generated by FaultZero AI | ${new Date().toLocaleDateString()}`,
        20,
        pageHeight - 10,
      )
    }

    reportProgress(0.95) // 95% progress after footer

    // Save the PDF
    const fileName = `${config.customerName ? config.customerName.replace(/\s+/g, "_") + "_" : ""}Machine_Report_${new Date().toISOString().split("T")[0]}.pdf`
    pdf.save(fileName)

    reportProgress(1) // 100% progress after save
    return true
  } catch (error) {
    console.error("PDF generation error:", error)
    throw new Error(error instanceof Error ? error.message : "Failed to generate PDF report")
  }
}
