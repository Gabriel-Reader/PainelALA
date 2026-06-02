import React, { useState, useEffect } from 'react';
import { useLang } from '../LanguageContext';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Users, Trash2, Mail, ShieldAlert, Calendar, Pencil } from 'lucide-react';
import { showToast } from './Toast';
import { ConfirmModal } from './ConfirmModal';

interface AppProfile {
  uid: string;
  email: string;
  role: 'resident' | 'representative' | 'dev';
  displayName?: string;
  room?: string;
  createdAt?: any;
}

import { useWingConfig } from '../hooks/useWingConfig';
import { ROOMS } from '../constants';

export function UsersTab() {
  const { profile, user: currentUser, config, updateConfig } = useWingConfig();
  const isDev = profile?.role === 'dev' || currentUser?.email === 'gabrielpinheiro632@gmail.com';
  const { t, lang } = useLang();
  const [users, setUsers] = useState<AppProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AppProfile | null>(null);

  const [editingNameUid, setEditingNameUid] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [editingRoleText, setEditingRoleText] = useState<'dev' | 'rep' | 'res' | null>(null);
  const [roleTextValue, setRoleTextValue] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const data: AppProfile[] = [];
      snap.forEach((d) => {
        data.push({ uid: d.id, ...d.data() } as AppProfile);
      });
      // Sort by creation date or email
      data.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return b.createdAt.toMillis() - a.createdAt.toMillis();
        }
        return a.email.localeCompare(b.email);
      });
      setUsers(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching users:", error);
      showToast(t.errorDesc, 'error');
      setLoading(false);
    });

    return unsub;
  }, [t.errorDesc]);

  const handleRoleChange = async (uid: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      showToast(t.roleUpdated, 'success');
    } catch (e) {
      console.error("Error updating role:", e);
      showToast(t.roleChangeError, 'error');
    }
  };

  const handleRoomChange = async (uid: string, newRoom: string) => {
    if (newRoom) {
      const roomCount = users.filter(u => u.room === newRoom && u.uid !== uid).length;
      if (roomCount >= 2) {
        showToast('Este quarto já atingiu o limite de 2 moradores.', 'error');
        return;
      }
    }
    
    try {
      await updateDoc(doc(db, 'users', uid), { room: newRoom || null });
      showToast('Quarto atualizado.', 'success');
    } catch (e) {
      console.error("Error updating room:", e);
      showToast('Erro ao atualizar quarto.', 'error');
    }
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await deleteDoc(doc(db, 'users', userToDelete.uid));
      showToast(t.userDeleted, 'success');
      setDeleteModalOpen(false);
      setUserToDelete(null);
    } catch (e) {
      console.error("Error deleting user:", e);
      showToast(t.errorDesc, 'error');
    }
  };

  const startEditName = (u: AppProfile) => {
    setEditingNameUid(u.uid);
    setEditNameValue(u.displayName || '');
  };

  const saveEditName = async (uid: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), { displayName: editNameValue.trim() || null });
      showToast('Nome atualizado.', 'success');
    } catch (e) {
      console.error("Error updating name:", e);
      showToast('Erro ao atualizar nome.', 'error');
    } finally {
      setEditingNameUid(null);
    }
  };

  const formatDate = (ts: any) => {
    if (!ts || !ts.toDate) return '---';
    return ts.toDate().toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-sky-400">
        <Users className="animate-pulse" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-neutral-800/50 p-4 sm:p-6 rounded-2xl border border-neutral-700/50">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Users className="text-[var(--theme-primary)]" size={24} />
              {t.usersTitle}
            </h2>
            <p className="text-sm text-neutral-400 mt-1">{t.usersDesc}</p>
          </div>
        </div>

        <div className="bg-black/20 rounded-xl overflow-hidden border border-neutral-800/60">
          <div className="overflow-x-auto pb-2">
            <table className="w-full text-left text-sm whitespace-nowrap min-w-[700px]">
              <thead className="bg-black/40 text-neutral-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 font-semibold">Nome</th>
                  <th className="px-4 py-3 font-semibold">{t.userEmail}</th>
                  <th className="px-4 py-3 font-semibold">Quarto</th>
                  <th className="px-4 py-3 font-semibold">{t.userRole}</th>
                  <th className="px-4 py-3 font-semibold">{t.userJoined}</th>
                  <th className="px-4 py-3 font-semibold text-right sticky right-0 bg-black/40 backdrop-blur-md shadow-[-4px_0_10px_rgba(0,0,0,0.1)] z-10">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {users.map(u => (
                  <tr key={u.uid} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      {isDev ? (
                        editingNameUid === u.uid ? (
                          <div className="flex items-center gap-2">
                            <input
                              autoFocus
                              type="text"
                              value={editNameValue}
                              onChange={(e) => setEditNameValue(e.target.value)}
                              onBlur={() => saveEditName(u.uid)}
                              onKeyDown={(e) => e.key === 'Enter' && saveEditName(u.uid)}
                              className="bg-black/20 text-neutral-200 border border-neutral-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-[var(--theme-primary)] min-w-[120px]"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-between group min-w-[140px]">
                            <div className="font-medium text-neutral-200 truncate max-w-[120px] sm:max-w-none">
                              {u.displayName || <span className="text-neutral-500 italic">Pendente</span>}
                            </div>
                            <button
                              onClick={() => startEditName(u)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-neutral-500 hover:text-[var(--theme-primary)] transition-opacity lg:opacity-0 sm:opacity-100"
                              title="Editar nome"
                            >
                              <Pencil size={14} />
                            </button>
                          </div>
                        )
                      ) : (
                        <div className="font-medium text-neutral-200">
                          {u.displayName || <span className="text-neutral-500 italic">Pendente</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-neutral-400">
                        <Mail size={14} className="text-neutral-500" />
                        {u.email}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {isDev ? (
                        <select
                          value={u.room || ''}
                          onChange={(e) => handleRoomChange(u.uid, e.target.value)}
                          className="bg-black/20 text-neutral-200 border border-neutral-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-sky-500 min-w-[100px]"
                        >
                          <option value="">Sem Quarto</option>
                          {['101', '102', '103', '104', '105'].map(r => (
                            <option key={r} value={r}>Quarto {r}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-neutral-300 font-medium">
                          {u.room ? `Quarto ${u.room}` : <span className="text-neutral-500 italic">Nenhum</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ShieldAlert size={14} className="text-neutral-500" />
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.uid, e.target.value)}
                          className="bg-black/20 text-neutral-200 border border-neutral-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-[var(--theme-primary)]"
                          disabled={!isDev}
                        >
                          <option value="resident">{t.roleResident}</option>
                          <option value="representative">{t.roleRep}</option>
                          <option value="dev">{t.roleDev}</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-400 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="opacity-70" />
                        {formatDate(u.createdAt)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right sticky right-0 bg-neutral-900/90 backdrop-blur-md shadow-[-4px_0_10px_rgba(0,0,0,0.1)] z-10">
                      {isDev && (
                        <button
                          onClick={() => { setUserToDelete(u); setDeleteModalOpen(true); }}
                          className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                          title={t.delete}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Legenda de Acessos */}
        <div className="mt-6 bg-neutral-800/40 border border-neutral-700/50 rounded-xl p-4 sm:p-5">
          <h3 className="text-[13px] font-bold text-neutral-300 uppercase tracking-wider mb-3">Níveis de Acesso</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            <div className="bg-black/20 p-3 rounded-lg border border-neutral-800/50 relative group/card">
              <span className="text-sm font-bold text-[var(--theme-primary)] block mb-1">Dev (Administrador)</span>
              {editingRoleText === 'dev' ? (
                 <div className="flex flex-col gap-2 mt-2 animate-in fade-in">
                   <textarea value={roleTextValue} onChange={e => setRoleTextValue(e.target.value)} className="text-xs bg-neutral-900 border border-neutral-700 rounded p-2 text-white w-full h-24 resize-none focus:outline-none focus:border-sky-500" />
                   <div className="flex gap-2 justify-end">
                     <button onClick={() => setEditingRoleText(null)} className="text-[10px] bg-neutral-700 hover:bg-neutral-600 px-3 py-1.5 rounded uppercase font-bold text-neutral-300">Cancelar</button>
                     <button onClick={() => { updateConfig({ roleDevDesc: roleTextValue }); setEditingRoleText(null); }} className="text-[10px] bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded uppercase font-bold text-white">Salvar</button>
                   </div>
                 </div>
              ) : (
                <>
                  <p className="text-xs text-neutral-400 leading-relaxed whitespace-pre-line">{config?.roleDevDesc || 'Acesso total ao sistema. Pode excluir usuários, editar configurações globais, alterar e excluir notificações, regras e estoques sem restrições.'}</p>
                  {isDev && <button onClick={() => { setRoleTextValue(config?.roleDevDesc || 'Acesso total ao sistema. Pode excluir usuários, editar configurações globais, alterar e excluir notificações, regras e estoques sem restrições.'); setEditingRoleText('dev'); }} className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 text-sky-400 p-1 hover:bg-sky-400/10 rounded transition-all"><Pencil size={12} /></button>}
                </>
              )}
            </div>

            <div className="bg-black/20 p-3 rounded-lg border border-neutral-800/50 relative group/card">
              <span className="text-sm font-bold text-sky-400 block mb-1">Representante</span>
              {editingRoleText === 'rep' ? (
                 <div className="flex flex-col gap-2 mt-2 animate-in fade-in">
                   <textarea value={roleTextValue} onChange={e => setRoleTextValue(e.target.value)} className="text-xs bg-neutral-900 border border-neutral-700 rounded p-2 text-white w-full h-24 resize-none focus:outline-none focus:border-sky-500" />
                   <div className="flex gap-2 justify-end">
                     <button onClick={() => setEditingRoleText(null)} className="text-[10px] bg-neutral-700 hover:bg-neutral-600 px-3 py-1.5 rounded uppercase font-bold text-neutral-300">Cancelar</button>
                     <button onClick={() => { updateConfig({ roleRepDesc: roleTextValue }); setEditingRoleText(null); }} className="text-[10px] bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded uppercase font-bold text-white">Salvar</button>
                   </div>
                 </div>
              ) : (
                <>
                  <p className="text-xs text-neutral-400 leading-relaxed whitespace-pre-line">{config?.roleRepDesc || 'Gerencia a ala. Pode criar, editar e excluir avisos, regras, itens do estoque, links úteis e configurar dias de limpeza.'}</p>
                  {isDev && <button onClick={() => { setRoleTextValue(config?.roleRepDesc || 'Gerencia a ala. Pode criar, editar e excluir avisos, regras, itens do estoque, links úteis e configurar dias de limpeza.'); setEditingRoleText('rep'); }} className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 text-sky-400 p-1 hover:bg-sky-400/10 rounded transition-all"><Pencil size={12} /></button>}
                </>
              )}
            </div>

            <div className="bg-black/20 p-3 rounded-lg border border-neutral-800/50 relative group/card">
              <span className="text-sm font-bold text-neutral-300 block mb-1">Morador</span>
              {editingRoleText === 'res' ? (
                 <div className="flex flex-col gap-2 mt-2 animate-in fade-in">
                   <textarea value={roleTextValue} onChange={e => setRoleTextValue(e.target.value)} className="text-xs bg-neutral-900 border border-neutral-700 rounded p-2 text-white w-full h-24 resize-none focus:outline-none focus:border-sky-500" />
                   <div className="flex gap-2 justify-end">
                     <button onClick={() => setEditingRoleText(null)} className="text-[10px] bg-neutral-700 hover:bg-neutral-600 px-3 py-1.5 rounded uppercase font-bold text-neutral-300">Cancelar</button>
                     <button onClick={() => { updateConfig({ roleResDesc: roleTextValue }); setEditingRoleText(null); }} className="text-[10px] bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded uppercase font-bold text-white">Salvar</button>
                   </div>
                 </div>
              ) : (
                <>
                  <p className="text-xs text-neutral-400 leading-relaxed whitespace-pre-line">{config?.roleResDesc || 'Acesso padrão. Pode visualizar avisos, regras e links, e realizar o "check" em suas próprias escalas de limpeza e tarefas diárias.'}</p>
                  {isDev && <button onClick={() => { setRoleTextValue(config?.roleResDesc || 'Acesso padrão. Pode visualizar avisos, regras e links, e realizar o "check" em suas próprias escalas de limpeza e tarefas diárias.'); setEditingRoleText('res'); }} className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 text-sky-400 p-1 hover:bg-sky-400/10 rounded transition-all"><Pencil size={12} /></button>}
                </>
              )}
            </div>

          </div>
        </div>

      </div>

      <ConfirmModal
        isOpen={deleteModalOpen}
        title={t.delete}
        message={userToDelete ? t.deleteUserConfirm.replace('{email}', userToDelete.email) : ''}
        onConfirm={confirmDelete}
        onCancel={() => { setDeleteModalOpen(false); setUserToDelete(null); }}
      />
    </div>
  );
}
