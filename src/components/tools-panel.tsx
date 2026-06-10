"use client";

import { useState, useCallback } from "react";
import {
  GitMerge,
  Mail,
  ShieldCheck,
  Download,
  Star,
  Search,
  Loader2,
  CheckCircle2,
  Copy,
  BarChart3,
  FileDown,
  Sparkles,
  Zap,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";

interface ToolCard {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  iconGradient: string;
  action: string;
  actionLabel: string;
  actionType: "tab" | "api";
  apiEndpoint?: string;
  apiBody?: Record<string, unknown>;
}

const TOOLS: ToolCard[] = [
  {
    id: "duplicates",
    title: "Duplicate Finder",
    description:
      "Scan your entire leads database to find potential duplicates based on name, email, domain, and phone similarity. Merge duplicates to clean your data.",
    icon: GitMerge,
    iconGradient: "from-violet-500 to-purple-600",
    action: "duplicates",
    actionLabel: "Find Duplicates",
    actionType: "tab",
  },
  {
    id: "finder",
    title: "Email Finder",
    description:
      "Search and find lead information. Navigate to the scraper panel to discover new leads from various data sources and APIs.",
    icon: Mail,
    iconGradient: "from-emerald-500 to-teal-600",
    action: "scraper",
    actionLabel: "Open Scraper",
    actionType: "tab",
  },
  {
    id: "bulk-validate",
    title: "Bulk Validate",
    description:
      "Validate email addresses and domains for all unvalidated leads. Checks DNS MX/A records and email syntax for up to 500 leads at once.",
    icon: ShieldCheck,
    iconGradient: "from-amber-500 to-orange-600",
    action: "validate",
    actionLabel: "Validate All",
    actionType: "tab",
  },
  {
    id: "export",
    title: "Export All Data",
    description:
      "Download your entire leads database as a CSV file. Includes all fields, validation status, scores, tags, and notes.",
    icon: Download,
    iconGradient: "from-rose-500 to-pink-600",
    action: "/api/export",
    actionLabel: "Export CSV",
    actionType: "api",
  },
  {
    id: "score-all",
    title: "Score All Leads",
    description:
      "Calculate quality scores (0-100) for every lead based on email validity, domain validation, phone, website, LinkedIn, and completeness.",
    icon: Star,
    iconGradient: "from-cyan-500 to-blue-600",
    action: "scoring",
    actionLabel: "Score Leads",
    actionType: "tab",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

export function ToolsPanel() {
  const { setActiveTab } = useAppStore();
  const [loadingTool, setLoadingTool] = useState<string | null>(null);

  const handleToolAction = useCallback(
    async (tool: ToolCard) => {
      if (tool.actionType === "tab") {
        setActiveTab(tool.action);
        toast.success(`Navigated to ${tool.title}`);
        return;
      }

      // API action
      setLoadingTool(tool.id);
      try {
        if (tool.id === "export") {
          const res = await fetch("/api/export");
          if (!res.ok) throw new Error("Export failed");
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `leadharvester-export-${new Date().toISOString().split("T")[0]}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          toast.success("Data exported successfully!");
        } else {
          const res = await fetch(tool.action!, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(tool.apiBody || {}),
          });
          const data = await res.json();
          if (data.success) {
            toast.success(`${tool.title} completed successfully`);
          } else {
            toast.error(data.error || `${tool.title} failed`);
          }
        }
      } catch {
        toast.error(`Failed to execute ${tool.title}`);
      } finally {
        setLoadingTool(null);
      }
    },
    [setActiveTab]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="glass-card border-emerald-200/50 dark:border-emerald-800/30">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm shadow-emerald-600/25">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Toolbox</CardTitle>
                <CardDescription>
                  Quick access to powerful lead management tools and utilities.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Tool cards grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isLoading = loadingTool === tool.id;

          return (
            <motion.div key={tool.id} variants={cardVariants}>
              <Card className="glass-card card-hover-lift flex h-full flex-col overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${tool.iconGradient} shadow-sm`}
                    >
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-sm">{tool.title}</CardTitle>
                      <CardDescription className="mt-1 line-clamp-2 text-xs">
                        {tool.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="mt-auto pt-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToolAction(tool)}
                    disabled={isLoading}
                    className={`w-full ${
                      tool.actionType === "tab"
                        ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950"
                        : "border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-400 dark:hover:bg-rose-950"
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        {tool.actionType === "tab" ? (
                          <Search className="mr-1.5 h-3.5 w-3.5" />
                        ) : (
                          <FileDown className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        {tool.actionLabel}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Quick tips section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
      >
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Pro Tips
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Use <span className="font-medium text-foreground">Duplicate Finder</span> before
                running analytics to ensure clean data. Duplicates can skew your statistics.
              </p>
            </div>
            <div className="flex gap-2">
              <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Run <span className="font-medium text-foreground">Bulk Validate</span> first, then{" "}
                <span className="font-medium text-foreground">Score All Leads</span> for the most
                accurate quality scores.
              </p>
            </div>
            <div className="flex gap-2">
              <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Export your data regularly as a backup. The CSV export includes all fields,
                validation status, scores, tags, and notes.
              </p>
            </div>
            <div className="flex gap-2">
              <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Lead scoring is recalculated on demand — after bulk validation, re-score to
                capture the improved validation status.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
