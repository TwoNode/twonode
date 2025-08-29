import React, { useRef, useEffect, useState } from 'react';

interface PieChartData {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieChartData[];
  title: string;
  subtitle?: string;
  height?: number;
  width?: number;
  donut?: boolean;
  donutLabel?: string;
  donutValue?: string | number;
}

export function PieChart({
  data,
  title,
  subtitle,
  height = 300,
  width = 300,
  donut = false,
  donutLabel,
  donutValue,
}: PieChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width, height });
  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const container = canvasRef.current.parentElement;
        if (container) {
          const containerWidth = container.clientWidth;
          const size = Math.min(containerWidth - 32, width); // 32px padding
          setDimensions({ width: size, height: size });
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [width, height]);

  // Draw the pie chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || total === 0) return;

    const ctx = canvas.getContext('2d');;
    if (!ctx) return;

    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const radius = Math.min(dimensions.width, dimensions.height) * 0.4;
    const innerRadius = donut ? radius * 0.6 : 0;
    
    // Set canvas dimensions
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);
    
    // Draw pie slices
    let startAngle = -Math.PI / 2; // Start from top (-90 degrees)
    
    data.forEach((item, index) => {
      const sliceAngle = (2 * Math.PI * item.value) / total;
      
      // Draw outer arc
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle, false);
      ctx.closePath();
      
      // Fill with color
      ctx.fillStyle = item.color;
      ctx.fill();
      
      // If donut, cut out the center
      if (donut) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2, false);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
      
      startAngle += sliceAngle;
    });
    
    // Add center text for donut chart
    if (donut && donutValue !== undefined) {
      ctx.fillStyle = '#1F2937'; // gray-800
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Main value
      ctx.font = 'bold 24px Inter, sans-serif';
      ctx.fillText(String(donutValue), centerX, centerY - 10);
      
      // Label
      if (donutLabel) {
        ctx.font = '12px Inter, sans-serif';
        ctx.fillStyle = '#6B7280'; // gray-500
        ctx.fillText(donutLabel, centerX, centerY + 20);
      }
    }
  }, [data, dimensions, total, donut, donutLabel, donutValue]);

  if (total === 0) {
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

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
      
      <div className="flex flex-col items-center justify-center">
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={dimensions.width}
            height={dimensions.height}
            className="w-full h-auto"
          />
        </div>
        
        <div className="mt-4 w-full">
          <div className="grid grid-cols-2 gap-2">
            {data.map((item, index) => (
              <div key={index} className="flex items-center space-x-2 text-sm">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-gray-700 truncate">{item.label}</span>
                <span className="text-gray-500 ml-auto">
                  {Math.round((item.value / total) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Generate colors for pie chart segments
export function generateColors(count: number): string[] {
  const colors = [
    '#3B82F6', // blue-500
    '#10B981', // emerald-500
    '#F59E0B', // amber-500
    '#8B5CF6', // violet-500
    '#EC4899', // pink-500
    '#14B8A6', // teal-500
    '#F97316', // orange-500
    '#6366F1', // indigo-500
    '#84CC16', // lime-500
    '#EF4444', // red-500
  ];
  
  // If we need more colors than we have defined, generate some
  if (count > colors.length) {
    const additionalColors = [];
    for (let i = colors.length; i < count; i++) {
      // Generate a random color with good contrast
      const hue = Math.floor(Math.random() * 360);
      const saturation = 70 + Math.floor(Math.random() * 30); // 70-100%
      const lightness = 40 + Math.floor(Math.random() * 30); // 40-70%
      additionalColors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
    }
    return [...colors, ...additionalColors];
  }
  
  return colors.slice(0, count);
}
