'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  roleId?: string;
  roleName?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

interface AdminUsersListProps {
  onUserSelect?: (user: AdminUser) => void;
}

export const AdminUsersList: React.FC<AdminUsersListProps> = ({ onUserSelect }) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/admin/users');
      setUsers(response.data.data);
    } catch (err: any) {
      const message = err.response?.data?.error?.message || 'Failed to load admin users';
      setError(message);
      console.error('Error fetching admin users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (userId: string) => {
    if (!confirm('Deactivate this user?')) return;

    try {
      await api.patch(`/admin/users/${userId}`, { isActive: false });
      fetchUsers();
    } catch (err) {
      console.error('Failed to deactivate user:', err);
      alert('Failed to deactivate user');
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Delete this admin user? This cannot be undone.')) return;

    try {
      await api.delete(`/admin/users/${userId}`);
      fetchUsers();
    } catch (err) {
      console.error('Failed to delete user:', err);
      alert('Failed to delete user');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Loading admin users...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border border-gray-200">
            <tr>
              <th className="px-4 py-2 text-left font-semibold text-gray-900">Name</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-900">Email</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-900">Role</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-900">Status</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-900">Last Login</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="border border-gray-200 hover:bg-gray-50 cursor-pointer transition"
                onClick={() => onUserSelect?.(user)}
              >
                <td className="px-4 py-3 font-medium text-gray-900">{user.name}</td>
                <td className="px-4 py-3 text-gray-600">{user.email}</td>
                <td className="px-4 py-3">
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                    {user.roleName || 'No role'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      user.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">
                  {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'}
                </td>
                <td className="px-4 py-3 space-x-2 flex" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleDeactivate(user.id)}
                    disabled={!user.isActive}
                    className="text-orange-600 hover:text-orange-700 disabled:opacity-50 text-xs font-semibold"
                  >
                    Deactivate
                  </button>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="text-red-600 hover:text-red-700 text-xs font-semibold"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <div className="text-center py-8 text-gray-600">
          <p>No admin users found</p>
        </div>
      )}
    </div>
  );
};

export default AdminUsersList;
