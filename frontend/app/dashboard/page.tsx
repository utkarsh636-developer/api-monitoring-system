'use client';

import React, { useState, useEffect } from 'react';
import { useDashboard } from './layout';
import MetricCard from '../../components/MetricCard';
import { analyticsApi, DashboardData } from '../../lib/api';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// Custom tooltip matching Image 1
interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-950/95 border border-zinc-800 rounded-xl p-3 shadow-xl text-xs font-sans min-w-[170px] select-none text-zinc-300">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2 font-medium">
          <span className="text-white text-sm font-semibold">{label}</span>
        </div>
        <div className="space-y-1.5 font-medium">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded bg-indigo-500"></span>
              <span>Requests</span>
            </div>
            <span className="font-bold text-white font-mono">{payload[0].value.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded bg-emerald-500"></span>
              <span>Latency</span>
            </div>
            <span className="font-bold text-white font-mono">{payload[1].value} ms</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function DashboardOverview() {
  const { user, selectedClientId } = useDashboard();

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'24H' | '7D' | '30D' | 'ALL'>('24H');

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      let startTime: string | undefined;
      if (timeRange === '7D') {
        startTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (timeRange === '30D') {
        startTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      } else if (timeRange === 'ALL') {
        startTime = new Date(0).toISOString();
      }

      const response = await analyticsApi.getDashboard(selectedClientId, startTime);
      if (response.success && response.data) {
        setDashboardData(response.data);
      } else {
        setError(response.message || 'Failed to fetch dashboard data');
      }
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(
        err.response?.data?.message || 
        err.message || 
        'Could not connect to the analytics server. Please verify the backend is running.'
      );
      setDashboardData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedClientId, timeRange]);

  // Color mappings matching Image 2's specific rows
  const endpointColors = [
    { solid: 'bg-cyan-500', striped: 'bg-cyan-500/20 text-cyan-500', trend: 'text-emerald-600' },
    { solid: 'bg-yellow-500', striped: 'bg-yellow-500/20 text-yellow-500', trend: 'text-emerald-600' },
    { solid: 'bg-orange-500', striped: 'bg-orange-500/20 text-orange-500', trend: 'text-rose-600' },
    { solid: 'bg-violet-600', striped: 'bg-violet-600/20 text-violet-500', trend: 'text-emerald-600' },
  ];

  // Style status codes in logs
  const getStatusColor = (errorHits: number, totalHits: number) => {
    if (totalHits === 0) return 'text-zinc-600 bg-zinc-50 border-zinc-100';
    const rate = (errorHits / totalHits) * 100;
    if (rate === 0) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    if (rate < 10) return 'text-amber-600 bg-amber-50 border-amber-100';
    return 'text-rose-600 bg-rose-50 border-rose-100';
  };

  const getStatusLabel = (errorHits: number, totalHits: number) => {
    if (errorHits === 0) return '200 OK';
    const successRate = Math.round(((totalHits - errorHits) / totalHits) * 100);
    return `${successRate}% OK`;
  };

  // Style HTTP methods in logs
  const getMethodStyle = (method: string) => {
    switch (method?.toUpperCase()) {
      case 'GET':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'POST':
        return 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20';
      case 'PUT':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      default:
        return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
    }
  };

  // Group and aggregate recentActivity by timeBucket for chart mapping
  const aggregatedChartData = React.useMemo(() => {
    if (!dashboardData?.recentActivity) return [];
    
    const buckets: Record<string, { requests: number; totalLatencyHits: number; totalLatency: number; timestamp: number }> = {};
    
    dashboardData.recentActivity.forEach((hit) => {
      const bucketTime = hit.timeBucket;
      const hits = hit.totalHits || 0;
      const lat = hit.avgLatency || 0;
      
      if (!buckets[bucketTime]) {
        buckets[bucketTime] = {
          requests: 0,
          totalLatencyHits: 0,
          totalLatency: 0,
          timestamp: new Date(bucketTime).getTime(),
        };
      }
      buckets[bucketTime].requests += hits;
      buckets[bucketTime].totalLatencyHits += hits;
      buckets[bucketTime].totalLatency += lat * hits;
    });
    
    return Object.entries(buckets)
      .map(([bucketTime, data]) => {
        const avgLat = data.totalLatencyHits > 0 
          ? Math.round(data.totalLatency / data.totalLatencyHits) 
          : 0;
        return {
          timeBucket: bucketTime,
          timestamp: data.timestamp,
          time: new Date(bucketTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          requests: data.requests,
          latency: avgLat,
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [dashboardData?.recentActivity]);

  // Compute status metrics for Pie Chart
  const statusData = React.useMemo(() => {
    if (!dashboardData?.stats) return [];
    const successCount = dashboardData.stats.successHits || 0;
    const errorCount = dashboardData.stats.errorHits || 0;
    const total = successCount + errorCount || 1;
    
    const successPercent = Math.round((successCount / total) * 100);
    const errorPercent = 100 - successPercent;
    
    return [
      { name: 'Success Hits', value: successPercent, color: '#6366f1' },
      { name: 'Error Hits', value: errorPercent, color: '#f43f5e' }
    ];
  }, [dashboardData?.stats]);

  // Max bounds for top endpoints normalization
  const maxHits = React.useMemo(() => {
    if (!dashboardData?.topEndpoints || dashboardData.topEndpoints.length === 0) return 1;
    return Math.max(...dashboardData.topEndpoints.map(e => e.totalHits || 0)) || 1;
  }, [dashboardData?.topEndpoints]);

  const maxLatency = React.useMemo(() => {
    if (!dashboardData?.topEndpoints || dashboardData.topEndpoints.length === 0) return 1;
    return Math.max(...dashboardData.topEndpoints.map(e => e.avgLatency || 0)) || 1;
  }, [dashboardData?.topEndpoints]);

  // Loading skeleton screen
  if (loading) {
    return (
      <div className="space-y-8 animate-pulse select-none">
        {/* Welcome Banner Skeleton */}
        <div className="bg-zinc-200 h-24 rounded-2xl"></div>

        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border border-zinc-150 rounded-2xl p-6 min-h-[140px] flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="h-3 w-16 bg-zinc-200 rounded"></div>
                  <div className="h-8 w-24 bg-zinc-200 rounded"></div>
                </div>
                <div className="h-10 w-10 bg-zinc-100 rounded-xl border border-zinc-200/50"></div>
              </div>
              <div className="flex justify-between items-center mt-4">
                <div className="h-5 w-12 bg-zinc-100 rounded-lg"></div>
                <div className="h-4 w-20 bg-zinc-100 rounded"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Chart + Table Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-zinc-200 rounded-2xl p-6 min-h-[380px] flex flex-col justify-between">
              <div className="h-12 border-b border-zinc-100 pb-4 mb-4 flex justify-between items-center">
                <div className="space-y-1">
                  <div className="h-4 w-48 bg-zinc-200 rounded"></div>
                  <div className="h-3 w-32 bg-zinc-200 rounded"></div>
                </div>
              </div>
              <div className="h-64 bg-zinc-50 rounded-xl flex items-center justify-center">
                <div className="text-zinc-300 text-sm">Loading graph...</div>
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="bg-white border border-zinc-200 rounded-2xl p-6 min-h-[220px] flex flex-col justify-between">
              <div className="space-y-1">
                <div className="h-4 w-32 bg-zinc-200 rounded"></div>
                <div className="h-3 w-24 bg-zinc-200 rounded"></div>
              </div>
              <div className="h-32 flex items-center justify-center">
                <div className="h-24 w-24 rounded-full border-8 border-zinc-100 border-t-zinc-200 animate-spin"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error screen
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] p-8 bg-white border border-zinc-200 rounded-2xl shadow-sm text-center select-none max-w-xl mx-auto my-12">
        <div className="h-16 w-16 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 mb-6 animate-bounce">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-zinc-900 mb-2">Connection Error</h3>
        <p className="text-zinc-500 text-sm max-w-md mb-6 leading-relaxed">
          {error}
        </p>
        <button
          onClick={fetchDashboardData}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-xl shadow-sm border border-indigo-700/50 hover:shadow transition-all duration-150 flex items-center gap-2 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18.2" />
          </svg>
          Retry Connection
        </button>
      </div>
    );
  }

  // Zero-state onboarding screen
  if (!dashboardData || dashboardData.stats.totalHits === 0) {
    return (
      <div className="space-y-8 select-none">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-zinc-900 to-indigo-950 rounded-2xl p-6 text-white shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              Welcome back, {user?.username || 'Developer'}!
            </h2>
            <p className="text-zinc-400 text-xs mt-1">
              System is online. Awaiting integration traffic.
            </p>
          </div>
          
          {/* Time Range Selector */}
          <div className="flex items-center gap-1.5 bg-white/10 p-1 rounded-xl border border-white/10 text-xs font-semibold text-zinc-300">
            <button 
              onClick={() => setTimeRange('24H')} 
              className={`px-2.5 py-1.5 rounded-lg transition-all duration-150 cursor-pointer ${timeRange === '24H' ? 'bg-white text-zinc-900 shadow-sm font-bold' : 'hover:text-white hover:bg-white/5'}`}
            >
              24H
            </button>
            <button 
              onClick={() => setTimeRange('7D')} 
              className={`px-2.5 py-1.5 rounded-lg transition-all duration-150 cursor-pointer ${timeRange === '7D' ? 'bg-white text-zinc-900 shadow-sm font-bold' : 'hover:text-white hover:bg-white/5'}`}
            >
              7D
            </button>
            <button 
              onClick={() => setTimeRange('30D')} 
              className={`px-2.5 py-1.5 rounded-lg transition-all duration-150 cursor-pointer ${timeRange === '30D' ? 'bg-white text-zinc-900 shadow-sm font-bold' : 'hover:text-white hover:bg-white/5'}`}
            >
              30D
            </button>
            <button 
              onClick={() => setTimeRange('ALL')} 
              className={`px-2.5 py-1.5 rounded-lg transition-all duration-150 cursor-pointer ${timeRange === 'ALL' ? 'bg-white text-zinc-900 shadow-sm font-bold' : 'hover:text-white hover:bg-white/5'}`}
            >
              All Time
            </button>
          </div>
        </div>

        {/* Zero State Card */}
        <div className="flex flex-col items-center justify-center min-h-[380px] p-8 bg-white border border-zinc-200 rounded-2xl shadow-sm text-center max-w-2xl mx-auto my-6">
          <div className="h-16 w-16 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-6 animate-pulse">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-zinc-900 mb-2">Awaiting Integration Traffic</h3>
          <p className="text-zinc-500 text-sm max-w-lg mb-6 leading-relaxed">
            No API traffic detected yet. Please generate an API Key under the <strong>Keys</strong> tab and configure your services to log requests to see analytics.
          </p>
          <a
            href="/dashboard/keys"
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-xl shadow-sm border border-indigo-700/50 hover:shadow transition-all duration-150 flex items-center gap-2 cursor-pointer"
          >
            Go to Keys Management
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        </div>
      </div>
    );
  }

  // Active state screen
  return (
    <div className="space-y-8 select-none">
      {/* 1. Welcome Banner */}
      <div className="bg-gradient-to-r from-zinc-900 to-indigo-950 rounded-2xl p-6 text-white shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            Welcome back, {user?.username || 'Developer'}!
          </h2>
          <p className="text-zinc-400 text-xs mt-1">
            System status is healthy. Monitoring {selectedClientId === 'all' ? 'all' : 'selected'} API endpoints.
          </p>
        </div>
        
        {/* Time Range Selector */}
        <div className="flex items-center gap-1.5 bg-white/10 p-1 rounded-xl border border-white/10 text-xs font-semibold text-zinc-300">
          <button 
            onClick={() => setTimeRange('24H')} 
            className={`px-2.5 py-1.5 rounded-lg transition-all duration-150 cursor-pointer ${timeRange === '24H' ? 'bg-white text-zinc-900 shadow-sm font-bold' : 'hover:text-white hover:bg-white/5'}`}
          >
            24H
          </button>
          <button 
            onClick={() => setTimeRange('7D')} 
            className={`px-2.5 py-1.5 rounded-lg transition-all duration-150 cursor-pointer ${timeRange === '7D' ? 'bg-white text-zinc-900 shadow-sm font-bold' : 'hover:text-white hover:bg-white/5'}`}
          >
            7D
          </button>
          <button 
            onClick={() => setTimeRange('30D')} 
            className={`px-2.5 py-1.5 rounded-lg transition-all duration-150 cursor-pointer ${timeRange === '30D' ? 'bg-white text-zinc-900 shadow-sm font-bold' : 'hover:text-white hover:bg-white/5'}`}
          >
            30D
          </button>
          <button 
            onClick={() => setTimeRange('ALL')} 
            className={`px-2.5 py-1.5 rounded-lg transition-all duration-150 cursor-pointer ${timeRange === 'ALL' ? 'bg-white text-zinc-900 shadow-sm font-bold' : 'hover:text-white hover:bg-white/5'}`}
          >
            All Time
          </button>
        </div>
      </div>

      {/* 2. KPI Cards Grid (4 columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Requests"
          value={dashboardData.stats.totalHits.toLocaleString()}
          icon={
            <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
          trend="Live"
          trendType="up"
          description="vs last 24h"
        />

        <MetricCard
          title="Avg Latency"
          value={`${dashboardData.stats.avgLatency} ms`}
          icon={
            <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          trend="Stable"
          trendType="neutral"
          description="average speed"
        />

        <MetricCard
          title="Error Rate"
          value={`${dashboardData.stats.errorRate}%`}
          icon={
            <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
          trend={dashboardData.stats.errorRate > 5 ? 'High' : 'Normal'}
          trendType={dashboardData.stats.errorRate > 5 ? 'down' : 'up'}
          description="percentage failed"
        />

        <MetricCard
          title="Unique Endpoints"
          value={dashboardData.stats.uniqueEndpoints.toString()}
          icon={
            <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 103.935 1.274 2.25 2.25 0 00-3.935-1.274Zm0 0L10.5 12m7.717 3.5a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5Z" />
            </svg>
          }
          trend="Active"
          trendType="neutral"
          description="monitored endpoints"
        />
      </div>

      {/* 3. Bento Grid - Multi-column widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Chart Area (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Chart Container (Area Chart - Image 1) */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm min-h-[380px] flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-zinc-900">Traffic Volume & Performance Trend</h3>
                <p className="text-zinc-500 text-xs mt-0.5 font-medium">Real-time latency spikes mapped against request volume</p>
              </div>
              <div className="flex items-center gap-2 bg-zinc-50 px-3 py-1.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                <span>Active: {timeRange === '24H' ? '24 Hours' : timeRange === '7D' ? '7 Days' : timeRange === '30D' ? '30 Days' : 'All Time'}</span>
              </div>
            </div>

            {/* Recharts Area + Line Component */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={aggregatedChartData}
                  margin={{ top: 10, right: 5, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="time"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }} />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="requests"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRequests)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="latency"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Activity Table (Bento Left Box) */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-zinc-900">Recent Api Hits</h3>
                <p className="text-zinc-500 text-xs mt-0.5 font-medium">Incoming client request buckets</p>
              </div>
              <button onClick={fetchDashboardData} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">Refresh Data</button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-zinc-400 text-xs font-semibold uppercase tracking-wider border-b border-zinc-100">
                    <th className="pb-3 font-semibold">Method</th>
                    <th className="pb-3 font-semibold">Endpoint</th>
                    <th className="pb-3 font-semibold">Status / Success</th>
                    <th className="pb-3 font-semibold">Avg Latency</th>
                    <th className="pb-3 font-semibold text-right">Time Bucket</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {dashboardData.recentActivity.map((hit, idx) => (
                    <tr key={hit.id || idx} className="hover:bg-zinc-50/50 transition-colors duration-150">
                      <td className="py-3 pr-2">
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider font-mono ${getMethodStyle(hit.method)}`}>
                          {hit.method}
                        </span>
                      </td>
                      <td className="py-3 font-medium text-zinc-800 font-mono text-xs max-w-[200px] truncate">
                        {hit.endpoint}
                        {hit.serviceName && (
                          <span className="block text-[10px] text-zinc-400 font-sans font-normal mt-0.5">
                            {hit.serviceName}
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full border ${getStatusColor(hit.errorHits || 0, hit.totalHits || 0)}`}>
                          {getStatusLabel(hit.errorHits || 0, hit.totalHits || 0)}
                        </span>
                      </td>
                      <td className="py-3 text-zinc-600 font-mono text-xs">{hit.avgLatency}ms</td>
                      <td className="py-3 text-right text-zinc-400 text-xs font-medium">
                        {new Date(hit.timeBucket).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Columns (1/3 width) */}
        <div className="space-y-6">
          
          {/* Status Code Breakdown Doughnut (Doughnut Chart - Image 3) */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm min-h-[220px] flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-zinc-900">Response Health</h3>
              <p className="text-zinc-500 text-xs mt-0.5 font-medium">Status code distribution ratio</p>
            </div>
            
            {/* Visual Doughnut Chart */}
            <div className="flex items-center justify-center py-2">
              <div className="h-32 w-32 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={56}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#fff" strokeWidth={2.5} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Custom Legends */}
            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[10px] font-semibold text-zinc-600 uppercase border-t border-zinc-100 pt-3">
              {statusData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                  <span className="truncate">{item.name} ({item.value}%)</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Endpoints (Stacked Progress Bars - Image 2) */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
            <div className="border-b border-zinc-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-zinc-900">Top Endpoints</h3>
              <p className="text-zinc-500 text-xs mt-0.5 font-medium">Comparison of hits volume and latency load</p>
            </div>

            <div className="space-y-5">
              {dashboardData.topEndpoints.map((endpoint, index) => {
                const color = endpointColors[index % endpointColors.length] || endpointColors[0];
                const hitPercentage = Math.round((endpoint.totalHits / maxHits) * 100) || 0;
                const latencyPercentage = Math.round((endpoint.avgLatency / maxLatency) * 100) || 0;

                return (
                  <div key={index} className="flex items-center gap-3">
                    {/* HTTP Method Badge */}
                    <div className="w-12 text-left">
                      <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider font-mono ${getMethodStyle(endpoint.method)}`}>
                        {endpoint.method}
                      </span>
                    </div>

                    {/* Middle progress bars (Double stack) */}
                    <div className="flex-1 space-y-1.5">
                      <div className="text-xs font-semibold text-zinc-800 truncate font-mono max-w-[170px]" title={endpoint.endpoint}>
                        {endpoint.endpoint}
                      </div>

                      {/* Hits Bar (Solid Accent) */}
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-full bg-zinc-50 rounded-full overflow-hidden border border-zinc-200/40">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${color.solid}`}
                            style={{ width: `${hitPercentage}%` }}
                          ></div>
                        </div>
                        <span className="text-[10px] font-bold font-mono text-zinc-700 min-w-[34px] text-right">
                          {endpoint.totalHits.toLocaleString()}
                        </span>
                      </div>

                      {/* Latency Bar (Striped/Muted Accent) */}
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-full bg-zinc-50 rounded-full overflow-hidden border border-zinc-200/40">
                          <div
                            className={`h-full rounded-full bg-stripes transition-all duration-500 ${color.striped}`}
                            style={{ width: `${latencyPercentage}%` }}
                          ></div>
                        </div>
                        <span className="text-[10px] font-bold font-mono text-zinc-400 min-w-[34px] text-right">
                          {endpoint.avgLatency}ms
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

