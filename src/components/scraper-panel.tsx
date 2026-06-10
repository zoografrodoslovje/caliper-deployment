"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Play,
  Square,
  Settings2,
  Database,
  FileText,
  Copy,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";

const DATA_SOURCES = [
  { value: "socrata-chicago-food", label: "Chicago Food Businesses - Socrata API" },
  { value: "socrata-chicago-business", label: "Chicago Business Licenses - Socrata API" },
  { value: "custom", label: "Custom Source" },
];

const FACILITY_TYPES = [
  { value: "", label: "All Types" },
  { value: "Restaurant", label: "Restaurant" },
  { value: "Cafe", label: "Cafe" },
  { value: "Bar", label: "Bar" },
  { value: "Bakery", label: "Bakery" },
  { value: "Grocery", label: "Grocery Store" },
  { value: "Food Truck", label: "Food Truck" },
  { value: "Catering", label: "Catering" },
  { value: "Deli", label: "Deli" },
];

interface LogMessage {
  id: number;
  message: string;
  type: "info" | "success" | "warning" | "error";
  timestamp: Date;
}

export function ScraperPanel() {
  const {
    isScraping,
    scrapeProgress,
    scrapeResult,
    startScraping,
    updateProgress,
    setScrapeResult,
    stopScraping,
  } = useAppStore();

  const [source, setSource] = useState("socrata-chicago-food");
  const [maxRecords, setMaxRecords] = useState(1000);
  const [city, setCity] = useState("CHICAGO");
  const [facilityType, setFacilityType] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [logs, setLogs] = useState<LogMessage[]>([]);

  const addLog = useCallback((message: string, type: LogMessage["type"] = "info") => {
    setLogs((prev) => [
      ...prev,
      {
        id: Date.now(),
        message,
        type,
        timestamp: new Date(),
      },
    ]);
  }, []);

  const handleStartScraping = async () => {
    if (!campaignName.trim()) {
      toast.error("Please enter a campaign name");
      return;
    }

    startScraping();
    setLogs([]);
    addLog(`Initializing scrape for "${campaignName}"...`, "info");
    addLog(`Source: ${DATA_SOURCES.find((s) => s.value === source)?.label}`, "info");
    addLog(`Filters: City=${city}, Facility Type=${facilityType || "All"}, Max Records=${maxRecords}`, "info");

    try {
      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          maxRecords,
          filters: {
            city,
            facilityType: facilityType || undefined,
          },
          campaignName,
        }),
      });

      if (!response.ok) {
        throw new Error("Scrape request failed");
      }

      addLog("Connecting to data source...", "info");
      updateProgress({ current: 0, total: maxRecords, status: "fetching" });

      // Simulate progress updates for visual feedback
      let simulatedCurrent = 0;
      const progressInterval = setInterval(() => {
        if (simulatedCurrent >= maxRecords) {
          clearInterval(progressInterval);
          return;
        }
        const increment = Math.floor(Math.random() * Math.min(50, maxRecords - simulatedCurrent)) + 1;
        simulatedCurrent = Math.min(simulatedCurrent + increment, maxRecords);
        updateProgress({ current: simulatedCurrent, total: maxRecords, status: "fetching" });
        addLog(`Fetched ${simulatedCurrent}/${maxRecords} records...`, "info");
      }, 800);

      const data = await response.json();

      clearInterval(progressInterval);
      updateProgress({ current: data.scraped, total: data.scraped, status: "saving" });
      addLog(`Saving ${data.saved} records to database...`, "success");

      setTimeout(() => {
        setScrapeResult({
          scraped: data.scraped || 0,
          saved: data.saved || 0,
          duplicates: (data.scraped || 0) - (data.saved || 0),
        });
        addLog(`✅ Complete! Scraped ${data.scraped} records, saved ${data.saved} new leads.`, "success");
        toast.success(`Successfully scraped ${data.saved} new leads!`);
      }, 500);
    } catch (error) {
      stopScraping();
      addLog(`❌ Error: ${error instanceof Error ? error.message : "Failed to scrape"}`, "error");
      toast.error("Failed to start scraping. Please try again.");
    }
  };

  const handleStopScraping = () => {
    stopScraping();
    addLog("⏹ Scraping stopped by user.", "warning");
    toast.info("Scraping stopped.");
  };

  const progressPercent =
    scrapeProgress.total > 0
      ? Math.round((scrapeProgress.current / scrapeProgress.total) * 100)
      : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Configuration */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="lg:col-span-2"
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-lg">Scrape Configuration</CardTitle>
            </div>
            <CardDescription>
              Configure your data source and filters to harvest leads.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="source">Data Source</Label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger id="source">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {DATA_SOURCES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="campaign">Campaign Name</Label>
                <Input
                  id="campaign"
                  placeholder="e.g. Chicago Restaurants Q1"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  disabled={isScraping}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxRecords">Max Records</Label>
                <Input
                  id="maxRecords"
                  type="number"
                  min={1}
                  max={10000}
                  value={maxRecords}
                  onChange={(e) => setMaxRecords(Math.max(1, parseInt(e.target.value) || 1))}
                  disabled={isScraping}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City Filter</Label>
                <Input
                  id="city"
                  placeholder="e.g. CHICAGO"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={isScraping}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="facilityType">Facility Type</Label>
                <Select value={facilityType} onValueChange={setFacilityType}>
                  <SelectTrigger id="facilityType">
                    <SelectValue placeholder="Select facility type" />
                  </SelectTrigger>
                  <SelectContent>
                    {FACILITY_TYPES.map((ft) => (
                      <SelectItem key={ft.value} value={ft.value || "all"}>
                        {ft.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              {!isScraping ? (
                <Button
                  onClick={handleStartScraping}
                  className="bg-emerald-600 text-white shadow-md shadow-emerald-600/25 hover:bg-emerald-700"
                  size="lg"
                >
                  <Zap className="h-4 w-4" />
                  Start Harvesting
                </Button>
              ) : (
                <Button
                  onClick={handleStopScraping}
                  variant="destructive"
                  size="lg"
                >
                  <Square className="h-4 w-4" />
                  Stop
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  setCampaignName("");
                  setFacilityType("");
                  setMaxRecords(1000);
                  setCity("CHICAGO");
                }}
                disabled={isScraping}
              >
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Progress & Logs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-lg">Progress</CardTitle>
              {isScraping && (
                <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
              )}
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {scrapeProgress.status === "idle"
                    ? "Ready"
                    : scrapeProgress.status === "completed"
                      ? "Completed"
                      : scrapeProgress.status === "stopped"
                        ? "Stopped"
                        : scrapeProgress.status === "starting"
                          ? "Starting..."
                          : scrapeProgress.status === "saving"
                            ? "Saving..."
                            : "Fetching..."}
                </span>
                {scrapeProgress.total > 0 && (
                  <span className="font-mono text-sm">
                    {scrapeProgress.current.toLocaleString()} / {scrapeProgress.total.toLocaleString()}
                  </span>
                )}
              </div>
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-primary/20">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-emerald-600 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              {scrapeProgress.total > 0 && (
                <p className="text-right text-xs text-muted-foreground">
                  {progressPercent}% complete
                </p>
              )}
            </div>

            <Separator />

            {/* Quick Stats */}
            <AnimatePresence>
              {scrapeResult && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <p className="text-sm font-medium">Quick Stats</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col items-center rounded-lg border border-border/50 bg-muted/30 p-2">
                      <FileText className="mb-1 h-4 w-4 text-emerald-600" />
                      <span className="text-lg font-bold">{scrapeResult.scraped}</span>
                      <span className="text-[10px] text-muted-foreground">Scraped</span>
                    </div>
                    <div className="flex flex-col items-center rounded-lg border border-border/50 bg-muted/30 p-2">
                      <CheckCircle2 className="mb-1 h-4 w-4 text-emerald-600" />
                      <span className="text-lg font-bold">{scrapeResult.saved}</span>
                      <span className="text-[10px] text-muted-foreground">New</span>
                    </div>
                    <div className="flex flex-col items-center rounded-lg border border-border/50 bg-muted/30 p-2">
                      <Copy className="mb-1 h-4 w-4 text-amber-500" />
                      <span className="text-lg font-bold">{scrapeResult.duplicates}</span>
                      <span className="text-[10px] text-muted-foreground">Duplicates</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Separator />

            {/* Log Messages */}
            <div className="flex-1">
              <p className="mb-2 text-sm font-medium">Activity Log</p>
              <ScrollArea className="h-[180px] rounded-md border border-border/50 bg-muted/20">
                <div className="space-y-1 p-2">
                  {logs.length === 0 ? (
                    <p className="py-8 text-center text-xs text-muted-foreground">
                      No activity yet. Start a scrape to see logs.
                    </p>
                  ) : (
                    logs.map((log) => (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-start gap-2 rounded px-1.5 py-1 text-xs"
                      >
                        <Badge
                          variant="outline"
                          className={`h-4 shrink-0 border-transparent px-1 text-[9px] uppercase ${
                            log.type === "success"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : log.type === "error"
                                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                : log.type === "warning"
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                  : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {log.type === "info" ? "INFO" : log.type === "success" ? "OK" : log.type === "error" ? "ERR" : "WARN"}
                        </Badge>
                        <span className="text-muted-foreground">{log.message}</span>
                      </motion.div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
