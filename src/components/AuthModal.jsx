"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, LogIn, UserPlus, AlertCircle, CheckCircle, KeyRound } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export function AuthModal({ isOpen, onClose, defaultMode = 'login', resetToken: initialResetToken = '' }) {
  const [mode, setMode] = useState(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resetToken, setResetToken] = useState(initialResetToken);
  const [showResetForm, setShowResetForm] = useState(!!initialResetToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const router = useRouter();

  // Update reset form visibility when token changes
  React.useEffect(() => {
    if (initialResetToken) {
      setResetToken(initialResetToken);
      setShowResetForm(true);
      setMode('reset');
    }
  }, [initialResetToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (mode === 'login') {
        // Use NextAuth signIn
        const result = await signIn('credentials', {
          redirect: false,
          email,
          password,
        });

        if (result?.error) {
          setError(result.error);
        } else {
          toast.success('Login successful!');
          onClose();
          setEmail('');
          setPassword('');
          
          // Check if user is admin to redirect
          try {
            const userRes = await fetch('/api/auth/current-user');
            const userData = await userRes.json();
            if (userData?.user?.role === 'admin') {
              router.push('/admin');
            } else {
              router.refresh();
            }
          } catch (e) {
            router.refresh();
          }
        }
      } else if (mode === 'signup') {
        if (!name.trim()) {
          setError('Please enter your name');
          setIsLoading(false);
          return;
        }

        // Call signup API
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Signup failed');
        } else {
          // Auto login after signup
          const loginResult = await signIn('credentials', {
            redirect: false,
            email,
            password,
          });

          if (loginResult?.error) {
            setError('Account created but login failed. Please try logging in.');
          } else {
            toast.success('Account created successfully!');
            onClose();
            setName('');
            setEmail('');
            setPassword('');
            router.refresh();
          }
        }
      } else if (mode === 'reset') {
        if (!showResetForm && !resetToken) {
          // Step 1: Request reset email
          const response = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          });

          const data = await response.json();

          if (!response.ok) {
            setError(data.error || 'Failed to send reset email');
          } else {
            setSuccess('Password reset instructions sent! Check your email.');
            setError('');
            setTimeout(() => {
              switchMode('login');
            }, 3000);
          }
        } else {
          // Step 2: Reset password with token
          if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            setIsLoading(false);
            return;
          }
          if (newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            setIsLoading(false);
            return;
          }

          const response = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: resetToken, password: newPassword }),
          });

          const data = await response.json();

          if (!response.ok) {
            setError(data.error || 'Failed to reset password');
          } else {
            setSuccess('Password reset successfully! Redirecting to login...');
            toast.success('Password reset successfully!');
            setError('');
            setTimeout(() => {
              onClose();
              setNewPassword('');
              setConfirmPassword('');
              setResetToken('');
              setShowResetForm(false);
              router.push('/login');
            }, 2000);
          }
        }
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    
    // Close modal before redirect for smoother UX
    setTimeout(() => {
      onClose();
    }, 300);
    
    // Show loading toast
    toast.loading('Redirecting to Google...', { duration: 2000 });
    
    try {
      // This will cause a full page redirect to Google OAuth
      await signIn('google', { callbackUrl: '/' });
    } catch (error) {
      toast.error('Google sign-in failed. Please try again.');
      setIsGoogleLoading(false);
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
    setSuccess('');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative bg-gradient-to-r from-emerald-600 to-teal-600 p-8 text-white">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3 mb-4">
                {mode === 'reset' ? (
                  <KeyRound className="w-8 h-8" />
                ) : mode === 'login' ? (
                  <LogIn className="w-8 h-8" />
                ) : (
                  <UserPlus className="w-8 h-8" />
                )}
                <h2 className="text-3xl font-bold">
                  {mode === 'reset' ? 'Reset Password' : mode === 'login' ? 'Welcome Back' : 'Join Us'}
                </h2>
              </div>
              <p className="text-emerald-50">
                {mode === 'reset'
                  ? showResetForm 
                    ? 'Enter your new password below to complete the reset process'
                    : 'Enter your email to receive password reset instructions'
                  : mode === 'login'
                  ? 'Login to access your dashboard and contribute to conservation'
                  : 'Create an account to enroll in programs and make an impact'}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-8 pt-4 space-y-5">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </motion.div>
              )}

              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3"
                >
                  <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-green-800">{success}</p>
                </motion.div>
              )}

              {/* Google Sign In Button - show only for login and signup */}
              {mode !== 'reset' && (
                <>
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isGoogleLoading}
                    className="w-full bg-white border-2 border-gray-300 text-gray-700 py-4 rounded-xl font-bold hover:bg-gray-50 transition-all shadow-sm flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGoogleLoading ? (
                      <>
                        <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                        <span>Redirecting to Google...</span>
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" className="w-6 h-6">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        <span>Continue with Google</span>
                      </>
                    )}
                  </button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-gray-500">Or continue with email</span>
                    </div>
                  </div>
                </>
              )}

              {mode === 'signup' && (
                <div>
                  <label htmlFor="name" className="block text-sm font-bold text-gray-700 mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                      placeholder="Enter your name"
                      required={mode === 'signup'}
                    />
                  </div>
                </div>
              )}

              {/* Show email field only if not in password reset form */}
              {!(mode === 'reset' && showResetForm) && (
                <div>
                  <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Password reset form - show when user has token */}
              {mode === 'reset' && showResetForm && (
                <>
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-bold text-gray-700 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="password"
                        id="newPassword"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                        placeholder="Enter new password"
                        required
                        minLength={6}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">At least 6 characters</p>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-bold text-gray-700 mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="password"
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                        placeholder="Confirm new password"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                </>
              )}

              {mode !== 'reset' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="password" className="block text-sm font-bold text-gray-700">
                      Password
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => switchMode('reset')}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
                      >
                        Forgot?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                      placeholder="••••••••"
                      required={mode !== 'reset'}
                      minLength={6}
                    />
                  </div>
                  {mode === 'signup' && (
                    <p className="text-xs text-gray-500 mt-2">At least 6 characters</p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-4 rounded-xl font-bold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {mode === 'login' ? 'Logging in...' : mode === 'signup' ? 'Creating account...' : showResetForm ? 'Resetting password...' : 'Sending...'}
                  </span>
                ) : (
                  mode === 'login' ? 'Login' : mode === 'signup' ? 'Create Account' : showResetForm ? 'Reset Password' : 'Send Reset Link'
                )}
              </button>

              <div className="text-center space-y-2">
                {mode === 'reset' ? (
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="text-sm text-emerald-600 hover:text-emerald-700 font-semibold"
                  >
                    ← Back to login
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                    className="text-sm text-emerald-600 hover:text-emerald-700 font-semibold"
                  >
                    {mode === 'login'
                      ? "Don't have an account? Sign up"
                      : 'Already have an account? Login'}
                  </button>
                )}
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
