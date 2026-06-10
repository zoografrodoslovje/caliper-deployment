"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Mail,
  Users,
  Globe,
  Loader2,
  Copy,
  CheckCircle2,
  XCircle,
  Zap,
  Building2,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";

interface Prediction {
  email: string;
  pattern: string;
  confidence: "high" | "medium" | "low";
}

interface PredictResult {
  success: boolean;
  domain: string;
  domainValid: boolean | null;
  domainDetails: { valid: boolean; hasMx: boolean; hasA: boolean } | null;
  predictions: Prediction[];
  totalPatterns: number;
}

interface BulkResult {
  success: boolean;
  totalProcessed: number;
  results: Array<{
    id?: string;
    firstName: string;
    lastName: string;
    domain: string;
    predictions: Prediction[];
    totalPatterns: number;
  }>;
}

function getConfidenceBadgeClass(confidence: string) {
  switch (confidence) {
    case "high":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "medium":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-800/30 dark:text-gray-400";
  }
}

function getConfidenceLabel(confidence: string) {
  return confidence.charAt(0).toUpperCase() + confidence.slice(1);
}

export function FinderPanel() {
  const { addValidationLog } = useAppStore();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [domain, setDomain] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictResult | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [validatingEmails, setValidatingEmails] = useState<Set<string>>(new Set());
  const [validationResults, setValidationResults] = useState<
    Record<string, boolean | null>
  >({});

  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<number | null>(null);

  const handlePredict = useCallback(async () => {
    if (!firstName.trim() || !domain.trim()) {
      toast.error("First name and domain are required");
      return;
    }

    setLoading(true);
    setResult(null);
    setValidationResults({});
    setValidatingEmails(new Set());

    try {
      const res = await fetch("/api/finder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "predict",
          domain: domain.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          companyName: companyName.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Prediction failed");
      }

      const data = await res.json();
      setResult(data);
      toast.success(
        `Found ${data.totalPatterns} email patterns for ${data.domain}`
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Prediction request failed"
      );
    } finally {
      setLoading(false);
    }
  }, [firstName, lastName, domain, companyName]);

  const handleCopy = useCallback(
    async (email: string) => {
      try {
        await navigator.clipboard.writeText(email);
        setCopiedEmail(email);
        toast.success(`Copied ${email} to clipboard`);
        setTimeout(() => setCopiedEmail(null), 2000);
      } catch {
        toast.error("Failed to copy to clipboard");
      }
    },
    []
  );

  const handleValidateEmail = useCallback(
    async (email: string) => {
      if (validatingEmails.has(email)) return;

      setValidatingEmails((prev) => new Set(prev).add(email));
      setValidationResults((prev) => ({ ...prev, [email]: null }));

      try {
        const res = await fetch("/api/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "email", input: email }),
        });

        const data = await res.json();
        setValidationResults((prev) => ({ ...prev, [email]: data.isValid }));
        addValidationLog({
          id: Date.now().toString() + Math.random().toString(36).slice(2),
          type: "email",
          input: email,
          isValid: data.isValid,
          details: data.details?.message || null,
          createdAt: new Date().toISOString(),
        });
      } catch {
        setValidationResults((prev) => ({ ...prev, [email]: false }));
        toast.error(`Failed to validate ${email}`);
      } finally {
        setValidatingEmails((prev) => {
          const next = new Set(prev);
          next.delete(email);
          return next;
        });
      }
    },
    [validatingEmails, addValidationLog]
  );

  const handleBulkPredict = useCallback(async () => {
    setBulkLoading(true);
    setBulkResult(null);

    try {
      // Fetch leads from DB that have names and domains but empty emails
      const leadsRes = await fetch("/api/leads?pageSize=100&search=");
      if (!leadsRes.ok) throw new Error("Failed to fetch leads");
      const leadsData = await leadsRes.json();

      const eligibleLeads = leadsData.leads.filter(
        (lead: { name: string; domain: string; email: string }) =>
          lead.name.trim() && lead.domain.trim() && !lead.email.trim()
      );

      if (eligibleLeads.length === 0) {
        toast.info("No leads found that need email predictions");
        setBulkLoading(false);
        return;
      }

      const bulkPayload = eligibleLeads.map(
        (lead: { id: string; name: string; domain: string }) => {
          const nameParts = lead.name.trim().split(/\s+/);
          return {
            id: lead.id,
            firstName: nameParts[0] || "",
            lastName: nameParts.slice(1).join(" ") || "",
            domain: lead.domain.trim(),
          };
        }
      );

      const res = await fetch("/api/finder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulk_predict",
          leads: bulkPayload,
        }),
      });

      if (!res.ok) throw new Error("Bulk prediction failed");
      const data: BulkResult = await res.json();
      setBulkResult(data.totalProcessed);
      toast.success(
        `Generated patterns for ${data.totalProcessed} leads`
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Bulk prediction failed"
      );
    } finally {
      setBulkLoading(false);
    }
  }, []);

  const sortedPredictions = result?.predictions
    ? [...result.predictions].sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.confidence] - order[b.confidence];
      })
    : [];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left Column - Search & Predict */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="lg:col-span-2"
      >
        <Card className="glass-card card-hover-lift">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Search className="h-4 w-4 text-emerald-600" />
              </div>
              <CardTitle className="text-lg">Email Pattern Finder</CardTitle>
            </div>
            <CardDescription>
              Predict email addresses from company names, first names, and domain
              patterns.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Input Fields */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="finder-first" className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  First Name *
                </Label>
                <Input
                  id="finder-first"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="finder-last" className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  Last Name
                </Label>
                <Input
                  id="finder-last"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="finder-domain" className="flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  Domain *
                </Label>
                <Input
                  id="finder-domain"
                  placeholder="example.com"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="finder-company" className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  Company Name{" "}
                  <span className="text-xs text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="finder-company"
                  placeholder="Acme Corp"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
            </div>

            {/* Predict Button */}
            <Button
              onClick={handlePredict}
              disabled={loading || !firstName.trim() || !domain.trim()}
              className="w-full bg-emerald-600 text-white shadow-md shadow-emerald-600/25 hover:bg-emerald-700 sm:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Finding Patterns...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Find Email Patterns
                </>
              )}
            </Button>

            <Separator />

            {/* Results Area */}
            <AnimatePresence mode="wait">
              {loading && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-8 w-48" />
                </motion.div>
              )}

              {result && !loading && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  {/* Domain Status */}
                  <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{result.domain}</p>
                      {companyName && (
                        <p className="text-xs text-muted-foreground">
                          {companyName}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {result.totalPatterns} patterns
                      </Badge>
                      {result.domainValid !== null && (
                        <Badge
                          className={`border-transparent text-xs ${
                            result.domainValid
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                        >
                          {result.domainValid ? "DNS ✓" : "DNS ✗"}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Predictions Grid */}
                  <ScrollArea className="max-h-[480px]">
                    <div className="space-y-2 pr-4">
                      {sortedPredictions.map((pred) => (
                        <motion.div
                          key={pred.email}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="group flex items-center gap-3 rounded-lg border border-border/50 bg-background/50 px-4 py-3 transition-colors hover:border-emerald-200 hover:bg-emerald-50/30 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/20"
                        >
                          {/* Email */}
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="truncate font-mono text-sm">
                              {pred.email}
                            </span>
                          </div>

                          {/* Pattern Badge */}
                          <Badge
                            variant="outline"
                            className="shrink-0 text-[10px] font-mono"
                          >
                            {pred.pattern}
                          </Badge>

                          {/* Confidence Badge */}
                          <Badge
                            variant="outline"
                            className={`shrink-0 border-transparent text-[10px] ${getConfidenceBadgeClass(pred.confidence)}`}
                          >
                            {getConfidenceLabel(pred.confidence)}
                          </Badge>

                          {/* Actions */}
                          <div className="flex shrink-0 items-center gap-1">
                            {/* Validation Result */}
                            {validationResults[pred.email] === true && (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            )}
                            {validationResults[pred.email] === false && (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                            {validatingEmails.has(pred.email) && (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                            )}
                            {validationResults[pred.email] === undefined &&
                              !validatingEmails.has(pred.email) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs text-muted-foreground hover:text-emerald-600"
                                  onClick={() => handleValidateEmail(pred.email)}
                                  title="Validate email"
                                >
                                  Validate
                                </Button>
                              )}

                            {/* Copy */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => handleCopy(pred.email)}
                              title="Copy email"
                            >
                              {copiedEmail === pred.email ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>
                </motion.div>
              )}

              {/* Empty State */}
              {!result && !loading && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100/50 dark:bg-emerald-900/20">
                    <Mail className="h-8 w-8 text-emerald-600/40" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">
                      No predictions yet
                    </p>
                    <p className="text-xs">
                      Enter a name and domain to generate email pattern predictions.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* Right Column - Bulk & Tips */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="space-y-6"
      >
        {/* Bulk Predict Card */}
        <Card className="glass-card card-hover-lift">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Zap className="h-4 w-4 text-emerald-600" />
              </div>
              <CardTitle className="text-lg">Bulk Predict</CardTitle>
            </div>
            <CardDescription>
              Predict emails for all leads in your database that have names but no
              email.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleBulkPredict}
              disabled={bulkLoading}
              className="w-full bg-emerald-600 text-white shadow-md shadow-emerald-600/25 hover:bg-emerald-700"
            >
              {bulkLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Predicting...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Predict for All Leads
                </>
              )}
            </Button>

            <AnimatePresence>
              {bulkResult !== null && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <div className="flex flex-col items-center rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
                    <span className="text-2xl font-bold text-emerald-600">
                      {bulkResult}
                    </span>
                    <span className="text-xs text-emerald-600/80">
                      Leads with predictions generated
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Tips Card */}
        <Card className="glass-card card-hover-lift">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Zap className="h-4 w-4 text-emerald-600" />
              </div>
              <CardTitle className="text-lg">Tips</CardTitle>
            </div>
            <CardDescription>
              Get the most out of email pattern predictions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5">
                <span className="mt-1.5 flex h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
                <span className="text-sm text-muted-foreground">
                  Most corporate emails use{" "}
                  <span className="font-medium text-foreground">
                    first.last
                  </span>{" "}
                  or{" "}
                  <span className="font-medium text-foreground">flast</span>{" "}
                  patterns
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-1.5 flex h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
                <span className="text-sm text-muted-foreground">
                  Try validating predictions before adding to campaigns
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-1.5 flex h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
                <span className="text-sm text-muted-foreground">
                  Higher confidence = more common pattern for that domain
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
