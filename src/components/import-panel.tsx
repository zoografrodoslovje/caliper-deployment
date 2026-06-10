"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  Table,
  Loader2,
  FileUp,
  X,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table as TableUI,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface ImportResult {
  success: boolean;
  total: number;
  imported: number;
  skipped: number;
  errors: { row: number; message: string }[];
  columnsMapped: Record<string, string>;
}

interface ParsedPreview {
  headers: string[];
  rows: Record<string, string>[];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function parseCSVPreview(text: string, maxRows: number = 5): ParsedPreview {
  let cleaned = text.replace(/^\uFEFF/, "");
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    const next = cleaned[i + 1];

    if (inQuotes) {
      if (ch === '"') {
        if (next === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === "\r" && next === "\n") {
        lines.push(current);
        current = "";
        i++;
      } else if (ch === "\n" || ch === "\r") {
        lines.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  if (current.trim() !== "" || cleaned.endsWith("\n")) {
    lines.push(current);
  }

  if (lines.length < 2) return { headers: [], rows: [] };

  // Detect delimiter
  const firstLine = lines[0];
  const counts: Record<string, number> = { ",": 0, "\t": 0, ";": 0, "|": 0 };
  for (const ch of firstLine) {
    if (ch in counts) counts[ch]++;
  }
  let delimiter = ",";
  let maxCount = 0;
  for (const [ch, c] of Object.entries(counts)) {
    if (c > maxCount) {
      maxCount = c;
      delimiter = ch;
    }
  }

  function splitLine(line: string): string[] {
    const fields: string[] = [];
    let field = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      const next = line[i + 1];
      if (inQ) {
        if (ch === '"') {
          if (next === '"') {
            field += '"';
            i++;
          } else {
            inQ = false;
          }
        } else {
          field += ch;
        }
      } else {
        if (ch === '"') {
          inQ = true;
        } else if (ch === delimiter) {
          fields.push(field.trim());
          field = "";
        } else {
          field += ch;
        }
      }
    }
    fields.push(field.trim());
    return fields;
  }

  const headers = splitLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < Math.min(lines.length, maxRows + 1); i++) {
    const line = lines[i].trim();
    if (line === "") continue;
    const values = splitLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? "";
    });
    rows.push(row);
  }

  return { headers, rows };
}

function downloadSampleCSV() {
  const headers = [
    "name",
    "email",
    "phone",
    "website",
    "city",
    "state",
    "zipcode",
    "address",
    "industry",
    "description",
    "domain",
    "linkedin",
    "license",
    "risk",
  ];
  const sampleRows = [
    [
      "Acme Corp",
      "contact@acme.com",
      "+1 (555) 123-4567",
      "https://acme.com",
      "Chicago",
      "IL",
      "60601",
      "123 Main St",
      "Technology",
      "A leading tech company",
      "acme.com",
      "https://linkedin.com/company/acme",
      "LIC-001",
      "Risk 3 (Medium)",
    ],
    [
      "Global Foods Inc",
      "info@globalfoods.com",
      "+1 (555) 987-6543",
      "https://globalfoods.com",
      "New York",
      "NY",
      "10001",
      "456 Broadway",
      "Restaurant & Food Service",
      "International food distributor",
      "globalfoods.com",
      "",
      "LIC-002",
      "Risk 2 (High)",
    ],
    [
      "City Builders LLC",
      "hello@citybuilders.com",
      "+1 (555) 456-7890",
      "",
      "Los Angeles",
      "CA",
      "90001",
      "789 Sunset Blvd",
      "Construction",
      "Commercial construction",
      "",
      "",
      "LIC-003",
      "Risk 1 (Highest)",
    ],
  ];

  const csvContent = [headers.join(","), ...sampleRows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "leadharvester_sample_template.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  toast.success("Sample CSV template downloaded");
}

export function ImportPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [preview, setPreview] = useState<ParsedPreview | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((selectedFile: File) => {
    if (!selectedFile.name.endsWith(".csv") && !selectedFile.type.includes("csv") && !selectedFile.type.includes("spreadsheet") && !selectedFile.type.includes("text/plain")) {
      toast.error("Please select a CSV file");
      return;
    }

    setFile(selectedFile);
    setResult(null);
    setImportProgress(0);
    setImportStatus("");

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSVPreview(text, 5);
      setPreview(parsed);
    };
    reader.readAsText(selectedFile);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFileSelect(droppedFile);
      }
    },
    [handleFileSelect]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        handleFileSelect(selectedFile);
      }
    },
    [handleFileSelect]
  );

  const handleImport = useCallback(async () => {
    if (!file) {
      toast.error("No file selected");
      return;
    }

    setImporting(true);
    setImportProgress(0);
    setImportStatus("Uploading file...");
    setResult(null);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setImportProgress((prev) => Math.min(prev + Math.random() * 15, 90));
      }, 300);

      setImportStatus("Parsing and importing leads...");

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setImportProgress(100);

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Import failed");
      }

      const data: ImportResult = await res.json();
      setResult(data);

      if (data.success) {
        setImportStatus("Import complete!");
        toast.success(
          `Imported ${data.imported} of ${data.total} leads successfully`
        );
      }
    } catch (err) {
      setImportStatus("Import failed");
      toast.error(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setImporting(false);
    }
  }, [file]);

  const handleClear = useCallback(() => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setImportProgress(0);
    setImportStatus("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main Import Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="lg:col-span-2 space-y-6"
      >
        {/* Upload Card */}
        <Card className="glass-card card-hover-lift">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileUp className="h-5 w-5 text-emerald-600" />
                <CardTitle className="text-lg">CSV Import</CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadSampleCSV}
                className="gap-1.5"
              >
                <Download className="h-3.5 w-3.5 text-emerald-600" />
                Sample Template
              </Button>
            </div>
            <CardDescription>
              Upload a CSV file to import leads into your database. Columns are
              automatically mapped to lead fields.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all duration-300 ${
                isDragOver
                  ? "border-emerald-500 bg-emerald-50/80 dark:border-emerald-400 dark:bg-emerald-950/30"
                  : "border-border/60 hover:border-emerald-400/60 hover:bg-muted/30"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,application/vnd.ms-excel"
                onChange={handleInputChange}
                className="hidden"
              />

              <AnimatePresence mode="wait">
                {file ? (
                  <motion.div
                    key="file-info"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex flex-col items-center gap-3"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
                      <FileSpreadsheet className="h-7 w-7 text-emerald-600" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClear();
                      }}
                      className="gap-1 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3.5 w-3.5" />
                      Remove file
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="upload-prompt"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex flex-col items-center gap-3"
                  >
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-xl transition-colors duration-300 ${
                        isDragOver
                          ? "bg-emerald-200 dark:bg-emerald-800/50"
                          : "bg-muted/60 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/30"
                      }`}
                    >
                      <Upload
                        className={`h-7 w-7 transition-colors duration-300 ${
                          isDragOver
                            ? "text-emerald-600"
                            : "text-muted-foreground group-hover:text-emerald-600"
                        }`}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">
                        Drag & drop your CSV file here
                      </p>
                      <p className="text-xs text-muted-foreground">
                        or click to browse · CSV files supported
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Import Button */}
            {file && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Button
                  onClick={handleImport}
                  disabled={importing}
                  className="w-full bg-emerald-600 text-white shadow-md shadow-emerald-600/25 hover:bg-emerald-700"
                >
                  {importing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {importStatus}
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Import Leads
                    </>
                  )}
                </Button>

                {/* Progress Bar */}
                <AnimatePresence>
                  {importing && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 space-y-1.5"
                    >
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <motion.div
                          className="h-full rounded-full bg-emerald-500"
                          initial={{ width: "0%" }}
                          animate={{ width: `${importProgress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      <p className="text-center text-xs text-muted-foreground">
                        {Math.round(importProgress)}% complete
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Results Summary */}
            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Separator className="my-4" />
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Import Results</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="flex flex-col items-center rounded-lg border border-border/50 bg-muted/30 p-3">
                        <span className="text-2xl font-bold ticker">
                          {result.total}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          Total Rows
                        </span>
                      </div>
                      <div className="flex flex-col items-center rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950/30">
                        <span className="text-2xl font-bold text-emerald-600 ticker ticker-delay-1">
                          {result.imported}
                        </span>
                        <span className="text-[10px] text-emerald-600">
                          Imported
                        </span>
                      </div>
                      <div className="flex flex-col items-center rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
                        <span className="text-2xl font-bold text-amber-600 ticker ticker-delay-2">
                          {result.skipped}
                        </span>
                        <span className="text-[10px] text-amber-600">
                          Skipped
                        </span>
                      </div>
                    </div>

                    {/* Error count badge */}
                    {result.errors.length > 0 && (
                      <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-800 dark:bg-red-950/30">
                        <Badge className="gap-1 border-transparent bg-red-600 text-white">
                          <XCircle className="h-3 w-3" />
                          {result.errors.length} Error{result.errors.length !== 1 ? "s" : ""}
                        </Badge>
                        <ScrollArea className="max-h-32 flex-1">
                          <div className="space-y-1">
                            {result.errors.slice(0, 10).map((err, i) => (
                              <p key={i} className="text-xs text-red-600 dark:text-red-400">
                                Row {err.row}: {err.message}
                              </p>
                            ))}
                            {result.errors.length > 10 && (
                              <p className="text-xs text-muted-foreground">
                                ...and {result.errors.length - 10} more errors
                              </p>
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    )}

                    {/* Column Mapping */}
                    {result.columnsMapped &&
                      Object.keys(result.columnsMapped).length > 0 && (
                        <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                            <GripVertical className="h-3 w-3" />
                            Column Mapping
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(result.columnsMapped).map(
                              ([csvCol, dbField]) => (
                                <Badge
                                  key={csvCol}
                                  variant="outline"
                                  className="border-emerald-200 bg-emerald-50 text-[10px] dark:border-emerald-800 dark:bg-emerald-950/30"
                                >
                                  <span className="font-mono text-muted-foreground">
                                    {csvCol}
                                  </span>
                                  <span className="mx-1 text-muted-foreground">
                                    →
                                  </span>
                                  <span className="font-medium text-emerald-700 dark:text-emerald-400">
                                    {dbField}
                                  </span>
                                </Badge>
                              )
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* Preview Sidebar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="glass-card card-hover-lift flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Table className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-lg">CSV Preview</CardTitle>
            </div>
            <CardDescription>
              First 5 rows from the uploaded file
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {preview && preview.headers.length > 0 ? (
              <ScrollArea className="h-[480px]">
                <div className="space-y-3">
                  {/* Headers */}
                  <div className="flex flex-wrap gap-1">
                    {preview.headers.map((h) => (
                      <Badge
                        key={h}
                        variant="outline"
                        className="border-border/60 text-[10px]"
                      >
                        {h}
                      </Badge>
                    ))}
                  </div>

                  <Separator />

                  {/* Preview Table */}
                  <div className="overflow-x-auto rounded-md border">
                    <TableUI>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8 text-center text-[10px]">
                            #
                          </TableHead>
                          {preview.headers.slice(0, 4).map((h) => (
                            <TableHead
                              key={h}
                              className="text-[10px] font-medium"
                            >
                              {h}
                            </TableHead>
                          ))}
                          {preview.headers.length > 4 && (
                            <TableHead className="text-[10px]">
                              +{preview.headers.length - 4}
                            </TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview.rows.map((row, rowIdx) => (
                          <TableRow key={rowIdx}>
                            <TableCell className="text-center text-[10px] text-muted-foreground">
                              {rowIdx + 1}
                            </TableCell>
                            {preview.headers.slice(0, 4).map((h) => (
                              <TableCell
                                key={h}
                                className="max-w-[120px] truncate text-xs"
                              >
                                {row[h] || "—"}
                              </TableCell>
                            ))}
                            {preview.headers.length > 4 && (
                              <TableCell className="text-[10px] text-muted-foreground">
                                ...
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </TableUI>
                  </div>

                  {/* Mapping Summary */}
                  <div className="rounded-lg border border-border/50 bg-muted/20 p-2.5">
                    <p className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                      <AlertCircle className="h-3 w-3" />
                      {Object.keys(preview.headers).length} columns detected
                    </p>
                  </div>
                </div>
              </ScrollArea>
            ) : (
              <div className="flex h-[480px] flex-col items-center justify-center gap-3 text-muted-foreground">
                <FileSpreadsheet className="h-12 w-12 opacity-20" />
                <p className="text-xs">Upload a CSV file to preview</p>
                <p className="text-[10px]">
                  Preview shows the first 5 rows of data
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
