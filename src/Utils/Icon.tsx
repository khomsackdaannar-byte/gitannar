import { Zap, Wrench, Scissors, Car, Smartphone, Snowflake, type LucideIcon } from "lucide-react";

// ທຽບເທົ່າ Icons.electrical_services, Icons.plumbing ... ຂອງ Flutter
const iconMap: Record<string, LucideIcon> = {
  electrical_services: Zap,
  plumbing: Wrench,
  content_cut: Scissors,
  car_repair: Car,
  phone_android: Smartphone,
  air_repair: Snowflake,
};

export function getTechIcon(name: string): LucideIcon {
  return iconMap[name] ?? Wrench;
}