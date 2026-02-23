import React from "react";
import {
  BookText,
  type LucideIcon,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";
import { NavLink } from "react-router-dom";

import { useI18n } from "@/i18n";

interface AppSidebarProps {
  collapsed: boolean;
}

const AppSidebar: React.FC<AppSidebarProps> = ({ collapsed }) => {
  const { t } = useI18n();
  const defaultGuestAvatarUrl = "https://api.dicebear.com/9.x/thumbs/svg?seed=guest-user";

  const itemClass =
    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground";
  const navItems: Array<{ to: string; label: string; icon: LucideIcon }> = [
    { to: "/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
    { to: "/sdk-docs", label: t("sidebar.sdkDocs"), icon: BookText },
  ];

  return (
    <div
      className={`relative hidden h-[calc(100vh-6.5rem)] w-20 shrink-0 self-start lg:sticky lg:top-20 lg:block ${
        collapsed ? "z-20" : "z-[70]"
      }`}
    >
      <aside
        className={`absolute left-0 top-0 flex h-full flex-col rounded-2xl border border-border/70 bg-card/85 backdrop-blur-xl transition-[width,padding,box-shadow] duration-300 ease-out ${
          collapsed ? "z-30 w-20 p-3" : "z-[80] w-72 p-4 shadow-xl"
        }`}
      >
        <div className={`mb-4 flex items-center ${collapsed ? "justify-center" : "gap-2"}`}>
          <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-muted/45">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          {!collapsed && <span className="text-base font-semibold text-foreground">Monitor</span>}
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `${itemClass} ${isActive ? "bg-muted/60 text-foreground" : ""}`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}

        {!collapsed && (
          <div className="mt-auto border-t border-border/70 pt-4">
            <div className="flex items-center gap-2">
              <img
                src={defaultGuestAvatarUrl}
                alt="Guest avatar"
                className="h-8 w-8 rounded-full border border-border bg-muted/45 object-cover"
                loading="lazy"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{t("sidebar.accountName")}</p>
                <p className="truncate text-xs text-muted-foreground">{t("sidebar.accountEmail")}</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
};

export default AppSidebar;
