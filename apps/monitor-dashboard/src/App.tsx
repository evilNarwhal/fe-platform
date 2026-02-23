import React, { useEffect, useState } from "react";
import { BookText, LayoutDashboard, Moon, PanelLeft, Sun } from "lucide-react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n, type Locale } from "@/i18n";
import AppSidebar from "@/components/layout/AppSidebar";
import DashboardPage from "@/pages/DashboardPage";
import SDKDocsPage from "@/pages/SDKDocsPage";

interface ThemeToggleButtonProps {
  ariaLabel: string;
}

const ThemeToggleButton: React.FC<ThemeToggleButtonProps> = ({ ariaLabel }) => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document === "undefined") return true;
    return document.documentElement.classList.contains("dark");
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  return (
    <button
      type="button"
      onClick={() => setIsDark((prev) => !prev)}
      aria-label={ariaLabel}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted/40 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground dark:border-[#3a404a] dark:bg-[#151921]/90"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
};

const App: React.FC = () => {
  const { t, locale, setLocale } = useI18n();
  const location = useLocation();
  const [appId, setAppId] = useState("blog-frontend");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const isDocsRoute = location.pathname.startsWith("/sdk-docs");
  const CurrentPageIcon = isDocsRoute ? BookText : LayoutDashboard;
  const currentPageTitle = isDocsRoute ? t("sidebar.sdkDocs") : t("nav.dashboard");

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <header className="sticky top-0 z-50 px-4 pt-4 md:px-8">
        <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center rounded-2xl border border-border/80 bg-background/95 px-3 text-foreground shadow-sm backdrop-blur md:px-4 dark:border-[#333943]/70 dark:bg-[linear-gradient(180deg,rgba(17,20,25,0.92)_0%,rgba(13,16,21,0.94)_100%)] dark:shadow-[0_10px_30px_rgba(2,6,12,0.5),inset_0_1px_0_rgba(148,163,184,0.05)]">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              aria-label={t("nav.toggleSidebar")}
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground dark:border-[#3a404a] dark:bg-[#151921]/90"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
            <div className="h-4 w-px bg-border" />
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <CurrentPageIcon className="h-4 w-4" />
              {currentPageTitle}
            </span>
          </div>

          <div className="flex flex-1 justify-center px-3">
            {isDocsRoute ? (
              <div className="inline-flex h-9 items-center rounded-xl border border-border bg-muted/40 px-3 text-xs font-semibold text-muted-foreground">
                monitor-sdk
              </div>
            ) : (
              <div className="flex w-full max-w-[220px] items-center gap-2">
                <span className="text-sm text-primary">AppId:</span>
                <Select value={appId} onValueChange={setAppId}>
                  <SelectTrigger className="h-9 rounded-xl border-border bg-background text-xs font-semibold text-foreground">
                    <SelectValue placeholder={t("common.selectAppId")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blog-frontend">blog-frontend</SelectItem>
                    <SelectItem value="monitor-web">monitor-web</SelectItem>
                    <SelectItem value="demo-app">demo-app</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Select value={locale} onValueChange={(value) => setLocale(value as Locale)}>
              <SelectTrigger className="h-8 w-[106px] rounded-lg border-border bg-muted/40 text-xs font-semibold text-foreground dark:border-[#3a404a] dark:bg-[#151921]/90">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t("locale.en")}</SelectItem>
                <SelectItem value="zh">{t("locale.zh")}</SelectItem>
              </SelectContent>
            </Select>
            <ThemeToggleButton ariaLabel={t("nav.toggleTheme")} />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1600px] gap-4 px-4 pb-8 pt-4 md:px-8">
        <AppSidebar collapsed={sidebarCollapsed} />
        <div className="min-w-0 flex-1">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage appId={appId} />} />
            <Route path="/sdk-docs" element={<SDKDocsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default App;
