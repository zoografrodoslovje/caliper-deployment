"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Megaphone,
  Plus,
  Trash2,
  Users,
  RefreshCw,
  Eye,
  FolderOpen,
  Calendar,
  Tag,
  FileText,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore, type Campaign } from "@/lib/store";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  completed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  paused: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CampaignsPanel() {
  const { setActiveTab } = useAppStore();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [source, setSource] = useState("socrata-chicago-food");
  const [filter, setFilter] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/campaigns");
      if (!res.ok) throw new Error("Failed to fetch campaigns");
      const data = await res.json();
      setCampaigns(data.campaigns || []);
    } catch {
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Please enter a campaign name");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          source,
          queryFilter: filter.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to create campaign");
      toast.success(`Campaign "${name}" created successfully`);
      setName("");
      setFilter("");
      setShowCreate(false);
      fetchCampaigns();
    } catch {
      toast.error("Failed to create campaign");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // Use the leads delete endpoint with campaign context or a campaign-specific endpoint
      const res = await fetch(`/api/campaigns?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete campaign");
      toast.success("Campaign deleted");
      fetchCampaigns();
    } catch {
      toast.error("Failed to delete campaign");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Campaign List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="lg:col-span-2"
      >
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-emerald-600" />
                  <CardTitle className="text-lg">Campaigns</CardTitle>
                </div>
                <CardDescription>
                  Manage your lead generation campaigns.
                </CardDescription>
              </div>
              <Button
                onClick={() => setShowCreate(!showCreate)}
                className="bg-emerald-600 text-white shadow-md shadow-emerald-600/25 hover:bg-emerald-700"
                size="sm"
              >
                <Plus className="h-4 w-4" />
                New Campaign
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-36" />
                ))}
              </div>
            ) : campaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
                <FolderOpen className="h-12 w-12 opacity-20" />
                <p className="text-sm font-medium">No campaigns yet</p>
                <p className="text-xs">
                  Create a campaign or run a scrape to get started.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {campaigns.map((campaign, index) => (
                  <motion.div
                    key={campaign.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="overflow-hidden border-border/50 transition-shadow hover:shadow-md">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-sm font-semibold">{campaign.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge
                                variant="outline"
                                className={`border-transparent text-[10px] uppercase ${STATUS_COLORS[campaign.status] || STATUS_COLORS.active}`}
                              >
                                {campaign.status}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Users className="h-3 w-3" />
                            <span>{campaign.totalFetched} leads</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <FileText className="h-3 w-3" />
                            <span>{campaign.totalValid} valid</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Tag className="h-3 w-3" />
                            <span className="truncate">{campaign.source}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(campaign.createdAt)}</span>
                          </div>
                        </div>

                        {campaign.queryFilter && (
                          <p className="text-[10px] truncate rounded bg-muted/50 px-2 py-1 font-mono text-muted-foreground">
                            Filter: {campaign.queryFilter}
                          </p>
                        )}

                        <Separator />

                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 flex-1 gap-1 text-xs"
                            onClick={() => setActiveTab("leads")}
                          >
                            <Eye className="h-3 w-3" />
                            View Leads
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 flex-1 gap-1 text-xs"
                            onClick={() => setActiveTab("scraper")}
                          >
                            <RefreshCw className="h-3 w-3" />
                            Re-scrape
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-red-500 hover:text-red-600"
                            onClick={() => handleDelete(campaign.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Create Campaign */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-lg">Create Campaign</CardTitle>
            </div>
            <CardDescription>
              Set up a new lead generation campaign.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="campaign-name">Campaign Name</Label>
              <Input
                id="campaign-name"
                placeholder="e.g. Chicago Food Q1 2025"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaign-source">Source</Label>
              <Input
                id="campaign-source"
                placeholder="e.g. socrata-chicago-food"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaign-filter">Filter (optional)</Label>
              <Input
                id="campaign-filter"
                placeholder="e.g. city=CHICAGO&facilityType=Restaurant"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
            <Button
              onClick={handleCreate}
              disabled={creating || !name.trim()}
              className="w-full bg-emerald-600 text-white shadow-md shadow-emerald-600/25 hover:bg-emerald-700"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Create Campaign
            </Button>

            <Separator />

            <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
              <p className="text-xs font-medium text-muted-foreground">Tips</p>
              <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-600">•</span>
                  Create campaigns to organize your leads.
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-600">•</span>
                  Use filters to target specific segments.
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-600">•</span>
                  Re-scrape to update existing campaigns.
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
