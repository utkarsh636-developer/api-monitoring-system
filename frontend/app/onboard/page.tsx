'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '../../lib/api';

export default function OnboardPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onboardingDisabled, setOnboardingDisabled] = useState(false);

  // Check if user is already logged in, or if onboarding is already disabled
  useEffect(() => {
    let active = true;
    async function checkExistingAuth() {
      try {
        const response = await authApi.getProfile();
        if (response.success && response.data && active) {
          router.push('/dashboard');
        }
      } catch (err) {
        // Safe to ignore, user is unauthenticated
      }
    }
    checkExistingAuth();
    return () => {
      active = false;
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await authApi.onboardSuperAdmin({ username, email, password });
      if (response.success) {
        router.push('/dashboard');
      } else {
        setError(response.message || 'Onboarding failed.');
      }
    } catch (err: any) {
      console.error('Onboarding error:', err);
      if (err.response?.status === 403) {
        setOnboardingDisabled(true);
        setError('Super Admin onboarding is disabled because the platform has already been initialized.');
      } else {
        const errMsg = err.response?.data?.message || 'Failed to onboard super admin. Please try again.';
        setError(errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-zinc-50 flex items-center justify-center p-6 font-sans text-zinc-950 select-none overflow-x-hidden">
      
      {/* Background patterns */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50/50 via-zinc-50 to-zinc-50 pointer-events-none"></div>

      <div className="relative bg-white w-full max-w-md rounded-2xl border border-zinc-200 shadow-xl overflow-hidden z-10 p-8">
        
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center gap-4.5 mb-8">
          <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-md shadow-indigo-600/10">
            📡
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">
              System Initialization
            </h1>
            <p className="text-zinc-500 text-xs mt-1 font-medium max-w-xs leading-relaxed">
              Create the primary platform **Super Admin** to configure the monitoring infrastructure.
            </p>
          </div>
        </div>

        {/* Disabled Onboarding Redirect State */}
        {onboardingDisabled ? (
          <div className="space-y-6 text-center animate-scale-in">
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-xs font-semibold text-amber-800 leading-relaxed max-w-sm mx-auto flex flex-col items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center font-extrabold text-sm mb-1">
                ⚠️
              </span>
              <span>
                Onboarding is permanently disabled because a Super Admin account has already been registered in the database.
              </span>
            </div>
            <button
              onClick={() => router.push('/login')}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md active:scale-[0.99] transition duration-150"
            >
              Go to Login Page
            </button>
          </div>
        ) : (
          /* Onboarding Form */
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Error Notification */}
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-xs font-bold text-rose-600 flex items-center gap-2 animate-scale-in">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Username */}
            <div className="space-y-1.5">
              <label htmlFor="username" className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Admin Username
              </label>
              <input
                type="text"
                id="username"
                placeholder="e.g. system_admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-zinc-800 placeholder-zinc-400"
              />
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Admin Email Address
              </label>
              <input
                type="email"
                id="email"
                placeholder="admin@apipulse.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-zinc-800 placeholder-zinc-400"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="pass" className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                id="pass"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-zinc-800 placeholder-zinc-400"
              />
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label htmlFor="confirmPass" className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPass"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-zinc-800 placeholder-zinc-400"
              />
            </div>

            {/* Action buttons */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-600/10 active:scale-[0.99] transition duration-150 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4.5 w-4.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Onboarding Admin...</span>
                  </>
                ) : (
                  'Create Admin Account'
                )}
              </button>
            </div>

            {/* Already onboarded footer */}
            <p className="text-center text-xs text-zinc-400 font-medium pt-2">
              Already onboarded?{' '}
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline"
              >
                Log In
              </button>
            </p>
          </form>
        )}

      </div>
    </div>
  );
}
