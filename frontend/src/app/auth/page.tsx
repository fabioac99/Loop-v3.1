'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/lib/api';
import Image from 'next/image';
import logo from '@/images/logo.png'; // Using the '@' alias usually configured in Next.js

function useBranding() {
  const [branding, setBranding] = useState<{
    logoUrl: string | null;
    logoLightUrl: string | null;
    brandName: string;
    showBrandName: boolean;
    expandLogo: boolean;
  }>({ logoUrl: null, logoLightUrl: null, brandName: 'LOOP', showBrandName: true, expandLogo: false });

  useEffect(() => {
    api.getSettings().then((s: any) => {
      setBranding({
        logoUrl: s.logoFileId ? `${api.baseUrl}/files/${s.logoFileId}` : null,
        logoLightUrl: s.logoLightFileId ? `${api.baseUrl}/files/${s.logoLightFileId}` : null,
        brandName: s.brandName || 'LOOP',
        showBrandName: s.showBrandName ?? true,
        expandLogo: s.expandLogo ?? false,
      });
    }).catch(() => { });
  }, []);

  return branding;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const router = useRouter();
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('loop-theme');
      return saved ? saved === 'dark' : true;
    }
    return true;
  });
  const branding = useBranding();

  // Decide which logo to use based on theme
  const logoToUse =
    (dark ? branding.logoUrl : branding.logoLightUrl) ||
    branding.logoUrl ||
    branding.logoLightUrl;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
        backgroundSize: '32px 32px',
      }} />

      <div className="w-full max-w-[420px] mx-4 relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          {logoToUse ? (
            <div className="inline-flex items-center justify-center mb-6">
              <img
                src={logoToUse}
                alt={branding.brandName}
                className="h-16 w-auto object-contain"
              />
            </div>
          ) : (
            <div className="inline-flex items-center justify-center w-80 h-20 rounded-2xl bg-primary/10 mb-6 overflow-hidden">
              <Image
                src={logo}
                alt="LOOPing Logo"
                className="w-68 h-68 object-contain" // Slightly smaller than the 16x16 container for padding
                priority
              />
            </div>
          )}
          {branding.showBrandName && (
            <>
            </>
          )}
        </div>



        {/* Login Form */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl shadow-black/5">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground/80">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                placeholder="your@email.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground/80">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-xl border border-destructive/20">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Contact your administrator for account access
        </p>
      </div>
    </div>
  );
}
