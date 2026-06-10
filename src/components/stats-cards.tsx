"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Users,
  MailCheck,
  Globe,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Star,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore, type DashboardStats } from "@/lib/store";

/* ------------------------------------------------------------------ */
/*  Animated counter hook                                              */
/* ------------------------------------------------------------------ */
function useAnimatedNumber(target: number, duration = 800): number {
  const [current, setCurrent] = useState(0);

  const animate = useCallback(() => {
    if (target === 0) {
      setCurrent(0);
      return;
    }
    const steps = 30;
    const increment = target / steps;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step >= steps) {
        setCurrent(target);
        clearInterval(interval);
      } else {
        setCurrent(Math.round(increment * step));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [target, duration]);

  useEffect(() => {
    const cleanup = animate();
    return cleanup;
  }, [animate]);

  return current;
}

/* ------------------------------------------------------------------ */
/*  Sparkline mini-bars (purely visual)                                */
/* ------------------------------------------------------------------ */
function Sparkline({ heights, color = "bg-emerald-500" }: { heights: number[]; color?: string }) {
  return (
    <div className="flex items-end gap-0.5">
      {heights.map((h, i) => (
        <div
          key={i}
          className={`w-1 rounded-sm ${color}`}
          style={{ height: `${h}px` }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat Card                                                          */
/* ------------------------------------------------------------------ */
const CARD_GRADIENTS = [
  "from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30",
  "from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30",
  "from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30",
  "from-sky-50 to-blue-50 dark:from-sky-950/30 dark:to-blue-950/30",
  "from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30",
];

const SPARKLINE_HEIGHTS: number[][] = [
  [8, 14, 10, 18, 12],
  [12, 8, 16, 10, 20],
  [6, 12, 18, 14, 10],
  [10, 16, 12, 20, 14],
  [14, 10, 18, 8, 16],
];

const SPARKLINE_COLORS = [
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-sky-500",
  "bg-rose-500",
];

interface StatCardProps {
  title: string;
  value: string;
  numericValue: number;
  icon: React.ReactNode;
  trend?: { value: string; isUp: boolean };
  delay?: number;
  index?: number;
}

function StatCard({ title, value, numericValue, icon, trend, delay = 0, index = 0 }: StatCardProps) {
  const animatedValue = useAnimatedNumber(numericValue);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Card className={`card-hover-lift glass-card overflow-hidden transition-shadow hover:shadow-md`}>
        <CardContent className={`bg-gradient-to-br ${CARD_GRADIENTS[index % CARD_GRADIENTS.length]} p-4 sm:p-6`}>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold tabular-nums sm:text-3xl">
                {animatedValue.toLocaleString()}
              </p>
              <div className="flex items-center gap-2">
                {trend && (
                  <div className="flex items-center gap-1">
                    {trend.isUp ? (
                      <ArrowUpRight className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 text-red-500" />
                    )}
                    <span
                      className={`text-xs font-medium ${
                        trend.isUp ? "text-emerald-600" : "text-red-500"
                      }`}
                    >
                      {trend.value}
                    </span>
                  </div>
                )}
                <Sparkline heights={SPARKLINE_HEIGHTS[index % SPARKLINE_HEIGHTS.length]} color={SPARKLINE_COLORS[index % SPARKLINE_COLORS.length]} />
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 sm:h-12 sm:w-12">
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */
function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="skeleton h-4 w-24" />
            <Skeleton className="skeleton h-8 w-16" />
            <Skeleton className="skeleton h-3 w-12" />
          </div>
          <Skeleton className="skeleton h-10 w-10 rounded-lg sm:h-12 sm:w-12" />
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  StatsCards component                                               */
/* ------------------------------------------------------------------ */
export function StatsCards() {
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
        // Stats will remain null
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [setStats]);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const totalLeads = stats?.totalLeads ?? 0;
  const validEmails = stats?.validatedEmails ?? 0;
  const validDomains = stats?.validatedDomains ?? 0;
  const qualityScore = stats?.qualityScore ?? 0;
  const scoredLeads = stats?.scoredLeads ?? 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <StatCard
        title="Total Leads"
        value={totalLeads.toLocaleString()}
        numericValue={totalLeads}
        icon={<Users className="h-5 w-5 sm:h-6 sm:w-6" />}
        trend={totalLeads > 0 ? { value: "Growing", isUp: true } : undefined}
        delay={0}
        index={0}
      />
      <StatCard
        title="Valid Emails"
        value={validEmails.toLocaleString()}
        numericValue={validEmails}
        icon={<MailCheck className="h-5 w-5 sm:h-6 sm:w-6" />}
        trend={
          totalLeads > 0
            ? {
                value: `${Math.round((validEmails / Math.max(totalLeads, 1)) * 100)}% of total`,
                isUp: true,
              }
            : undefined
        }
        delay={0.05}
        index={1}
      />
      <StatCard
        title="Valid Domains"
        value={validDomains.toLocaleString()}
        numericValue={validDomains}
        icon={<Globe className="h-5 w-5 sm:h-6 sm:w-6" />}
        trend={
          totalLeads > 0
            ? {
                value: `${Math.round((validDomains / Math.max(totalLeads, 1)) * 100)}% of total`,
                isUp: true,
              }
            : undefined
        }
        delay={0.1}
        index={2}
      />
      <StatCard
        title="Quality Score"
        value={`${qualityScore}%`}
        numericValue={qualityScore}
        icon={<TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />}
        trend={
          qualityScore >= 70
            ? { value: "Excellent", isUp: true }
            : qualityScore >= 40
              ? { value: "Fair", isUp: false }
              : { value: "Needs work", isUp: false }
        }
        delay={0.15}
        index={3}
      />
      <StatCard
        title="Scored Leads"
        value={scoredLeads.toLocaleString()}
        numericValue={scoredLeads}
        icon={<Star className="h-5 w-5 sm:h-6 sm:w-6" />}
        trend={scoredLeads > 0 ? { value: "Active", isUp: true } : undefined}
        delay={0.2}
        index={4}
      />
    </div>
  );
}