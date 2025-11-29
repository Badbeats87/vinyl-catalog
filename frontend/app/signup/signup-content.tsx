'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

export default function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser, setToken } = useAuthStore();

  const [userType, setUserType] = useState<'seller' | 'buyer'>(
    (searchParams.get('type') as 'seller' | 'buyer') || 'buyer'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  // Email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Validate email format
  const validateEmail = (value: string): string | undefined => {
    if (!value) return 'Email is required';
    if (!emailRegex.test(value)) return 'Please enter a valid email address';
    return undefined;
  };

  // Validate password
  const validatePassword = (value: string): string | undefined => {
    if (!value) return 'Password is required';
    if (value.length < 8) return 'Password must be at least 8 characters';
    return undefined;
  };

  // Validate confirm password
  const validateConfirmPassword = (value: string, pwd: string): string | undefined => {
    if (!value) return 'Please confirm your password';
    if (value !== pwd) return 'Passwords do not match';
    return undefined;
  };

  // Handle email change with validation
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    const error = validateEmail(value);
    setFieldErrors((prev) => ({
      ...prev,
      email: error,
    }));
  };

  // Handle password change with validation
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    const error = validatePassword(value);
    setFieldErrors((prev) => ({
      ...prev,
      password: error,
    }));

    // Also validate confirm password if it was already entered
    if (confirmPassword) {
      const confirmError = validateConfirmPassword(confirmPassword, value);
      setFieldErrors((prev) => ({
        ...prev,
        confirmPassword: confirmError,
      }));
    }
  };

  // Handle confirm password change with validation
  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setConfirmPassword(value);
    const error = validateConfirmPassword(value, password);
    setFieldErrors((prev) => ({
      ...prev,
      confirmPassword: error,
    }));
  };

  // Check if form is valid
  const isFormValid =
    email &&
    password &&
    confirmPassword &&
    !fieldErrors.email &&
    !fieldErrors.password &&
    !fieldErrors.confirmPassword;

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate all fields before submitting
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    const confirmPasswordError = validateConfirmPassword(confirmPassword, password);

    if (emailError || passwordError || confirmPasswordError) {
      setFieldErrors({
        email: emailError,
        password: passwordError,
        confirmPassword: confirmPasswordError,
      });
      return;
    }

    setLoading(true);
    try {
      const response = await api.auth.signup({
        email,
        password,
        userType,
      });

      const { token, user } = response.data;
      setToken(token);
      const mappedUser = {
        id: user.id || email,
        email: user.email,
        userType: userType,
        name: user.name,
      };
      setUser(mappedUser as any);

      // Redirect based on user type
      if (userType === 'seller') {
        router.push('/seller/dashboard');
      } else {
        router.push('/buyer/storefront');
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      console.error('Error response:', err.response?.data);
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error?.message ||
        err.message ||
        'Sign up failed. Check console for details.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
        <p className="text-gray-400 mb-6">Join as a {userType}</p>

        <form onSubmit={handleSignUp} className="space-y-4">
          {/* User Type Selection */}
          <div className="flex gap-4 mb-6">
            <button
              type="button"
              onClick={() => setUserType('seller')}
              className={`flex-1 py-2 px-4 rounded ${
                userType === 'seller'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Seller
            </button>
            <button
              type="button"
              onClick={() => setUserType('buyer')}
              className={`flex-1 py-2 px-4 rounded ${
                userType === 'buyer'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Buyer
            </button>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="you@example.com"
              className={`w-full px-4 py-2 bg-gray-700 border rounded text-white placeholder-gray-500 focus:outline-none transition ${
                fieldErrors.email
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray-600 focus:border-green-500'
              }`}
            />
            {fieldErrors.email && (
              <p className="text-red-400 text-sm mt-1">{fieldErrors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Password <span className="text-red-400">*</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={handlePasswordChange}
              placeholder="••••••••"
              className={`w-full px-4 py-2 bg-gray-700 border rounded text-white placeholder-gray-500 focus:outline-none transition ${
                fieldErrors.password
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray-600 focus:border-green-500'
              }`}
            />
            {fieldErrors.password && (
              <p className="text-red-400 text-sm mt-1">{fieldErrors.password}</p>
            )}
            <p className="text-gray-400 text-xs mt-1">At least 8 characters required</p>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Confirm Password <span className="text-red-400">*</span>
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              placeholder="••••••••"
              className={`w-full px-4 py-2 bg-gray-700 border rounded text-white placeholder-gray-500 focus:outline-none transition ${
                fieldErrors.confirmPassword
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray-600 focus:border-green-500'
              }`}
            />
            {fieldErrors.confirmPassword && (
              <p className="text-red-400 text-sm mt-1">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          {/* API Error Message */}
          {error && (
            <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-2 rounded">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !isFormValid}
            className="w-full bg-green-600 text-white py-2 rounded font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        {/* Login Link */}
        <p className="text-center text-gray-400 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-green-400 hover:text-green-300">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
