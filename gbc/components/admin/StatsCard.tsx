import { Card } from "@/components/ui/card";
import { Ticket, DollarSign, CheckCircle, Clock } from "lucide-react";
import { GBC_COLORS } from "@/gbc/colors";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: "ticket" | "money" | "check" | "clock";
  /** @deprecated kept for call-site compatibility -- the artifact's stat
   * cards use one uniform icon treatment (brand purple) regardless of
   * metric, not a per-card color, so this no longer changes rendering. */
  color?: "purple" | "green" | "blue" | "yellow";
}

const iconMap = {
  ticket: Ticket,
  money: DollarSign,
  check: CheckCircle,
  clock: Clock,
};

export function StatsCard({ title, value, subtitle, icon }: StatsCardProps) {
  const Icon = iconMap[icon];

  return (
    <Card className="p-6 stats-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <h3 className="text-3xl font-bold mb-1">{value}</h3>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
        <div className="p-3 rounded-lg" style={{ background: GBC_COLORS.surface.main, color: GBC_COLORS.primary.main }}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </Card>
  );
}
