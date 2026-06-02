import React, { useState } from 'react';
import { Wrench, Send, AlertCircle, Building2, Package, Maximize, Pencil, X } from 'lucide-react';
import { AppConfig } from '../hooks/useWingConfig';
import { useLang } from '../LanguageContext';

interface MaintenanceTabProps {
  config?: AppConfig;
  isAdmin?: boolean;
  updateConfig?: (updates: Partial<AppConfig>) => Promise<void>;
  forceMode?: 'view' | 'edit';
}

export function MaintenanceTab({ config, isAdmin, updateConfig, forceMode = 'view' }: MaintenanceTabProps) {
  const { t, lang } = useLang();
  const [ala, setAla] = useState('');
  const [quarto, setQuarto] = useState('');
  const [comum, setComum] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(forceMode === 'edit');
  
  const defField1 = 'Pendências na Ala (informe a Ala)';
  const defField2 = 'Pendências no Quarto (informe o quarto)';
  const defField3 = 'Manutenções nos Espaços em Comum';
  const defDesc = 'Preencha os campos abaixo com os problemas encontrados na ala ou no seu quarto. Ao clicar em enviar, sua solicitação será registrada automaticamente e enviada para a administração providenciar os reparos.';

  const displayField1 = lang === 'en' && (config?.maintenanceField1Title === defField1 || !config?.maintenanceField1Title) ? t.maintenanceField1 : (config?.maintenanceField1Title || t.maintenanceField1);
  const displayField2 = lang === 'en' && (config?.maintenanceField2Title === defField2 || !config?.maintenanceField2Title) ? t.maintenanceField2 : (config?.maintenanceField2Title || t.maintenanceField2);
  const displayField3 = lang === 'en' && (config?.maintenanceField3Title === defField3 || !config?.maintenanceField3Title) ? t.maintenanceField3 : (config?.maintenanceField3Title || t.maintenanceField3);
  const displayDesc = lang === 'en' && (config?.maintenanceDescription === defDesc || !config?.maintenanceDescription) ? t.maintenanceDefaultDesc : (config?.maintenanceDescription || t.maintenanceDefaultDesc);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccess(false);

    const formData = new URLSearchParams();
    if (ala.trim()) formData.append('ala', ala.trim());
    if (quarto.trim()) formData.append('quarto', quarto.trim());
    if (comum.trim()) formData.append('comum', comum.trim());

    const submitUrl = 'https://script.google.com/macros/s/AKfycbythpANWi_f1uZxgRUPV1s3HovOpaefe4dnPIy7AtOrmfpopasGWlhJclzMX76936x8/exec';

    try {
      await fetch(submitUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
      });
      setSuccess(true);
      setAla('');
      setQuarto('');
      setComum('');
      setTimeout(() => setSuccess(false), 5000);
    } catch (error) {
      console.error('Error submitting form:', error);
      alert(t.maintenanceError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
        <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
        <p className="text-red-200 text-sm font-medium">Este recurso ainda não está no ar. As solicitações de manutenção enviadas por aqui não serão processadas no momento.</p>
      </div>

      <div className="bg-sky-900/20 border border-sky-800/50 rounded-2xl p-6 flex items-start gap-4 shadow-sm">
        <div className="p-3 bg-sky-900/40 rounded-xl shrink-0">
          <AlertCircle className="w-6 h-6 text-sky-400" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1 gap-4">
            <h2 className="text-lg font-bold text-sky-100">{t.maintenanceTitle}</h2>
            {isAdmin && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 bg-sky-900/40 hover:bg-sky-800/60 rounded-lg text-sky-300 transition-colors shrink-0"
                title={t.editTexts}
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-sky-300/80 text-sm leading-relaxed">
            {displayDesc}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-2xl p-6 shadow-sm focus-within:border-sky-500/50 transition-colors">
          <label htmlFor="ala" className="flex items-center gap-2 text-sm font-semibold text-neutral-300 mb-3">
            <Building2 className="w-4 h-4 text-sky-400" />
            {displayField1}
          </label>
          <textarea
            id="ala"
            rows={3}
            value={ala}
            onChange={(e) => setAla(e.target.value)}
            placeholder={t.maintenanceField1Placeholder}
            className="w-full bg-neutral-900/50 border border-neutral-700/50 rounded-xl px-4 py-3 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 resize-none transition-all"
          />
        </div>

        <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-2xl p-6 shadow-sm focus-within:border-emerald-500/50 transition-colors">
          <label htmlFor="quarto" className="flex items-center gap-2 text-sm font-semibold text-neutral-300 mb-3">
            <Wrench className="w-4 h-4 text-sky-400" />
            {displayField2}
          </label>
          <textarea
            id="quarto"
            rows={3}
            value={quarto}
            onChange={(e) => setQuarto(e.target.value)}
            placeholder={t.maintenanceField2Placeholder}
            className="w-full bg-neutral-900/50 border border-neutral-700/50 rounded-xl px-4 py-3 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none transition-all"
          />
        </div>

        <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-2xl p-6 shadow-sm focus-within:border-amber-500/50 transition-colors">
          <label htmlFor="comum" className="flex items-center gap-2 text-sm font-semibold text-neutral-300 mb-3">
            <Package className="w-4 h-4 text-sky-400" />
            {displayField3}
          </label>
          <textarea
            id="comum"
            rows={3}
            value={comum}
            onChange={(e) => setComum(e.target.value)}
            placeholder={t.maintenanceField3Placeholder}
            className="w-full bg-neutral-900/50 border border-neutral-700/50 rounded-xl px-4 py-3 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none transition-all"
          />
        </div>

        {success && (
          <div className="bg-emerald-900/40 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-xl flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            {t.maintenanceSuccess}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <button
            type="submit"
            disabled={(!ala.trim() && !quarto.trim() && !comum.trim()) || isSubmitting}
            className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-sm w-full sm:w-auto justify-center shrink-0 ml-auto"
          >
            <Send className="w-5 h-5" />
            {isSubmitting ? t.sending : t.send}
          </button>
        </div>
      </form>

      {isEditing && (
        <MaintenanceSettingsModal
          config={config}
          onClose={() => setIsEditing(false)}
          onSave={async (updates) => {
            if (updateConfig) await updateConfig(updates);
            setIsEditing(false);
          }}
        />
      )}
    </div>
  );
}

function MaintenanceSettingsModal({
  config,
  onClose,
  onSave
}: {
  config?: AppConfig;
  onClose: () => void;
  onSave: (updates: Partial<AppConfig>) => Promise<void>;
}) {
  const [description, setDescription] = useState(config?.maintenanceDescription ?? 'Preencha os campos abaixo com os problemas encontrados na ala ou no seu quarto. Ao clicar em enviar, sua solicitação será registrada automaticamente e enviada para a administração providenciar os reparos.');
  const [field1, setField1] = useState(config?.maintenanceField1Title ?? 'Pendências na Ala (informe a Ala)');
  const [field2, setField2] = useState(config?.maintenanceField2Title ?? 'Pendências no Quarto (informe o quarto)');
  const [field3, setField3] = useState(config?.maintenanceField3Title ?? 'Manutenções nos Espaços em Comum');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave({
      maintenanceDescription: description,
      maintenanceField1Title: field1,
      maintenanceField2Title: field2,
      maintenanceField3Title: field3
    });
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/50">
          <h2 className="text-xl font-bold text-neutral-100 flex items-center gap-2">
            <Pencil className="w-5 h-5 text-sky-400" />
            Editar Textos da Aba
          </h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">Descrição</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-sky-500/50 resize-none"
              rows={3}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">Título do Campo 1 (Ala)</label>
            <input
              type="text"
              value={field1}
              onChange={e => setField1(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">Título do Campo 2 (Quarto)</label>
            <input
              type="text"
              value={field2}
              onChange={e => setField2(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">Título do Campo 3 (Espaços Comuns)</label>
            <input
              type="text"
              value={field3}
              onChange={e => setField3(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-neutral-400 hover:text-white font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white px-6 py-2 rounded-xl font-medium transition-colors"
            >
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
