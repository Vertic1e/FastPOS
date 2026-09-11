import {
  Beef,
  Beer,
  CakeSlice,
  ChefHat,
  Citrus,
  Coffee,
  Cookie,
  Croissant,
  CupSoda,
  Donut,
  Egg,
  Fish,
  Flame,
  Milk,
  Pizza,
  Popcorn,
  Salad,
  Sandwich,
  Soup,
  Utensils,
  UtensilsCrossed,
  Wine,
  type LucideIcon,
} from "lucide-react";

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  "utensils-crossed": UtensilsCrossed,
  beef: Beef,
  pizza: Pizza,
  salad: Salad,
  sandwich: Sandwich,
  "cup-soda": CupSoda,
  coffee: Coffee,
  beer: Beer,
  wine: Wine,
  "cake-slice": CakeSlice,
  popcorn: Popcorn,
  soup: Soup,
  egg: Egg,
  croissant: Croissant,
  cookie: Cookie,
  milk: Milk,
  citrus: Citrus,
  flame: Flame,
  fish: Fish,
  donut: Donut,
  "chef-hat": ChefHat,
};

export const ICON_CHOICES = Object.keys(CATEGORY_ICONS);

export function CategoryIcon({
  name,
  size = 16,
  className,
}: {
  name: string | null | undefined;
  size?: number;
  className?: string;
}) {
  const Icon = CATEGORY_ICONS[name ?? ""] ?? Utensils;
  return <Icon size={size} className={className} strokeWidth={2} />;
}
