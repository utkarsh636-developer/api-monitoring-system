'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, User, Client } from '../../lib/api';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';

interface DashboardContextType {
  user: User | null;
  selectedClientId: string;
  setSelectedClientId: (clientId: string) => void;
  clients: Client[];
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState('all');
  const [clients, setClients] = useState<Client[]>([]);

  // 1. Fetch user profile on mount
  useEffect(() => {
    let active = true;

    async function checkAuth() {
      try {
        const response = await authApi.getProfile();
        if (response.success && response.data && active) {
          setUser(response.data);
        }
      } catch (err) {
        console.warn('Authentication failed, using developer mock profile');
        
        // Development Bypassed State (since login/register pages are not built yet)
        if (active) {
          setUser({
            id: 'dev-user-id-999',
            username: 'Utkarsh',
            email: 'admin@apipulse.com',
            role: 'SUPER_ADMIN', // Toggle this to 'CLIENT_ADMIN' to test different views
            clientId: 'dev-client-id-999',
            createdAt: new Date().toISOString(),
          });
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    checkAuth();

    return () => {
      active = false;
    };
  }, []);

  // 2. Global response interceptor listener (auth:unauthorized)
  useEffect(() => {
    const handleUnauthorized = () => {
      // In production we would redirect:
      // router.push('/login');
      console.warn('Session expired - global event caught');
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [router]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      // In production: router.push('/login');
      alert('Logged out! (Mock redirection bypassed)');
    }
  };

  // Mock list of clients (for Super Admin selector preview)
  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN') {
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
          createdAt: new Date().toISOString(),
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
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);
    }
  }, [user]);

  if (loading) {
    // Loading skeleton screen
    return (
      <div className="flex h-screen w-screen bg-zinc-50 items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative flex h-10 w-10">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-10 w-10 bg-indigo-600 items-center justify-center text-white font-bold text-lg">
              📡
            </span>
          </div>
          <p className="text-sm font-semibold text-zinc-500 animate-pulse">
            Connecting to API Pulse...
          </p>
        </div>
      </div>
    );
  }

  // Determine dynamic header title based on current routing
  const getHeaderTitle = () => {
    return 'Dashboard Overview';
  };

  return (
    <DashboardContext.Provider value={{ user, selectedClientId, setSelectedClientId, clients }}>
      <div className="flex h-screen overflow-hidden bg-zinc-50 font-sans">
        {/* Left Navigation Sidebar */}
        <Sidebar user={user} onLogout={handleLogout} />

        {/* Right Content Frame */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header
            user={user}
            title={getHeaderTitle()}
            clients={clients}
            selectedClientId={selectedClientId}
            onClientChange={setSelectedClientId}
          />

          {/* Main Scrollable Viewport */}
          <main className="flex-1 overflow-y-auto p-8 bg-zinc-50">
            {children}
          </main>
        </div>
      </div>
    </DashboardContext.Provider>
  );
}
