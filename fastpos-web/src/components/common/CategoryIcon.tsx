import React from "react";
import {
  Coffee,
  CupSoda,
  Utensils,
  Sandwich,
  Pizza,
  Wine,
  Beer,
  Cake,
  IceCream,
  Apple,
  Cookie,
  Flame,
  Soup,
  type LucideIcon,
} from "lucide-react";

interface CategoryIconProps {
  name: string;
  className?: string;
}

const iconMap: Record<string, LucideIcon> = {
  coffee: Coffee,
  "cup-soda": CupSoda,
  croissant: Cookie,
  sandwich: Sandwich,
  utensils: Utensils,
  pizza: Pizza,
  wine: Wine,
  beer: Beer,
  cake: Cake,
  "ice-cream": IceCream,
  apple: Apple,
  cookie: Cookie,
  flame: Flame,
  soup: Soup,
};

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, className = "w-4 h-4" }) => {
  const IconComponent = iconMap[name.toLowerCase()] || Utensils;
  return <IconComponent className={className} />;
};
