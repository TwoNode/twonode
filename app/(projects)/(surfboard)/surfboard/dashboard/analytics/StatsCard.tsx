import React from 'react';
import { FiArrowUp, FiArrowDown } from 'react-icons/fi';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'teal';
}

const colorMap = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  orange: 'bg-orange-50 text-orange-600',
  red: 'bg-red-50 text-red-600',
  purple: 'bg-purple-50 text-purple-600',
  teal: 'bg-teal-50 text-teal-600',
};

export function StatsCard({ title, value, change, icon, color = 'blue' }: StatsCardProps) {
  const colorClasses = colorMap[color];
  
  return (
    <div className="bg-white dark:bg-surface rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {change !== undefined && (
            <div className={`mt-2 flex items-center text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? (
                <FiArrowUp className="mr-1" />
              ) : (
                <FiArrowDown className="mr-1" />
              )}
              {Math.abs(change)}% from last period
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full ${colorClasses} bg-opacity-50`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
