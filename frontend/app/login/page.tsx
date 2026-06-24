'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already logged in, redirect to dashboard if they are
  useEffect(() => {
    let active = true;
    async function checkExistingAuth() {
      try {
        const response = await authApi.getProfile();
        if (response.success && response.data && active) {
          router.push('/dashboard');
        }
      } catch (err) {
        // Not logged in, stay on login page
      }
    }
    checkExistingAuth();
    return () => {
      active = false;
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await authApi.login({ username, password });
      if (response.success) {
        router.push('/dashboard');
      } else {
        setError(response.message || 'Login failed. Please verify credentials.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const errMsg = err.response?.data?.message || 'Invalid username or password.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex bg-white font-sans text-zinc-900 select-none overflow-x-hidden">
      
      {/* LEFT COLUMN: LOGIN FORM */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 lg:px-24 xl:px-32 py-12 relative">
        <div className="max-w-md w-full mx-auto space-y-8">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-md shadow-indigo-600/10">
              📡
            </div>
            <span className="text-xl font-bold tracking-tight text-zinc-900">API Pulse</span>
          </div>

          {/* Titles */}
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">
              Log in to your account.
            </h1>
            <p className="text-zinc-500 text-sm font-medium">
              Enter your username and password to log in.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Error Notification */}
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-xs font-bold text-rose-600 flex items-center gap-2 animate-scale-in">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                {error}
              </div>
            )}

            {/* Username Field */}
            <div className="space-y-1.5 relative">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                  <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  className="w-full pl-10.5 pr-4 py-3 bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-zinc-800 placeholder-zinc-400"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                  <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full pl-10.5 pr-10 py-3 bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-zinc-800 placeholder-zinc-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  {showPassword ? (
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
              </div>
            </div>

            {/* Forgot Password */}
            <div className="flex justify-end">
              <a href="#" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
                Forgot password?
              </a>
            </div>

            {/* Submit Button */}
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
                  <span>Logging in...</span>
                </>
              ) : (
                'Login'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center py-1">
            <div className="absolute inset-x-0 border-b border-zinc-100"></div>
            <span className="relative px-3 bg-white text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              or
            </span>
          </div>

          {/* Social Buttons */}
          <div className="grid grid-cols-2 gap-3.5">
            <button
              type="button"
              onClick={() => alert('Social sign-in is disabled in development mode.')}
              className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl text-xs font-bold text-zinc-700 active:scale-[0.99] transition duration-150 shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.99 5.99 0 018 12.527a5.99 5.99 0 015.99-5.99c2.316 0 4.223 1.3 5.161 3.204l3.636-2.11C20.67 3.513 16.685 1.5 12 1.5 5.648 1.5.5 6.648.5 13s5.148 11.5 11.5 11.5c6.262 0 11.455-5.148 11.455-11.5 0-.74-.093-1.48-.26-2.215H12.24z"/>
              </svg>
              Google
            </button>
            <button
              type="button"
              onClick={() => alert('Social sign-in is disabled in development mode.')}
              className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl text-xs font-bold text-zinc-700 active:scale-[0.99] transition duration-150 shadow-sm"
            >
              <svg className="w-4 h-4" fill="#1877F2" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook
            </button>
          </div>

          {/* Footer link to onboard page */}
          <p className="text-center text-xs text-zinc-500 font-medium pt-2">
            Don't you have an account?{' '}
            <button
              type="button"
              onClick={() => router.push('/onboard')}
              className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline"
            >
              Sign Up
            </button>
          </p>

        </div>
      </div>

      {/* RIGHT COLUMN: BRAND & PREVIEW PANEL */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-tr from-indigo-700 via-indigo-600 to-violet-600 relative overflow-hidden items-center justify-center p-12">
        {/* Subtle decorative circles */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full filter blur-3xl transform translate-x-20 -translate-y-20"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full filter blur-3xl transform -translate-x-20 translate-y-20"></div>

        <div className="relative max-w-lg w-full flex flex-col items-center gap-12 text-center text-white z-10 select-none">
          
          {/* Mockup Dashboard Panel Layout */}
          <div className="relative w-full aspect-[4/3] bg-zinc-900/10 backdrop-blur-md rounded-2xl border border-white/10 p-5 shadow-2xl flex flex-col gap-4 animate-scale-in">
            {/* Header frame inside mockup */}
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/80"></span>
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/80"></span>
                <span className="h-2.5 w-2.5 rounded-full bg-green-400/80"></span>
              </div>
              <div className="px-3 py-0.5 rounded-md bg-white/5 text-[9px] font-semibold text-white/50 tracking-wider">
                apipulse.com/dashboard
              </div>
            </div>

            {/* Dashboard Mock Content */}
            <div className="flex-1 grid grid-cols-3 gap-3.5 text-left text-white/90">
              
              {/* Sidebar list mock */}
              <div className="col-span-1 border-r border-white/5 pr-3 flex flex-col gap-2 pt-1.5">
                <div className="h-3 w-full bg-white/15 rounded-md"></div>
                <div className="h-3 w-5/6 bg-white/10 rounded-md"></div>
                <div className="h-3 w-4/6 bg-white/5 rounded-md"></div>
                <div className="h-3 w-5/6 bg-white/5 rounded-md"></div>
              </div>

              {/* Main content pane mock */}
              <div className="col-span-2 space-y-4 pt-1.5">
                
                {/* Stats block */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-white/5 rounded-xl border border-white/5 flex flex-col gap-1">
                    <span className="text-[8px] text-white/40 font-bold uppercase tracking-wider">Requests</span>
                    <span className="text-xs font-extrabold font-mono">1.2M</span>
                  </div>
                  <div className="p-2.5 bg-white/5 rounded-xl border border-white/5 flex flex-col gap-1">
                    <span className="text-[8px] text-white/40 font-bold uppercase tracking-wider">Latency</span>
                    <span className="text-xs font-extrabold font-mono text-emerald-400">12 ms</span>
                  </div>
                </div>

                {/* Micro Chart Mockup */}
                <div className="h-20 bg-white/5 rounded-xl border border-white/5 p-3 flex flex-col justify-end relative overflow-hidden">
                  <div className="absolute top-2.5 left-3 text-[8px] font-bold text-white/40 uppercase tracking-wider">Traffic Load</div>
                  <div className="flex items-end gap-1.5 h-10 w-full">
                    <div className="w-full bg-indigo-400/30 rounded-t h-4 animate-pulse"></div>
                    <div className="w-full bg-indigo-400/40 rounded-t h-6"></div>
                    <div className="w-full bg-indigo-400/60 rounded-t h-8"></div>
                    <div className="w-full bg-indigo-400/30 rounded-t h-5"></div>
                    <div className="w-full bg-indigo-400/50 rounded-t h-7"></div>
                    <div className="w-full bg-indigo-400/90 rounded-t h-9"></div>
                  </div>
                </div>

              </div>

            </div>

            {/* Overlaid Latency Alert Pill */}
            <div className="absolute -left-6 bottom-16 bg-white border border-zinc-150 rounded-2xl p-3 shadow-xl flex items-center gap-3 text-zinc-800 animate-bounce max-w-[150px]">
              <div className="h-8 w-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500 text-sm">
                ⚡
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider">Status</span>
                <span className="text-xs font-extrabold text-zinc-900 leading-tight">99.9% Health</span>
              </div>
            </div>

            {/* Overlaid API keys pill */}
            <div className="absolute -right-8 top-12 bg-white border border-zinc-150 rounded-2xl p-3.5 shadow-xl flex items-center gap-3 text-zinc-800 max-w-[170px]">
              <div className="h-8 w-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 text-sm font-bold">
                🔑
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider">Active Keys</span>
                <span className="text-xs font-extrabold text-zinc-900 leading-tight">Secure Ingestion</span>
              </div>
            </div>

          </div>

          {/* Subtitles below Mockup */}
          <div className="space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              The easiest way to monitor your APIs.
            </h2>
            <p className="text-indigo-100 text-sm max-w-sm mx-auto leading-relaxed font-medium opacity-90">
              Track latency spikes, analyze HTTP status flows, and secure your systems with API Pulse.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
