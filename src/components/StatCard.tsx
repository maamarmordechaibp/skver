// src/components/StatCard.tsx
interface StatCardProps {
  title: string;
  value: string | number;
  color?: "blue" | "green" | "red" | "yellow" | "purple" | "orange";
  icon?: string;
  trend?: string;
}

const colorClasses = {
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  green: "bg-green-50 text-green-700 border-green-200",
  red: "bg-red-50 text-red-700 border-red-200",
  yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  orange: "bg-orange-50 text-orange-700 border-orange-200",
};

const gradients = {
  blue: "from-blue-600 to-blue-700",
  green: "from-green-600 to-green-700",
  red: "from-red-600 to-red-700",
  yellow: "from-yellow-600 to-yellow-700",
  purple: "from-purple-600 to-purple-700",
  orange: "from-orange-600 to-orange-700",
};

export default function StatCard({
  title,
  value,
  color = "blue",
  icon,
  trend,
}: StatCardProps) {
  return (
    <div className={`border rounded-lg p-6 ${colorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium opacity-75">{title}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
          {trend && (
            <p className="text-xs mt-2 opacity-75">{trend}</p>
          )}
        </div>
        {icon && <span className="text-4xl opacity-20">{icon}</span>}
      </div>
    </div>
  );
}
