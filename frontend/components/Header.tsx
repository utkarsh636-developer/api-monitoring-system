'use client';

import React, { useState, useEffect } from 'react';
import { User, Client } from '../lib/api';

interface HeaderProps {
  user: User | null;
  title: string;
  clients?: Client[];
  selectedClientId?: string;
  onClientChange?: (clientId: string) => void;
  onGenerateKey?: () => void;
}

export default function Header({
  user,
  title,
  clients = [],
  selectedClientId = 'all',
  onClientChange,
  onGenerateKey,
}: HeaderProps) {
  const [formattedDate, setFormattedDate] = useState('');

  useEffect(() => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    setFormattedDate(new Date().toLocaleDateString('en-US', options));
  }, []);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isClientAdmin = user?.role === 'CLIENT_ADMIN';

  return (
    <header className="h-16 border-b border-zinc-200 bg-white flex items-center justify-between px-8 select-none">
      {/* Page Title & Date */}
      <div>
        <h1 className="text-xl font-bold text-zinc-900 tracking-tight">{title}</h1>
        {formattedDate && (
          <p className="text-xs text-zinc-500 font-medium mt-0.5">{formattedDate}</p>
        )}
      </div>

      {/* Center Search Bar */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
        <div className="relative w-full">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search endpoints, services or status codes..."
            className="w-full pl-9 pr-4 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 text-zinc-800 placeholder-zinc-400"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Dynamic controls based on user role */}
        {isSuperAdmin && onClientChange && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Viewing:</span>
            <select
              value={selectedClientId}
              onChange={(e) => onClientChange(e.target.value)}
              className="bg-zinc-50 border border-zinc-200 text-zinc-800 text-sm font-medium rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
            >
              <option value="all">All Clients (Platform Global)</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {isClientAdmin && onGenerateKey && (
          <button
            onClick={onGenerateKey}
            className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-[0.98] transition-all duration-150"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Generate API Key
          </button>
        )}

        {/* Small avatar fallback in header */}
        <div className="h-8 w-8 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-600 font-semibold text-xs md:hidden">
          {user?.username?.substring(0, 2).toUpperCase() || 'US'}
        </div>
      </div>
    </header>
  );
}
