'use client';

import React, { useState, useEffect } from 'react';
import { useDashboard } from '../layout';
import { authApi } from '../../../lib/api';

export default function SettingsPage() {
  const { user, setUser } = useDashboard();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // User profile states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');

  // Load current settings dynamically based on user context
  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setEmail(user.email || '');
    }
  }, [user]);

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

        </div>

      </div>
    </div>
  );
}
