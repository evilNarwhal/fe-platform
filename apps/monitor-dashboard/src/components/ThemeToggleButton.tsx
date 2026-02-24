import React, { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

interface ThemeToggleButtonProps {
  ariaLabel: string;
}

/**
 * 主题切换按钮（亮/暗）。
 * 作用：维护本地主题状态，并同步到 html 根节点的 dark class。
 * 管理范围：仅负责主题切换交互，不处理业务状态。
 */
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

export default ThemeToggleButton;

