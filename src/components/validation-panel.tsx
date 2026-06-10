"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Globe,
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldCheck,
  Zap,
  History,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore, type ValidationLog } from "@/lib/store";
import { toast } from "sonner";

interface ValidationResult {
  isValid: boolean;
  type: string;
  input: string;
  details: {
    syntax?: boolean;
    mx?: boolean;
    dns?: boolean;
    smtp?: boolean;
    disposable?: boolean;
    message?: string;
  };
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}

export function ValidationPanel() {
  const { validationLogs, addValidationLog, clearValidationLogs } = useAppStore();
  const [validationType, setValidationType] = useState<"email" | "domain">("email");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [bulkResult, setBulkResult] = useState<{ validated: number; valid: number; invalid: number } | null>(null);

  const handleValidate = async () => {
    if (!input.trim()) {
      toast.error("Please enter an email or domain");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: validationType,
          input: input.trim(),
        }),
      });

      if (!res.ok) throw new Error("Validation failed");
      const data = await res.json();
      setResult(data);
      addValidationLog({
        id: Date.now().toString(),
        type: validationType,
        input: input.trim(),
        isValid: data.isValid,
        details: data.details?.message || null,
        createdAt: new Date().toISOString(),
      });
    } catch {
      toast.error("Validation request failed");
      setResult({
        isValid: false,
        type: validationType,
        input: input.trim(),
        details: { message: "Validation request failed" },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkValidate = useCallback(async () => {
    setBulkLoading(true);
    setBulkProgress({ current: 0, total: 0 });
    setBulkResult(null);

    try {
      const res = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "bulk", input: {} }),
      });

      if (!res.ok) throw new Error("Bulk validation failed");
      const data = await res.json();
      setBulkResult({
        validated: data.totalChecked || 0,
        valid: data.emailValidated + data.domainValidated || 0,
        invalid: (data.totalChecked || 0) - (data.emailValidated + data.domainValidated || 0),
      });
      toast.success(`Bulk validation complete: ${data.totalChecked || 0} records checked`);
    } catch {
      toast.error("Bulk validation failed");
    } finally {
      setBulkLoading(false);
    }
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Single Validation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="lg:col-span-2"
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-lg">Single Validation</CardTitle>
            </div>
            <CardDescription>
              Validate individual email addresses or domains.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Type Toggle */}
            <div className="flex rounded-lg border border-border/50 bg-muted/30 p-1">
              <button
                className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
                  validationType === "email"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => {
                  setValidationType("email");
                  setResult(null);
                }}
              >
                <Mail className="h-4 w-4" />
                Email
              </button>
              <button
                className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
                  validationType === "domain"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => {
                  setValidationType("domain");
                  setResult(null);
                }}
              >
                <Globe className="h-4 w-4" />
                Domain
              </button>
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                {validationType === "email" ? (
                  <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                ) : (
                  <Globe className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                )}
                <Input
                  placeholder={
                    validationType === "email"
                      ? "Enter email address (e.g. test@example.com)"
                      : "Enter domain (e.g. example.com)"
                  }
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="pl-8"
                  onKeyDown={(e) => e.key === "Enter" && handleValidate()}
                />
              </div>
              <Button
                onClick={handleValidate}
                disabled={loading || !input.trim()}
                className="bg-emerald-600 text-white shadow-md shadow-emerald-600/25 hover:bg-emerald-700"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                Validate
              </Button>
            </div>

            {/* Results */}
            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-8 w-48" />
                </motion.div>
              )}
              {result && !loading && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  <div
                    className={`flex items-center gap-3 rounded-lg border p-4 ${
                      result.isValid
                        ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"
                        : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
                    }`}
                  >
                    {result.isValid ? (
                      <CheckCircle2 className="h-8 w-8 shrink-0 text-emerald-600" />
                    ) : (
                      <XCircle className="h-8 w-8 shrink-0 text-red-500" />
                    )}
                    <div>
                      <p className="font-semibold">
                        {result.isValid ? "Valid" : "Invalid"}{" "}
                        {validationType === "email" ? "Email Address" : "Domain"}
                      </p>
                      <p className="text-sm text-muted-foreground">{result.input}</p>
                    </div>
                    <Badge
                      className={`ml-auto border-transparent ${
                        result.isValid
                          ? "bg-emerald-600 text-white"
                          : "bg-red-600 text-white"
                      }`}
                    >
                      {result.isValid ? "PASS" : "FAIL"}
                    </Badge>
                  </div>

                  {result.details && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {Object.entries(result.details)
                        .filter(([key]) => key !== "message")
                        .map(([key, value]) => (
                          <div
                            key={key}
                            className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2"
                          >
                            <span className="text-sm capitalize text-muted-foreground">{key}</span>
                            {typeof value === "boolean" ? (
                              value ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )
                            ) : (
                              <span className="text-sm font-medium">{String(value)}</span>
                            )}
                          </div>
                        ))}
                      {result.details.message && (
                        <div className="rounded-md border border-border/50 px-3 py-2 sm:col-span-2">
                          <p className="text-sm">{result.details.message}</p>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <Separator />

            {/* Bulk Validation */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Bulk Validation</p>
              <p className="text-xs text-muted-foreground">
                Validate all leads&apos; emails and domains in the database.
              </p>
              <Button
                variant="outline"
                onClick={handleBulkValidate}
                disabled={bulkLoading}
                className="gap-2"
              >
                {bulkLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 text-emerald-600" />
                )}
                {bulkLoading
                  ? `Validating... ${bulkProgress.current}/${bulkProgress.total}`
                  : "Validate All Leads"}
              </Button>

              <AnimatePresence>
                {bulkResult && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="grid grid-cols-3 gap-2"
                  >
                    <div className="flex flex-col items-center rounded-lg border border-border/50 bg-muted/30 p-3">
                      <span className="text-xl font-bold">{bulkResult.validated}</span>
                      <span className="text-[10px] text-muted-foreground">Validated</span>
                    </div>
                    <div className="flex flex-col items-center rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950/30">
                      <span className="text-xl font-bold text-emerald-600">{bulkResult.valid}</span>
                      <span className="text-[10px] text-emerald-600">Valid</span>
                    </div>
                    <div className="flex flex-col items-center rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/30">
                      <span className="text-xl font-bold text-red-500">{bulkResult.invalid}</span>
                      <span className="text-[10px] text-red-500">Invalid</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Validation History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-emerald-600" />
                <CardTitle className="text-lg">History</CardTitle>
              </div>
              {validationLogs.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearValidationLogs}
                  className="h-7 text-xs text-muted-foreground"
                >
                  Clear
                </Button>
              )}
            </div>
            <CardDescription>
              Recent validation results
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <ScrollArea className="h-[400px]">
              <div className="space-y-1.5">
                {validationLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                    <Clock className="h-8 w-8 opacity-30" />
                    <p className="text-xs">No validation history yet.</p>
                    <p className="text-xs">Validate an email or domain to see results.</p>
                  </div>
                ) : (
                  validationLogs.map((log: ValidationLog) => (
                    <div
                      key={log.id}
                      className="flex items-center gap-2 rounded-md border border-border/50 px-3 py-2"
                    >
                      {log.isValid ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                      ) : (
                        <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{log.input}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {log.type === "email" ? "Email" : "Domain"} · {formatDate(log.createdAt)}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`shrink-0 border-transparent text-[9px] ${
                          log.isValid
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {log.isValid ? "VALID" : "INVALID"}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
