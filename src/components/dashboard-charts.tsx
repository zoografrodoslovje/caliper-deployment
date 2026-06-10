"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore, type DashboardStats } from "@/lib/store";
import { Building2, PieChart as PieChartIcon, BarChart3, Globe, Database, FileSpreadsheet } from "lucide-react";

const PIE_COLORS = [
  "hsl(160, 84%, 39%)",  // emerald-600
  "hsl(38, 92%, 50%)",   // amber-500
  "hsl(350, 89%, 60%)",  // rose-500
  "hsl(263, 70%, 50%)",  // violet-500
  "hsl(25, 95%, 53%)",   // orange-500
  "hsl(172, 66%, 50%)",  // teal-500
  "hsl(340, 82%, 52%)",  // pink-500
  "hsl(200, 98%, 39%)",  // cyan-600
  "hsl(280, 67%, 53%)",  // purple-500
  "hsl(82, 84%, 39%)",   // lime-600
];

const pieChartConfig = {
  count: { label: "Leads" },
  Restaurant: { label: "Restaurant", color: "hsl(38, 92%, 50%)" },
  Cafe: { label: "Cafe", color: "hsl(263, 70%, 50%)" },
  Bar: { label: "Bar", color: "hsl(350, 89%, 60%)" },
  Bakery: { label: "Bakery", color: "hsl(25, 95%, 53%)" },
  Grocery: { label: "Grocery", color: "hsl(82, 84%, 39%)" },
  "Food Truck": { label: "Food Truck", color: "hsl(200, 98%, 39%)" },
  Catering: { label: "Catering", color: "hsl(340, 82%, 52%)" },
  Deli: { label: "Deli", color: "hsl(172, 66%, 50%)" },
} as const;

const barChartConfig = {
  valid: { label: "Valid", color: "hsl(160, 84%, 39%)" },
  invalid: { label: "Invalid", color: "hsl(350, 89%, 60%)" },
  unchecked: { label: "Unchecked", color: "hsl(215, 20%, 65%)" },
} as const;

const CITY_BAR_COLORS = [
  "hsl(160, 84%, 39%)",
  "hsl(172, 66%, 50%)",
  "hsl(168, 76%, 42%)",
  "hsl(164, 80%, 44%)",
  "hsl(176, 60%, 48%)",
  "hsl(170, 70%, 46%)",
  "hsl(162, 82%, 40%)",
  "hsl(174, 64%, 47%)",
  "hsl(166, 78%, 43%)",
  "hsl(178, 58%, 49%)",
];

const cityChartConfig = {
  count: { label: "Leads" },
} as const;

const SOURCE_COLORS = [
  "hsl(160, 84%, 39%)",  // emerald-600
  "hsl(38, 92%, 50%)",   // amber-500
  "hsl(263, 70%, 50%)",  // violet-500
  "hsl(200, 98%, 39%)",  // cyan-600
  "hsl(25, 95%, 53%)",   // orange-500
  "hsl(340, 82%, 52%)",  // pink-500
  "hsl(82, 84%, 39%)",   // lime-600
  "hsl(280, 67%, 53%)",  // purple-500
];

const sourceChartConfig = {
  count: { label: "Leads" },
  socrata: { label: "Socrata", color: "hsl(160, 84%, 39%)" },
  csv_import: { label: "CSV Import", color: "hsl(38, 92%, 50%)" },
  manual: { label: "Manual", color: "hsl(263, 70%, 50%)" },
  api: { label: "API", color: "hsl(200, 98%, 39%)" },
} as const;

export function DashboardCharts() {
  const { stats, setStats } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/stats");
        if (res.ok) {
          const data: DashboardStats = await res.json();
          setStats(data);
        }
      } catch {
        // Stats will remain null, charts will show empty state
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [setStats]);

  const industryData = (stats?.industryDistribution || []).map((item, i) => ({
    name: item.industry,
    count: item.count,
    fill: PIE_COLORS[i % PIE_COLORS.length],
  }));

  const cityData = useMemo(() => {
    const raw = stats?.cityDistribution || [];
    return raw
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .reverse()
      .map((item, i) => ({
        city: item.city,
        count: item.count,
        fill: CITY_BAR_COLORS[i % CITY_BAR_COLORS.length],
      }));
  }, [stats?.cityDistribution]);

  const sourceData = useMemo(() => {
    const raw = stats?.sourceBreakdown || [];
    return raw.map((item, i) => ({
      name: item.source.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      source: item.source,
      count: item.count,
      fill: SOURCE_COLORS[i % SOURCE_COLORS.length],
    }));
  }, [stats?.sourceBreakdown]);

  const totalLeads = stats?.totalLeads ?? 0;
  const emailValid = stats?.validatedEmails ?? 0;
  const domainValid = stats?.validatedDomains ?? 0;
  const emailInvalid = Math.max(0, (stats?.leadsWithEmail ?? 0) - emailValid);
  const domainInvalid = Math.max(0, totalLeads - domainValid);
  const emailUnchecked = Math.max(0, totalLeads - emailValid - emailInvalid);
  const domainUnchecked = Math.max(0, totalLeads - domainValid - domainInvalid);

  const emailValidationData = [
    {
      category: "Email",
      valid: emailValid,
      invalid: emailInvalid,
      unchecked: emailUnchecked,
    },
  ];

  const domainValidationData = [
    {
      category: "Domain",
      valid: domainValid,
      invalid: domainInvalid,
      unchecked: domainUnchecked,
    },
  ];

  const totalValidation = emailValidationData.concat(domainValidationData);

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
      {/* Industry Distribution Pie Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="glass-card">
          <Card className="border-0 bg-transparent shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <PieChartIcon className="h-4 w-4 text-emerald-600" />
                Industry Distribution
              </CardTitle>
              <CardDescription>Breakdown of leads by industry type</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="aspect-[4/3] w-full" />
              ) : industryData.length === 0 ? (
                <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 text-muted-foreground">
                  <PieChartIcon className="h-8 w-8 opacity-40" />
                  <p className="text-sm">No data yet. Scrape leads to see distribution.</p>
                </div>
              ) : (
                <ChartContainer config={pieChartConfig} className="aspect-[4/3] w-full">
                  <PieChart>
                    <Pie
                      data={industryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="count"
                      nameKey="name"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                      fontSize={11}
                    >
                      {industryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} stroke="none" />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                  </PieChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Validation Status Bar Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="glass-card">
          <Card className="border-0 bg-transparent shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-4 w-4 text-emerald-600" />
                Validation Status
              </CardTitle>
              <CardDescription>Email and domain validation breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="aspect-[4/3] w-full" />
              ) : (
                <ChartContainer config={barChartConfig} className="aspect-[4/3] w-full">
                  <BarChart data={totalValidation} barGap={4} barCategoryGap="20%">
                    <XAxis dataKey="category" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                    />
                    <Bar dataKey="valid" stackId="a" fill="hsl(160, 84%, 39%)" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="invalid" stackId="a" fill="hsl(350, 89%, 60%)" />
                    <Bar dataKey="unchecked" stackId="a" fill="hsl(215, 20%, 65%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* City Distribution Bar Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <div className="glass-card">
          <Card className="border-0 bg-transparent shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-4 w-4 text-teal-600" />
                City Distribution
              </CardTitle>
              <CardDescription>Top 10 cities by lead count</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="aspect-[4/3] w-full" />
              ) : cityData.length === 0 ? (
                <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Building2 className="h-8 w-8 opacity-40" />
                  <p className="text-sm">No city data available yet.</p>
                </div>
              ) : (
                <ChartContainer config={cityChartConfig} className="aspect-[4/3] w-full">
                  <BarChart data={cityData} layout="vertical" barGap={2} barCategoryGap="20%">
                    <XAxis type="number" tickLine={false} axisLine={false} />
                    <YAxis
                      type="category"
                      dataKey="city"
                      tickLine={false}
                      axisLine={false}
                      width={80}
                      fontSize={12}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {cityData.map((entry, index) => (
                        <Cell key={`city-${index}`} fill={entry.fill} stroke="none" />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Source Breakdown Donut Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <div className="glass-card">
          <Card className="border-0 bg-transparent shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Database className="h-4 w-4 text-violet-500" />
                Source Breakdown
              </CardTitle>
              <CardDescription>Leads grouped by data source</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="aspect-[4/3] w-full" />
              ) : sourceData.length === 0 ? (
                <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Database className="h-8 w-8 opacity-40" />
                  <p className="text-sm">No source data available yet.</p>
                </div>
              ) : (
                <ChartContainer config={sourceChartConfig} className="aspect-[4/3] w-full">
                  <PieChart>
                    <Pie
                      data={sourceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={95}
                      paddingAngle={3}
                      dataKey="count"
                      nameKey="name"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                      fontSize={11}
                    >
                      {sourceData.map((entry, index) => (
                        <Cell key={`source-${index}`} fill={entry.fill} stroke="none" />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                  </PieChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}
