'use client';

import React, { useState } from 'react';
import { RoleGuard } from '@/components/role-guard';
import { Tabs, TabItem } from '@/components/ui/tabs';
import { Building2, Users, Upload } from 'lucide-react';
import BranchesPage from '../branches/page';
import StaffPage from '../staff/page';
import ImportPage from '../import/page';

const managementTabs: TabItem[] = [
  { id: 'branches', label: 'Cabang', icon: Building2 },
  { id: 'staff', label: 'Kasir', icon: Users },
  { id: 'import', label: 'Impor Data', icon: Upload },
];

export default function ManagementPage() {
  const [activeTab, setActiveTab] = useState<string>('branches');

  return (
    <RoleGuard allowedRoles={['OWNER']}>
      <div className="space-y-6">
        {/* Top Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Manajemen</h1>
        </div>

        {/* Section Navigation */}
        <Tabs items={managementTabs} activeId={activeTab} onChange={setActiveTab} />

        {/* Active Section Content */}
        <div>
          {activeTab === 'branches' && <BranchesPage />}
          {activeTab === 'staff' && <StaffPage />}
          {activeTab === 'import' && <ImportPage />}
        </div>
      </div>
    </RoleGuard>
  );
}
