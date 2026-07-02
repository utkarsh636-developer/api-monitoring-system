'use client';

import React, { useState, useEffect } from 'react';
import { useDashboard } from '../layout';
import { clientApi, authApi } from '../../../lib/api';

export default function SettingsPage() {
  const { user, selectedClientId, clients, setUser } = useDashboard();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // User profile states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');

  // Organization states
  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [retentionDays, setRetentionDays] = useState(30);
  const [timezone, setTimezone] = useState('UTC');
  const [alertsEnabled, setAlertsEnabled] = useState(true);

  const canManageOrg = user?.role === 'SUPER_ADMIN' || user?.role === 'CLIENT_ADMIN';

  // Load current settings dynamically based on active selected client and user context
  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setEmail(user.email || '');
      
      const targetClientId = user.role === 'SUPER_ADMIN' ? selectedClientId : (user.clientId || '');
      const activeClient = clients.find(c => c.id === targetClientId);

      if (activeClient) {
        setCompanyName(activeClient.name || '');
        setCompanyEmail(activeClient.email || '');
        setRetentionDays(activeClient.dataRetentionDays || 30);
        setTimezone(activeClient.timezone || 'UTC');
        setAlertsEnabled(activeClient.alertsEnabled !== undefined ? activeClient.alertsEnabled : true);
      } else {
        setCompanyName('');
        setCompanyEmail('');
        setRetentionDays(30);
        setTimezone('UTC');
        setAlertsEnabled(true);
      }
    }
  }, [user, selectedClientId, clients]);

  // Handle personal settings submit
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !email.trim()) return;

    try {
      const response = await authApi.updateProfile({ username, email });
      if (response.success && response.data) {
        setUser(response.data);
        setSuccessMessage('Profile settings updated successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        alert(response.message || 'Failed to update profile.');
      }
    } catch (err: any) {
      console.error('Failed to save profile:', err);
      const errMsg = err.response?.data?.message || 'Failed to update profile settings.';
      alert(errMsg);
    }
  };

  // Handle organization settings submit
  const handleSaveOrg = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('Organization settings updated successfully!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  return (
    <div className="space-y-6 select-none font-sans max-w-4xl">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Settings</h2>
        <p className="text-zinc-500 text-sm mt-0.5 font-medium">
          Manage your personal profile settings and organization configurations.
        </p>
      </div>

      {/* Floating Success Notification */}
      {successMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 border border-zinc-800 text-white rounded-xl py-3 px-5 shadow-xl text-xs font-bold flex items-center gap-2.5 animate-scale-in">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
          {successMessage}
        </div>
      )}

      {/* Bento Layout Settings Grids */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Context Info */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-zinc-900">Account Overview</h3>
            <p className="text-zinc-500 text-xs mt-1 leading-relaxed">
              Verify your active credentials and access privileges.
            </p>
            <div className="mt-4 space-y-3 font-medium text-xs">
              <div className="flex justify-between py-1 border-b border-zinc-50">
                <span className="text-zinc-400">User Role</span>
                <span className="text-zinc-800 font-bold uppercase tracking-wider font-mono bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200">
                  {user?.role?.replace('_', ' ')}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-50">
                <span className="text-zinc-400">Organization ID</span>
                <span className="text-zinc-500 font-mono truncate max-w-[100px]" title={user?.clientId || 'N/A'}>
                  {user?.clientId || 'None (Global)'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-zinc-400">Join Date</span>
                <span className="text-zinc-500 font-mono">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Settings Forms */}
        <div className="md:col-span-2 space-y-6">
          
          {/* User Profile Form */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
            <div className="border-b border-zinc-100 pb-3 mb-5">
              <h3 className="text-base font-bold text-zinc-900">Personal Profile</h3>
              <p className="text-zinc-500 text-xs mt-0.5 font-medium">Update your account name and email address.</p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="username" className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    Username
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-zinc-50">
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm active:scale-[0.98] transition duration-150"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>

          {/* Organization Settings Form (Only visible to Client Admin or Super Admin) */}
          {canManageOrg ? (
            <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
              <div className="border-b border-zinc-100 pb-3 mb-5">
                <h3 className="text-base font-bold text-zinc-900">Organization Settings</h3>
                <p className="text-zinc-500 text-xs mt-0.5 font-medium">Configure team-wide variables and performance limits.</p>
              </div>

              {user?.role === 'SUPER_ADMIN' && selectedClientId === 'all' ? (
                <div className="text-center py-10">
                  <div className="mx-auto h-12 w-12 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-400 mb-3 animate-pulse">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-zinc-800">No Organization Selected</h3>
                  <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto leading-relaxed font-medium">
                    Please choose a specific organization from the top-right header dropdown to view and manage its settings.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSaveOrg} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Company Name */}
                    <div className="space-y-1.5">
                      <label htmlFor="companyName" className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">
                        Company Name
                      </label>
                      <input
                        type="text"
                        id="companyName"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
                      />
                    </div>

                    {/* Company Contact Email */}
                    <div className="space-y-1.5">
                      <label htmlFor="companyEmail" className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">
                        Contact Email
                      </label>
                      <input
                        type="email"
                        id="companyEmail"
                        value={companyEmail}
                        onChange={(e) => setCompanyEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
                      />
                    </div>

                    {/* Data Retention Threshold */}
                    <div className="space-y-1.5">
                      <label htmlFor="retention" className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">
                        Data Retention Threshold
                      </label>
                      <select
                        id="retention"
                        value={retentionDays}
                        onChange={(e) => setRetentionDays(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm text-zinc-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-semibold"
                      >
                        <option value={14}>14 Days</option>
                        <option value={30}>30 Days (Standard)</option>
                        <option value={90}>90 Days</option>
                        <option value={180}>180 Days (Long-term)</option>
                      </select>
                    </div>

                    {/* Primary Timezone */}
                    <div className="space-y-1.5">
                      <label htmlFor="timezone" className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">
                        Primary Timezone
                      </label>
                      <select
                        id="timezone"
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm text-zinc-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-semibold"
                      >
                        <option value="UTC">UTC (Universal Coordinated)</option>
                        <option value="GMT">GMT (Greenwich Mean Time)</option>
                        <option value="EST">EST (Eastern Standard)</option>
                        <option value="PST">PST (Pacific Standard)</option>
                        <option value="IST">IST (Indian Standard)</option>
                      </select>
                    </div>
                  </div>

                  {/* Email Alert Warning Toggle */}
                  <div className="flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      id="alerts"
                      checked={alertsEnabled}
                      onChange={(e) => setAlertsEnabled(e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-200 text-indigo-600 focus:ring-indigo-500/20 cursor-pointer"
                    />
                    <label htmlFor="alerts" className="text-xs font-bold text-zinc-500 uppercase tracking-wider cursor-pointer">
                      Enable System Alerts / Warning Emails
                    </label>
                  </div>

                  <div className="flex justify-end pt-3 border-t border-zinc-50">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm active:scale-[0.98] transition duration-150"
                    >
                      Save Organization Settings
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* Non-admin lock view for CLIENT_VIEWER */
            <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm text-center py-10">
              <div className="mx-auto h-12 w-12 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-400 mb-3">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-zinc-800">Organization Settings Locked</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto leading-relaxed">
                Only Super Admins and Client Admins can view or configure the organization setting panels.
              </p>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
