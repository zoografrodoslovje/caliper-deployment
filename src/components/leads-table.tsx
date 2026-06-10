"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  Download,
  Trash2,
  CheckCircle2,
  XCircle,
  MinusCircle,
  ChevronUp,
  ChevronDown,
  Eye,
  Inbox,
  ShieldCheck,
  ArrowUpDown,
  X,
  FileJson,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useAppStore, type Lead } from "@/lib/store";
import { toast } from "sonner";

const INDUSTRY_COLORS: Record<string, string> = {
  Restaurant: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Cafe: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  Bar: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  Bakery: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  Grocery: "bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400",
  "Food Truck": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  Catering: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  Deli: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
};

function ValidationBadge({ isValid, checked }: { isValid: boolean; checked: boolean }) {
  if (!checked) {
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <MinusCircle className="h-3 w-3" />
        Unchecked
      </Badge>
    );
  }
  if (isValid) {
    return (
      <Badge className="gap-1 border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
        <CheckCircle2 className="h-3 w-3" />
        Valid
      </Badge>
    );
  }
  return (
    <Badge className="gap-1 border-transparent bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
      <XCircle className="h-3 w-3" />
      Invalid
    </Badge>
  );
}

function IndustryBadge({ industry }: { industry: string }) {
  const colorClass =
    INDUSTRY_COLORS[industry] ||
    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
  return (
    <Badge variant="outline" className={`border-transparent ${colorClass}`}>
      {industry || "Unknown"}
    </Badge>
  );
}

function LeadDetailDialog({ lead, open, onOpenChange }: { lead: Lead | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  if (!lead) return null;

  const fields = [
    { label: "Name", value: lead.name },
    { label: "DBA Name", value: lead.dbaName },
    { label: "Address", value: lead.address },
    { label: "City", value: `${lead.city}, ${lead.state} ${lead.zipcode}` },
    { label: "Country", value: lead.country },
    { label: "Email", value: lead.email },
    { label: "Phone", value: lead.phone },
    { label: "Website", value: lead.website },
    { label: "Domain", value: lead.domain },
    { label: "LinkedIn", value: lead.linkedin },
    { label: "Industry", value: lead.industry },
    { label: "Facility Type", value: lead.facilityType },
    { label: "License", value: lead.license },
    { label: "Risk Level", value: lead.risk },
    { label: "Inspection Date", value: lead.inspectionDate },
    { label: "Inspection Type", value: lead.inspectionType },
    { label: "Results", value: lead.results },
    { label: "Violations", value: lead.violations },
    { label: "Latitude", value: lead.latitude },
    { label: "Longitude", value: lead.longitude },
    { label: "Description", value: lead.description },
    { label: "Source", value: lead.source },
    { label: "Campaign ID", value: lead.campaignId },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            Lead Details
          </DialogTitle>
          <DialogDescription>
            Full information for {lead.name}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="grid gap-3 pb-4 sm:grid-cols-2">
            {fields.map((field) => (
              <div key={field.label} className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">{field.label}</p>
                {field.label === "Email" ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm break-all">{field.value || "—"}</span>
                    <ValidationBadge isValid={lead.emailValid} checked={lead.emailCheckedAt !== null} />
                  </div>
                ) : field.label === "Domain" ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm break-all">{field.value || "—"}</span>
                    <ValidationBadge isValid={lead.domainValid} checked={lead.domainCheckedAt !== null} />
                  </div>
                ) : field.label === "Industry" ? (
                  <IndustryBadge industry={field.value || "Unknown"} />
                ) : (
                  <p className="text-sm">{field.value || "—"}</p>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export function LeadsTable() {
  const {
    filters,
    setFilters,
    resetFilters,
    sortBy,
    sortOrder,
    setSort,
    page,
    pageSize,
    setPage,
    setPageSize,
    selectedLeads,
    toggleLeadSelection,
    selectAllLeads,
    clearSelection,
  } = useAppStore();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        sortBy,
        sortOrder,
      });
      if (filters.search) params.append("search", filters.search);
      if (filters.industry) params.append("industry", filters.industry);
      if (filters.city) params.append("city", filters.city);
      if (filters.emailValid) params.append("emailValid", filters.emailValid);
      if (filters.domainValid) params.append("domainValid", filters.domainValid);
      if (filters.scoreFilter) params.append("scoreFilter", filters.scoreFilter);

      const res = await fetch(`/api/leads?${params}`);
      if (!res.ok) throw new Error("Failed to fetch leads");
      const data = await res.json();
      setLeads(data.leads || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 0);
    } catch {
      setLeads([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sortBy, sortOrder, filters]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // When leads load, update selection tracking
  useEffect(() => {
    clearSelection();
  }, [page, pageSize, clearSelection]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSort(field, sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSort(field, "asc");
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedLeads.length === 0) return;
    try {
      const res = await fetch("/api/leads", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedLeads }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      const data = await res.json();
      toast.success(`Deleted ${data.deleted} leads successfully`);
      clearSelection();
      fetchLeads();
    } catch {
      toast.error("Failed to delete selected leads");
    }
  };

  const handleExport = (format: string = "csv") => {
    const params = new URLSearchParams({
      sortBy,
      sortOrder,
      format,
    });
    if (filters.search) params.append("search", filters.search);
    if (filters.industry) params.append("industry", filters.industry);
    if (filters.city) params.append("city", filters.city);
    if (filters.emailValid) params.append("emailValid", filters.emailValid);
    if (filters.domainValid) params.append("domainValid", filters.domainValid);
    if (selectedLeads.length > 0) params.append("ids", selectedLeads.join(","));

    window.open(`/api/export?${params}`, "_blank");
    toast.success(`Exporting ${format.toUpperCase()}...`);
  };

  const handleValidateSelected = async () => {
    if (selectedLeads.length === 0) {
      toast.error("No leads selected");
      return;
    }
    try {
      const selectedLeadsData = leads.filter((l) => selectedLeads.includes(l.id));
      const emails = selectedLeadsData.filter((l) => l.email).map((l) => l.email);
      const domains = selectedLeadsData.filter((l) => l.domain).map((l) => l.domain);

      for (const email of emails.slice(0, 5)) {
        await fetch("/api/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "email", input: email }),
        });
      }
      for (const domain of domains.slice(0, 5)) {
        await fetch("/api/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "domain", input: domain }),
        });
      }
      toast.success("Validation started for selected leads");
      fetchLeads();
    } catch {
      toast.error("Validation failed");
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-30" />;
    return sortOrder === "asc" ? (
      <ChevronUp className="ml-1 h-3 w-3 text-emerald-600" />
    ) : (
      <ChevronDown className="ml-1 h-3 w-3 text-emerald-600" />
    );
  };

  const paginationRange = () => {
    const range: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let i = start; i <= end; i++) {
      range.push(i);
    }
    return range;
  };

  const allOnPageSelected =
    leads.length > 0 && leads.every((l) => selectedLeads.includes(l.id));

  const handleSelectAll = () => {
    if (allOnPageSelected) {
      clearSelection();
    } else {
      selectAllLeads(leads.map((l) => l.id));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">Leads Database</CardTitle>
              <CardDescription>
                {total.toLocaleString()} leads found
                {selectedLeads.length > 0 && ` · ${selectedLeads.length} selected`}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedLeads.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleValidateSelected}
                  className="gap-1"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  Validate Selected
                </Button>
              )}
              <Select onValueChange={(v) => handleExport(v)}>
                <SelectTrigger className="h-9 w-auto gap-1.5 px-3">
                  <Download className="h-3.5 w-3.5" />
                  <SelectValue placeholder="Export" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">
                    <span className="flex items-center gap-2">
                      <Download className="h-3.5 w-3.5" />
                      Export CSV
                    </span>
                  </SelectItem>
                  <SelectItem value="json">
                    <span className="flex items-center gap-2">
                      <FileJson className="h-3.5 w-3.5" />
                      Export JSON
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              {selectedLeads.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteSelected}
                  className="gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete ({selectedLeads.length})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={filters.search}
                onChange={(e) => setFilters({ search: e.target.value })}
                className="pl-8"
              />
            </div>
            <Select
              value={filters.industry}
              onValueChange={(v) => setFilters({ industry: v === "all" ? "" : v })}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Industry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Industries</SelectItem>
                <SelectItem value="Restaurant">Restaurant</SelectItem>
                <SelectItem value="Cafe">Cafe</SelectItem>
                <SelectItem value="Bar">Bar</SelectItem>
                <SelectItem value="Bakery">Bakery</SelectItem>
                <SelectItem value="Grocery">Grocery</SelectItem>
                <SelectItem value="Food Truck">Food Truck</SelectItem>
                <SelectItem value="Catering">Catering</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="City..."
              value={filters.city}
              onChange={(e) => setFilters({ city: e.target.value })}
              className="w-[120px]"
            />
            <Select
              value={filters.emailValid}
              onValueChange={(v) => setFilters({ emailValid: v === "all" ? "" : v })}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Email" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Email</SelectItem>
                <SelectItem value="true">Valid</SelectItem>
                <SelectItem value="false">Invalid</SelectItem>
                <SelectItem value="unchecked">Unchecked</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.domainValid}
              onValueChange={(v) => setFilters({ domainValid: v === "all" ? "" : v })}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Domain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Domain</SelectItem>
                <SelectItem value="true">Valid</SelectItem>
                <SelectItem value="false">Invalid</SelectItem>
                <SelectItem value="unchecked">Unchecked</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.scoreFilter || "all"}
              onValueChange={(v) => setFilters({ scoreFilter: v === "all" ? "" : v })}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Score" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Scores</SelectItem>
                <SelectItem value="high">High (60+)</SelectItem>
                <SelectItem value="medium">Medium (40-59)</SelectItem>
                <SelectItem value="low">Low (0-39)</SelectItem>
                <SelectItem value="unscored">Unscored</SelectItem>
              </SelectContent>
            </Select>
            {(filters.search || filters.industry || filters.city || filters.emailValid || filters.domainValid || filters.scoreFilter) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={resetFilters}
                className="h-9 w-9"
                title="Clear filters"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <Separator />

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={allOnPageSelected}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort("name")}
                  >
                    <span className="flex items-center">
                      Name <SortIcon field="name" />
                    </span>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort("email")}
                  >
                    <span className="flex items-center">
                      Email <SortIcon field="email" />
                    </span>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort("domain")}
                  >
                    <span className="flex items-center">
                      Domain <SortIcon field="domain" />
                    </span>
                  </TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort("city")}
                  >
                    <span className="flex items-center">
                      City <SortIcon field="city" />
                    </span>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">Facility Type</TableHead>
                  <TableHead
                    className="hidden cursor-pointer select-none xl:table-cell"
                    onClick={() => handleSort("score")}
                  >
                    <span className="flex items-center">
                      Score <SortIcon field="score" />
                    </span>
                  </TableHead>
                  <TableHead className="hidden xl:table-cell">Tags</TableHead>
                  <TableHead className="w-[50px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-4" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-6" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : leads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                        <Inbox className="h-10 w-10 opacity-30" />
                        <p className="text-sm font-medium">No leads found</p>
                        <p className="text-xs">
                          Try adjusting your filters or scrape new leads.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  leads.map((lead) => (
                    <TableRow
                      key={lead.id}
                      className={selectedLeads.includes(lead.id) ? "bg-emerald-50/50 dark:bg-emerald-950/10" : ""}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedLeads.includes(lead.id)}
                          onCheckedChange={() => toggleLeadSelection(lead.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {lead.name}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="max-w-[180px] truncate text-xs">
                            {lead.email || "—"}
                          </span>
                          <ValidationBadge
                            isValid={lead.emailValid}
                            checked={lead.emailCheckedAt !== null}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="max-w-[150px] truncate text-xs">
                            {lead.domain || "—"}
                          </span>
                          <ValidationBadge
                            isValid={lead.domainValid}
                            checked={lead.domainCheckedAt !== null}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <IndustryBadge industry={lead.industry} />
                      </TableCell>
                      <TableCell className="text-sm">{lead.city || "—"}</TableCell>
                      <TableCell className="hidden text-sm lg:table-cell">
                        {lead.facilityType || "—"}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <Badge
                          variant="outline"
                          className={`border-transparent text-[10px] ${
                            (lead.score || 0) >= 80
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : (lead.score || 0) >= 60
                                ? "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400"
                                : (lead.score || 0) >= 40
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                  : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {lead.score || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        {lead.tags ? (
                          <div className="flex flex-wrap gap-1">
                            {lead.tags.split(",").filter(Boolean).slice(0, 3).map((tag) => (
                              <Badge
                                key={tag}
                                variant="outline"
                                className="badge-pop border-emerald-200 bg-emerald-50 text-[9px] text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400"
                              >
                                <Tag className="mr-0.5 h-2.5 w-2.5" />
                                {tag.trim()}
                              </Badge>
                            ))}
                            {lead.tags.split(",").filter(Boolean).length > 3 && (
                              <span className="text-[9px] text-muted-foreground">
                                +{lead.tags.split(",").filter(Boolean).length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/40">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setDetailLead(lead);
                            setDetailOpen(true);
                          }}
                          title="View details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                  Page {page} of {totalPages}
                </span>
                <span className="mx-1">·</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => setPageSize(parseInt(v))}
                >
                  <SelectTrigger className="h-7 w-[70px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span>per page</span>
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setPage(Math.max(1, page - 1))}
                      className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  {paginationRange().map((p, idx) =>
                    idx === 0 && p > 1 ? (
                      <PaginationItem key={`ellipsis-start-${p}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : idx > 0 && paginationRange()[idx - 1] < p - 1 ? (
                      <PaginationItem key={`ellipsis-${p}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={p}>
                        <PaginationLink
                          isActive={p === page}
                          onClick={() => setPage(p)}
                          className="cursor-pointer"
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  )}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      <LeadDetailDialog lead={detailLead} open={detailOpen} onOpenChange={setDetailOpen} />
    </motion.div>
  );
}
