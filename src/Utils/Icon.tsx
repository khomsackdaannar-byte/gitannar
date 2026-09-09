import { Zap, Wrench, Scissors, Car, Smartphone, LucideIcon } from "lucide-react";

// ທຽບເທົ່າ Icons.electrical_services, Icons.plumbing ... ຂອງ Flutter
const iconMap: Record<string, LucideIcon> = {
  electrical_services: Zap,
  plumbing: Wrench,
  content_cut: Scissors,
  car_repair: Car,
  phone_android: Smartphone,
};

export function getTechIcon(name: string): LucideIcon {
  return iconMap[name] ?? Wrench;
}