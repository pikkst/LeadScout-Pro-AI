import React from 'react';

export const AppFooter: React.FC = () => (
  <footer className="mt-16 pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6 text-slate-500 text-[10px] font-bold uppercase">
    <p>&copy; {new Date().getFullYear()} LeadScout PRO AI. All rights reserved.</p>
    <div className="flex gap-8">
      <span className="flex items-center gap-2 opacity-80">
        <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-ping" />
        AI Node Sync: Secure Connected
      </span>
      <span className="text-slate-500 opacity-60">Autonomous LeadScout Engine v4.8</span>
    </div>
  </footer>
);
