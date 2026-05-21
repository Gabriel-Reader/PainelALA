import React, { useState, useEffect } from 'react';
import { useLang } from '../LanguageContext';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Users, Trash2, Mail, ShieldAlert, Calendar } from 'lucide-react';
import { showToast } from './Toast';
import { ConfirmModal } from './ConfirmModal';

interface AppProfile {
  uid: string;
  email: string;
  role: 'resident' | 'representative' | 'dev';
  createdAt?: any;
}

export function UsersTab() {
  const { t, lang } = useLang();
  const [users, setUsers] = useState<AppProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AppProfile | null>(null);

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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-black/40 text-neutral-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 font-semibold">{t.userEmail}</th>
                  <th className="px-4 py-3 font-semibold">{t.userRole}</th>
                  <th className="px-4 py-3 font-semibold">{t.userJoined}</th>
                  <th className="px-4 py-3 font-semibold text-right sticky right-0 bg-black/40 backdrop-blur-md shadow-[-4px_0_10px_rgba(0,0,0,0.1)] z-10">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {users.map(u => (
                  <tr key={u.uid} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-neutral-200">
                        <Mail size={14} className="text-neutral-500" />
                        {u.email}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ShieldAlert size={14} className="text-neutral-500" />
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.uid, e.target.value)}
                          className="bg-black/20 text-neutral-200 border border-neutral-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-[var(--theme-primary)]"
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
                      <button
                        onClick={() => { setUserToDelete(u); setDeleteModalOpen(true); }}
                        className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                        title={t.delete}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
