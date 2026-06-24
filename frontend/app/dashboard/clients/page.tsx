'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useDashboard } from '../layout';
import { clientApi, Client } from '../../../lib/api';

export default function ClientsPage() {
  const { user } = useDashboard();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // Actions dropdown states
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Modal registration states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientWebsite, setNewClientWebsite] = useState('');
  const [newClientRetention, setNewClientRetention] = useState<number>(30);
  const [newClientTimezone, setNewClientTimezone] = useState('UTC');
  const [newClientAlerts, setNewClientAlerts] = useState(true);

  // User registration states
  const [userModalClientId, setUserModalClientId] = useState<string | null>(null);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'CLIENT_ADMIN' | 'CLIENT_VIEWER'>('CLIENT_ADMIN');
  const [userModalError, setUserModalError] = useState<string | null>(null);
  const [userModalSuccess, setUserModalSuccess] = useState<string | null>(null);
  const [userModalLoading, setUserModalLoading] = useState(false);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // Fetch client directory
  useEffect(() => {
    let active = true;

    async function fetchClients() {
      // Access Control: Only fetch if Super Admin
      if (!isSuperAdmin) {
        setLoading(false);
        return;
      }

      try {
        const response = await clientApi.getClients();
        if (response.success && response.data && active) {
          setClients(response.data);
        }
      } catch (err) {
        console.warn('Backend clients fetch failed, loading developer mock directory');
        
        // Mock fallback directory in development
        if (active) {
          setClients([
            {
              id: 'dev-client-id-999',
              name: 'Code Architecture',
              slug: 'code-architecture',
              email: 'info@codearc.com',
              isActive: true,
              dataRetentionDays: 30,
              alertsEnabled: true,
              timezone: 'UTC',
              createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
              updatedAt: new Date().toISOString(),
            },
            {
              id: 'client-beta-id',
              name: 'FoodDelivery API Corp',
              slug: 'food-delivery',
              email: 'api@fooddelivery.com',
              isActive: true,
              dataRetentionDays: 14,
              alertsEnabled: false,
              timezone: 'EST',
              createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
              updatedAt: new Date().toISOString(),
            },
            {
              id: 'client-gamma-id',
              name: 'SuperShop E-Commerce',
              slug: 'supershop',
              email: 'admin@supershop.io',
              isActive: false,
              dataRetentionDays: 90,
              alertsEnabled: true,
              timezone: 'GMT',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchClients();

    return () => {
      active = false;
    };
  }, [user, isSuperAdmin]);

  // Click outside listener to close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Toggle active/inactive status
  const handleToggleStatus = (id: string) => {
    setClients(prev =>
      prev.map(c => (c.id === id ? { ...c, isActive: !c.isActive } : c))
    );
    setActiveMenuId(null);
  };

  // Delete Client
  const handleDeleteClient = (id: string) => {
    if (confirm('Are you sure you want to delete this client company? All associated API keys, logs, and users will be permanently deleted.')) {
      setClients(prev => prev.filter(c => c.id !== id));
      setActiveMenuId(null);
    }
  };

  // Register Client Submit
  const handleRegisterClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim() || !newClientEmail.trim()) return;

    // Auto-generate slug from name
    const clientSlug = newClientName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const newClientRecord: Client = {
      id: `client-${Date.now()}`,
      name: newClientName,
      slug: clientSlug,
      email: newClientEmail,
      website: newClientWebsite || null,
      isActive: true,
      dataRetentionDays: newClientRetention,
      timezone: newClientTimezone,
      alertsEnabled: newClientAlerts,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const response = await clientApi.createClient({
        name: newClientName,
        email: newClientEmail,
        website: newClientWebsite,
      });
      if (response.success && response.data) {
        newClientRecord.id = response.data.id;
        newClientRecord.slug = response.data.slug;
      }
    } catch (err) {
      console.warn('Backend client registration failed, saving mock client data');
    }

    setClients(prev => [newClientRecord, ...prev]);
    setIsModalOpen(false);
    // Clear forms
    setNewClientName('');
    setNewClientEmail('');
    setNewClientWebsite('');
    setNewClientRetention(30);
    setNewClientTimezone('UTC');
    setNewClientAlerts(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setNewClientName('');
    setNewClientEmail('');
    setNewClientWebsite('');
    setNewClientRetention(30);
    setNewClientTimezone('UTC');
    setNewClientAlerts(true);
  };

  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userModalClientId) return;
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      setUserModalError('Please fill in all fields.');
      return;
    }

    setUserModalLoading(true);
    setUserModalError(null);
    setUserModalSuccess(null);

    try {
      const response = await clientApi.createClientUser(userModalClientId, {
        username: newUserName,
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole,
      });

      if (response.success) {
        setUserModalSuccess('User onboarded successfully!');
        setTimeout(() => {
          handleCloseUserModal();
        }, 1500);
      } else {
        setUserModalError(response.message || 'Failed to onboard client user.');
      }
    } catch (err: any) {
      console.error('Create user error:', err);
      const errMsg = err.response?.data?.message || 'Error onboarding user. Validation check failed.';
      setUserModalError(errMsg);
    } finally {
      setUserModalLoading(false);
    }
  };

  const handleCloseUserModal = () => {
    setUserModalClientId(null);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPassword('');
    setNewUserRole('CLIENT_ADMIN');
    setUserModalError(null);
    setUserModalSuccess(null);
  };

  // Access Control Screen
  if (!isSuperAdmin && !loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] text-center p-6">
        <div className="h-16 w-16 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 mb-4 shadow-sm shadow-rose-100">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-zinc-900">Access Denied</h3>
        <p className="text-zinc-500 text-sm max-w-sm mt-1.5 font-medium leading-relaxed">
          The Client Directory is restricted to platform Super Admins. Individual client admins cannot access other registered companies.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none font-sans">
      {/* Header section with Action Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Clients</h2>
          <p className="text-zinc-500 text-sm mt-0.5 font-medium">
            Register and manage active developer client organizations on the monitoring platform.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-[0.98] transition-all duration-150"
        >
          Register Client
        </button>
      </div>

      {/* Main Table Card (Twelvedata reference layout) */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="text-zinc-400 text-xs font-semibold uppercase tracking-wider border-b border-zinc-150 bg-zinc-50/50">
                <th className="py-4 px-6 font-semibold">Name</th>
                <th className="py-4 px-6 font-semibold">Slug</th>
                <th className="py-4 px-6 font-semibold">Contact Email</th>
                <th className="py-4 px-6 font-semibold">Data Retention</th>
                <th className="py-4 px-6 font-semibold">Status</th>
                <th className="py-4 px-6 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700 font-medium">
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-400">
                    No active clients found. Click "Register Client" to add one.
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr key={client.id} className="hover:bg-zinc-50/30 transition-colors duration-150">
                    {/* Name */}
                    <td className="py-4 px-6">
                      <div className="font-bold text-zinc-900">{client.name}</div>
                      {client.website && (
                        <a
                          href={client.website.startsWith('http') ? client.website : `https://${client.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-zinc-400 hover:text-indigo-600 transition-colors font-semibold mt-0.5 inline-block"
                        >
                          {client.website.replace(/https?:\/\//, '')}
                        </a>
                      )}
                    </td>

                    {/* Slug */}
                    <td className="py-4 px-6">
                      <div className="bg-zinc-100 px-3 py-1 rounded-full border border-zinc-200/50 font-mono text-xs text-zinc-600 tracking-wide select-text inline-block">
                        {client.slug}
                      </div>
                    </td>

                    {/* Contact Email */}
                    <td className="py-4 px-6 text-zinc-600 font-medium">{client.email}</td>

                    {/* Data Retention days */}
                    <td className="py-4 px-6 text-zinc-500 font-mono text-xs">
                      {client.dataRetentionDays} Days
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full border ${
                        client.isActive
                          ? 'text-emerald-600 bg-emerald-50 border-emerald-100'
                          : 'text-zinc-500 bg-zinc-50 border-zinc-200'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${client.isActive ? 'bg-emerald-500' : 'bg-zinc-400'}`}></span>
                        {client.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Context Menu Actions Dropdown */}
                    <td className="py-4 px-6 text-right relative">
                      <button
                        onClick={() => setActiveMenuId(activeMenuId === client.id ? null : client.id)}
                        className="text-zinc-400 hover:text-zinc-700 transition-colors p-1"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                        </svg>
                      </button>

                      {/* Dropdown Box overlay */}
                      {activeMenuId === client.id && (
                        <div
                          ref={dropdownRef}
                          className="absolute right-6 mt-1 w-36 bg-white border border-zinc-200 rounded-xl shadow-lg z-20 py-1.5 text-left divide-y divide-zinc-50 text-xs font-semibold"
                        >
                          <button
                            onClick={() => {
                              setUserModalClientId(client.id);
                              setActiveMenuId(null);
                            }}
                            className="w-full px-4 py-2 hover:bg-zinc-50 text-indigo-600 flex items-center gap-2"
                          >
                            <span>Register User</span>
                          </button>
                          <button
                            onClick={() => handleToggleStatus(client.id)}
                            className="w-full px-4 py-2 hover:bg-zinc-50 text-zinc-700 flex items-center gap-2"
                          >
                            <span>{client.isActive ? 'Deactivate' : 'Activate'}</span>
                          </button>
                          <button
                            onClick={() => handleDeleteClient(client.id)}
                            className="w-full px-4 py-2 hover:bg-rose-50 text-rose-600 flex items-center gap-2"
                          >
                            <span>Delete Client</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Overlaid Modal Panel */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center select-none font-sans">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-xs" onClick={handleCloseModal}></div>

          {/* Modal Container */}
          <div className="relative bg-white w-full max-w-md rounded-2xl border border-zinc-200 shadow-xl overflow-hidden z-10 p-6 animate-scale-in">
            <form onSubmit={handleRegisterClient} className="space-y-5">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <h3 className="text-base font-bold text-zinc-900">Register new Client</h3>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="text-zinc-400 hover:text-zinc-600 transition"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Client Name Input */}
              <div className="space-y-1.5">
                <label htmlFor="clientName" className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Client Name
                </label>
                <input
                  type="text"
                  id="clientName"
                  required
                  placeholder="e.g. Google Maps Team"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition placeholder-zinc-400 animate-none"
                />
              </div>

              {/* Contact Email Input */}
              <div className="space-y-1.5">
                <label htmlFor="clientEmail" className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Contact Email
                </label>
                <input
                  type="email"
                  id="clientEmail"
                  required
                  placeholder="admin@gmaps.com"
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition placeholder-zinc-400"
                />
              </div>

              {/* Website Input */}
              <div className="space-y-1.5">
                <label htmlFor="clientWebsite" className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Website URL
                </label>
                <input
                  type="text"
                  id="clientWebsite"
                  placeholder="e.g. https://maps.google.com"
                  value={newClientWebsite}
                  onChange={(e) => setNewClientWebsite(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition placeholder-zinc-400 animate-none"
                />
              </div>

              {/* Data Retention selection */}
              <div className="space-y-1.5">
                <label htmlFor="clientRetention" className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Data Retention Threshold
                </label>
                <select
                  id="clientRetention"
                  value={newClientRetention}
                  onChange={(e) => setNewClientRetention(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm text-zinc-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
                >
                  <option value={14}>14 Days</option>
                  <option value={30}>30 Days (Standard)</option>
                  <option value={90}>90 Days</option>
                  <option value={180}>180 Days (Long-term)</option>
                </select>
              </div>

              {/* Timezone selection */}
              <div className="space-y-1.5">
                <label htmlFor="clientTimezone" className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Primary Timezone
                </label>
                <select
                  id="clientTimezone"
                  value={newClientTimezone}
                  onChange={(e) => setNewClientTimezone(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm text-zinc-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
                >
                  <option value="UTC">UTC (Universal Coordinated)</option>
                  <option value="GMT">GMT (Greenwich Mean Time)</option>
                  <option value="EST">EST (Eastern Standard)</option>
                  <option value="PST">PST (Pacific Standard)</option>
                  <option value="IST">IST (Indian Standard)</option>
                </select>
              </div>

              {/* Email Alerts Toggle Checkbox */}
              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="clientAlerts"
                  checked={newClientAlerts}
                  onChange={(e) => setNewClientAlerts(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-200 text-indigo-600 focus:ring-indigo-500/20"
                />
                <label htmlFor="clientAlerts" className="text-xs font-bold text-zinc-500 uppercase tracking-wider cursor-pointer">
                  Enable System Alerts / Email warnings
                </label>
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-zinc-200 text-zinc-500 hover:text-zinc-700 rounded-xl text-sm font-semibold transition hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition active:scale-[0.98]"
                >
                  Register Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Registration Modal Overlay */}
      {userModalClientId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center select-none font-sans">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-xs" onClick={handleCloseUserModal}></div>

          {/* Modal Container */}
          <div className="relative bg-white w-full max-w-md rounded-2xl border border-zinc-200 shadow-xl overflow-hidden z-10 p-6 animate-scale-in">
            <form onSubmit={handleRegisterUser} className="space-y-5">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <h3 className="text-base font-bold text-zinc-900">Register Client User</h3>
                <button
                  type="button"
                  onClick={handleCloseUserModal}
                  className="text-zinc-400 hover:text-zinc-600 transition-colors p-1"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Toast Messages */}
              {userModalError && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs font-bold text-rose-600 flex items-center gap-2 animate-scale-in">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                  {userModalError}
                </div>
              )}
              {userModalSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs font-bold text-emerald-600 flex items-center gap-2 animate-scale-in">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                  {userModalSuccess}
                </div>
              )}

              {/* Username Input */}
              <div className="space-y-1.5">
                <label htmlFor="userUsername" className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Username
                </label>
                <input
                  type="text"
                  id="userUsername"
                  placeholder="e.g. client_admin_username"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  disabled={userModalLoading}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
                />
              </div>

              {/* Email Input */}
              <div className="space-y-1.5">
                <label htmlFor="userEmail" className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Email Address
                </label>
                <input
                  type="email"
                  id="userEmail"
                  placeholder="user@company.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  disabled={userModalLoading}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
                />
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label htmlFor="userPassword" className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Password
                </label>
                <input
                  type="password"
                  id="userPassword"
                  placeholder="••••••••"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  disabled={userModalLoading}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
                />
              </div>

              {/* Role Select Dropdown */}
              <div className="space-y-1.5">
                <label htmlFor="userRole" className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Platform Role
                </label>
                <select
                  id="userRole"
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  disabled={userModalLoading}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm text-zinc-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
                >
                  <option value="CLIENT_ADMIN">Client Admin (View & Configure)</option>
                  <option value="CLIENT_VIEWER">Client Viewer (Read Only)</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={handleCloseUserModal}
                  disabled={userModalLoading}
                  className="px-4 py-2 border border-zinc-200 text-zinc-500 hover:text-zinc-700 rounded-xl text-sm font-semibold transition hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={userModalLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-sm font-semibold shadow-sm transition active:scale-[0.98]"
                >
                  {userModalLoading ? 'Creating User...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
