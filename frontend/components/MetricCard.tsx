import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendType?: 'up' | 'down' | 'neutral';
  description?: string;
}

export default function MetricCard({
  title,
  value,
  icon,
  trend,
  trendType = 'neutral',
  description,
}: MetricCardProps) {
  
  const getTrendStyle = () => {
    switch (trendType) {
      case 'up':
        return 'bg-emerald-50 text-emerald-600 border border-emerald-100';
      case 'down':
        return 'bg-rose-50 text-rose-600 border border-rose-100';
      default:
        return 'bg-zinc-50 text-zinc-600 border border-zinc-100';
    }
  };

  const getTrendIcon = () => {
    if (trendType === 'up') {
      return (
        <svg className="w-3.5 h-3.5 mr-0.5 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      );
    }
    if (trendType === 'down') {
      return (
        <svg className="w-3.5 h-3.5 mr-0.5 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-zinc-150 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-zinc-250 transition-all duration-200 flex flex-col justify-between select-none min-h-[140px]">
      <div className="flex items-start justify-between">
        {/* Metric Title & Value */}
        <div className="space-y-1">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
            {title}
          </span>
          <h2 className="text-3xl font-bold text-zinc-950 tracking-tight leading-none pt-1">
            {value}
          </h2>
        </div>

        {/* Dynamic Icon Wrapper */}
        <div className="h-10 w-10 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-500 border border-zinc-100">
          {icon}
        </div>
      </div>

      {/* Footer metadata: trend or description */}
      <div className="flex items-center justify-between mt-4">
        {trend ? (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-lg flex items-center ${getTrendStyle()}`}>
            {getTrendIcon()}
            {trend}
          </span>
        ) : (
          <span className="text-xs text-zinc-400 font-medium">No prior trend data</span>
        )}

        {description && (
          <span className="text-xs text-zinc-400 font-medium text-right truncate max-w-[150px]">
            {description}
          </span>
        )}
      </div>
    </div>
  );
}
