"use client";

import { useEffect } from "react";
import {
  Zap, Users, Search, ShieldCheck, Megaphone, BarChart3,
  Upload, Star, GitMerge, Wrench
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppStore } from "@/lib/store";
import { Header } from "@/components/layout/header";
import { StatsCards } from "@/components/stats-cards";
import { ScraperPanel } from "@/components/scraper-panel";
import { LeadsTable } from "@/components/leads-table";
import { ValidationPanel } from "@/components/validation-panel";
import { CampaignsPanel } from "@/components/campaigns-panel";
import { DashboardCharts } from "@/components/dashboard-charts";
import { ImportPanel } from "@/components/import-panel";
import { ScorePanel } from "@/components/score-panel";
import { FinderPanel } from "@/components/finder-panel";
import { DuplicatesPanel } from "@/components/duplicates-panel";
import { ToolsPanel } from "@/components/tools-panel";

const TABS = [
  { value: "scraper", label: "Scraper", icon: Zap },
  { value: "leads", label: "Leads", icon: Users },
  { value: "finder", label: "Finder", icon: Search },
  { value: "validate", label: "Validate", icon: ShieldCheck },
  { value: "campaigns", label: "Campaigns", icon: Megaphone },
  { value: "charts", label: "Analytics", icon: BarChart3 },
  { value: "import", label: "Import", icon: Upload },
  { value: "scoring", label: "Scoring", icon: Star },
  { value: "duplicates", label: "Duplicates", icon: GitMerge },
  { value: "tools", label: "Tools", icon: Wrench },
];

export default function Home() {
  const { activeTab, setActiveTab, setFilters } = useAppStore();

  // Global search listener from header
  useEffect(() => {
    const handleGlobalSearch = (e: CustomEvent) => {
      setFilters({ search: e.detail });
      setActiveTab("leads");
    };
    window.addEventListener("global-search", handleGlobalSearch as EventListener);
    return () => window.removeEventListener("global-search", handleGlobalSearch as EventListener);
  }, [setFilters, setActiveTab]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="bg-mesh fixed inset-0 -z-10" />
      <Header />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <section className="mb-8" aria-label="Dashboard Statistics">
          <div className="rounded-xl border border-white/10 bg-background/40 p-1 backdrop-blur-sm">
            <StatsCards />
          </div>
        </section>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="glass-card overflow-x-auto p-1.5">
            <TabsList className="flex w-full justify-start gap-1.5 bg-transparent p-0">
              {TABS.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="tab-shine gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-emerald-600/25 data-[state=active]:dark:from-emerald-500 data-[state=active]:dark:to-teal-500"
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="scraper" className="mt-0">
            <ScraperPanel />
          </TabsContent>

          <TabsContent value="leads" className="mt-0">
            <LeadsTable />
          </TabsContent>

          <TabsContent value="finder" className="mt-0">
            <FinderPanel />
          </TabsContent>

          <TabsContent value="validate" className="mt-0">
            <ValidationPanel />
          </TabsContent>

          <TabsContent value="campaigns" className="mt-0">
            <CampaignsPanel />
          </TabsContent>

          <TabsContent value="charts" className="mt-0">
            <DashboardCharts />
          </TabsContent>

          <TabsContent value="import" className="mt-0">
            <ImportPanel />
          </TabsContent>

          <TabsContent value="scoring" className="mt-0">
            <ScorePanel />
          </TabsContent>

          <TabsContent value="duplicates" className="mt-0">
            <DuplicatesPanel />
          </TabsContent>

          <TabsContent value="tools" className="mt-0">
            <ToolsPanel />
          </TabsContent>
        </Tabs>
      </main>

      {/* Enhanced Footer */}
      <footer className="border-t border-border/40 bg-background/60 backdrop-blur-sm">
        <div className="status-bar-gradient h-[2px]" />
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 sm:flex-row sm:px-6 sm:py-3 lg:px-8">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
              <Zap className="h-3 w-3" />
            </div>
            <span>
              &copy; {new Date().getFullYear()} LeadHarvester. All rights reserved.
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Powered by{" "}
            <span className="font-semibold text-gradient-emerald">
              LeadHarvester AI
            </span>
          </p>
        </div>
      </footer>
    </div>
  );
}
