"use client";

import { useState, useCallback } from "react";
import {
  Copy,
  GitMerge,
  Search,
  Users,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  XCircle,
  Trash2,
  ChevronRight,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface DuplicateLead {
  id: string;
  name: string;
  email: string;
  phone: string;
  domain: string;
  city: string;
  industry: string;
  score: number;
  emailValid: boolean;
  domainValid: boolean;
  source: string;
  tags: string;
  createdAt: string;
}

interface DuplicateGroup {
  id: string;
  leads: DuplicateLead[];
  matchType: string;
  matchField: string;
  matchValue: string;
  confidence: number;
}

const matchTypeColors: Record<string, string> = {
  Name: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
  "Similar Name": "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  Email: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  Domain: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  "Email Domain": "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  Phone: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",
};

function confidenceLabel(score: number): { label: string; color: string } {
  if (score >= 0.95) return { label: "Exact Match", color: "text-emerald-600 dark:text-emerald-400" };
  if (score >= 0.8) return { label: "High Confidence", color: "text-amber-600 dark:text-amber-400" };
  if (score >= 0.6) return { label: "Medium", color: "text-orange-600 dark:text-orange-400" };
  return { label: "Low", color: "text-red-600 dark:text-red-400" };
}

export function DuplicatesPanel() {
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [totalLeads, setTotalLeads] = useState(0);
  const [mergedCount, setMergedCount] = useState(0);
  const [selectedKeep, setSelectedKeep] = useState<Record<string, string>>({});
  const [mergingGroupId, setMergingGroupId] = useState<string | null>(null);

  const scanForDuplicates = useCallback(async () => {
    setIsScanning(true);
    setSelectedKeep({});
    try {
      const res = await fetch("/api/duplicates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "find" }),
      });
      const data = await res.json();
      if (data.success) {
        setGroups(data.duplicates);
        setTotalLeads(data.totalLeads);
        setHasScanned(true);
        toast.success(`Found ${data.duplicateGroups} duplicate groups across ${data.totalLeads} leads`);
      } else {
        toast.error(data.error || "Failed to scan for duplicates");
      }
    } catch {
      toast.error("Network error while scanning for duplicates");
    } finally {
      setIsScanning(false);
    }
  }, []);

  const mergeGroup = useCallback(
    async (groupId: string) => {
      const group = groups.find((g) => g.id === groupId);
      if (!group) return;

      const keepId = selectedKeep[groupId] || group.leads[0].id;
      const mergeIds = group.leads.filter((l) => l.id !== keepId).map((l) => l.id);

      if (mergeIds.length === 0) {
        toast.info("No leads to merge");
        return;
      }

      setMergingGroupId(groupId);
      try {
        const res = await fetch("/api/duplicates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "merge", keepId, mergeIds }),
        });
        const data = await res.json();
        if (data.success) {
          setGroups((prev) => prev.filter((g) => g.id !== groupId));
          setMergedCount((prev) => prev + data.mergedCount);
          toast.success(`Merged ${data.mergedCount} lead(s) successfully`);
        } else {
          toast.error(data.error || "Failed to merge leads");
        }
      } catch {
        toast.error("Network error while merging leads");
      } finally {
        setMergingGroupId(null);
      }
    },
    [groups, selectedKeep]
  );

  const selectKeep = (groupId: string, leadId: string) => {
    setSelectedKeep((prev) => ({ ...prev, [groupId]: leadId }));
  };

  const totalDuplicateLeads = groups.reduce((sum, g) => sum + g.leads.length, 0);
  const potentialMerges = groups.length;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left: Main duplicate detection panel */}
      <div className="lg:col-span-2 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="glass-card border-emerald-200/50 dark:border-emerald-800/30">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm shadow-emerald-600/25">
                  <GitMerge className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Duplicate Detection</CardTitle>
                  <CardDescription>
                    Find and merge duplicate leads in your database.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={scanForDuplicates}
                  disabled={isScanning}
                  className="bg-emerald-600 text-white shadow-md shadow-emerald-600/25 hover:bg-emerald-700"
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Scan for Duplicates
                    </>
                  )}
                </Button>
                {hasScanned && (
                  <Badge variant="outline" className="border-emerald-300 dark:border-emerald-700">
                    <Users className="mr-1 h-3 w-3" />
                    {totalLeads} leads scanned
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Loading skeleton */}
        {isScanning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {[1, 2].map((i) => (
              <Card key={i} className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                  {[1, 2].map((j) => (
                    <div key={j} className="flex items-center gap-3 mb-2 p-2 rounded-lg bg-muted/30">
                      <Skeleton className="h-8 w-8 rounded" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </motion.div>
        )}

        {/* Results */}
        <AnimatePresence mode="popLayout">
          {!isScanning && groups.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {groups.map((group, idx) => {
                const conf = confidenceLabel(group.confidence);
                const keepId = selectedKeep[group.id] || group.leads[0].id;

                return (
                  <motion.div
                    key={group.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.05, duration: 0.3 }}
                  >
                    <Card className="glass-card card-hover-lift overflow-hidden">
                      <CardContent className="p-4">
                        {/* Group header */}
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <Badge className={matchTypeColors[group.matchType] || "bg-gray-100 text-gray-800"}>
                            {group.matchType}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {group.leads.length} leads
                          </span>
                          <span className={`text-xs font-medium ${conf.color}`}>
                            {conf.label} ({Math.round(group.confidence * 100)}%)
                          </span>
                          <div className="ml-auto">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => mergeGroup(group.id)}
                              disabled={mergingGroupId === group.id}
                              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950"
                            >
                              {mergingGroupId === group.id ? (
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              ) : (
                                <GitMerge className="mr-1 h-3 w-3" />
                              )}
                              Merge All
                            </Button>
                          </div>
                        </div>

                        {/* Lead cards */}
                        <div className="space-y-2">
                          {group.leads.map((lead) => {
                            const isKept = lead.id === keepId;
                            return (
                              <motion.div
                                key={lead.id}
                                layout
                                className={`flex items-center gap-3 rounded-lg border p-3 transition-colors cursor-pointer ${
                                  isKept
                                    ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-700 dark:bg-emerald-950/30"
                                    : "border-border/50 bg-muted/20 hover:bg-muted/40"
                                }`}
                                onClick={() => selectKeep(group.id, lead.id)}
                              >
                                {/* Radio-like indicator */}
                                <div
                                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                                    isKept
                                      ? "border-emerald-500 bg-emerald-500"
                                      : "border-muted-foreground/30"
                                  }`}
                                >
                                  {isKept && <CheckCircle2 className="h-4 w-4 text-white" />}
                                </div>

                                {/* Lead info */}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="truncate text-sm font-medium">
                                      {lead.name || "Unnamed"}
                                    </span>
                                    {isKept && (
                                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                        KEEP
                                      </Badge>
                                    )}
                                    {lead.score > 0 && (
                                      <Badge
                                        variant="outline"
                                        className={`text-[10px] px-1.5 py-0 ${
                                          lead.score >= 60
                                            ? "border-emerald-300 text-emerald-600"
                                            : lead.score >= 40
                                            ? "border-amber-300 text-amber-600"
                                            : "border-red-300 text-red-600"
                                        }`}
                                      >
                                        {lead.score}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-xs text-muted-foreground">
                                    {lead.email && (
                                      <span className="flex items-center gap-1">
                                        <Copy className="h-3 w-3" />
                                        {lead.email}
                                      </span>
                                    )}
                                    {lead.phone && (
                                      <span>{lead.phone}</span>
                                    )}
                                    {lead.city && (
                                      <span>{lead.city}</span>
                                    )}
                                    {lead.domain && (
                                      <span className="text-emerald-600 dark:text-emerald-400">
                                        {lead.domain}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                              </motion.div>
                            );
                          })}
                        </div>

                        {/* Match value */}
                        <div className="mt-3 rounded-md bg-muted/30 px-3 py-1.5">
                          <span className="text-xs text-muted-foreground">
                            Matching on{" "}
                            <span className="font-medium text-foreground">
                              {group.matchField}
                            </span>
                            : &quot;{group.matchValue}&quot;
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {!isScanning && hasScanned && groups.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="glass-card">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">No Duplicates Found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your database looks clean! No duplicate leads were detected.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Initial state */}
        {!isScanning && !hasScanned && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="glass-card">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">Ready to Scan</h3>
                <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
                  Click &quot;Scan for Duplicates&quot; to analyze your leads database for
                  potential duplicates based on name, email, domain, and phone matching.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Right: Stats & tips */}
      <div className="space-y-6">
        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Duplicates Found</span>
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {groups.length}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Leads in Duplicates</span>
                <span className="text-2xl font-bold">
                  {totalDuplicateLeads}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Potential Merges</span>
                <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {potentialMerges}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Already Merged</span>
                <span className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                  {mergedCount}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Match Type Legend */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Match Types</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { type: "Name", desc: "Exact name match", color: "bg-violet-400" },
                { type: "Similar Name", desc: "Fuzzy name match", color: "bg-purple-400" },
                { type: "Email", desc: "Same email address", color: "bg-rose-400" },
                { type: "Domain", desc: "Same website domain", color: "bg-amber-400" },
                { type: "Email Domain", desc: "Same email domain", color: "bg-orange-400" },
                { type: "Phone", desc: "Same phone number", color: "bg-cyan-400" },
              ].map((item) => (
                <div key={item.type} className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                  <span className="text-sm font-medium">{item.type}</span>
                  <span className="text-xs text-muted-foreground">— {item.desc}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Merge Tips */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Merge Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Click on a lead card to select it as the one to keep. The lead with the
                  highest score is pre-selected.
                </p>
              </div>
              <div className="flex gap-2">
                <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Merging keeps the best data from all leads: tags are combined, notes are
                  concatenated, and empty fields are filled.
                </p>
              </div>
              <div className="flex gap-2">
                <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  The highest score among merged leads is preserved for the kept lead.
                </p>
              </div>
              <div className="flex gap-2">
                <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Merged leads are permanently deleted. Review carefully before confirming.
                </p>
              </div>
              <div className="flex gap-2">
                <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Low-confidence matches should be reviewed manually before merging.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
