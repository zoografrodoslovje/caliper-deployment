"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Calculator,
  Trophy,
  Target,
  TrendingUp,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { toast } from "sonner";

interface TopLead {
  id: string;
  name: string;
  email: string;
  domain: string;
  industry: string;
  city: string;
  score: number;
}

interface ScoreStats {
  scoredLeads: number;
  avgScore: number;
}

interface ScoreBreakdown {
  base: number;
  hasEmail: number;
  emailValid: number;
  hasDomain: number;
  domainValid: number;
  hasPhone: number;
  hasWebsite: number;
  hasLinkedin: number;
  hasIndustry: number;
  hasFullAddress: number;
  riskPenalty: number;
}

interface ScoreDistributionItem {
  range: string;
  count: number;
  fill: string;
}

const BREAKDOWN_LABELS: Record<string, { label: string; positive: boolean }> = {
  base: { label: "Base Score", positive: true },
  hasEmail: { label: "Has Email", positive: true },
  emailValid: { label: "Email Validated", positive: true },
  hasDomain: { label: "Has Domain", positive: true },
  domainValid: { label: "Domain Validated", positive: true },
  hasPhone: { label: "Has Phone", positive: true },
  hasWebsite: { label: "Has Website", positive: true },
  hasLinkedin: { label: "Has LinkedIn", positive: true },
  hasIndustry: { label: "Industry Known", positive: true },
  hasFullAddress: { label: "Full Address", positive: true },
  riskPenalty: { label: "Risk Penalty", positive: false },
};

const barChartConfig = {
  count: { label: "Leads", color: "hsl(160, 84%, 39%)" },
} as const;

function getScoreBadge(score: number): {
  label: string;
  className: string;
} {
  if (score >= 80) {
    return {
      label: "Excellent",
      className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    };
  }
  if (score >= 60) {
    return {
      label: "Good",
      className: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
    };
  }
  if (score >= 40) {
    return {
      label: "Fair",
      className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    };
  }
  if (score >= 20) {
    return {
      label: "Poor",
      className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    };
  }
  return {
    label: "Bad",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-teal-600";
  if (score >= 40) return "text-amber-600";
  if (score >= 20) return "text-orange-600";
  return "text-red-600";
}

function getScoreRingColor(score: number): string {
  if (score >= 80) return "stroke-emerald-500";
  if (score >= 60) return "stroke-teal-500";
  if (score >= 40) return "stroke-amber-500";
  if (score >= 20) return "stroke-orange-500";
  return "stroke-red-500";
}

function getScoreTrackColor(score: number): string {
  if (score >= 80) return "stroke-emerald-200 dark:stroke-emerald-900";
  if (score >= 60) return "stroke-teal-200 dark:stroke-teal-900";
  if (score >= 40) return "stroke-amber-200 dark:stroke-amber-900";
  if (score >= 20) return "stroke-orange-200 dark:stroke-orange-900";
  return "stroke-red-200 dark:stroke-red-900";
}

function CircularScoreIndicator({ score, size = 120 }: { score: number; size?: number }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const center = size / 2;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={8}
          className={getScoreTrackColor(score)}
        />
        {/* Progress arc */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={8}
          strokeLinecap="round"
          className={getScoreRingColor(score)}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-3xl font-bold ${getScoreColor(score)}`}>
          {score}
        </span>
        <span className="text-[10px] text-muted-foreground">avg score</span>
      </div>
    </div>
  );
}

export function ScorePanel() {
  const [scoreStats, setScoreStats] = useState<ScoreStats | null>(null);
  const [topLeads, setTopLeads] = useState<TopLead[]>([]);
  const [distribution, setDistribution] = useState<ScoreDistributionItem[]>([]);
  const [selectedLead, setSelectedLead] = useState<TopLead | null>(null);
  const [breakdown, setBreakdown] = useState<ScoreBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/stats");
      if (res.ok) {
        const data = await res.json();
        setScoreStats({
          scoredLeads: data.scoredLeads ?? 0,
          avgScore: data.avgScore ?? 0,
        });
      }
    } catch {
      // silently fail
    }
  }, []);

  const fetchTopLeads = useCallback(async () => {
    try {
      const res = await fetch(
        "/api/leads?sortBy=score&sortOrder=desc&pageSize=5"
      );
      if (res.ok) {
        const data = await res.json();
        const leads: TopLead[] = (data.leads || []).map(
          (l: Record<string, unknown>) => ({
            id: l.id as string,
            name: l.name as string,
            email: l.email as string,
            domain: l.domain as string,
            industry: l.industry as string,
            city: l.city as string,
            score: (l.score as number) ?? 0,
          })
        );
        setTopLeads(leads);

        // Compute distribution from all leads
        if (data.total > 0) {
          fetchDistribution();
        }
      }
    } catch {
      // silently fail
    }
  }, []);

  const fetchDistribution = useCallback(async () => {
    try {
      const res = await fetch("/api/leads?sortBy=score&sortOrder=desc&pageSize=1000");
      if (res.ok) {
        const data = await res.json();
        const leads = data.leads || [];
        const buckets = [0, 0, 0, 0, 0]; // 0-20, 21-40, 41-60, 61-80, 81-100
        leads.forEach((l: { score: number }) => {
          const s = l.score ?? 0;
          if (s <= 20) buckets[0]++;
          else if (s <= 40) buckets[1]++;
          else if (s <= 60) buckets[2]++;
          else if (s <= 80) buckets[3]++;
          else buckets[4]++;
        });

        const distColors = [
          "hsl(350, 89%, 60%)",  // red
          "hsl(25, 95%, 53%)",   // orange
          "hsl(38, 92%, 50%)",   // amber
          "hsl(172, 66%, 50%)",  // teal
          "hsl(160, 84%, 39%)",  // emerald
        ];

        setDistribution([
          { range: "0-20", count: buckets[0], fill: distColors[0] },
          { range: "21-40", count: buckets[1], fill: distColors[1] },
          { range: "41-60", count: buckets[2], fill: distColors[2] },
          { range: "61-80", count: buckets[3], fill: distColors[3] },
          { range: "81-100", count: buckets[4], fill: distColors[4] },
        ]);
      }
    } catch {
      // silently fail
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchTopLeads()]);
    setLoading(false);
  }, [fetchStats, fetchTopLeads]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleCalculateAll = useCallback(async () => {
    setCalculating(true);
    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "calculate_all" }),
      });
      if (!res.ok) throw new Error("Calculation failed");
      const data = await res.json();
      toast.success(`Scores calculated for ${data.totalScored} leads`);
      await fetchAll();
    } catch {
      toast.error("Failed to calculate scores");
    } finally {
      setCalculating(false);
    }
  }, [fetchAll]);

  const handleSelectLead = useCallback(async (lead: TopLead) => {
    setSelectedLead(lead);
    setBreakdown(null);
    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "calculate", leadId: lead.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setBreakdown(data.breakdown);
      }
    } catch {
      // silently fail
    }
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Score Overview & Distribution */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        {/* Score Overview Card */}
        <Card className="glass-card card-hover-lift">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                <CardTitle className="text-lg">Score Overview</CardTitle>
              </div>
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchAll}
                  disabled={loading}
                  className="gap-1"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                </Button>
                <Button
                  size="sm"
                  onClick={handleCalculateAll}
                  disabled={calculating}
                  className="gap-1.5 bg-emerald-600 text-white shadow-md shadow-emerald-600/25 hover:bg-emerald-700"
                >
                  {calculating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Calculator className="h-3.5 w-3.5" />
                  )}
                  {calculating ? "Calculating..." : "Calculate All"}
                </Button>
              </div>
            </div>
            <CardDescription>
              Lead quality scores across your database
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex flex-col items-center gap-4 py-6">
                <Skeleton className="h-[120px] w-[120px] rounded-full" />
                <Skeleton className="h-4 w-40" />
                <div className="grid w-full grid-cols-2 gap-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 py-2">
                <CircularScoreIndicator score={scoreStats?.avgScore ?? 0} />
                <div className="grid w-full grid-cols-2 gap-3">
                  <div className="flex flex-col items-center rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950/30">
                    <Trophy className="mb-1 h-4 w-4 text-emerald-600" />
                    <span className="text-lg font-bold text-emerald-600 ticker">
                      {scoreStats?.scoredLeads ?? 0}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Leads Scored
                    </span>
                  </div>
                  <div className="flex flex-col items-center rounded-lg border border-border/50 bg-muted/30 p-3">
                    <Target className="mb-1 h-4 w-4 text-muted-foreground" />
                    <span className="text-lg font-bold ticker ticker-delay-1">
                      {scoreStats?.avgScore ?? 0}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Avg Score
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Distribution Chart Card */}
        <Card className="glass-card card-hover-lift">
          <CardHeader>
            <CardTitle className="text-lg">Score Distribution</CardTitle>
            <CardDescription>
              How many leads fall into each score range
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="aspect-[4/3] w-full" />
            ) : distribution.length === 0 || distribution.every((d) => d.count === 0) ? (
              <div className="flex aspect-[4/3] items-center justify-center text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <AlertCircle className="h-8 w-8 opacity-30" />
                  <p className="text-sm">No score data yet.</p>
                  <p className="text-xs">Calculate scores to see the distribution.</p>
                </div>
              </div>
            ) : (
              <ChartContainer config={barChartConfig} className="aspect-[4/3] w-full">
                <BarChart data={distribution} barGap={4} barCategoryGap="20%">
                  <XAxis
                    dataKey="range"
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                  />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {distribution.map((entry, index) => (
                      <motion.rect
                        key={`bar-${index}`}
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        transition={{ duration: 0.6, delay: index * 0.1 }}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Top Leads Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="lg:col-span-2"
      >
        <Card className="glass-card card-hover-lift">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-lg">Top Scored Leads</CardTitle>
            </div>
            <CardDescription>
              Highest-scoring leads based on data completeness and validation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-8 w-16" />
                  </div>
                ))}
              </div>
            ) : topLeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                <Trophy className="h-10 w-10 opacity-20" />
                <p className="text-sm">No scored leads yet.</p>
                <p className="text-xs">
                  Calculate scores to see the top leads.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12 text-center">#</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="hidden sm:table-cell">Email</TableHead>
                        <TableHead className="hidden md:table-cell">Industry</TableHead>
                        <TableHead className="hidden lg:table-cell">City</TableHead>
                        <TableHead className="text-right">Score</TableHead>
                        <TableHead className="w-12" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topLeads.map((lead, idx) => {
                        const badge = getScoreBadge(lead.score);
                        return (
                          <TableRow
                            key={lead.id}
                            className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                              selectedLead?.id === lead.id
                                ? "bg-emerald-50/50 dark:bg-emerald-950/10"
                                : ""
                            }`}
                            onClick={() => handleSelectLead(lead)}
                          >
                            <TableCell className="text-center">
                              <div
                                className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                                  idx === 0
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                    : idx === 1
                                      ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                                      : idx === 2
                                        ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                                        : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {idx + 1}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              {lead.name}
                            </TableCell>
                            <TableCell className="hidden max-w-[180px] truncate text-xs sm:table-cell">
                              {lead.email || "—"}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <Badge
                                variant="outline"
                                className="border-transparent text-[10px]"
                              >
                                {lead.industry || "Unknown"}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden text-sm lg:table-cell">
                              {lead.city || "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <span
                                  className={`text-sm font-bold ${getScoreColor(lead.score)}`}
                                >
                                  {lead.score}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={`border-transparent text-[9px] ${badge.className}`}
                                >
                                  {badge.label}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Score Breakdown */}
                <AnimatePresence>
                  {selectedLead && (
                    <motion.div
                      key={selectedLead.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Separator className="my-4" />
                      <div className="space-y-3">
                        <p className="flex items-center gap-2 text-sm font-medium">
                          <Target className="h-4 w-4 text-emerald-600" />
                          Score Breakdown: {selectedLead.name}
                        </p>

                        {breakdown ? (
                          <ScrollArea className="max-h-72">
                            <div className="space-y-2">
                              {Object.entries(breakdown).map(([key, value]) => {
                                const info = BREAKDOWN_LABELS[key];
                                if (!info) return null;
                                const isPositive = info.positive;
                                const displayValue =
                                  isPositive && value > 0
                                    ? `+${value}`
                                    : !isPositive
                                      ? `${value}`
                                      : value === 0
                                        ? "+0"
                                        : `${value}`;

                                return (
                                  <div
                                    key={key}
                                    className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2"
                                  >
                                    <div className="flex items-center gap-2">
                                      {value > 0 ? (
                                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                                      ) : value < 0 ? (
                                        <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                                      ) : (
                                        <div className="h-4 w-4 shrink-0 rounded-full border border-border" />
                                      )}
                                      <span className="text-sm text-muted-foreground">
                                        {info.label}
                                      </span>
                                    </div>
                                    <span
                                      className={`text-sm font-semibold ${
                                        value > 0
                                          ? "text-emerald-600"
                                          : value < 0
                                            ? "text-red-500"
                                            : "text-muted-foreground"
                                      }`}
                                    >
                                      {displayValue}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </ScrollArea>
                        ) : (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            <span className="ml-2 text-sm text-muted-foreground">
                              Loading breakdown...
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
