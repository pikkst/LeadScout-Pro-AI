import React from 'react';
import { OutreachPitch } from '../types';
import { FileCode, FileText } from 'lucide-react';

export interface PitchPreviewModalProps {
  pitch: OutreachPitch;
  isPreviewMode: boolean;
  editedSubject: string;
  editedBody: string;
  onClose: () => void;
  onTogglePreviewMode: () => void;
  onToggleEditorMode: () => void;
  onSubjectChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onSave: () => void;
}

export const PitchPreviewModal: React.FC<PitchPreviewModalProps> = ({
  pitch,
  isPreviewMode,
  editedSubject,
  editedBody,
  onClose,
  onTogglePreviewMode,
  onToggleEditorMode,
  onSubjectChange,
  onBodyChange,
  onSave,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">

        <div className="bg-slate-950 p-4 border-b border-slate-850 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-white text-base">Custom Proposal Editor & Previewer</h3>
            <p className="text-xs text-slate-500">Formulating B2B partnership outreach templates on behalf of your company</p>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 font-bold text-xs bg-slate-900 border border-slate-850 px-3 py-1.5 rounded-lg transition-colors"
          >
            Close (ESC)
          </button>
        </div>

        <div className="p-4 bg-slate-950/40 border-b border-slate-850 space-y-2.5">
          <div className="flex items-center gap-4 text-xs">
            <span className="w-16 text-slate-500 font-bold uppercase tracking-wider">Recipient:</span>
            <span className="font-mono text-sky-400 font-semibold">{pitch.leadEmail}</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="w-16 text-slate-500 font-bold uppercase tracking-wider">Subject:</span>
            <input
              type="text"
              value={editedSubject}
              onChange={(e) => onSubjectChange(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 font-semibold flex-grow focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>

        <div className="flex border-b border-slate-850 bg-slate-950/20">
          <button
            onClick={onTogglePreviewMode}
            className={`px-4 py-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
              isPreviewMode
                ? 'border-sky-500 text-sky-400 bg-sky-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-4 h-4" />
            Live Brand HTML Preview
          </button>
          <button
            onClick={onToggleEditorMode}
            className={`px-4 py-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
              !isPreviewMode
                ? 'border-sky-500 text-sky-400 bg-sky-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            Raw Source Editor
          </button>
        </div>

        <div className="flex-grow p-5 overflow-y-auto bg-slate-950/20 max-h-[50vh]">
          {isPreviewMode ? (
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-white min-h-[380px]">
              <iframe
                title="B2B Proposal Preview"
                srcDoc={editedBody}
                sandbox="allow-same-origin"
                className="w-full h-[400px] border-none bg-white"
              />
            </div>
          ) : (
            <textarea
              value={editedBody}
              onChange={(e) => onBodyChange(e.target.value)}
              className="w-full h-[400px] bg-slate-950 text-slate-300 font-mono text-xs p-4 rounded-xl border border-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="Paste or write HTML body markup here..."
            />
          )}
        </div>

        <div className="bg-slate-950 p-4 border-t border-slate-850 flex justify-between items-center">
          <span className="text-[10px] text-slate-500 font-mono">
            Language context: {pitch.language}
          </span>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs bg-slate-900 hover:bg-slate-850 text-slate-400 border border-slate-800 px-4 py-2 rounded-lg font-bold uppercase transition-colors"
            >
              Discard Changes
            </button>
            <button
              type="button"
              onClick={onSave}
              className="text-xs bg-sky-600 hover:bg-sky-500 text-white px-5 py-2 rounded-lg font-bold uppercase tracking-wider transition-colors"
            >
              Save Draft Changes
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
