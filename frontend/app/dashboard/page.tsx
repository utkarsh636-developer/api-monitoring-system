'use client';

import React from 'react';
import { useDashboard } from './layout';
import MetricCard from '../../components/MetricCard';

export default function DashboardOverview() {
  const { user, selectedClientId } = useDashboard();

  // Mock list of recent API hits (displays in Bento section)
  const mockRecentHits = [
    { id: '1', method: 'GET', endpoint: '/api/analytics/dashboard', status: 200, latency: '42ms', service: 'auth-service', time: 'Just now' },
    { id: '2', method: 'POST', endpoint: '/api/auth/login', status: 200, latency: '120ms', service: 'auth-service', time: '1 min ago' },
    { id: '3', method: 'GET', endpoint: '/api/clients/dashboard', status: 500, latency: '450ms', service: 'client-service', time: '3 mins ago' },
    { id: '4', method: 'PUT', endpoint: '/api/admin/clients/keys', status: 201, latency: '88ms', service: 'admin-service', time: '10 mins ago' },
    { id: '5', method: 'GET', endpoint: '/api/analytics/stats', status: 401, latency: '12ms', service: 'auth-service', time: '15 mins ago' },
  ];

  // Mock top endpoints data (displays with progress bars)
  const mockTopEndpoints = [
    { path: '/api/analytics/dashboard', method: 'GET', hits: 24500, percentage: 75 },
    { path: '/api/auth/login', method: 'POST', hits: 5200, percentage: 16 },
    { path: '/api/clients/dashboard', method: 'GET', hits: 2100, percentage: 6 },
    { path: '/api/admin/clients', method: 'POST', hits: 900, percentage: 3 },
  ];

  // Style status codes
  const getStatusColor = (code: number) => {
    if (code >= 200 && code < 300) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    if (code >= 400 && code < 500) return 'text-amber-600 bg-amber-50 border-amber-100';
    return 'text-rose-600 bg-rose-50 border-rose-100';
  };

  // Style HTTP methods
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
      {/* 1. Header welcome banner */}
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
          trend="-4.2%" // decrease in latency is positive (up/green)
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
          trend="-0.12%" // decrease in error rate is positive (up/green)
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
          
          {/* Main Chart Container */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm min-h-[380px] flex flex-col">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
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

            {/* Chart Graphic Placeholder */}
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-zinc-400">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-500 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm font-bold text-zinc-800">Chart Visualization Placeholder</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs text-center leading-relaxed">
                Dual-Axis Recharts area graph displaying API traffic volume and average latencies will be integrated here.
              </p>
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
          
          {/* Status Code Breakdown Doughnut */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm min-h-[220px] flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-zinc-900">Response Health</h3>
              <p className="text-zinc-500 text-xs mt-0.5 font-medium">Status code distribution ratio</p>
            </div>
            
            {/* Visual breakdown simulation */}
            <div className="py-4">
              <div className="h-4 w-full bg-zinc-100 rounded-full flex overflow-hidden border border-zinc-200">
                <div className="bg-emerald-500 h-full hover:opacity-90 transition-opacity" style={{ width: '98.5%' }} title="2xx Success"></div>
                <div className="bg-amber-400 h-full hover:opacity-90 transition-opacity" style={{ width: '1.0%' }} title="4xx Client Error"></div>
                <div className="bg-rose-500 h-full hover:opacity-90 transition-opacity" style={{ width: '0.5%' }} title="5xx Server Error"></div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 mt-4 text-xs font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  <span className="text-zinc-600">2xx (98.5%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                  <span className="text-zinc-600">4xx (1.0%)</span>
                </div>
                <div className="flex items-center gap-1.5 text-right">
                  <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                  <span className="text-zinc-600">5xx (0.5%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Endpoints (Horizontal Progress Bars) */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
            <div className="border-b border-zinc-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-zinc-900">Top Endpoints</h3>
              <p className="text-zinc-500 text-xs mt-0.5 font-medium">Most active API pathways</p>
            </div>

            <div className="space-y-4">
              {mockTopEndpoints.map((endpoint, index) => (
                <div key={index} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-zinc-800 truncate max-w-[170px] font-mono">{endpoint.path}</span>
                    <span className="text-zinc-500 font-mono">{endpoint.hits.toLocaleString()} hits</span>
                  </div>
                  {/* Custom progress bars exactly matching layout references */}
                  <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden border border-zinc-200/50">
                    <div 
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${endpoint.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
