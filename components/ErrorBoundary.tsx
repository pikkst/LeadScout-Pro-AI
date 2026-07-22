import React from 'react';

export class ErrorBoundary extends React.Component<{ children?: React.ReactNode }, { error: Error | null }> {
  declare readonly props: Readonly<{ children?: React.ReactNode }>;
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) { console.error('Application render failed', error, info); }
  render() {
    if (!this.state.error) return this.props.children;
    return <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-slate-100"><div role="alert" className="max-w-lg rounded-2xl border border-rose-500/30 bg-slate-900 p-8"><h1 className="text-xl font-black">This page could not be displayed</h1><p className="mt-2 text-sm text-slate-400">Your data is safe. Reload the page to retry; if the problem continues, copy the error below for support.</p><pre className="mt-4 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-rose-300">{this.state.error.message}</pre><button type="button" onClick={() => window.location.reload()} className="mt-5 rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white">Reload page</button></div></main>;
  }
}
