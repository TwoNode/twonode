import React from 'react';

interface BarChartProps {
  data: Array<{
    label: string;
    value: number;
    color?: string;
    // Support for multi-variable data
    subValues?: Array<{ label: string; value: number; color?: string }>;
  }>;
  title: string;
  subtitle?: string;
  height?: number;
  maxItems?: number;
  formatValue?: (value: number) => string;
  /** Rendered top-right of the header, alongside the title — e.g. a dimension toggle. */
  actions?: React.ReactNode;
  /** Whether to show as a multi-variable grouped bar chart */
  showMultiVariable?: boolean;
}

export function BarChart({
  data,
  title,
  subtitle,
  height = 300,
  maxItems = 10,
  formatValue = (value) => value.toString(),
  actions,
  showMultiVariable = false,
}: BarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 dark:bg-white/3 dark:shadow-none dark:border dark:border-white/10">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">{title}</h3>
            {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
          </div>
          {actions}
        </div>
        <div className="flex items-center justify-center" style={{ height }}>
          <p className="text-gray-500 dark:text-gray-400">No data available</p>
        </div>
      </div>
    );
  }

  // Sort and limit items
  const sortedData = [...data]
    .sort((a, b) => b.value - a.value)
    .slice(0, maxItems);

  const maxValue = Math.max(...sortedData.map((item) => item.value), 0);

  return (
    <div className="bg-white rounded-lg shadow p-6 dark:bg-white/3 dark:shadow-none dark:border dark:border-white/10">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{title}</h3>
          {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
        </div>
        {actions}
      </div>

      <div className="space-y-3" style={{ minHeight: height }}>
        {sortedData.map((item, index) => {
          const width = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
          const color = item.color || getColorForIndex(index);

          // Multi-variable histogram support
          if (showMultiVariable && item.subValues && item.subValues.length > 0) {
            const subMax = Math.max(...item.subValues.map(s => s.value), 0);
            return (
              <div key={item.label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700 truncate max-w-[40%] dark:text-gray-300">
                    {item.label}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white tabular-nums">
                    {formatValue(item.value)}
                  </span>
                </div>
                <div className="h-8 bg-gray-100 rounded-lg overflow-hidden dark:bg-white/10 flex">
                  {item.subValues.map((sub, subIndex) => {
                    const subWidth = subMax > 0 ? (sub.value / subMax) * 100 : 0;
                    const subColor = sub.color || getColorForIndex(subIndex);
                    return (
                      <div
                        key={sub.label}
                        className="h-full relative group"
                        style={{
                          width: `${subWidth}%`,
                          backgroundColor: subColor,
                          transition: 'width 0.5s ease-in-out',
                        }}
                        title={`${sub.label}: ${formatValue(sub.value)}`}
                      >
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-xs font-bold text-white drop-shadow">
                            {formatValue(sub.value)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-2 mt-1">
                  {item.subValues.map((sub, subIndex) => {
                    const subColor = sub.color || getColorForIndex(subIndex);
                    return (
                      <div key={sub.label} className="flex items-center gap-1 text-xs">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: subColor }}
                        />
                        <span className="text-gray-600 dark:text-gray-400">
                          {sub.label}: {formatValue(sub.value)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }

          // Standard single-value bar
          return (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700 truncate max-w-[40%] dark:text-gray-300">
                  {item.label}
                </span>
                <span className="font-medium text-gray-900 dark:text-white tabular-nums">
                  {formatValue(item.value)}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden dark:bg-white/10">
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
