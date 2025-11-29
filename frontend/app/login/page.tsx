'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

export default function Login() {
  const router = useRouter();
  const { setUser, setToken, user } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (user.userType === 'seller') {
        router.push('/seller/dashboard');
      } else if (user.userType === 'buyer') {
        router.push('/buyer/storefront');
      } else {
        router.push('/admin/dashboard');
      }
    }
  }, [user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Try to detect role from email pattern, default to buyer
      let detectedRole: 'seller' | 'buyer' | 'admin' = 'buyer';
      if (email.includes('admin')) detectedRole = 'admin';
      else if (email.includes('seller')) detectedRole = 'seller';

      const response = await api.auth.login({
        email,
        password,
        role: detectedRole,
      });

      const { token, user } = response.data;
      setToken(token);

      // Map the response to our user type
      const mappedUser = {
        id: user.id || email,
        email: user.email,
        userType: detectedRole,
        name: user.name,
      };
      setUser(mappedUser as any);

      // Redirect based on detected role
      if (detectedRole === 'seller') {
        router.push('/seller/dashboard');
      } else if (detectedRole === 'buyer') {
        router.push('/buyer/storefront');
      } else {
        router.push('/admin/dashboard');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      console.error('Error response:', err.response?.data);
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error?.message ||
        err.message ||
        'Login failed. Check console for details.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-white mb-6">Log In</h1>

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
              required
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-2 rounded">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-2 rounded font-semibold hover:bg-green-700 disabled:opacity-50 transition"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        {/* Demo Credentials */}
        <div className="mt-6 p-4 bg-gray-700 rounded border border-gray-600">
          <p className="text-sm text-gray-300 font-semibold mb-2">Demo Accounts (any password):</p>
          <p className="text-sm text-gray-400">seller@demo.com</p>
          <p className="text-sm text-gray-400">buyer@demo.com</p>
          <p className="text-sm text-gray-400">admin@demo.com</p>
        </div>

        {/* Sign Up Link */}
        <p className="text-center text-gray-400 mt-6">
          Don't have an account?{' '}
          <Link href="/signup" className="text-green-400 hover:text-green-300">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
