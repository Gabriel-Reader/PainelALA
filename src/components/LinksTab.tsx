import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import { ExternalLink, Plus, Pencil, Trash2, X } from 'lucide-react';
import { AppLink, AppConfig } from '../hooks/useWingConfig';
import { useLang } from '../LanguageContext';
import { ConfirmModal } from './ConfirmModal';

const DEFAULT_LINKS: AppLink[] = [
  {
    id: 'link-1',
    href: 'https://docs.google.com/forms/d/e/1FAIpQLScxlLRG-_D7jWz-gR0vx6NP6p4pVgY49MiukudZmbx4c5pxUg/viewform?usp=pp_url',
    color: 'sky',
    iconName: 'Wrench',
    title: 'Solicitação de manutenção',
    description: 'Formulário oficial para reparos na ala.',
  },
  {
    id: 'link-2',
    href: 'https://mapafurg.vercel.app/',
    color: 'emerald',
    iconName: 'Link2',
    title: 'App Mapa FURG',
    description: 'Localize-se facilmente no campus.',
  },
  {
    id: 'link-3',
    href: 'https://hopping-fresh-cycle-hub.base44.app',
    color: 'indigo',
    iconName: 'Droplets',
    title: 'Agendamento Lavadora',
    description: 'Escala de uso das máquinas de lavar.',
  },
];

const COLOR_MAP: Record<string, { bg: string; hoverBg: string; text: string; hoverText: string; borderHover: string }> = {
  sky: { bg: 'bg-sky-900/30', hoverBg: 'group-hover:bg-sky-900/50', text: 'text-sky-400', hoverText: 'group-hover:text-sky-400', borderHover: 'hover:border-sky-500/50' },
  emerald: { bg: 'bg-emerald-900/30', hoverBg: 'group-hover:bg-emerald-900/50', text: 'text-emerald-400', hoverText: 'group-hover:text-emerald-400', borderHover: 'hover:border-emerald-500/50' },
  indigo: { bg: 'bg-indigo-900/30', hoverBg: 'group-hover:bg-indigo-900/50', text: 'text-indigo-400', hoverText: 'group-hover:text-indigo-400', borderHover: 'hover:border-indigo-500/50' },
  amber: { bg: 'bg-amber-900/30', hoverBg: 'group-hover:bg-amber-900/50', text: 'text-amber-400', hoverText: 'group-hover:text-amber-400', borderHover: 'hover:border-amber-500/50' },
  pink: { bg: 'bg-pink-900/30', hoverBg: 'group-hover:bg-pink-900/50', text: 'text-pink-400', hoverText: 'group-hover:text-pink-400', borderHover: 'hover:border-pink-500/50' },
  purple: { bg: 'bg-purple-900/30', hoverBg: 'group-hover:bg-purple-900/50', text: 'text-purple-400', hoverText: 'group-hover:text-purple-400', borderHover: 'hover:border-purple-500/50' },
  teal: { bg: 'bg-teal-900/30', hoverBg: 'group-hover:bg-teal-900/50', text: 'text-teal-400', hoverText: 'group-hover:text-teal-400', borderHover: 'hover:border-teal-500/50' },
  rose: { bg: 'bg-rose-900/30', hoverBg: 'group-hover:bg-rose-900/50', text: 'text-rose-400', hoverText: 'group-hover:text-rose-400', borderHover: 'hover:border-rose-500/50' },
};

interface LinksTabProps {
  links?: AppLink[];
  isAdmin?: boolean;
  updateConfig?: (newConfig: Partial<AppConfig>) => void;
}

export function LinksTab({ links, isAdmin, updateConfig }: LinksTabProps) {
  const currentLinks = links && links.length > 0 ? links : DEFAULT_LINKS;
  const [editingLink, setEditingLink] = useState<AppLink | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<Partial<AppLink>>({});
  const [linkToDelete, setLinkToDelete] = useState<string | null>(null);
  const { t } = useLang();

  const handleSave = () => {
    if (!updateConfig) return;
    
    const url = (formData.href || '').trim();
    if (!/^https?:\/\/.+/i.test(url)) {
      alert(t.invalidUrl);
      return;
    }

    // If the DB is empty (i.e. 'links' is undefined), let's pre-populate it with DEFAULT_LINKS 
    // so we don't wipe out the other default links when saving just one.
    const baseLinks = links || DEFAULT_LINKS;

    if (isAdding) {
      const newLink: AppLink = {
        id: `link-${Date.now()}`,
        href: url,
        title: formData.title || '',
        description: formData.description || '',
        iconName: formData.iconName || 'Link',
        color: formData.color || 'sky'
      };
      updateConfig({ links: [...baseLinks, newLink] });
      setIsAdding(false);
    } else if (editingLink) {
      const updated = baseLinks.map(l => l.id === editingLink.id ? { ...l, ...formData, href: url } as AppLink : l);
      updateConfig({ links: updated });
      setEditingLink(null);
    }
    setFormData({});
  };

  const openDeleteModal = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!updateConfig) return;
    setLinkToDelete(id);
  };

  const confirmDelete = () => {
    if (!linkToDelete || !updateConfig) return;
    const baseLinks = links || DEFAULT_LINKS;
    updateConfig({ links: baseLinks.filter(l => l.id !== linkToDelete) });
    setLinkToDelete(null);
  };

  const openEdit = (link: AppLink, e: React.MouseEvent) => {
    e.preventDefault();
    setEditingLink(link);
    setFormData({ ...link });
  };

  const openAdd = () => {
    setIsAdding(true);
    setFormData({ href: '', title: '', description: '', iconName: 'Link', color: 'sky' });
  };

  const cancelModal = () => {
    setIsAdding(false);
    setEditingLink(null);
    setFormData({});
  };

  const colorOptions = ['sky', 'emerald', 'indigo', 'amber', 'pink', 'purple', 'teal', 'rose'];
  const commonIcons = ['Link', 'Wrench', 'Link2', 'Droplets', 'Book', 'Calendar', 'FileText', 'MapPin', 'MessageCircle', 'Phone', 'Video', 'Globe', 'Briefcase', 'ShoppingCart', 'Github', 'Youtube', 'Instagram', 'Figma', 'Cloud'];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {isAdmin && (
        <div className="flex justify-end">
          <button onClick={openAdd} className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
            <Plus size={18} /> {t.addLink}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {currentLinks.map(link => {
          const IconComp = (Icons as any)[link.iconName] || Icons.Link;
          const colors = COLOR_MAP[link.color] || COLOR_MAP['sky'];
          
          return (
            <a
              key={link.id}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className={`group relative p-4 sm:p-6 bg-neutral-800 rounded-2xl border border-neutral-700 ${colors.borderHover} hover:bg-neutral-800/80 transition-all shadow-sm flex items-center justify-between overflow-hidden gap-3`}
            >
              <div className="flex items-center gap-3 sm:gap-4 z-10 min-w-0">
                <div className={`${colors.bg} ${colors.hoverBg} p-2.5 sm:p-3 rounded-xl transition-colors shrink-0`}>
                  <IconComp className={`w-5 h-5 sm:w-6 sm:h-6 ${colors.text} ${colors.hoverText} transition-colors`} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-neutral-100 text-base sm:text-lg truncate">{link.title}</h3>
                  <p className="text-neutral-400/70 text-xs sm:text-sm line-clamp-2">{link.description}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-1 sm:gap-3 shrink-0 z-20">
                {isAdmin && (
                  <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-800/80 md:bg-transparent rounded-lg p-0.5 md:p-0">
                    <button onClick={(e) => openEdit(link, e)} className="p-1.5 md:p-2 text-neutral-400 hover:text-sky-400 hover:bg-neutral-700 rounded transition-colors" title={t.edit}>
                      <Pencil size={18} className="md:w-4 md:h-4" />
                    </button>
                    <button onClick={(e) => openDeleteModal(link.id, e)} className="p-1.5 md:p-2 text-neutral-400 hover:text-red-400 hover:bg-neutral-700 rounded transition-colors" title={t.delete}>
                      <Trash2 size={18} className="md:w-4 md:h-4" />
                    </button>
                  </div>
                )}
                <ExternalLink className={`w-4 h-4 sm:w-5 sm:h-5 text-neutral-500 ${colors.hoverText} transition-colors shrink-0`} />
              </div>
            </a>
          );
        })}
        {currentLinks.length === 0 && (
           <div className="col-span-full py-12 text-center text-neutral-500">
             {t.noLinks}
           </div>
        )}
      </div>

      {(isAdding || editingLink) && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-neutral-800 rounded-2xl w-full max-w-md shadow-2xl border border-neutral-700 overflow-hidden relative">
            <div className="p-4 border-b border-neutral-700 flex items-center justify-between bg-neutral-800/50">
              <h2 className="text-xl font-bold text-neutral-100">{isAdding ? t.newLink : t.editLink}</h2>
              <button onClick={cancelModal} className="p-1.5 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1.5">{t.linkTitle}</label>
                <input type="text" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-sky-500" placeholder={t.linkTitlePlaceholder} />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1.5">{t.linkUrl}</label>
                <input type="text" value={formData.href || ''} onChange={e => setFormData({ ...formData, href: e.target.value })} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-sky-500" placeholder={t.linkUrlPlaceholder} />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1.5">{t.linkDesc}</label>
                <input type="text" value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-sky-500" placeholder={t.linkDescPlaceholder} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1.5">{t.linkColor}</label>
                  <select value={formData.color || 'sky'} onChange={e => setFormData({ ...formData, color: e.target.value })} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-sky-500 capitalize">
                    {colorOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1.5">{t.linkIcon}</label>
                  <select value={formData.iconName || 'Link'} onChange={e => setFormData({ ...formData, iconName: e.target.value })} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-sky-500">
                    {commonIcons.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-neutral-700 bg-neutral-800/50 flex justify-end gap-3">
              <button onClick={cancelModal} className="px-4 py-2 text-sm font-medium text-neutral-300 hover:text-neutral-100 hover:bg-neutral-700 rounded-lg transition-colors">
                {t.cancel}
              </button>
              <button onClick={handleSave} disabled={!formData.title || !formData.href} className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {t.save}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!linkToDelete}
        title={t.delete}
        message={t.deleteLink}
        onConfirm={confirmDelete}
        onCancel={() => setLinkToDelete(null)}
      />
    </div>
  );
}
