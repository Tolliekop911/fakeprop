import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "relative flex items-center gap-1 rounded-full p-1 transition-all duration-300",
        "bg-muted/50 border border-border/50"
      )}
      aria-label="Toggle theme"
    >
      <span
        className={cn(
          "flex items-center justify-center w-7 h-7 rounded-full transition-all duration-300",
          !isDark && "bg-primary text-white shadow-lg",
          isDark && "text-muted-foreground hover:bg-primary/10"
        )}
      >
        <Sun className="w-4 h-4" />
      </span>
      <span
        className={cn(
          "flex items-center justify-center w-7 h-7 rounded-full transition-all duration-300",
          isDark && "bg-primary text-white shadow-lg",
          !isDark && "text-muted-foreground hover:bg-primary/10"
        )}
      >
        <Moon className="w-4 h-4" />
      </span>
    </button>
  );
}
