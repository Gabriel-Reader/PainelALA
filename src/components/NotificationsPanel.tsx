import React, { useState, useEffect, useRef } from 'react';
import {
  Bell, X, Plus, Trash2, AlertTriangle, Zap, Tag, Pencil,
  Bold, List, Link as LinkIcon, Send, ExternalLink, ChevronRight,
} from 'lucide-react';
import {
  collection, onSnapshot, addDoc, deleteDoc, updateDoc, doc, serverTimestamp,
  orderBy, query,
} from 'firebase/firestore';
import { db } from '../firebase';
import { showToast } from './Toast';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type NotificationBlock =
  | { type: 'text'; text: string; bold?: boolean }
  | { type: 'list'; items: string[] }
  | { type: 'tab-link'; tabKey: string; label: string };

export interface AppNotification {
  id: string;
  category: 'aviso' | 'atualizacao' | 'outro';
  customCategory?: string;
  title: string;
  blocks: NotificationBlock[];
  createdAt: any;
  createdBy: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  aviso:       { label: 'Aviso',       color: 'text-amber-400',  bg: 'bg-amber-400/10 border-amber-400/30',   icon: <AlertTriangle size={14} /> },
  atualizacao: { label: 'Atualização', color: 'text-sky-400',    bg: 'bg-sky-400/10 border-sky-400/30',       icon: <Zap size={14} /> },
  outro:       { label: 'Outro',       color: 'text-violet-400', bg: 'bg-violet-400/10 border-violet-400/30', icon: <Tag size={14} /> },
};

const TAB_OPTIONS = [
  { key: 'main',          label: 'Escalas' },
  { key: 'rules',         label: 'Tarefas da Limpeza' },
  { key: 'general_rules', label: 'Regras da Ala' },
  { key: 'links',         label: 'Links Úteis' },
  { key: 'products',      label: 'Estoque' },
  { key: 'maintenance',   label: 'Manutenção' },
  { key: 'users',         label: 'Usuários' },
];

const LS_READ_KEY = 'notifications_read_ts';
const getReadTs = () => parseInt(localStorage.getItem(LS_READ_KEY) || '0', 10);
const markAllRead = () => localStorage.setItem(LS_READ_KEY, Date.now().toString());

// ─────────────────────────────────────────────────────────────────────────────
// NotificationBell
// ─────────────────────────────────────────────────────────────────────────────

export function NotificationBell({ isDev, onNavigateToTab }: { isDev: boolean; onNavigateToTab: (tab: string) => void }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [editingNotification, setEditingNotification] = useState<AppNotification | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      const data: AppNotification[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as AppNotification));
      setNotifications(data);
      const readTs = getReadTs();
      setUnreadCount(data.filter(n => n.createdAt?.toMillis?.() > readTs).length);
    }, err => console.error('Notifications error:', err));
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const handleOpen = () => {
    setIsOpen(prev => {
      if (!prev) { setTimeout(() => { markAllRead(); setUnreadCount(0); }, 600); }
      return !prev;
    });
  };

  const handleEdit = (n: AppNotification) => {
    setIsOpen(false);
    setEditingNotification(n);
    setIsComposing(true);
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={handleOpen}
        className="relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-black/10 hover:bg-black/20 active:bg-black/30 text-white border border-white/5 rounded-xl transition-colors"
        aria-label="Notificações"
      >
        <Bell size={18} className={unreadCount > 0 ? 'text-[var(--theme-primary)]' : 'text-white/70'} />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1 bg-[var(--theme-primary)] text-neutral-900 text-[11px] font-bold rounded-full flex items-center justify-center leading-none shadow-lg">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Mobile overlay */}
      {isOpen && <div className="sm:hidden fixed inset-0 bg-black/50 z-[55]" onClick={() => setIsOpen(false)} />}

      {/* Panel — bottom-sheet on mobile, dropdown on desktop */}
      {isOpen && (
        <div className="
          fixed sm:absolute
          bottom-0 sm:bottom-auto left-0 right-0 sm:left-auto sm:right-0
          sm:top-[calc(100%+0.5rem)]
          z-[60] flex flex-col
          bg-neutral-900 border border-neutral-700/80
          rounded-t-2xl sm:rounded-2xl
          shadow-2xl overflow-hidden
          max-h-[85vh] sm:max-h-[80vh] sm:w-[24rem]
        ">
          {/* Drag handle on mobile */}
          <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
            <div className="w-10 h-1 bg-neutral-700 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-neutral-800/80 bg-black/20 shrink-0">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-[var(--theme-primary)]" />
              <span className="font-bold text-sm text-white">Notificações</span>
              {notifications.length > 0 && (
                <span className="text-[10px] text-neutral-500">{notifications.length}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isDev && (
                <button
                  onClick={() => { setIsOpen(false); setEditingNotification(null); setIsComposing(true); }}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[var(--theme-primary)] bg-[var(--theme-primary)]/10 hover:bg-[var(--theme-primary)]/20 active:bg-[var(--theme-primary)]/30 rounded-xl transition-colors"
                >
                  <Plus size={14} /> Nova
                </button>
              )}
              <button onClick={() => setIsOpen(false)} className="p-2 text-neutral-500 hover:text-neutral-300 rounded-xl transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1 divide-y divide-neutral-800/60">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
                <Bell size={32} className="text-neutral-700 mb-3" />
                <p className="text-neutral-500 text-sm">Nenhuma notificação ainda.</p>
                {isDev && (
                  <button onClick={() => { setIsOpen(false); setIsComposing(true); }} className="mt-3 text-xs text-[var(--theme-primary)] hover:underline">
                    Criar a primeira →
                  </button>
                )}
              </div>
            ) : (
              notifications.map(n => (
                <NotificationCard
                  key={n.id}
                  notification={n}
                  isDev={isDev}
                  onNavigateToTab={(tab) => { onNavigateToTab(tab); setIsOpen(false); }}
                  onEdit={() => handleEdit(n)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Composer */}
      {isComposing && (
        <NotificationComposer
          onClose={() => { setIsComposing(false); setEditingNotification(null); }}
          editing={editingNotification}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NotificationCard
// ─────────────────────────────────────────────────────────────────────────────

function NotificationCard({ notification: n, isDev, onNavigateToTab, onEdit }: {
  notification: AppNotification; isDev: boolean; onNavigateToTab: (tab: string) => void; onEdit: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = CATEGORY_META[n.category] || CATEGORY_META.outro;
  const categoryLabel = n.category === 'outro' && n.customCategory ? n.customCategory : meta.label;
  const dateStr = n.createdAt?.toDate
    ? n.createdAt.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    : '';
  const hasBody = n.blocks?.length > 0;

  const handleDelete = async () => {
    if (!window.confirm('Remover esta notificação?')) return;
    try {
      await deleteDoc(doc(db, 'notifications', n.id));
      showToast('Notificação removida.', 'success');
    } catch { showToast('Erro ao remover.', 'error'); }
  };

  return (
    <div className="px-4 py-4 hover:bg-white/[0.02] transition-colors">
      {/* Top row — wraps properly on mobile */}
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border shrink-0 ${meta.bg} ${meta.color}`}>
            {meta.icon}{categoryLabel}
          </span>
          {dateStr && <span className="text-[11px] text-neutral-600 shrink-0">{dateStr}</span>}
        </div>
        {isDev && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onEdit}
              className="p-2 text-neutral-600 hover:text-[var(--theme-primary)] hover:bg-[var(--theme-primary)]/10 rounded-lg transition-colors"
              title="Editar"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 text-neutral-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
              title="Remover"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Title — breaks properly */}
      <p className="text-sm font-semibold text-white leading-snug break-words">{n.title}</p>

      {/* Body — expandable */}
      {hasBody && (
        <>
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 mt-2.5 text-xs text-[var(--theme-primary)] hover:underline transition-colors py-1"
          >
            <ChevronRight size={13} className={`transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
            {expanded ? 'Recolher' : 'Ver detalhes'}
          </button>

          {expanded && (
            <div className="mt-2 space-y-2.5 text-sm text-neutral-300 border-l-2 border-neutral-700 pl-3">
              {n.blocks.map((block, i) => {
                if (block.type === 'text') return (
                  <p key={i} className={`break-words ${block.bold ? 'font-bold text-white' : 'text-neutral-300'}`}>{block.text}</p>
                );
                if (block.type === 'list') return (
                  <ul key={i} className="space-y-1 list-disc list-inside text-neutral-300">
                    {block.items.map((item, j) => <li key={j} className="leading-snug break-words">{item}</li>)}
                  </ul>
                );
                if (block.type === 'tab-link') return (
                  <button key={i} onClick={() => onNavigateToTab(block.tabKey)}
                    className="flex items-center gap-1.5 text-[var(--theme-primary)] hover:underline font-medium py-0.5 break-words text-left">
                    <ExternalLink size={13} className="shrink-0" />
                    <span className="break-words">{block.label || TAB_OPTIONS.find(t => t.key === block.tabKey)?.label || block.tabKey}</span>
                  </button>
                );
                return null;
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NotificationComposer (create + edit)
// ─────────────────────────────────────────────────────────────────────────────

function NotificationComposer({ onClose, editing }: { onClose: () => void; editing: AppNotification | null }) {
  const isEditing = !!editing;
  const [category, setCategory] = useState<'aviso' | 'atualizacao' | 'outro'>(editing?.category || 'atualizacao');
  const [customCategory, setCustomCategory] = useState(editing?.customCategory || '');
  const [title, setTitle] = useState(editing?.title || '');
  const [blocks, setBlocks] = useState<NotificationBlock[]>(editing?.blocks || []);
  const [isSaving, setIsSaving] = useState(false);

  const addTextBlock = () => setBlocks(b => [...b, { type: 'text', text: '', bold: false }]);
  const addListBlock = () => setBlocks(b => [...b, { type: 'list', items: [''] }]);
  const addTabLink = () => setBlocks(b => [...b, { type: 'tab-link', tabKey: 'main', label: '' }]);
  const removeBlock = (idx: number) => setBlocks(b => b.filter((_, i) => i !== idx));

  const updateBlock = (idx: number, patch: Partial<NotificationBlock>) =>
    setBlocks(b => b.map((block, i) => i === idx ? { ...block, ...patch } as NotificationBlock : block));

  const updateListItem = (bi: number, ii: number, val: string) =>
    setBlocks(b => b.map((block, i) => {
      if (i !== bi || block.type !== 'list') return block;
      const items = [...block.items]; items[ii] = val; return { ...block, items };
    }));

  const addListItem = (bi: number) =>
    setBlocks(b => b.map((block, i) => i === bi && block.type === 'list' ? { ...block, items: [...block.items, ''] } : block));

  const removeListItem = (bi: number, ii: number) =>
    setBlocks(b => b.map((block, i) => i === bi && block.type === 'list' ? { ...block, items: block.items.filter((_, j) => j !== ii) } : block));

  const handleSave = async () => {
    if (!title.trim()) { showToast('Insira um título.', 'error'); return; }
    setIsSaving(true);
    try {
      const payload = {
        category,
        customCategory: category === 'outro' ? customCategory.trim() : '',
        title: title.trim(),
        blocks,
      };
      if (isEditing) {
        await updateDoc(doc(db, 'notifications', editing!.id), payload);
        showToast('Notificação atualizada!', 'success');
      } else {
        await addDoc(collection(db, 'notifications'), {
          ...payload,
          createdAt: serverTimestamp(),
          createdBy: '',
        });
        showToast('Notificação publicada!', 'success');
      }
      onClose();
    } catch (e) {
      console.error(e); showToast('Erro ao salvar.', 'error');
    } finally { setIsSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-lg max-h-[95svh] sm:max-h-[90vh] flex flex-col bg-neutral-900 border border-neutral-700/80 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">

        {/* Drag handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-neutral-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-neutral-800 bg-black/20 shrink-0">
          <div className="flex items-center gap-2">
            {isEditing ? <Pencil size={15} className="text-[var(--theme-primary)]" /> : <Bell size={15} className="text-[var(--theme-primary)]" />}
            <span className="font-bold text-white text-sm">{isEditing ? 'Editar Notificação' : 'Nova Notificação'}</span>
          </div>
          <button onClick={onClose} className="p-2.5 text-neutral-500 hover:text-white rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-4 py-4 space-y-5">

          {/* Category */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2.5">Categoria</label>
            <div className="flex gap-2 flex-wrap">
              {(['aviso', 'atualizacao', 'outro'] as const).map(cat => {
                const m = CATEGORY_META[cat];
                const isSelected = category === cat;
                return (
                  <button key={cat} type="button" onClick={() => setCategory(cat)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                      isSelected ? `${m.bg} ${m.color} shadow` : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:border-neutral-500 active:bg-neutral-700'
                    }`}
                  >
                    {m.icon}{m.label}
                  </button>
                );
              })}
            </div>
            {category === 'outro' && (
              <input
                type="text" placeholder="Nome da categoria" value={customCategory}
                onChange={e => setCustomCategory(e.target.value)} maxLength={30}
                className="mt-2.5 w-full bg-neutral-800 text-white border border-neutral-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
              />
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2.5">Título</label>
            <input
              type="text" placeholder="Ex: Nova funcionalidade!" value={title}
              onChange={e => setTitle(e.target.value)} maxLength={100}
              className="w-full bg-neutral-800 text-white border border-neutral-700 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
            />
          </div>

          {/* Blocks */}
          {blocks.length > 0 && (
            <div className="space-y-3">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400">Conteúdo</label>
              {blocks.map((block, i) => (
                <div key={i} className="bg-neutral-800/60 border border-neutral-700/60 rounded-xl overflow-hidden">
                  {/* Block header */}
                  <div className="flex items-center justify-between px-3 py-2.5 bg-neutral-800 border-b border-neutral-700/60">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                      {block.type === 'text' && <><Bold size={12} /> {block.bold ? 'Texto em Negrito' : 'Parágrafo'}</>}
                      {block.type === 'list' && <><List size={12} /> Lista</>}
                      {block.type === 'tab-link' && <><LinkIcon size={12} /> Link de Aba</>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {block.type === 'text' && (
                        <button
                          onClick={() => updateBlock(i, { bold: !block.bold })}
                          title={block.bold ? 'Remover negrito' : 'Adicionar negrito'}
                          className={`flex items-center justify-center w-8 h-8 rounded-lg font-black text-sm transition-all border ${
                            block.bold
                              ? 'bg-[var(--theme-primary)] text-neutral-900 border-transparent shadow'
                              : 'bg-neutral-700 text-neutral-400 border-neutral-600 hover:text-white active:bg-neutral-600'
                          }`}
                        >
                          B
                        </button>
                      )}
                      <button
                        onClick={() => removeBlock(i)}
                        className="flex items-center justify-center w-8 h-8 rounded-lg text-neutral-600 hover:text-red-400 hover:bg-red-400/10 active:bg-red-400/20 transition-all border border-transparent hover:border-red-400/20"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Block body */}
                  <div className="p-3.5">
                    {block.type === 'text' && (
                      <textarea
                        value={block.text}
                        onChange={e => updateBlock(i, { text: e.target.value })}
                        placeholder="Escreva o parágrafo aqui..."
                        rows={3}
                        className={`w-full bg-transparent text-sm focus:outline-none resize-none placeholder:text-neutral-600 ${block.bold ? 'font-bold text-white' : 'text-neutral-200'}`}
                      />
                    )}

                    {block.type === 'list' && (
                      <div className="space-y-2.5">
                        {block.items.map((item, j) => (
                          <div key={j} className="flex items-center gap-2">
                            <span className="text-[var(--theme-primary)] text-xs shrink-0">•</span>
                            <input
                              type="text" value={item}
                              onChange={e => updateListItem(i, j, e.target.value)}
                              placeholder={`Item ${j + 1}`}
                              className="flex-1 bg-neutral-700/50 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)] transition-all placeholder:text-neutral-600"
                            />
                            {block.items.length > 1 && (
                              <button onClick={() => removeListItem(i, j)} className="p-2 text-neutral-600 hover:text-red-400 active:text-red-300 transition-colors">
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        ))}
                        <button onClick={() => addListItem(i)}
                          className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-[var(--theme-primary)] active:text-[var(--theme-primary)] transition-colors mt-1 py-1">
                          <Plus size={12} /> Adicionar item
                        </button>
                      </div>
                    )}

                    {block.type === 'tab-link' && (
                      <div className="space-y-3">
                        <select
                          value={block.tabKey}
                          onChange={e => updateBlock(i, { tabKey: e.target.value })}
                          className="w-full bg-neutral-700/50 text-white border border-neutral-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
                        >
                          {TAB_OPTIONS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                        </select>
                        <input
                          type="text" value={block.label}
                          onChange={e => updateBlock(i, { label: e.target.value })}
                          placeholder="Texto personalizado do link (opcional)"
                          className="w-full bg-neutral-700/50 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)] transition-all placeholder:text-neutral-600"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add block buttons */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2.5">
              {blocks.length === 0 ? 'Adicionar conteúdo (opcional)' : 'Adicionar bloco'}
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button onClick={addTextBlock}
                className="flex flex-col items-center gap-2 px-2 py-4 text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 border border-neutral-700 hover:border-neutral-500 rounded-xl transition-all">
                <Bold size={18} className="text-neutral-400" />
                <span>Parágrafo</span>
              </button>
              <button onClick={addListBlock}
                className="flex flex-col items-center gap-2 px-2 py-4 text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 border border-neutral-700 hover:border-neutral-500 rounded-xl transition-all">
                <List size={18} className="text-neutral-400" />
                <span>Lista</span>
              </button>
              <button onClick={addTabLink}
                className="flex flex-col items-center gap-2 px-2 py-4 text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 border border-neutral-700 hover:border-neutral-500 rounded-xl transition-all">
                <LinkIcon size={18} className="text-neutral-400" />
                <span>Link de aba</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-4 py-4 border-t border-neutral-800 bg-black/20 shrink-0">
          <button onClick={onClose}
            className="flex-1 py-3.5 text-sm text-neutral-400 hover:text-white active:text-white bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 rounded-xl transition-colors font-medium">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={isSaving || !title.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold text-neutral-900 bg-[var(--theme-primary)] hover:opacity-90 active:opacity-80 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            {isSaving ? 'Salvando...' : <><Send size={15} /> {isEditing ? 'Salvar' : 'Publicar'}</>}
          </button>
        </div>
      </div>
    </div>
  );
}
