'use client';

import { useRouter } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

// Ditampilkan di halaman yang butuh data cabang saat user belum punya cabang.
export function BranchRequiredNotice() {
  const router = useRouter();
  return (
    <EmptyState
      icon={Building2}
      title="Belum ada cabang"
      description="Fitur ini membutuhkan data cabang. Tambahkan cabang terlebih dahulu untuk mulai mengelola data bisnis."
      actionLabel="Tambah Cabang Sekarang"
      onAction={() => router.push('/branches')}
    />
  );
}
