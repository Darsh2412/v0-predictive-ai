"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Download, FileText, Building, AlertCircle } from "lucide-react"
import { generatePDFReport } from "@/lib/report-utils"

interface Machine {
  machine_id: number
  status: string
  health_score: number
  rul_days: number
  temperature: number
  energy_kw: number
  idle_time_pct: number
  vibration?: number
  load?: number
  rpm?: number
  current?: number
}

interface ReportGeneratorProps {
  machines: Machine[]
  dashboardSummary: any
  alerts: any[]
  energyData: any
  productionInsights: any
}

export function ReportGenerator({
  machines,
  dashboardSummary,
  alerts,
  energyData,
  productionInsights,
}: ReportGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loadingState, setLoadingState] = useState<"idle" | "preparing" | "generating" | "downloading" | "error">(
    "idle",
  )
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState("")
  const [generating, setGenerating] = useState(false)
  const [reportConfig, setReportConfig] = useState({
    reportType: "comprehensive",
    dateRange: "30days",
    includeCharts: true,
    includeMachineDetails: true,
    includeAlerts: true,
    includeEnergyAnalysis: true,
    includeRecommendations: true,
    customerName: "",
    reportTitle: "Machine Status & Performance Report",
    reportDescription: "",
    selectedMachines: machines.map((m) => m.machine_id.toString()),
  })

  const handleMachineSelection = (machineId: string, checked: boolean) => {
    setReportConfig((prev) => ({
      ...prev,
      selectedMachines: checked
        ? [...prev.selectedMachines, machineId]
        : prev.selectedMachines.filter((id) => id !== machineId),
    }))
  }

  const handleGenerateReport = async () => {
    try {
      setLoadingState("preparing")
      setLoadingProgress(10)
      setErrorMessage("")

      // Filter machines based on selection
      const selectedMachines = machines.filter((m) => reportConfig.selectedMachines.includes(m.machine_id.toString()))

      if (selectedMachines.length === 0) {
        throw new Error("Please select at least one machine to include in the report")
      }

      setLoadingProgress(30)
      setLoadingState("generating")

      // Generate the PDF report with progress updates
      const success = await generatePDFReport({
        machines: selectedMachines,
        dashboardSummary,
        alerts,
        energyData,
        productionInsights,
        config: reportConfig,
        onProgress: (progress) => {
          setLoadingProgress(30 + Math.floor(progress * 60))
        },
      })

      if (!success) {
        throw new Error("Failed to generate PDF report")
      }

      setLoadingProgress(95)
      setLoadingState("downloading")

      // Simulate download completion
      setTimeout(() => {
        setLoadingProgress(100)
        setLoadingState("idle")
        setIsOpen(false)
      }, 1000)
    } catch (error) {
      console.error("Error generating report:", error)
      setLoadingState("error")
      setErrorMessage(error instanceof Error ? error.message : "Failed to generate report")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          <Download className="h-4 w-4 mr-1" />
          Export Report
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Generate Professional Report
          </DialogTitle>
          <DialogDescription>
            Create a comprehensive PDF report with charts, data analysis, and recommendations
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Report Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reportType">Report Type</Label>
              <Select
                value={reportConfig.reportType}
                onValueChange={(value) => setReportConfig((prev) => ({ ...prev, reportType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comprehensive">Comprehensive Report</SelectItem>
                  <SelectItem value="executive">Executive Summary</SelectItem>
                  <SelectItem value="maintenance">Maintenance Focus</SelectItem>
                  <SelectItem value="energy">Energy Analysis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateRange">Date Range</Label>
              <Select
                value={reportConfig.dateRange}
                onValueChange={(value) => setReportConfig((prev) => ({ ...prev, dateRange: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Last 7 Days</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                  <SelectItem value="90days">Last 90 Days</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Customer Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Building className="w-4 h-4" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="customerName">Customer/Company Name</Label>
                <Input
                  id="customerName"
                  placeholder="Enter customer name"
                  value={reportConfig.customerName}
                  onChange={(e) => setReportConfig((prev) => ({ ...prev, customerName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reportTitle">Report Title</Label>
                <Input
                  id="reportTitle"
                  placeholder="Enter report title"
                  value={reportConfig.reportTitle}
                  onChange={(e) => setReportConfig((prev) => ({ ...prev, reportTitle: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reportDescription">Report Description (Optional)</Label>
                <Textarea
                  id="reportDescription"
                  placeholder="Enter additional context or description for this report"
                  value={reportConfig.reportDescription}
                  onChange={(e) => setReportConfig((prev) => ({ ...prev, reportDescription: e.target.value }))}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Machine Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Select Machines to Include</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {machines.map((machine) => (
                  <div key={machine.machine_id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`machine-${machine.machine_id}`}
                      checked={reportConfig.selectedMachines.includes(machine.machine_id.toString())}
                      onCheckedChange={(checked) =>
                        handleMachineSelection(machine.machine_id.toString(), checked as boolean)
                      }
                    />
                    <Label htmlFor={`machine-${machine.machine_id}`} className="text-sm font-normal">
                      Machine {machine.machine_id}
                      <span
                        className={`ml-1 text-xs ${
                          machine.status === "Healthy"
                            ? "text-emerald-600"
                            : machine.status === "Warning"
                              ? "text-amber-600"
                              : "text-red-600"
                        }`}
                      >
                        ({machine.status})
                      </span>
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Report Sections */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Report Sections</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeCharts"
                  checked={reportConfig.includeCharts}
                  onCheckedChange={(checked) =>
                    setReportConfig((prev) => ({ ...prev, includeCharts: checked as boolean }))
                  }
                />
                <Label htmlFor="includeCharts">Include Charts & Visualizations</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeMachineDetails"
                  checked={reportConfig.includeMachineDetails}
                  onCheckedChange={(checked) =>
                    setReportConfig((prev) => ({ ...prev, includeMachineDetails: checked as boolean }))
                  }
                />
                <Label htmlFor="includeMachineDetails">Machine Details & Metrics</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeAlerts"
                  checked={reportConfig.includeAlerts}
                  onCheckedChange={(checked) =>
                    setReportConfig((prev) => ({ ...prev, includeAlerts: checked as boolean }))
                  }
                />
                <Label htmlFor="includeAlerts">Alerts & Anomalies</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeEnergyAnalysis"
                  checked={reportConfig.includeEnergyAnalysis}
                  onCheckedChange={(checked) =>
                    setReportConfig((prev) => ({ ...prev, includeEnergyAnalysis: checked as boolean }))
                  }
                />
                <Label htmlFor="includeEnergyAnalysis">Energy Analysis & ROI</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeRecommendations"
                  checked={reportConfig.includeRecommendations}
                  onCheckedChange={(checked) =>
                    setReportConfig((prev) => ({ ...prev, includeRecommendations: checked as boolean }))
                  }
                />
                <Label htmlFor="includeRecommendations">AI Recommendations</Label>
              </div>
            </CardContent>
          </Card>

          {/* Generate Button */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={loadingState !== "idle" && loadingState !== "error"}
              className="h-9"
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerateReport}
              disabled={
                (loadingState !== "idle" && loadingState !== "error") || reportConfig.selectedMachines.length === 0
              }
              className="min-w-[140px] h-9"
            >
              {loadingState === "idle" || loadingState === "error" ? (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Generate Report
                </>
              ) : (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {loadingState === "preparing"
                    ? "Preparing..."
                    : loadingState === "generating"
                      ? "Generating..."
                      : "Downloading..."}
                </>
              )}
            </Button>
          </div>

          {loadingState !== "idle" && loadingState !== "error" && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
                  style={{ width: `${loadingProgress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1 text-center">
                {loadingState === "preparing"
                  ? "Preparing report data..."
                  : loadingState === "generating"
                    ? "Generating PDF report..."
                    : "Downloading your report..."}
              </p>
            </div>
          )}

          {loadingState === "error" && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm text-red-800 font-medium">Error generating report</p>
                  <p className="text-xs text-red-600 mt-1">
                    {errorMessage || "Please try again or contact support if the issue persists."}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 text-xs h-7 bg-white hover:bg-gray-50"
                    onClick={() => setLoadingState("idle")}
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
