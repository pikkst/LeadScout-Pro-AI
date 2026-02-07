
import React from 'react';

interface AgentTerminalProps {
  logs: string[];
}

const AgentTerminal: React.FC<AgentTerminalProps> = ({ logs }) => {
  const terminalRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="bg-black border border-slate-700 rounded-lg p-4 font-mono text-xs md:text-sm h-64 flex flex-col">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-2">
        <div className="w-3 h-3 rounded-full bg-red-500" />
        <div className="w-3 h-3 rounded-full bg-yellow-500" />
        <div className="w-3 h-3 rounded-full bg-green-500" />
        <span className="text-slate-500 ml-2">Agent Terminal v1.0.4</span>
      </div>
      <div 
        ref={terminalRef}
        className="overflow-y-auto flex-grow space-y-1 scrollbar-thin scrollbar-thumb-slate-700"
      >
        {logs.length === 0 && <div className="text-slate-600 italic">Awaiting instructions...</div>}
        {logs.map((log, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-emerald-500">[{new Date().toLocaleTimeString()}]</span>
            <span className="text-slate-300">{log}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AgentTerminal;
