import React from "react";
import { Moon, Sun, LayoutGrid, Grid3X3 } from "lucide-react";
import type { AccessibilitySettings, FontSizeScale } from "@/types";
import type { ThemeMode } from "@/lib/theme";
import { Segmented } from "@/components/ui";

interface DisplayOptionsProps {
  theme: ThemeMode;
  accessibility: AccessibilitySettings;
  onChangeTheme: (mode: ThemeMode) => void;
  onChangeDensity: (cols: 2 | 3) => void;
  onChangeFontSize: (size: FontSizeScale) => void;
  compact?: boolean;
}

/** Theme / density / text-size controls. Reused in the More sheet, the rail popover and Settings. */
export const DisplayOptions: React.FC<DisplayOptionsProps> = ({
  theme,
  accessibility,
  onChangeTheme,
  onChangeDensity,
  onChangeFontSize,
  compact = false,
}) => {
  const Row: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
    <div className={compact ? "flex flex-col gap-1.5" : "flex flex-col gap-2"}>
      <div>
        <span className="text-sm font-semibold text-fg">{label}</span>
        {hint && !compact && <p className="text-xs text-fg-subtle">{hint}</p>}
      </div>
      {children}
    </div>
  );

  return (
    <div className={compact ? "flex flex-col gap-3" : "flex flex-col gap-4"}>
      <Row label="Appearance" hint="Light works better in bright daylight; dark is easier on the eyes at night.">
        <Segmented<ThemeMode>
          fullWidth
          aria-label="Theme"
          value={theme}
          onChange={onChangeTheme}
          options={[
            { value: "dark", label: "Dark", icon: <Moon /> },
            { value: "light", label: "Light", icon: <Sun /> },
          ]}
        />
      </Row>

      <Row label="Item grid" hint="Comfortable shows bigger tap targets and photos; compact fits more items per screen.">
        <Segmented<"2" | "3">
          fullWidth
          aria-label="Grid density"
          value={String(accessibility.gridCols) as "2" | "3"}
          onChange={(v) => onChangeDensity(v === "3" ? 3 : 2)}
          options={[
            { value: "2", label: "Comfortable", icon: <LayoutGrid /> },
            { value: "3", label: "Compact", icon: <Grid3X3 /> },
          ]}
        />
      </Row>

      <Row label="Text size" hint="Scales the whole interface, including buttons.">
        <Segmented<FontSizeScale>
          fullWidth
          aria-label="Text size"
          value={accessibility.fontSize}
          onChange={onChangeFontSize}
          options={[
            { value: "normal", label: <span className="text-sm">A · Normal</span>, shortLabel: <span className="text-sm">A</span> },
            { value: "large", label: <span className="text-base">A · Large</span>, shortLabel: <span className="text-base">A+</span> },
            { value: "xlarge", label: <span className="text-lg">A · Extra</span>, shortLabel: <span className="text-lg">A++</span> },
          ]}
        />
      </Row>
    </div>
  );
};
