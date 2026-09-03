import { Card } from "@/components/ui/card";
import { Ticket, DollarSign, CheckCircle, Clock } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: "ticket" | "money" | "check" | "clock";
  color: "purple" | "green" | "blue" | "yellow";
}

const iconMap = {
  ticket: Ticket,
  money: DollarSign,
  check: CheckCircle,
  clock: Clock,
};

const colorMap = {
  purple: "bg-purple-100 text-purple-600",
  green: "bg-green-100 text-green-600",
  blue: "bg-blue-100 text-blue-600",
  yellow: "bg-yellow-100 text-yellow-600",
};

export function StatsCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: StatsCardProps) {
  const Icon = iconMap[icon];
  const colorClass = colorMap[color];

  return (
    <Card className="p-6 stats-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <h3 className="text-3xl font-bold mb-1">{value}</h3>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClass}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </Card>
  );
}
