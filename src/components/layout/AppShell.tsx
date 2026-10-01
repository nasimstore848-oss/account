'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ArrowDownLeft,
  ArrowUpRight,
  BookOpen,
  FolderTree,
  FileSpreadsheet,
  ShieldAlert,
  ShieldCheck,
  User,
  Sparkles,
  Menu,
  X,
  History,
} from 'lucide-react';
import { VoiceFab } from '@/features/voice/VoiceFab';
import { VoiceCommanderModal } from '@/features/voice/VoiceCommanderModal';
import { VoucherFormModal } from '@/features/vouchers/components/VoucherFormModal';
import { switchUserAction } from '@/server/actions/auth.actions';
import { AuthUser } from '@/lib/auth';
import { AccountRecord } from '@/server/repositories/account.repo';
import { VoiceDraft } from '@/adapters/voice/parse-command';

interface AppShellProps {
  children: React.ReactNode;
  currentUser: AuthUser;
  cashBoxes: AccountRecord[];
  postableAccounts: AccountRecord[];
}

export function AppShell({
  children,
  currentUser,
  cashBoxes,
  postableAccounts,
}: AppShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeUser, setActiveUser] = useState<AuthUser>(currentUser);

  // Quick voucher modal opened from anywhere (or via voice)
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'RECEIPT' | 'PAYMENT'>('PAYMENT');
  const [voiceDraftToPrefill, setVoiceDraftToPrefill] = useState<(VoiceDraft & { payeeId?: string }) | null>(null);

  const navItems = [
    {
      title: 'لوحة التحكم',
      href: '/',
      icon: LayoutDashboard,
      active: pathname === '/',
    },
    {
      title: 'سندات القبض',
      href: '/vouchers/receipts',
      icon: ArrowDownLeft,
      color: 'text-emerald-600',
      active: pathname.startsWith('/vouchers/receipts'),
    },
    {
      title: 'سندات الصرف',
      href: '/vouchers/payments',
      icon: ArrowUpRight,
      color: 'text-rose-600',
      active: pathname.startsWith('/vouchers/payments'),
    },
    {
      title: 'قيود اليومية',
      href: '/journal',
      icon: BookOpen,
      active: pathname.startsWith('/journal'),
    },
    {
      title: 'دليل الحسابات',
      href: '/accounts',
      icon: FolderTree,
      active: pathname.startsWith('/accounts'),
    },
    {
      title: 'كشف الحساب',
      href: '/statements',
      icon: FileSpreadsheet,
      active: pathname.startsWith('/statements'),
    },
    {
      title: 'سجل التدقيق والرقابة',
      href: '/audit',
      icon: History,
      active: pathname.startsWith('/audit'),
    },
  ];

  const handleUserSwitch = async (userId: string, role: any, name: string) => {
    setActiveUser({ id: userId, email: `${role.toLowerCase()}@company.local`, name, role });
    await switchUserAction(userId);
  };

  const openFormWithDraft = (draft: VoiceDraft & { payeeId?: string }) => {
    setVoiceDraftToPrefill(draft);
    if (draft.action === 'RECEIPT' || draft.action === 'PAYMENT') {
      setModalType(draft.action);
    }
    setIsVoucherModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900" dir="rtl">
      {/* Topbar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-200">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight text-slate-900 block leading-tight">
                  نظام السندات والقيود المحاسبية
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  الإدارة المالية والمحاسبية العامة
                </span>
              </div>
            </Link>
          </div>

          {/* Center Badges */}
          <div className="hidden md:flex items-center gap-2">
            <div className="px-3 py-1 bg-slate-100 border border-slate-200/80 rounded-full text-slate-700 text-xs font-mono font-bold">
              السنة المالية: 2026
            </div>
          </div>

          {/* Right Actions: Voice + Role Switcher */}
          <div className="flex items-center gap-3">
            <VoiceFab />

            {/* User Role Switcher Dropdown */}
            <div className="relative group">
              <button
                type="button"
                className="flex items-center gap-2 py-1.5 px-3 rounded-2xl border border-slate-200 hover:border-blue-400 bg-white transition-all text-xs"
              >
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <User className="w-4 h-4" />
                </div>
                <div className="text-start hidden sm:block">
                  <div className="font-bold text-slate-800 leading-tight">{activeUser.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono">دور: {activeUser.role}</div>
                </div>
              </button>

              <div className="absolute left-0 mt-1 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 hidden group-hover:block transition-all z-50">
                <div className="text-[11px] font-bold text-slate-400 px-2 py-1">تبديل المستخدم:</div>
                <button
                  type="button"
                  onClick={() => handleUserSwitch('usr_admin_1', 'ADMIN', 'جمال قبيضة (المدير)')}
                  className={`w-full text-start p-2 rounded-xl text-xs flex items-center justify-between ${
                    activeUser.role === 'ADMIN' ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span>جمال قبيضة (المدير)</span>
                  <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded font-mono">ADMIN</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUserSwitch('usr_acc_1', 'ACCOUNTANT', 'سامي العراسي (المحاسب)')}
                  className={`w-full text-start p-2 rounded-xl text-xs flex items-center justify-between ${
                    activeUser.role === 'ACCOUNTANT' ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span>سامي العراسي (المحاسب)</span>
                  <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded font-mono">ACCOUNTANT</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUserSwitch('usr_viewer_1', 'VIEWER', 'هشام العراسي (مشاهد)')}
                  className={`w-full text-start p-2 rounded-xl text-xs flex items-center justify-between ${
                    activeUser.role === 'VIEWER' ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span>هشام العراسي (مشاهد فقط)</span>
                  <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded font-mono">VIEWER</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex gap-6">
        {/* Sidebar (Desktop) */}
        <aside className="w-60 shrink-0 hidden lg:block">
          <div className="sticky top-24 space-y-4">
            <nav className="bg-white border border-slate-200/80 rounded-3xl p-3 shadow-2xs space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                      item.active
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${item.active ? 'text-white' : item.color || 'text-slate-400'}`} />
                    <span>{item.title}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Quick Create Buttons */}
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-3xl p-4 text-white shadow-md">
              <span className="text-[11px] font-bold text-slate-400 block mb-2">إجراءات سريعة</span>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setVoiceDraftToPrefill(null);
                    setModalType('PAYMENT');
                    setIsVoucherModalOpen(true);
                  }}
                  className="w-full py-2 px-3 bg-white/10 hover:bg-rose-600/80 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
                >
                  <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
                  <span>سند صرف نقدي</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVoiceDraftToPrefill(null);
                    setModalType('RECEIPT');
                    setIsVoucherModalOpen(true);
                  }}
                  className="w-full py-2 px-3 bg-white/10 hover:bg-emerald-600/80 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
                >
                  <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                  <span>سند قبض نقدي</span>
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Menu Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative w-72 bg-white h-full shadow-2xl p-4 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b">
                  <span className="font-bold text-sm">القائمة الرئيسية</span>
                  <button onClick={() => setMobileMenuOpen(false)}>
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold ${
                          item.active ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>

      {/* Global Voice Modal */}
      <VoiceCommanderModal onOpenVoucherFormWithDraft={openFormWithDraft} />

      {/* Global Voucher Form Modal */}
      <VoucherFormModal
        isOpen={isVoucherModalOpen}
        onClose={() => {
          setIsVoucherModalOpen(false);
          setVoiceDraftToPrefill(null);
        }}
        cashBoxes={cashBoxes}
        postableAccounts={postableAccounts}
        initialType={modalType}
        voiceDraft={voiceDraftToPrefill}
      />
    </div>
  );
}
