'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import ForbiddenPage from '@/app/(app)/forbidden/page';

interface UserProfile {
  user_id: string;
  email: string;
  full_name: string;
  role: 'OWNER' | 'CASHIER';
  org_id: string;
  org_name: string;
  is_demo: boolean;
  branch_id: string | null;
}

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: Array<'OWNER' | 'CASHIER'>;
}

export function RoleGuard({ children, allowedRoles = ['OWNER'] }: RoleGuardProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          // If unauthorized or local preview without session, let it render in dev preview mode or redirect to login
          if (res.status === 401) {
            router.push('/login');
            return;
          }
        }
        const json = await res.json();
        if (isMounted && json?.data) {
          setProfile(json.data);
        }
      } catch {
        // Fallback gracefully
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-2 text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin text-sage-600" />
        <span className="text-sm">Memeriksa hak akses...</span>
      </div>
    );
  }

  // If user profile is loaded and role is not allowed, show 403
  if (profile && !allowedRoles.includes(profile.role)) {
    return <ForbiddenPage />;
  }

  return <>{children}</>;
}
