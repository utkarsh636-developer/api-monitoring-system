'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User } from '../lib/api';

interface SidebarProps {
  user: User | null;
  onLogout: () => void;
}

export default function Sidebar({ user, onLogout }: SidebarProps) {
  const pathname = usePathname();

  // Navigation tabs configured with access permissions
  const navItems = [
    {
      name: 'Overview',
      href: '/dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
        </svg>
      ),
      roles: ['SUPER_ADMIN', 'CLIENT_ADMIN', 'CLIENT_VIEWER'],
    },
    {
      name: 'Clients',
      href: '/dashboard/clients',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      roles: ['SUPER_ADMIN'], // Super Admin Only
    },
    {
      name: 'API Keys',
      href: '/dashboard/keys',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m0 0a2 2 0 01-2 2m2-2h3m-3 0H9M3 12a9 9 0 0115 0M3 12a9 9 0 0015 0M3 12A9 9 0 1118 12M3 12a9 9 0 1015 0" />
        </svg>
      ),
      roles: ['SUPER_ADMIN', 'CLIENT_ADMIN'], // Client Admin & Super Admin
    },
    {
      name: 'Settings',
      href: '/dashboard/settings',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      roles: ['SUPER_ADMIN', 'CLIENT_ADMIN'],
    },
  ];

  const userRole = user?.role || 'CLIENT_VIEWER';
  const visibleItems = navItems.filter((item) => item.roles.includes(userRole));

  // Determine role styling badges
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-rose-50 text-rose-600 border border-rose-100';
      case 'CLIENT_ADMIN':
        return 'bg-indigo-50 text-indigo-600 border border-indigo-100';
      default:
        return 'bg-zinc-100 text-zinc-600 border border-zinc-200';
    }
  };

  const formatRole = (role: string) => {
    return role.replace('_', ' ');
  };

  return (
    <aside className="w-64 bg-white border-r border-zinc-200 flex flex-col h-screen text-zinc-600 select-none">
      {/* Brand Logo Section */}
      <div className="h-16 px-6 border-b border-zinc-200 flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
          <svg className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <span className="font-bold text-zinc-900 text-lg tracking-tight">API Pulse</span>
          <span className="text-[10px] block text-zinc-400 font-mono -mt-1">MONITOR v1.0</span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider px-3 mb-3">
          Navigation
        </div>
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100/50'
                  : 'hover:bg-zinc-50 hover:text-zinc-900'
              }`}
            >
              <span className={`${isActive ? 'text-indigo-600' : 'text-zinc-400 group-hover:text-zinc-500'}`}>
                {item.icon}
              </span>
              <span>{item.name}</span>
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Profile Container (Tabela Bottom Profile style) */}
      <div className="p-4 border-t border-zinc-200 bg-zinc-50/50">
        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-150/30 transition-colors duration-200">
          <div className="h-10 w-10 rounded-full bg-zinc-200 border border-zinc-300 flex items-center justify-center text-zinc-700 font-semibold text-sm">
            {user?.username?.substring(0, 2).toUpperCase() || 'US'}
          </div>
          <div className="flex-1 min-w-0">
            <span className="block text-sm font-semibold text-zinc-800 truncate">
              {user?.username || 'Guest Developer'}
            </span>
            <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-md mt-0.5 uppercase tracking-wider font-mono ${getRoleBadge(userRole)}`}>
              {formatRole(userRole)}
            </span>
          </div>
          <button
            onClick={onLogout}
            title="Log Out"
            className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-200/50 hover:text-rose-600 transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
