'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useDashboard } from '../layout';
import { clientApi, ApiKey } from '../../../lib/api';

// Extended type to handle active toggling and masking on client side
interface ApiKeyUI extends ApiKey {
  revealed?: boolean;
}

export default function ApiKeysPage() {
  const { user } = useDashboard();
  const canManageKeys = user?.role === 'SUPER_ADMIN' || user?.role === 'CLIENT_ADMIN';
  const [keys, setKeys] = useState<ApiKeyUI[]>([]);
  const [loading, setLoading] = useState(true);

  // Actions dropdown states
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Copy success animation states
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  // Modal generation states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyEnv, setNewKeyEnv] = useState<'PRODUCTION' | 'STAGING' | 'DEVELOPMENT' | 'TESTING'>('DEVELOPMENT');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);

  // Fetch client API keys
  useEffect(() => {
    let active = true;

    async function fetchKeys() {
      try {
        if (user?.clientId) {
          const response = await clientApi.getClientApiKeys(user.clientId);
          if (response.success && response.data && active) {
            setKeys(response.data.map(k => ({ ...k, revealed: false })));
          }
        }
      } catch (err) {
        console.error('Failed to fetch API keys from backend:', err);
        if (active) {
          setKeys([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchKeys();

    return () => {
      active = false;
    };
  }, [user]);

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

  // Copy to clipboard helper
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  // Toggle visible status of keys
  const toggleReveal = (id: string) => {
    setKeys(prev =>
      prev.map(k => (k.id === id ? { ...k, revealed: !k.revealed } : k))
    );
  };

  // Toggle active/inactive status
  const handleToggleStatus = async (id: string) => {
    if (!user?.clientId) return;
    const key = keys.find(k => k.id === id);
    if (!key) return;

    try {
      const response = await clientApi.updateApiKey(user.clientId, id, { isActive: !key.isActive });
      if (response.success && response.data) {
        setKeys(prev =>
          prev.map(k => (k.id === id ? { ...response.data!, revealed: key.revealed } : k))
        );
      } else {
        alert(response.message || 'Failed to toggle API key status.');
      }
    } catch (err) {
      console.error('Failed to toggle key status:', err);
      alert('An error occurred while updating the API key status.');
    }
    setActiveMenuId(null);
  };

  // Revoke/Delete API Key
  const handleRevokeKey = async (id: string) => {
    if (!user?.clientId) return;
    if (confirm('Are you sure you want to revoke this API key? This action is permanent and will break any services currently using it.')) {
      try {
        const response = await clientApi.deleteApiKey(user.clientId, id);
        if (response.success) {
          setKeys(prev => prev.filter(k => k.id !== id));
        } else {
          alert(response.message || 'Failed to revoke API key.');
        }
      } catch (err) {
        console.error('Failed to revoke key:', err);
        alert('An error occurred while revoking the API key.');
      }
      setActiveMenuId(null);
    }
  };

  // Create new API key
  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim() || !user?.clientId) return;

    setCreateLoading(true);
    setCreateError(null);

    try {
      const response = await clientApi.createApiKey(user.clientId, {
        name: newKeyName,
        environment: newKeyEnv,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
      });
      if (response.success && response.data) {
        setKeys(prev => [{ ...response.data!, revealed: false }, ...prev]);
        setGeneratedKey(response.data.key); // Transition to Secure Reveal Screen
      } else {
        setCreateError(response.message || 'Failed to generate API key.');
      }
    } catch (err: any) {
      console.error('Failed to create API key:', err);
      const errMsg = err.response?.data?.message || 'Failed to generate API key. Please try again.';
      setCreateError(errMsg);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setNewKeyName('');
    setNewKeyEnv('DEVELOPMENT');
    setGeneratedKey(null);
    setCreateError(null);
  };

  // Style helper for environments
  const getEnvStyle = (env: string) => {
    switch (env) {
      case 'PRODUCTION':
        return 'bg-rose-50 text-rose-600 border border-rose-100';
      case 'STAGING':
        return 'bg-amber-50 text-amber-600 border border-amber-100';
      case 'DEVELOPMENT':
        return 'bg-indigo-50 text-indigo-600 border border-indigo-100';
      default:
        return 'bg-zinc-100 text-zinc-600 border border-zinc-200';
    }
  };

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
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">API keys</h2>
          <p className="text-zinc-500 text-sm mt-0.5 font-medium">
            Manage credentials for authenticating your backend client servers and services.
          </p>
        </div>
        {canManageKeys && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-[0.98] transition-all duration-150"
          >
            Create new key
          </button>
        )}
      </div>

      {/* Main Table Card (Twelvedata reference layout) */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="text-zinc-400 text-xs font-semibold uppercase tracking-wider border-b border-zinc-150 bg-zinc-50/50">
                <th className="py-4 px-6 font-semibold">Name</th>
                <th className="py-4 px-6 font-semibold">Key</th>
                <th className="py-4 px-6 font-semibold">Environment</th>
                <th className="py-4 px-6 font-semibold">Created At</th>
                <th className="py-4 px-6 font-semibold">Status</th>
                {canManageKeys && <th className="py-4 px-6 font-semibold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700 font-medium">
              {keys.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-400">
                    No active API keys found. Click "Create new key" to get started.
                  </td>
                </tr>
              ) : (
                keys.map((key) => (
                  <tr key={key.id} className="hover:bg-zinc-50/30 transition-colors duration-150">
                    {/* Name */}
                    <td className="py-4 px-6 font-bold text-zinc-900">{key.name}</td>

                    {/* Key Pill with Copy & Eye icon (Twelvedata layout) */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-zinc-100/80 px-3.5 py-1.5 rounded-full border border-zinc-200/50 font-mono text-xs text-zinc-600 tracking-wide select-text">
                          {key.revealed
                            ? key.key
                            : `${key.key.substring(0, 9)}••••••••••••••••••••${key.key.slice(-4)}`}
                        </div>
                        
                        {/* Toggle visibility (Eye) */}
                        <button
                          onClick={() => toggleReveal(key.id)}
                          className="text-zinc-400 hover:text-zinc-700 transition-colors p-1"
                          title={key.revealed ? 'Mask key' : 'Reveal key'}
                        >
                          {key.revealed ? (
                            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          ) : (
                            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>

                        {/* Copy button */}
                        <div className="relative">
                          <button
                            onClick={() => handleCopy(key.id, key.key)}
                            className="text-zinc-400 hover:text-zinc-700 transition-colors p-1"
                            title="Copy key"
                          >
                            {copiedKeyId === key.id ? (
                              <svg className="w-4.5 h-4.5 text-emerald-600 animate-scale-in" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                              </svg>
                            )}
                          </button>
                          {copiedKeyId === key.id && (
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-0.5 bg-zinc-900 text-white text-[10px] rounded shadow-lg whitespace-nowrap z-10 animate-fade-in font-bold">
                              Copied!
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Environment */}
                    <td className="py-4 px-6">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-wider font-mono ${getEnvStyle(key.environment)}`}>
                        {key.environment}
                      </span>
                    </td>

                    {/* Created At */}
                    <td className="py-4 px-6 text-zinc-500 font-mono text-xs">
                      {new Date(key.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>

                    {/* Status Toggle */}
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full border ${
                        key.isActive
                          ? 'text-emerald-600 bg-emerald-50 border-emerald-100'
                          : 'text-zinc-500 bg-zinc-50 border-zinc-200'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${key.isActive ? 'bg-emerald-500' : 'bg-zinc-400'}`}></span>
                        {key.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Custom Context Menu Actions Dropdown */}
                    {canManageKeys && (
                      <td className="py-4 px-6 text-right relative">
                        <button
                          onClick={() => setActiveMenuId(activeMenuId === key.id ? null : key.id)}
                          className="text-zinc-400 hover:text-zinc-700 transition-colors p-1"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                          </svg>
                        </button>

                        {/* Dropdown Box overlay */}
                        {activeMenuId === key.id && (
                          <div
                            ref={dropdownRef}
                            className="absolute right-6 mt-1 w-36 bg-white border border-zinc-200 rounded-xl shadow-lg z-20 py-1.5 text-left divide-y divide-zinc-50 text-xs font-semibold"
                          >
                            <button
                              onClick={() => handleToggleStatus(key.id)}
                              className="w-full px-4 py-2 hover:bg-zinc-50 text-zinc-700 flex items-center gap-2"
                            >
                              <span>{key.isActive ? 'Deactivate' : 'Activate'}</span>
                            </button>
                            <button
                              onClick={() => handleRevokeKey(key.id)}
                              className="w-full px-4 py-2 hover:bg-rose-50 text-rose-600 flex items-center gap-2"
                            >
                              <span>Revoke Key</span>
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Overlaid Modal Panel (Premium Custom Design) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center select-none font-sans">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-xs" onClick={handleCloseModal}></div>

          {/* Modal Container */}
          <div className="relative bg-white w-full max-w-md rounded-2xl border border-zinc-200 shadow-xl overflow-hidden z-10 p-6 animate-scale-in">
            {/* If a new key is successfully generated -> Show Secure Reveal View */}
            {generatedKey ? (
              <div className="space-y-6 text-center">
                <div className="mx-auto h-12 w-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-zinc-900">API Key Generated</h3>
                  <p className="text-xs text-zinc-500 font-medium px-4">
                    For security, we will only display this key value once. Please save it immediately.
                  </p>
                </div>

                {/* Big Copy block */}
                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 flex items-center justify-between gap-3 text-left font-mono text-sm text-zinc-700 tracking-wide select-text">
                  <span className="truncate break-all select-all">{generatedKey}</span>
                  <button
                    onClick={() => handleCopy('modal-copy', generatedKey)}
                    className="p-2 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-lg text-zinc-500 hover:text-zinc-700 shadow-sm transition-all"
                    title="Copy to clipboard"
                  >
                    {copiedKeyId === 'modal-copy' ? (
                      <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                    )}
                  </button>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleCloseModal}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition"
                  >
                    I have saved this key
                  </button>
                </div>
              </div>
            ) : (
              /* Normal input form */
              <form onSubmit={handleCreateKey} className="space-y-5">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                  <h3 className="text-base font-bold text-zinc-900">Create new API Key</h3>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={createLoading}
                    className="text-zinc-400 hover:text-zinc-600 transition"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Error Notification */}
                {createError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs font-bold text-rose-600 flex items-center gap-2 animate-scale-in">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                    {createError}
                  </div>
                )}

                {/* Key Name Input */}
                <div className="space-y-1.5">
                  <label htmlFor="keyName" className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    Key Name
                  </label>
                  <input
                    type="text"
                    id="keyName"
                    required
                    disabled={createLoading}
                    placeholder="e.g. Production Ingestion pipeline"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition placeholder-zinc-400 font-medium"
                  />
                </div>

                {/* Key Environment Dropdown */}
                <div className="space-y-1.5">
                  <label htmlFor="keyEnv" className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    Environment
                  </label>
                  <select
                    id="keyEnv"
                    value={newKeyEnv}
                    disabled={createLoading}
                    onChange={(e) => setNewKeyEnv(e.target.value as any)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm text-zinc-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
                  >
                    <option value="DEVELOPMENT">Development</option>
                    <option value="STAGING">Staging</option>
                    <option value="PRODUCTION">Production</option>
                    <option value="TESTING">Testing</option>
                  </select>
                </div>

                <div className="flex gap-3 justify-end pt-3 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={createLoading}
                    className="px-4 py-2 border border-zinc-200 text-zinc-500 hover:text-zinc-700 rounded-xl text-sm font-semibold transition hover:bg-zinc-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-sm font-semibold shadow-sm transition active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {createLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Generating...</span>
                      </>
                    ) : (
                      'Generate Key'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
