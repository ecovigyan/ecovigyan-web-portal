"use client";

import React, { useState } from 'react';
import { Menu, X, User, LogOut, LayoutDashboard, Settings, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { AuthModal } from './AuthModal';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const navLinks = [
    { name: 'Mushroom Mania', href: '/explore', featured: true },
    { name: 'Store', href: '/products' },
    { name: 'Programs', href: '/programs' },
    { name: 'Get Involved', href: '/join-us' },
  ];

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    setIsOpen(false);
  };

  return (
    <>
      <nav className="fixed w-full z-50 bg-white/90 backdrop-blur-md border-b border-emerald-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <Link href="/" className="flex items-center gap-2">
              <motion.img 
                src="/gallery/logo4.png"
                alt="Eco Vigyan Foundation Logo" 
                className="w-12 h-12 object-contain"
                whileHover={{ 
                  scale: 1.1, 
                  rotate: [0, -5, 5, -5, 0],
                  transition: { duration: 0.5 }
                }}
              />
              <div className="flex flex-col">
                <span className="text-xl font-bold text-emerald-900 leading-none">ECO VIGYAN</span>
                <span className="text-[10px] tracking-[0.2em] text-emerald-600 font-semibold uppercase">Foundation</span>
              </div>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`relative text-sm font-medium transition-colors ${
                    link.featured
                      ? 'text-emerald-700 font-semibold hover:text-emerald-500'
                      : 'text-emerald-800 hover:text-emerald-600'
                  }`}
                >
                  {link.name}
                  {link.featured && (
                    <span className="absolute -top-1.5 -right-3 flex items-center justify-center">
                      <span className="absolute inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 opacity-75 animate-ping" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                  )}
                </Link>
              ))}
              
              {isAuthenticated && user ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 bg-emerald-50 border-2 border-emerald-200 text-emerald-900 px-4 py-2 rounded-full text-sm font-semibold hover:bg-emerald-100 transition-all"
                  >
                    {user?.dp?.url && !imageError ? (
                      <img 
                        src={user.dp.url} 
                        alt={user.name}
                        onError={() => setImageError(true)}
                        className="w-8 h-8 rounded-full object-cover border-2 border-emerald-300"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
                        {user?.name?.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2) || 'U'}
                      </div>
                    )}
                    <span className="hidden lg:inline">{user?.name}</span>
                  </button>

                  <AnimatePresence>
                    {showUserMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-emerald-100 overflow-hidden"
                      >
                        <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                          <p className="font-bold text-emerald-900">{user?.name}</p>
                          <p className="text-xs text-emerald-600">{user?.email}</p>
                          <span className="inline-block mt-2 px-2 py-1 bg-emerald-200 text-emerald-800 text-xs font-bold rounded-full uppercase">
                            {user?.role || 'user'}
                          </span>
                        </div>
                        <div className="p-2">
                          {user?.role === 'admin' && (
                            <Link
                              href="/admin"
                              className="flex items-center gap-3 px-4 py-3 hover:bg-emerald-50 rounded-xl transition-colors text-emerald-700 font-bold border-b border-emerald-50"
                              onClick={() => setShowUserMenu(false)}
                            >
                              <Shield className="w-5 h-5 text-emerald-600" />
                              <span>Admin Panel</span>
                            </Link>
                          )}
                          <Link
                            href="/dashboard"
                            className="flex items-center gap-3 px-4 py-3 hover:bg-emerald-50 rounded-xl transition-colors text-gray-700"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <LayoutDashboard className="w-5 h-5 text-emerald-600" />
                            <span className="font-medium">Dashboard</span>
                          </Link>
                          <Link
                            href="/account"
                            className="flex items-center gap-3 px-4 py-3 hover:bg-emerald-50 rounded-xl transition-colors text-gray-700"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <Settings className="w-5 h-5 text-emerald-600" />
                            <span className="font-medium">Profile Settings</span>
                          </Link>
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 rounded-xl transition-colors text-gray-700"
                          >
                            <LogOut className="w-5 h-5 text-red-600" />
                            <span className="font-medium">Logout</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="bg-emerald-600 text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200/50 flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  Login
                </button>
              )}

              <Link href="/donate">
                <button className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-200/50">
                  Donate Now
                </button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="text-emerald-900 p-2 focus:outline-none"
              >
                {isOpen ? <X size={28} /> : <Menu size={28} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white border-b border-emerald-100 overflow-hidden"
            >
              <div className="px-4 pt-2 pb-6 space-y-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`flex items-center justify-between px-3 py-3 text-base font-medium rounded-lg hover:bg-emerald-50 ${
                      link.featured ? 'text-emerald-700 font-semibold' : 'text-emerald-900'
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    {link.name}
                    {link.featured && (
                      <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wide">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Featured
                      </span>
                    )}
                  </Link>
                ))}

                {isAuthenticated && user ? (
                  <>
                    <div className="px-3 py-4 bg-emerald-50 rounded-lg border border-emerald-200">
                      <p className="font-bold text-emerald-900 text-sm">{user?.name}</p>
                      <p className="text-xs text-emerald-600">{user?.email}</p>
                    </div>
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-3 px-3 py-3 text-base font-medium text-emerald-900 hover:bg-emerald-50 rounded-lg"
                      onClick={() => setIsOpen(false)}
                    >
                      <LayoutDashboard className="w-5 h-5" />
                      Dashboard
                    </Link>
                    <Link
                      href="/account"
                      className="flex items-center gap-3 px-3 py-3 text-base font-medium text-emerald-900 hover:bg-emerald-50 rounded-lg"
                      onClick={() => setIsOpen(false)}
                    >
                      <Settings className="w-5 h-5" />
                      Profile Settings
                    </Link>
                    {user?.role === 'admin' && (
                      <Link
                        href="/admin"
                        className="flex items-center gap-3 px-3 py-3 text-base font-semibold text-emerald-700 hover:bg-emerald-50 rounded-lg"
                        onClick={() => setIsOpen(false)}
                      >
                        <Shield className="w-5 h-5 text-emerald-600" />
                        Admin Panel
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-3 text-base font-medium text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <LogOut className="w-5 h-5" />
                      Logout
                    </button>
                  </>
                ) : (
                  <div className="px-3 pt-2">
                    <button
                      onClick={() => {
                        setShowAuthModal(true);
                        setIsOpen(false);
                      }}
                      className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl text-base font-semibold"
                    >
                      <User className="w-5 h-5" />
                      Login / Sign Up
                    </button>
                  </div>
                )}

                <div className="pt-2 px-3">
                  <Link href="/donate" className="block" onClick={() => setIsOpen(false)}>
                    <button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-xl text-base font-semibold">
                      Donate Now
                    </button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
}
