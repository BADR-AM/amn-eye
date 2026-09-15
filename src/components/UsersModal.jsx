import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  KeyRound, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  X, 
  RefreshCw,
  UserCheck,
  Lock
} from 'lucide-react';
import { authHeaders } from '../utils/auth';

const ROLE_INFO = {
  admin: {
    label: 'مدير المنظومة',
    badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    description: 'صلاحيات كاملة (إدارة المستخدمين، النسخ الاحتياطي، حذف وتعديل)',
    icon: ShieldAlert
  },
  officer: {
    label: 'ضابط أمن وتحريات',
    badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    description: 'تسجيل وتعديل المجندين، التيكتات، المتابعة الطبية، والتقارير',
    icon: ShieldCheck
  },
  operator: {
    label: 'مدخل بيانات / كشك',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    description: 'استمارة كشك الاستقبال والتقاط الصور والفيديو فقط',
    icon: Users
  }
};

export default function UsersModal({ isOpen, onClose, currentUser, showToast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Create User Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState('officer');
  const [newPassword, setNewPassword] = useState('');
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Edit / Reset User State
  const [editingUser, setEditingUser] = useState(null);
  const [editFullName, setEditFullName] = useState('');
  const [editRole, setEditRole] = useState('officer');
  const [editPassword, setEditPassword] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Delete User Confirmation State
  const [deletingUser, setDeletingUser] = useState(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/users', {
        headers: authHeaders(),
      });
      if (!res.ok) {
        throw new Error('فشل جلب قائمة المستخدمين');
      }
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setShowAddForm(false);
      setEditingUser(null);
      setDeletingUser(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Add User
  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUsername.trim() || !newFullName.trim() || !newPassword.trim()) {
      showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
      return;
    }
    if (newPassword.trim().length < 4) {
      showToast('كلمة المرور يجب ألا تقل عن 4 رموز', 'error');
      return;
    }

    setSubmittingAdd(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({
          username: newUsername.trim(),
          full_name: newFullName.trim(),
          role: newRole,
          password: newPassword.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل إنشاء الحساب');
      }

      showToast('تم إنشاء الحساب بنجاح');
      setNewUsername('');
      setNewFullName('');
      setNewPassword('');
      setNewRole('officer');
      setShowAddForm(false);
      fetchUsers();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmittingAdd(false);
    }
  };

  // Handle Start Edit
  const handleStartEdit = (user) => {
    setEditingUser(user);
    setEditFullName(user.full_name);
    setEditRole(user.role);
    setEditPassword('');
  };

  // Handle Save Edit
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editFullName.trim()) {
      showToast('الاسم الكامل مطلوب', 'error');
      return;
    }

    setSubmittingEdit(true);
    try {
      const payload = {
        full_name: editFullName.trim(),
        role: editRole,
      };
      if (editPassword.trim()) {
        if (editPassword.trim().length < 4) {
          showToast('كلمة المرور الجديدة يجب ألا تقل عن 4 رموز', 'error');
          setSubmittingEdit(false);
          return;
        }
        payload.password = editPassword.trim();
      }

      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل تحديث بيانات الحساب');
      }

      showToast('تم تحديث بيانات الحساب بنجاح');
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Handle Delete User
  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setSubmittingDelete(true);
    try {
      const res = await fetch(`/api/users/${deletingUser.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل حذف الحساب');
      }

      showToast('تم حذف الحساب بنجاح');
      setDeletingUser(null);
      fetchUsers();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmittingDelete(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" dir="rtl">
      <div className="bg-darkslate-900 dark:bg-zinc-900 border border-slate-700/60 dark:border-zinc-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 dark:border-zinc-800 bg-darkslate-850/70 dark:bg-zinc-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">إدارة الحسابات وتحديد الصلاحيات</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono font-bold">
                  {users.length} مستخدم
                </span>
              </div>
              <p className="text-xs text-slate-400">التحكم في حسابات ضباط التحريات والمدخلين وصلاحيات النظام</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                showAddForm
                  ? 'bg-slate-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/30'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>{showAddForm ? 'إلغاء الإضافة' : 'إضافة حساب جديد'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          {/* Add User Collapsible Form */}
          {showAddForm && (
            <form onSubmit={handleAddUser} className="bg-darkslate-850 dark:bg-zinc-950/80 border border-emerald-500/30 rounded-2xl p-5 space-y-4 shadow-xl animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <UserPlus className="w-4 h-4" />
                  <span>بيانات الحساب الجديد</span>
                </div>
                <span className="text-[11px] text-slate-400">حدد الصلاحية المناسبة حسب المهام الموكلة</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    اسم المستخدم (Login ID) *
                  </label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="مثال: officer_ali"
                    className="w-full bg-darkslate-900 dark:bg-zinc-900 border border-slate-700 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 font-sans"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    الاسم بالكامل والرتبة *
                  </label>
                  <input
                    type="text"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="مثال: نقيب / أحمد محمود"
                    className="w-full bg-darkslate-900 dark:bg-zinc-900 border border-slate-700 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 font-sans"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    الصلاحية والرتبة في المنظومة *
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full bg-darkslate-900 dark:bg-zinc-900 border border-slate-700 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-sans"
                  >
                    <option value="officer">ضابط أمن وتحريات</option>
                    <option value="operator">مدخل بيانات / كشك الاستقبال</option>
                    <option value="admin">مدير المنظومة (صلاحيات كاملة)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    كلمة المرور الأولية *
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="4 رموز على الأقل..."
                    className="w-full bg-darkslate-900 dark:bg-zinc-900 border border-slate-700 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 font-sans"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submittingAdd}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950/40 transition-all disabled:opacity-60"
                >
                  {submittingAdd ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>حفظ وإنشاء الحساب</span>
                </button>
              </div>
            </form>
          )}

          {/* Users List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                قائمة الحسابات المسجلة بالمنظومة
              </h3>
              <button
                onClick={fetchUsers}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>تحديث القائمة</span>
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Loader2 className="w-7 h-7 animate-spin mb-2 text-blue-400" />
                <span className="text-xs">جاري تحميل الحسابات والصلاحيات...</span>
              </div>
            ) : error ? (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center font-bold">
                {error}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {users.map((user) => {
                  const roleConfig = ROLE_INFO[user.role] || ROLE_INFO.officer;
                  const RoleIcon = roleConfig.icon;
                  const isCurrent = currentUser && (currentUser.id === user.id || currentUser.username === user.username);

                  return (
                    <div 
                      key={user.id}
                      className="bg-darkslate-850 dark:bg-zinc-950 border border-slate-800 dark:border-zinc-800 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition-all shadow-md group"
                    >
                      <div>
                        {/* Top Info */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-slate-800 dark:bg-zinc-900 border border-slate-700/60 dark:border-zinc-800 flex items-center justify-center text-slate-300 group-hover:text-blue-400 transition-colors">
                              <RoleIcon className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-white">{user.full_name}</h4>
                                {isCurrent && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                                    حسابك الحالي
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-slate-400 font-mono">@{user.username}</span>
                            </div>
                          </div>

                          {/* Role Badge */}
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-xl border flex items-center gap-1.5 ${roleConfig.badgeClass}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            <span>{roleConfig.label}</span>
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-400 bg-darkslate-900/60 dark:bg-zinc-900/60 p-2.5 rounded-xl border border-slate-800/80 mb-3">
                          {roleConfig.description}
                        </p>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
                        <span className="text-[10px] text-slate-400 font-mono">
                          {user.created_at ? `تاريخ الإنشاء: ${new Date(user.created_at).toLocaleDateString('ar-EG')}` : ''}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleStartEdit(user)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors text-xs font-semibold"
                            title="تعديل البيانات أو إعادة تعيين كلمة المرور"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                            <span>تعديل</span>
                          </button>

                          {!isCurrent && (
                            <button
                              onClick={() => setDeletingUser(user)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/30 text-slate-400 hover:text-rose-400 border border-slate-700/60 hover:border-rose-500/40 transition-colors"
                              title="حذف هذا الحساب"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer Note */}
        <div className="px-6 py-3 border-t border-slate-800 dark:border-zinc-800 bg-darkslate-850/40 dark:bg-zinc-950/40 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>أمن المنظومة • تشفير كلمات المرور بتقنية bcrypt و JWT</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors"
          >
            إغلاق
          </button>
        </div>

      </div>

      {/* Edit User Modal Dialog */}
      {editingUser && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" dir="rtl">
          <div className="bg-darkslate-900 dark:bg-zinc-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                <Edit3 className="w-4 h-4" />
                <span>تعديل حساب: @{editingUser.username}</span>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  الاسم الكامل والرتبة
                </label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full bg-darkslate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-sans"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  الصلاحية
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full bg-darkslate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-sans"
                >
                  <option value="officer">ضابط أمن وتحريات</option>
                  <option value="operator">مدخل بيانات / كشك الاستقبال</option>
                  <option value="admin">مدير المنظومة (صلاحيات كاملة)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  إعادة تعيين كلمة المرور (اختياري)
                </label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="اتركها فارغة إذا لم ترغب في تغييرها..."
                  className="w-full bg-darkslate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-sans"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  إذا تم إدخال كلمة سر جديدة، سيتم تشفيرها واستبدال كلمة المرور السابقة فوراً.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-950/40 transition-all disabled:opacity-60"
                >
                  {submittingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>حفظ التعديلات</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Dialog */}
      {deletingUser && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" dir="rtl">
          <div className="bg-darkslate-900 dark:bg-zinc-900 border border-rose-500/40 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">تأكيد حذف الحساب</h3>
                <p className="text-xs text-rose-300">إجراء لا يمكن التراجع عنه</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              هل أنت متأكد من رغبتك في حذف حساب <strong className="text-white">"{deletingUser.full_name}"</strong> (@{deletingUser.username}) نهائياً من المنظومة؟
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={submittingDelete}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-950/40 transition-all disabled:opacity-60"
              >
                {submittingDelete ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>حذف الحساب</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
