"use client";

import { useEffect, useState, useCallback } from "react";
import { useTheme } from "next-themes";
import {
  Sun, Moon, Sprout, Bell, Search, X,
  Sparkles, ChevronDown, Activity, CheckCircle2,
  AlertCircle, Info, Zap, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

// Notification interface
interface Notification {
  id: string;
  title: string;
  message: string;
  type: "success" | "warning" | "info" | "error";
  time: string;
  read: boolean;
}

// Mock notifications
const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    title: "Scrape Complete",
    message: "Chicago Food Q1 scraped 847 leads successfully.",
    type: "success",
    time: "2m ago",
    read: false,
  },
  {
    id: "2",
    title: "Validation Warning",
    message: "15 emails failed validation in recent batch.",
    type: "warning",
    time: "1h ago",
    read: false,
  },
  {
    id: "3",
    title: "System Update",
    message: "LeadHarvester v3.0 is now available with new features.",
    type: "info",
    time: "1d ago",
    read: true,
  },
];

export function Header() {
  const { theme, setTheme } = useTheme();
  const [currentTime, setCurrentTime] = useState<string>("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const mounted = currentTime.length > 0;

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }) +
          " · " +
          now.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 30_000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (searchQuery.trim()) {
        // Navigate to leads tab with search
        const event = new CustomEvent("global-search", { detail: searchQuery });
        window.dispatchEvent(event);
        setShowSearch(false);
        setSearchQuery("");
      }
    },
    [searchQuery]
  );

  const notificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case "error":
        return <X className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-sky-500" />;
    }
  };

  const notifBg = (type: string) => {
    switch (type) {
      case "success":
        return "bg-emerald-50 dark:bg-emerald-950/20";
      case "warning":
        return "bg-amber-50 dark:bg-amber-950/20";
      case "error":
        return "bg-red-50 dark:bg-red-950/20";
      default:
        return "bg-sky-50 dark:bg-sky-950/20";
    }
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-header relative z-50 overflow-hidden border-b border-border/50 bg-card/80 backdrop-blur-xl"
    >
      {/* Top accent bar */}
      <div className="status-bar-gradient h-[2px]" />

      <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/5 via-transparent to-teal-600/5" />

      <div className="relative mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Left: Logo + Title */}
        <div className="flex items-center gap-3">
          <motion.div
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-600/30"
            whileHover={{ rotate: 12, scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
          >
            <Sprout className="h-5 w-5" />
          </motion.div>
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              <span className="text-gradient-emerald">LeadHarvester</span>
            </h1>
            <p className="hidden text-[10px] font-medium uppercase tracking-widest text-muted-foreground sm:block">
              Apollo-style Lead Intelligence Platform
            </p>
          </div>
        </div>

        {/* Center: Global Search (desktop only) */}
        <div className="hidden md:block">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search leads, campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-glow w-72 rounded-full border-border/50 bg-muted/50 pl-9 pr-4 text-sm transition-all focus:w-96"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <kbd className="hidden rounded border border-border/50 bg-muted/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground lg:inline-block">
                ⌘K
              </kbd>
            </div>
          </form>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Mobile search toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full md:hidden"
            onClick={() => setShowSearch(!showSearch)}
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* Date / Time */}
          {mounted && (
            <div className="hidden items-center gap-1.5 rounded-full border border-border/30 bg-muted/30 px-3 py-1 sm:flex">
              <Clock className="h-3 w-3 text-emerald-600" />
              <span className="text-xs font-medium text-muted-foreground">
                {currentTime}
              </span>
            </div>
          )}

          {/* Notification Bell */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 rounded-full"
              aria-label="Notifications"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="dot-pulse absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-rose-500 text-[10px] font-bold text-white shadow-sm">
                  {unreadCount}
                </span>
              )}
            </Button>

            {/* Notification Dropdown */}
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border/50 bg-card shadow-xl shadow-black/10"
                >
                  <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm font-semibold">Notifications</span>
                    </div>
                    {unreadCount > 0 && (
                      <Badge
                        variant="outline"
                        className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400"
                      >
                        {unreadCount} new
                      </Badge>
                    )}
                  </div>
                  <ScrollArea className="max-h-80">
                    <div className="divide-y divide-border/30">
                      {notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50 ${notifBg(notif.type)}`}
                        >
                          <div className="mt-0.5">{notificationIcon(notif.type)}</div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">{notif.title}</p>
                              {!notif.read && (
                                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                              )}
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                              {notif.message}
                            </p>
                            <p className="mt-1 text-[10px] text-muted-foreground">
                              {notif.time}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="border-t border-border/50 px-4 py-2.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs text-emerald-600 hover:text-emerald-700"
                    >
                      View all notifications
                      <ChevronDown className="ml-1 h-3 w-3 rotate-180" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-9 w-9 rounded-full"
            aria-label="Toggle theme"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
        </div>
      </div>

      {/* Mobile Search Bar */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-border/30 px-4 py-2 md:hidden"
          >
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
