'use client';

export const dynamic = 'force-dynamic';

import dynamic from 'next/dynamic';

const AdminUsersContent = dynamic(() => import('./admin-users-content'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4">⏳</div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  ),
});

export default function AdminUsersPage() {
  return <AdminUsersContent />;
}
