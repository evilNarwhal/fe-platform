import React from "react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className = "", title, action }) => {
  return (
    <Card
      className={cn(
        "rounded-3xl border-border/60 bg-card/90 backdrop-blur-xl shadow-[0_8px_32px_rgba(31,38,135,0.07)] dark:border-[#323740]/70 dark:bg-[linear-gradient(180deg,rgba(24,27,33,0.92)_0%,rgba(16,19,24,0.96)_100%)] dark:shadow-[0_14px_40px_rgba(2,6,12,0.55),inset_0_1px_0_rgba(148,163,184,0.05)]",
        className,
      )}
    >
      {(title || action) && (
        <CardHeader className="mb-0 flex-row items-center justify-between space-y-0 p-6 pb-4">
          {title ? <CardTitle className="text-lg font-semibold text-foreground/90">{title}</CardTitle> : <div />}
          {action && <div>{action}</div>}
        </CardHeader>
      )}
      <CardContent className={cn("p-6", title || action ? "pt-0" : "")}>{children}</CardContent>
    </Card>
  );
};

export default GlassCard;
