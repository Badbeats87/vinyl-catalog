'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';

interface Submission {
  id: string;
  seller: string;
  album: string;
  artist: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export default function AdminDashboard() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const [submissions, setSubmissions] = useState<Submission[]>([
    {
      id: '1',
      seller: 'seller@demo.com',
      album: 'Thriller',
      artist: 'Michael Jackson',
      submittedAt: '2024-11-28',
      status: 'pending',
    },
    {
      id: '2',
      seller: 'seller2@demo.com',
      album: 'The Wall',
      artist: 'Pink Floyd',
      submittedAt: '2024-11-27',
      status: 'pending',
    },
    {
      id: '3',
      seller: 'seller@demo.com',
      album: 'Dark Side of the Moon',
      artist: 'Pink Floyd',
      submittedAt: '2024-11-26',
      status: 'approved',
    },
  ]);

  useEffect(() => {
    if (!user || user.userType !== 'admin') {
      router.push('/');
    }
  }, [user, router]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleApprove = (id: string) => {
    setSubmissions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'approved' as const } : s))
    );
  };

  const handleReject = (id: string) => {
    setSubmissions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'rejected' as const } : s))
    );
  };

  const pendingCount = submissions.filter((s) => s.status === 'pending').length;
  const approvedCount = submissions.filter((s) => s.status === 'approved').length;
  const rejectedCount = submissions.filter((s) => s.status === 'rejected').length;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 shadow">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-green-500">🔐 Admin Dashboard</h1>
          <div className="flex gap-4 items-center">
            <span className="text-sm text-gray-300">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="text-gray-300 hover:text-white transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="text-gray-400 text-sm font-semibold mb-2">Total Submissions</div>
            <div className="text-3xl font-bold text-green-500">{submissions.length}</div>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg border-l-4 border-yellow-500">
            <div className="text-gray-400 text-sm font-semibold mb-2">Pending Review</div>
            <div className="text-3xl font-bold text-yellow-500">{pendingCount}</div>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg border-l-4 border-green-500">
            <div className="text-gray-400 text-sm font-semibold mb-2">Approved</div>
            <div className="text-3xl font-bold text-green-500">{approvedCount}</div>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg border-l-4 border-red-500">
            <div className="text-gray-400 text-sm font-semibold mb-2">Rejected</div>
            <div className="text-3xl font-bold text-red-500">{rejectedCount}</div>
          </div>
        </div>

        {/* Submissions Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-bold">Seller Submissions</h2>
          </div>
          <table className="w-full">
            <thead className="bg-gray-700 border-b border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Seller</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Album</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Artist</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Submitted</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((submission) => (
                <tr key={submission.id} className="border-b border-gray-700 hover:bg-gray-750">
                  <td className="px-6 py-4 text-sm">{submission.seller}</td>
                  <td className="px-6 py-4">{submission.album}</td>
                  <td className="px-6 py-4 text-gray-400">{submission.artist}</td>
                  <td className="px-6 py-4 text-sm text-gray-400">{submission.submittedAt}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded text-xs font-semibold ${
                        submission.status === 'pending'
                          ? 'bg-yellow-900 text-yellow-200'
                          : submission.status === 'approved'
                          ? 'bg-green-900 text-green-200'
                          : 'bg-red-900 text-red-200'
                      }`}
                    >
                      {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {submission.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(submission.id)}
                          className="text-green-400 hover:text-green-300 font-semibold"
                        >
                          Approve
                        </button>
                        <span className="text-gray-600">|</span>
                        <button
                          onClick={() => handleReject(submission.id)}
                          className="text-red-400 hover:text-red-300 font-semibold"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {submission.status !== 'pending' && (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
