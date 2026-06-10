import { create } from "zustand";

export interface ScrapeProgress {
  current: number;
  total: number;
  status: string;
}

export interface Filters {
  search: string;
  industry: string;
  city: string;
  emailValid: string;
  domainValid: string;
  scoreFilter: string;
}

export interface Lead {
  id: string;
  externalId: string;
  name: string;
  dbaName: string;
  address: string;
  city: string;
  state: string;
  zipcode: string;
  license: string;
  facilityType: string;
  risk: string;
  inspectionDate: string;
  inspectionType: string;
  results: string;
  violations: string;
  latitude: string;
  longitude: string;
  website: string;
  email: string;
  phone: string;
  industry: string;
  description: string;
  country: string;
  domain: string;
  linkedin: string;
  tags: string;
  notes: string;
  emailValid: boolean;
  domainValid: boolean;
  mxValid: boolean;
  emailCheckedAt: string | null;
  domainCheckedAt: string | null;
  score: number;
  source: string;
  campaignId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  status: string;
  source: string;
  queryFilter: string | null;
  totalFetched: number;
  totalValid: number;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalLeads: number;
  validatedEmails: number;
  validatedDomains: number;
  unvalidatedEmails: number;
  unvalidatedDomains: number;
  leadsWithEmail: number;
  qualityScore: number;
  scoredLeads: number;
  avgScore: number;
  todayLeads: number;
  totalValidationLogs: number;
  industryDistribution: { industry: string; count: number }[];
  cityDistribution: { city: string; count: number }[];
  sourceBreakdown: { source: string; count: number }[];
  recentCampaigns: Campaign[];
}

export interface ValidationLog {
  id: string;
  type: string;
  input: string;
  isValid: boolean;
  details: string | null;
  createdAt: string;
}

export interface LeadsResponse {
  leads: Lead[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface AppState {
  // Scraper state
  isScraping: boolean;
  scrapeProgress: ScrapeProgress;
  scrapeResult: { scraped: number; saved: number; duplicates: number } | null;
  startScraping: () => void;
  updateProgress: (progress: ScrapeProgress) => void;
  setScrapeResult: (result: { scraped: number; saved: number; duplicates: number }) => void;
  stopScraping: () => void;

  // Selected leads
  selectedLeads: string[];
  toggleLeadSelection: (id: string) => void;
  selectAllLeads: (ids: string[]) => void;
  clearSelection: () => void;

  // Active tab
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // Filters
  filters: Filters;
  setFilters: (filters: Partial<Filters>) => void;
  resetFilters: () => void;

  // Sort
  sortBy: string;
  sortOrder: "asc" | "desc";
  setSort: (sortBy: string, sortOrder: "asc" | "desc") => void;

  // Pagination
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;

  // Dashboard stats
  stats: DashboardStats | null;
  setStats: (stats: DashboardStats) => void;

  // Validation logs
  validationLogs: ValidationLog[];
  addValidationLog: (log: ValidationLog) => void;
  clearValidationLogs: () => void;
}

const defaultFilters: Filters = {
  search: "",
  industry: "",
  city: "",
  emailValid: "",
  domainValid: "",
  scoreFilter: "",
};

export const useAppStore = create<AppState>((set) => ({
  // Scraper state
  isScraping: false,
  scrapeProgress: { current: 0, total: 0, status: "idle" },
  scrapeResult: null,
  startScraping: () =>
    set({
      isScraping: true,
      scrapeProgress: { current: 0, total: 0, status: "starting" },
      scrapeResult: null,
    }),
  updateProgress: (progress) =>
    set({ scrapeProgress: progress }),
  setScrapeResult: (result) =>
    set({
      isScraping: false,
      scrapeResult: result,
      scrapeProgress: { current: result.scraped, total: result.scraped, status: "completed" },
    }),
  stopScraping: () =>
    set({
      isScraping: false,
      scrapeProgress: { current: 0, total: 0, status: "stopped" },
    }),

  // Selected leads
  selectedLeads: [],
  toggleLeadSelection: (id) =>
    set((state) => ({
      selectedLeads: state.selectedLeads.includes(id)
        ? state.selectedLeads.filter((lid) => lid !== id)
        : [...state.selectedLeads, id],
    })),
  selectAllLeads: (ids) =>
    set({ selectedLeads: ids }),
  clearSelection: () => set({ selectedLeads: [] }),

  // Active tab
  activeTab: "scraper",
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Filters
  filters: defaultFilters,
  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
      page: 1,
    })),
  resetFilters: () => set({ filters: defaultFilters, page: 1 }),

  // Sort
  sortBy: "createdAt",
  sortOrder: "desc",
  setSort: (sortBy, sortOrder) => set({ sortBy, sortOrder }),

  // Pagination
  page: 1,
  pageSize: 20,
  setPage: (page) => set({ page }),
  setPageSize: (pageSize) => set({ pageSize: Math.max(1, Math.min(100, pageSize)), page: 1 }),

  // Dashboard stats
  stats: null,
  setStats: (stats) => set({ stats }),

  // Validation logs
  validationLogs: [],
  addValidationLog: (log) =>
    set((state) => ({
      validationLogs: [log, ...state.validationLogs].slice(0, 50),
    })),
  clearValidationLogs: () => set({ validationLogs: [] }),
}));
