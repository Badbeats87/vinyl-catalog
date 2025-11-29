'use client';

import React, { useState } from 'react';
import AdminUsersList from '@/components/AdminUsersList';
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

export default function AdminUsersContent() {
  const [showForm, setShowForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [passwordHash, setPasswordHash] = useState('');
  const [roleId, setRoleId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email || !name || !passwordHash) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      await api.post('/admin/users', {
        email,
        name,
        passwordHash,
        roleId: roleId || undefined,
      });

      setSuccessMessage('Admin user created successfully');
      setEmail('');
      setName('');
      setPasswordHash('');
      setRoleId('');
      setShowForm(false);
      setRefreshKey((prev) => prev + 1);
    } catch (err: any) {
      const message =
        err.response?.data?.error?.message || 'Failed to create admin user';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Users Management</h1>
          <p className="text-gray-600">
            Create and manage admin users with different roles and permissions
          </p>
        </div>

        {/* Messages */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-700">{successMessage}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Add User Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition"
          >
            {showForm ? 'Cancel' : '+ Add New Admin User'}
          </button>
        </div>

        {/* Add User Form */}
        {showForm && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Admin User</h2>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Email <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Full Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Password Hash */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Password Hash <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="password"
                    value={passwordHash}
                    onChange={(e) => setPasswordHash(e.target.value)}
                    placeholder="Hashed password"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    In production, use bcrypt for password hashing
                  </p>
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Role
                  </label>
                  <select
                    value={roleId}
                    onChange={(e) => setRoleId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">No role selected</option>
                    <option value="super_admin">Super Admin</option>
                    <option value="manager">Manager</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold py-2 px-6 rounded-lg transition disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Admin User'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Users List */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Admin Users</h2>
          <AdminUsersList key={refreshKey} onUserSelect={setSelectedUser} />
        </div>
      </div>
    </div>
  );
}
