'use client';

import React from 'react';
import { useDashboard } from './layout';
import MetricCard from '../../components/MetricCard';
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
          <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[10px] font-bold">
            +12.1%
          </span>
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

  // Mock timeline data for the main Area + Line chart (Image 1)
  const mockChartData = [
    { time: 'Jan 23', requests: 2800, latency: 120 },
    { time: 'Mar 23', requests: 2400, latency: 98 },
    { time: 'May 23', requests: 1800, latency: 85 },
    { time: 'Jul 23', requests: 2100, latency: 105 },
    { time: 'Sep 23', requests: 2300, latency: 110 },
    { time: 'Nov 23', requests: 3800, latency: 175 },
    { time: 'Dec 23', requests: 3500, latency: 160 },
  ];

  // Mock list of recent API hits (displays in Bento section)
  const mockRecentHits = [
    { id: '1', method: 'GET', endpoint: '/api/analytics/dashboard', status: 200, latency: '42ms', service: 'auth-service', time: 'Just now' },
    { id: '2', method: 'POST', endpoint: '/api/auth/login', status: 200, latency: '120ms', service: 'auth-service', time: '1 min ago' },
    { id: '3', method: 'GET', endpoint: '/api/clients/dashboard', status: 500, latency: '450ms', service: 'client-service', time: '3 mins ago' },
    { id: '4', method: 'PUT', endpoint: '/api/admin/clients/keys', status: 201, latency: '88ms', service: 'admin-service', time: '10 mins ago' },
    { id: '5', method: 'GET', endpoint: '/api/analytics/stats', status: 401, latency: '12ms', service: 'auth-service', time: '15 mins ago' },
  ];

  // Mock top endpoints data matching Image 2 (dual progress bars)
  const mockTopEndpoints = [
    { path: '/api/analytics/dashboard', method: 'GET', hits: 4879, prevHits: 1552, percentage: 75, prevPercentage: 25, trend: '↑ 214%' },
    { path: '/api/auth/login', method: 'POST', hits: 5381, prevHits: 4274, percentage: 82, prevPercentage: 65, trend: '↑ 25%' },
    { path: '/api/clients/dashboard', method: 'GET', hits: 3931, prevHits: 5014, percentage: 60, prevPercentage: 77, trend: '↓ 21%' },
    { path: '/api/admin/clients', method: 'POST', hits: 6200, prevHits: 4350, percentage: 95, prevPercentage: 67, trend: '↑ 43%' },
  ];

  // Color mappings matching Image 2's specific rows
  const endpointColors = [
    { solid: 'bg-cyan-500', striped: 'bg-cyan-500/20 text-cyan-500', trend: 'text-emerald-600' },
    { solid: 'bg-yellow-500', striped: 'bg-yellow-500/20 text-yellow-500', trend: 'text-emerald-600' },
    { solid: 'bg-orange-500', striped: 'bg-orange-500/20 text-orange-500', trend: 'text-rose-600' },
    { solid: 'bg-violet-600', striped: 'bg-violet-600/20 text-violet-500', trend: 'text-emerald-600' },
  ];

  // Mock status distribution matching Image 3 doughnut percentages
  const mockStatusData = [
    { name: '2xx Success', value: 55, color: '#7294c4' },
    { name: '3xx Redirect', value: 25, color: '#88c0a3' },
    { name: '4xx Client Error', value: 12, color: '#b3db18' },
    { name: '5xx Server Error', value: 8, color: '#88a6a8' }
  ];

  // Style status codes in logs
  const getStatusColor = (code: number) => {
    if (code >= 200 && code < 300) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    if (code >= 400 && code < 500) return 'text-amber-600 bg-amber-50 border-amber-100';
    return 'text-rose-600 bg-rose-50 border-rose-100';
  };

  // Style HTTP methods in logs
  const getMethodStyle = (method: string) => {
    switch (method) {
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

  return (
    <div className="space-y-8 select-none">
      {/* 1. Welcome Banner */}
      <div className="bg-gradient-to-r from-zinc-900 to-indigo-950 rounded-2xl p-6 text-white shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            Welcome back, {user?.username || 'Developer'}!
          </h2>
          <p className="text-zinc-400 text-xs mt-1">
            System status is healthy. Monitoring {selectedClientId === 'all' ? 'all' : 'selected'} API endpoints.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 text-xs font-medium">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Consumer Node: Online
        </div>
      </div>

      {/* 2. KPI Cards Grid (4 columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Requests"
          value="45,200"
          icon={
            <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
          trend="+12.4%"
          trendType="up"
          description="vs last 24h"
        />

        <MetricCard
          title="Avg Latency"
          value="108 ms"
          icon={
            <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          trend="-4.2%"
          trendType="up"
          description="average speed"
        />

        <MetricCard
          title="Error Rate"
          value="0.38%"
          icon={
            <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
          trend="-0.12%"
          trendType="up"
          description="percentage failed"
        />

        <MetricCard
          title="Active API Keys"
          value={user?.role === 'SUPER_ADMIN' ? '12' : '3'}
          icon={
            <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m0 0a2 2 0 01-2 2m2-2h3m-3 0H9M3 12a9 9 0 0115 0M3 12a9 9 0 0015 0M3 12A9 9 0 1118 12M3 12a9 9 0 1015 0" />
            </svg>
          }
          trend="Stable"
          trendType="neutral"
          description="active integrations"
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
              {/* Timeline select options */}
              <div className="flex items-center gap-1.5 bg-zinc-50 p-1 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-600">
                <button className="px-2.5 py-1 bg-white text-zinc-900 rounded-lg shadow-sm border border-zinc-100">Live</button>
                <button className="px-2.5 py-1 hover:text-zinc-900">1H</button>
                <button className="px-2.5 py-1 hover:text-zinc-900">24H</button>
              </div>
            </div>

            {/* Recharts Area + Line Component */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={mockChartData}
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
                <p className="text-zinc-500 text-xs mt-0.5 font-medium">Real-time incoming client requests</p>
              </div>
              <button className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">View All Logs</button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-zinc-400 text-xs font-semibold uppercase tracking-wider border-b border-zinc-100">
                    <th className="pb-3 font-semibold">Method</th>
                    <th className="pb-3 font-semibold">Endpoint</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold">Latency</th>
                    <th className="pb-3 font-semibold text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {mockRecentHits.map((hit) => (
                    <tr key={hit.id} className="hover:bg-zinc-50/50 transition-colors duration-150">
                      <td className="py-3 pr-2">
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider font-mono ${getMethodStyle(hit.method)}`}>
                          {hit.method}
                        </span>
                      </td>
                      <td className="py-3 font-medium text-zinc-800 font-mono text-xs max-w-[200px] truncate">{hit.endpoint}</td>
                      <td className="py-3">
                        <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full border ${getStatusColor(hit.status)}`}>
                          {hit.status}
                        </span>
                      </td>
                      <td className="py-3 text-zinc-600 font-mono text-xs">{hit.latency}</td>
                      <td className="py-3 text-right text-zinc-400 text-xs font-medium">{hit.time}</td>
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
                      data={mockStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={56}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {mockStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#fff" strokeWidth={2.5} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Custom Legends */}
            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[10px] font-semibold text-zinc-600 uppercase border-t border-zinc-100 pt-3">
              {mockStatusData.map((item, idx) => (
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
              <p className="text-zinc-500 text-xs mt-0.5 font-medium">Comparison of current vs previous hits volume</p>
            </div>

            <div className="space-y-5">
              {mockTopEndpoints.map((endpoint, index) => {
                const color = endpointColors[index] || endpointColors[0];
                return (
                  <div key={index} className="flex items-center gap-3">
                    {/* Left Trend Indicators */}
                    <div className="w-12 text-left">
                      <span className={`text-[11px] font-bold ${color.trend}`}>
                        {endpoint.trend}
                      </span>
                    </div>

                    {/* Middle progress bars (Double stack) */}
                    <div className="flex-1 space-y-1.5">
                      <div className="text-xs font-semibold text-zinc-800 truncate font-mono max-w-[150px]">
                        {endpoint.path}
                      </div>

                      {/* Top Bar (Striped - Previous Period hits) */}
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-full bg-zinc-50 rounded-full overflow-hidden border border-zinc-200/40">
                          <div
                            className={`h-full rounded-full bg-stripes transition-all duration-500 ${color.striped}`}
                            style={{ width: `${endpoint.prevPercentage}%` }}
                          ></div>
                        </div>
                        <span className="text-[10px] font-bold font-mono text-zinc-400 min-w-[28px] text-right">
                          {endpoint.prevHits.toLocaleString()}
                        </span>
                      </div>

                      {/* Bottom Bar (Solid - Current Period hits) */}
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-full bg-zinc-50 rounded-full overflow-hidden border border-zinc-200/40">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${color.solid}`}
                            style={{ width: `${endpoint.percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-[10px] font-bold font-mono text-zinc-700 min-w-[28px] text-right">
                          {endpoint.hits.toLocaleString()}
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
