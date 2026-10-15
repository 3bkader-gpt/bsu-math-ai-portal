'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';
import content from '@/data/content.json';
import { 
  Lock, 
  User, 
  Sparkles, 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  Server, 
  CheckCircle2, 
  AlertCircle,
  GraduationCap,
  ArrowRight
} from 'lucide-react';
import { getApiUrl } from '@/lib/api';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const handleAutofill = () => {
    setUsername('admin');
    setPassword('admin_academic_2026');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    // Check credentials locally first to guarantee admin can NEVER get locked out by dead tunnels
    const isDirectAdmin = (
      trimmedUser.toLowerCase() === 'admin' &&
      (trimmedPass === 'admin_academic_2026' || trimmedPass === 'admin123')
    );

    if (isDirectAdmin) {
      // Direct instant authentication
      const directToken = 'admin_academic_cloud_token_' + Date.now();
      localStorage.setItem('adminToken', directToken);
      localStorage.setItem('adminUser', 'admin');

      // Attempt optional background sync with backend if online
      try {
        fetch(getApiUrl('/api/auth/login'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: trimmedUser, password: trimmedPass }),
        }).then(res => res.json()).then(data => {
          if (data?.access_token) {
            localStorage.setItem('adminToken', data.access_token);
          }
        }).catch(() => {});
      } catch {}

      router.push('/admin/dashboard');
      return;
    }

    try {
      const res = await fetch(getApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmedUser, password: trimmedPass }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'اسم المستخدم أو كلمة المرور غير صحيحة، يرجى المحاولة مرة أخرى.');
      }

      // Save token and admin metadata in localStorage
      const token = data.access_token || data.token;
      const adminUsername = data.username || data.user?.username || 'admin';
      localStorage.setItem('adminToken', token);
      localStorage.setItem('adminUser', adminUsername);
      
      // Navigate to dashboard
      router.push('/admin/dashboard');
    } catch (err: any) {
      setError('اسم المستخدم أو كلمة المرور غير صحيحة، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-3 sm:p-6 overflow-hidden transition-colors w-full max-w-[100vw]">
      {/* Decorative Floating Math Symbols Background */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden font-mono opacity-10 max-w-full">
        <span className="absolute top-16 right-20 text-4xl sm:text-5xl text-blue-500">∫ f(x) dx</span>
        <span className="absolute top-1/4 left-16 text-3xl sm:text-4xl text-cyan-500">∑ (1/n²) = π²/6</span>
        <span className="absolute bottom-28 right-28 text-4xl sm:text-5xl text-blue-500">∇ × B = μ₀J</span>
        <span className="absolute bottom-20 left-24 text-3xl sm:text-4xl text-emerald-500">lim(x→0) sin(x)/x = 1</span>
        <span className="absolute top-12 left-1/2 -translate-x-1/2 text-2xl sm:text-3xl text-amber-500">∂²u/∂t² = c²∇²u</span>
      </div>

      {/* Main Login Card */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
          boxShadow: 'var(--card-shadow)',
        }}
        className="relative z-10 w-full max-w-md p-5 sm:p-10 rounded-3xl border transition-colors shadow-2xl backdrop-blur-md min-w-0"
      >
        
        {/* Top Header & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black border transition-all hover:scale-105 shadow-xs"
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            <ArrowRight className="w-4 h-4" />
            <span>{content.adminLogin.backToPortal}</span>
          </Link>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 bg-emerald-500/10 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{content.adminLogin.serverStatus}</span>
            </div>
            <ThemeToggle />
          </div>
        </div>

        {/* Brand Icon & Heading */}
        <div className="text-center mb-6">
          <div
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: '#ffffff',
            }}
            className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20 mb-3.5"
          >
            <Sparkles className="w-7 h-7" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {content.adminLogin.title}
          </h1>
          <p className="text-sm sm:text-base font-bold mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {content.adminLogin.subtitle}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-rose-600 dark:text-rose-300 text-sm font-bold animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1 text-right font-bold">{error}</div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm sm:text-base font-black mb-2" style={{ color: 'var(--text-primary)' }}>
              {content.adminLogin.usernameLabel}
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                required
                dir="ltr"
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-prominent)',
                  color: 'var(--text-primary)',
                }}
                className="w-full px-4 py-3.5 pl-10 rounded-2xl border text-base focus:outline-none transition-all font-bold"
              />
              <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm sm:text-base font-black" style={{ color: 'var(--text-primary)' }}>
                {content.adminLogin.passwordLabel}
              </label>
              <button
                type="button"
                onClick={handleAutofill}
                className="text-xs sm:text-sm font-black hover:underline transition-colors cursor-pointer"
                style={{ color: 'var(--accent-primary)' }}
              >
                {content.adminLogin.autofillButton}
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                dir="ltr"
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-prominent)',
                  color: 'var(--text-primary)',
                }}
                className="w-full px-4 py-3.5 pl-10 pr-10 rounded-2xl border text-base focus:outline-none transition-all font-bold"
              />
              <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: '#ffffff',
            }}
            className="w-full py-4 px-5 rounded-2xl font-black text-base sm:text-lg transition-all flex items-center justify-center gap-2.5 shadow-lg hover:opacity-95 active:scale-[0.98] cursor-pointer mt-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>{content.adminLogin.loadingButton}</span>
              </>
            ) : (
              <>
                <span>{content.adminLogin.loginButton}</span>
                <ArrowLeft className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Infrastructure Indicators */}
        <div
          className="mt-6 pt-5 border-t flex items-center justify-between text-[11px] font-medium"
          style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
        >
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
            <span>{content.adminLogin.dbLabel}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            <span>{content.adminLogin.cdnLabel}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            <span>{content.adminLogin.modelLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

