import React, { useState, useEffect } from 'react';
import { FileText, Plus, Download, Eye, Trash2, Edit2, Settings } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  type: string;
  content: string;
  variables: string;
  isDefault: boolean;
}

interface GeneratedDoc {
  id: string;
  title: string;
  type: string;
  content: string;
  pdfUrl?: string;
  createdAt: string;
  lead?: { name: string };
  createdBy: { name: string };
}

const DocumentsTab: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [documents, setDocuments] = useState<GeneratedDoc[]>([]);
  const [leads, setLeads] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [previewDoc, setPreviewDoc] = useState<GeneratedDoc | null>(null);

  const [templateForm, setTemplateForm] = useState({
    name: '',
    type: 'PROPOSAL',
    content: '',
    variables: '[]',
    isDefault: false,
  });

  const [generateForm, setGenerateForm] = useState({
    templateId: '',
    leadId: '',
    title: '',
    variables: '{}',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [templatesRes, docsRes] = await Promise.all([
        fetch('/api/documents/templates'),
        fetch('/api/documents'),
      ]);
      const [templatesData, docsData] = await Promise.all([
        templatesRes.json(),
        docsRes.json(),
      ]);
      setTemplates(templatesData);
      setDocuments(docsData);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingTemplate ? `/api/documents/templates/${editingTemplate.id}` : '/api/documents/templates';
      const method = editingTemplate ? 'PUT' : 'POST';

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateForm),
      });

      await loadData();
      resetTemplateForm();
    } catch (error) {
      console.error('Failed to save template:', error);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    try {
      await fetch(`/api/documents/templates/${id}`, { method: 'DELETE' });
      await loadData();
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const handleGenerateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...generateForm,
          variables: JSON.parse(generateForm.variables),
        }),
      });
      await loadData();
      setShowGenerateForm(false);
      setGenerateForm({ templateId: '', leadId: '', title: '', variables: '{}' });
    } catch (error) {
      console.error('Failed to generate document:', error);
    }
  };

  const handleDownloadPDF = async (doc: GeneratedDoc) => {
    try {
      const response = await fetch(`/api/documents/${doc.id}/pdf`);
      const data = await response.json();

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(data.html);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
      }
    } catch (error) {
      console.error('Failed to download PDF:', error);
    }
  };

  const resetTemplateForm = () => {
    setTemplateForm({ name: '', type: 'PROPOSAL', content: '', variables: '[]', isDefault: false });
    setEditingTemplate(null);
    setShowTemplateForm(false);
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      PROPOSAL: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      CONTRACT: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      NDA: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      QUOTE: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
      INVOICE: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      CUSTOM: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
    };
    return colors[type] || colors.CUSTOM;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading documents...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-sky-400" />
            Documents & Templates
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Generate proposals, contracts, and quotes from templates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGenerateForm(true)}
            className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="w-3 h-3" />
            Generate
          </button>
          <button
            onClick={() => setShowTemplateForm(true)}
            className="flex items-center gap-1 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="w-3 h-3" />
            New Template
          </button>
        </div>
      </div>

      {/* Templates */}
      <section className="bg-slate-950/40 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4 text-slate-400" />
          Templates
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {templates.map((template) => (
            <div key={template.id} className="bg-slate-900/50 border border-slate-850 rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{template.name}</span>
                    {template.isDefault && (
                      <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-sky-500/10 text-sky-400">
                        Default
                      </span>
                    )}
                  </div>
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${getTypeColor(template.type)}`}>
                    {template.type.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingTemplate(template);
                      setTemplateForm({
                        name: template.name,
                        type: template.type,
                        content: template.content,
                        variables: template.variables,
                        isDefault: template.isDefault,
                      });
                      setShowTemplateForm(true);
                    }}
                    className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-3 h-3 text-slate-400" />
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="p-1.5 hover:bg-red-900/30 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-500 line-clamp-2">
                {template.content.replace(/<[^>]*>/g, '').slice(0, 100)}...
              </p>
            </div>
          ))}
          {templates.length === 0 && (
            <div className="col-span-full text-center py-6 text-slate-500 text-xs">
              No templates yet. Create your first template to get started.
            </div>
          )}
        </div>
      </section>

      {/* Generated Documents */}
      <section className="bg-slate-950/40 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-400" />
          Generated Documents
        </h3>
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="bg-slate-900/50 border border-slate-850 rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">{doc.title}</span>
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${getTypeColor(doc.type)}`}>
                    {doc.type}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Created by {doc.createdBy.name} • {new Date(doc.createdAt).toLocaleDateString('en-US')}
                  {doc.lead && ` • For: ${doc.lead.name}`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewDoc(doc)}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                  title="Preview"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button
                  onClick={() => handleDownloadPDF(doc)}
                  className="p-2 hover:bg-emerald-900/30 rounded-lg transition-colors"
                  title="Download PDF"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                </button>
              </div>
            </div>
          ))}
          {documents.length === 0 && (
            <div className="text-center py-6 text-slate-500 text-xs">
              No documents generated yet. Generate a document from a template.
            </div>
          )}
        </div>
      </section>

      {/* Template Form Modal */}
      {showTemplateForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-bold text-white mb-4">
              {editingTemplate ? 'Edit Template' : 'New Template'}
            </h3>
            <form onSubmit={handleCreateTemplate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                    Type
                  </label>
                  <select
                    value={templateForm.type}
                    onChange={(e) => setTemplateForm({ ...templateForm, type: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  >
                    <option value="PROPOSAL">Proposal</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="NDA">NDA</option>
                    <option value="QUOTE">Quote</option>
                    <option value="INVOICE">Invoice</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Template Content (HTML)
                </label>
                <textarea
                  value={templateForm.content}
                  onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  rows={10}
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Variables (JSON array)
                </label>
                <input
                  type="text"
                  value={templateForm.variables}
                  onChange={(e) => setTemplateForm({ ...templateForm, variables: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  placeholder='["lead_name", "company_name", "agent_name"]'
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={templateForm.isDefault}
                    onChange={(e) => setTemplateForm({ ...templateForm, isDefault: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-800"
                  />
                  <span className="text-xs text-slate-300">Set as default</span>
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                >
                  {editingTemplate ? 'Update' : 'Create'} Template
                </button>
                <button
                  type="button"
                  onClick={resetTemplateForm}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generate Document Modal */}
      {showGenerateForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-sm font-bold text-white mb-4">Generate Document</h3>
            <form onSubmit={handleGenerateDocument} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Template
                </label>
                <select
                  value={generateForm.templateId}
                  onChange={(e) => setGenerateForm({ ...generateForm, templateId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  required
                >
                  <option value="">Select template</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>{template.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Document Title
                </label>
                <input
                  type="text"
                  value={generateForm.title}
                  onChange={(e) => setGenerateForm({ ...generateForm, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Lead (optional - auto-fills variables)
                </label>
                <select
                  value={generateForm.leadId}
                  onChange={(e) => setGenerateForm({ ...generateForm, leadId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                >
                  <option value="">None</option>
                  {leads.map((lead) => (
                    <option key={lead.id} value={lead.id}>{lead.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 rounded-lg transition-colors"
                >
                  Generate Document
                </button>
                <button
                  type="button"
                  onClick={() => setShowGenerateForm(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">{previewDoc.title}</h3>
              <button
                onClick={() => setPreviewDoc(null)}
                className="text-slate-400 hover:text-white"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div
              className="bg-white rounded-lg p-6 text-slate-900"
              dangerouslySetInnerHTML={{ __html: previewDoc.content }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentsTab;
