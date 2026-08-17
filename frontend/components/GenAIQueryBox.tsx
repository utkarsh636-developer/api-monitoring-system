'use client';

import React, { useState } from 'react';
import { genaiApi } from '../lib/api';

export default function GenAIQueryBox() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const result = await genaiApi.queryMetricsNL(trimmed);
      setResponse(result);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        err.message ||
        'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-zinc-100 pb-4 mb-5">
        <div className="h-8 w-8 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100 text-indigo-600 flex-shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>
        <div>
          <h3 className="text-base font-bold text-zinc-900">Ask Your Metrics</h3>
          <p className="text-xs text-zinc-400 font-medium mt-0.5">
            Ask a natural-language question about your API data
          </p>
        </div>
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            // Submit on Enter (without Shift)
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e as any);
            }
          }}
          placeholder="e.g. What is the average latency for the checkout endpoint in the last 30 days?"
          rows={2}
          className="w-full text-sm text-zinc-800 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 resize-none placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all duration-150 font-medium"
          disabled={loading}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-400">Press Enter to submit · Shift+Enter for new line</span>
          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl shadow-sm border border-indigo-700/50 hover:shadow transition-all duration-150 cursor-pointer"
          >
            {loading ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Thinking...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
                Ask
              </>
            )}
          </button>
        </div>
      </form>

      {/* Error state */}
      {error && (
        <div className="mt-4 flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 font-medium">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Response */}
      {response && !error && (
        <div className="mt-4 p-4 bg-zinc-50 border border-zinc-100 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Response</span>
          </div>
          <p className="text-sm text-zinc-800 font-medium leading-relaxed whitespace-pre-wrap">{response}</p>
        </div>
      )}
    </div>
  );
}
