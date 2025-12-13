import React from 'react';

interface BarChartProps {
  data: Array<{
    label: string;
    value: number;
    color?: string;
  }>;
  title: string;
  subtitle?: string;
  height?: number;
  maxItems?: number;
  formatValue?: (value: number) => string;
}

export function BarChart({
  data,
  title,
  subtitle,
  height = 300,
  maxItems = 10,
  formatValue = (value) => value.toString(),
}: BarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500 mb-4">{subtitle}</p>}
        <div className="flex items-center justify-center" style={{ height }}>
          <p className="text-gray-500">No data available</p>
        </div>
      </div>
    );
  }

  // Sort and limit items
  const sortedData = [...data]
    .sort((a, b) => b.value - a.value)
    .slice(0, maxItems);

  const maxValue = Math.max(...sortedData.map((item) => item.value), 0);
  const barHeight = Math.min(300, Math.max(30, height / sortedData.length - 8));

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
      
      <div className="space-y-3">
        {sortedData.map((item, index) => {
          const width = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
          const color = item.color || getColorForIndex(index);
          
          return (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700 truncate max-w-[40%]">
                  {item.label}
                </span>
                <span className="font-medium text-gray-900">
                  {formatValue(item.value)}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${width}%`,
                    backgroundColor: color,
                    transition: 'width 0.5s ease-in-out',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Generate a color based on index
function getColorForIndex(index: number): string {
  const colors = [
    '#3b82f6', // blue-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#14b8a6', // teal-500
    '#f97316', // orange-500
    '#6366f1', // indigo-500
  ];
  
  return colors[index % colors.length];
}
