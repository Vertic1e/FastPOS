export type AccentKey = "flame" | "forest" | "ocean" | "berry" | "sunset";

export const ACCENTS: Record<
  AccentKey,
  { label: string; color: string; deep: string; soft: string }
> = {
  flame: { label: "Flame", color: "#E85D26", deep: "#C94815", soft: "#FBE9E0" },
  forest: { label: "Forest", color: "#3E7C4F", deep: "#2C5E3A", soft: "#E3EFE6" },
  ocean: { label: "Ocean", color: "#0F7FA8", deep: "#0B5F7E", soft: "#E0F0F6" },
  berry: { label: "Berry", color: "#B83A6B", deep: "#962D56", soft: "#F8E4ED" },
  sunset: { label: "Sunset", color: "#C98B1B", deep: "#A67110", soft: "#F7EEDB" },
};

export function getAccent(key: string | null | undefined) {
  return ACCENTS[(key as AccentKey) ?? "flame"] ?? ACCENTS.flame;
}

export const CATEGORY_COLORS = [
  "#F59E0B",
  "#EF4444",
  "#10B981",
  "#8B5CF6",
  "#0EA5E9",
  "#EC4899",
  "#E85D26",
  "#64748B",
  "#14B8A6",
  "#FACC15",
];
