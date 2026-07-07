"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  MapPin,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  ArrowRight,
  Search,
  AlertCircle,
  Plus,
  Trash2,
  RefreshCw,
  Bell,
  Palette,
  BookOpen,
  Filter,
  ImageIcon,
  FileEdit,
  Upload,
  ChevronLeft,
  ChevronRight,
  Shield,
  Users,
  Ban,
  UserCheck,
  Award,
  Globe,
  LogOut
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ReviewObservationModal } from '@/components/ReviewObservationModal';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import { ImageWithFallback } from '@/components/ImageWithFallback';
import { ImportExcelModal } from '@/components/ImportExcelModal';

export default function AdminPanel() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  
  // Navigation Section State (sidebar option)
  const [activeSection, setActiveSection] = useState('overview');
  
  // Observations State
  const [observationFilter, setObservationFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [showNotifications, setShowNotifications] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [observations, setObservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [observationToDelete, setObservationToDelete] = useState(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [observationToReview, setObservationToReview] = useState(null);
  const [observationToReject, setObservationToReject] = useState(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [bulkApproving, setBulkApproving] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [actionLoadingStates, setActionLoadingStates] = useState({});
  const [deletingObservation, setDeletingObservation] = useState(false);

  // Users State
  const [usersList, setUsersList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersSearch, setUsersSearch] = useState('');
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [usersTotalCount, setUsersTotalCount] = useState(0);

  // Stats State
  const [stats, setStats] = useState({
    totalObservations: 0,
    pendingObservations: 0,
    approvedObservations: 0,
    rejectedObservations: 0,
    systemImports: 0
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Security guard
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
  }, [user, authLoading, router]);

  // Load observations data
  useEffect(() => {
    if (user?.role === 'admin' && activeSection === 'observations') {
      loadObservations();
    }
  }, [user, activeSection, observationFilter, currentPage]);

  // Load users data
  useEffect(() => {
    if (user?.role === 'admin' && activeSection === 'users') {
      loadUsers();
    }
  }, [user, activeSection, usersPage, usersSearch]);

  // Initial load of counts/stats
  useEffect(() => {
    if (user?.role === 'admin') {
      fetchCounts();
    }
  }, [user]);

  const loadObservations = async () => {
    try {
      setLoading(true);
      const url = observationFilter === 'system-imports'
        ? `/api/admin/mushrooms?systemImports=true&page=${currentPage}&limit=24`
        : observationFilter === 'all'
        ? `/api/admin/mushrooms?page=${currentPage}`
        : `/api/admin/mushrooms?status=${observationFilter}&page=${currentPage}`;
      
      const res = await fetch(url);
      const data = await res.json();

      if (res.ok) {
        setObservations(data.mushrooms || []);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.total || 0);
        await fetchCounts();
      } else {
        throw new Error(data.error || 'Failed to fetch observations');
      }
    } catch (error) {
      console.error('Load data error:', error);
      toast.error(error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setUsersLoading(true);
      const url = `/api/admin/users?page=${usersPage}&search=${usersSearch}`;
      const res = await fetch(url);
      const data = await res.json();

      if (res.ok) {
        setUsersList(data.users || []);
        setUsersTotalPages(data.totalPages || 1);
        setUsersTotalCount(data.total || 0);
      } else {
        throw new Error(data.error || 'Failed to load users');
      }
    } catch (error) {
      console.error('Load users error:', error);
      toast.error(error.message || 'Failed to load users directory');
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchCounts = async () => {
    try {
      const res = await fetch('/api/admin/mushrooms?countsOnly=true');
      if (res.ok) {
        const data = await res.json();
        if (data.counts) {
          const pending = data.counts.pending || 0;
          const approved = data.counts.approved || 0;
          const rejected = data.counts.rejected || 0;
          const systemImports = data.counts.systemImports || 0;
          const total = pending + approved + rejected;
          
          setStats({
            totalObservations: total,
            pendingObservations: pending,
            approvedObservations: approved,
            rejectedObservations: rejected,
            systemImports: systemImports
          });
        }
      }
    } catch (error) {
      console.error('Fetch counts error:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (activeSection === 'observations') {
      await loadObservations();
    } else if (activeSection === 'users') {
      await loadUsers();
    } else {
      await fetchCounts();
    }
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success('Data refreshed successfully!');
    }, 500);
  };

  const setObservationLoading = (id, action, isLoading) => {
    setActionLoadingStates(prev => ({
      ...prev,
      [`${id}-${action}`]: isLoading
    }));
  };

  const isObservationLoading = (id, action) => {
    return actionLoadingStates[`${id}-${action}`] || false;
  };

  const updateObservationStatus = async (id, status, rejectionReason) => {
    const action =
      status === 'approved' ? 'approve' :
      status === 'rejected' ? 'reject' :
      'pending';
    setObservationLoading(id, action, true);
    
    try {
      const res = await fetch(`/api/admin/mushrooms/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action,
          status,
          ...(rejectionReason && { rejectionReason })
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update observation');
      }

      toast.success(`Observation ${status} successfully!`);
      await loadObservations();
    } catch (error) {
      toast.error(error.message || 'Failed to update observation');
      throw error;
    } finally {
      setObservationLoading(id, action, false);
    }
  };

  const handleSaveReview = async (updatedObservation) => {
    try {
      const res = await fetch(`/api/admin/mushrooms/${updatedObservation._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commonName: updatedObservation.commonName,
          scientificName: updatedObservation.scientificName,
          description: updatedObservation.description,
          ecologicalRole: updatedObservation.ecologicalRole,
          texture: updatedObservation.texture,
          underside: updatedObservation.underside,
          fruitingSurface: updatedObservation.fruitingSurface,
          stemPresence: updatedObservation.stemPresence,
          commonUses: updatedObservation.commonUses,
          adminNotes: updatedObservation.adminNotes
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save review');
      }

      await loadObservations();
    } catch (error) {
      throw error;
    }
  };

  const handleDeleteObservation = (observation) => {
    setObservationToDelete(observation);
  };

  const confirmDeleteObservation = async () => {
    if (!observationToDelete) return;

    setDeletingObservation(true);
    try {
      const res = await fetch(`/api/mushrooms/${observationToDelete._id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete observation');
      }

      toast.success('Observation deleted successfully');
      setObservationToDelete(null);
      await loadObservations();
    } catch (error) {
      toast.error(error.message || 'Failed to delete observation');
    } finally {
      setDeletingObservation(false);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedItems.size === 0) {
      toast.error('Please select items first');
      return;
    }

    setBulkApproving(true);
    try {
      const res = await fetch('/api/admin/mushrooms/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          mushroomIds: Array.from(selectedItems)
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to approve observations');
      }

      const data = await res.json();
      toast.success(`Approved ${data.modifiedCount} observation(s)! ${data.pointsAwarded} points awarded.`);
      setSelectedItems(new Set());
      await loadObservations();
    } catch (error) {
      toast.error(error.message || 'Failed to approve observations');
    } finally {
      setBulkApproving(false);
    }
  };

  const handleBulkDelete = () => {
    if (selectedItems.size === 0) {
      toast.error('Please select items first');
      return;
    }
    setIsBulkDeleteModalOpen(true);
  };

  const confirmBulkDelete = async () => {
    const count = selectedItems.size;
    
    setBulkDeleting(true);
    try {
      const promises = Array.from(selectedItems).map(id =>
        fetch(`/api/mushrooms/${id}`, { method: 'DELETE' })
      );
      
      await Promise.all(promises);
      toast.success(`${count} observation${count > 1 ? 's' : ''} deleted successfully`);
      setSelectedItems(new Set());
      setIsBulkDeleteModalOpen(false);
      await loadObservations();
    } catch (error) {
      toast.error('Failed to delete some observations');
    } finally {
      setBulkDeleting(false);
    }
  };

  const toggleItemSelection = (id) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const selectAll = (items) => {
    const newSelected = new Set(items.map(item => item._id));
    setSelectedItems(newSelected);
  };

  const deselectAll = () => {
    setSelectedItems(new Set());
  };

  // User Banning / Unbanning Actions
  const handleBanToggle = async (targetUser) => {
    const action = targetUser.isBanned ? 'unban' : 'ban';
    const confirmMsg = `Are you sure you want to ${action} ${targetUser.name || targetUser.username}?`;
    if (!window.confirm(confirmMsg)) return;

    setActionLoadingStates(prev => ({ ...prev, [targetUser._id]: true }));
    try {
      const res = await fetch('/api/admin/users/ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUser._id, action })
      });
      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || `User ${action}ned successfully`);
        await loadUsers();
      } else {
        throw new Error(data.error || 'Action failed');
      }
    } catch (err) {
      toast.error(err.message || `Failed to ${action} user`);
    } finally {
      setActionLoadingStates(prev => ({ ...prev, [targetUser._id]: false }));
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-amber-50 text-amber-700 border-amber-200',
      approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      rejected: 'bg-red-50 text-red-700 border-red-200'
    };
    const icons = {
      pending: Clock,
      approved: CheckCircle,
      rejected: XCircle
    };
    const Icon = icons[status];
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${styles[status]}`}>
        <Icon className="w-3.5 h-3.5" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const filterBySearch = (items, query) => {
    if (!query.trim()) return items;
    const lowerQuery = query.toLowerCase();
    return items.filter(item => {
      const searchableText = JSON.stringify(item).toLowerCase();
      return searchableText.includes(lowerQuery);
    });
  };

  const filteredObservations = filterBySearch(observations, searchQuery);
  const pendingCount = stats.pendingObservations;

  // Show loading while auth is being verified
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Verifying Administrator privileges...</p>
        </div>
      </div>
    );
  }

  // Double check role guard
  if (!user || user.role !== 'admin') {
    return null;
  }

  // Sidebar Menu Items
  const sidebarItems = [
    { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'observations', label: 'Observations Review', icon: MapPin, badge: stats.pendingObservations },
    { id: 'users', label: 'Volunteer Directory', icon: Users }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row h-screen overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-full md:w-64 bg-emerald-950 text-white shrink-0 flex flex-col justify-between z-10 shadow-xl border-r border-emerald-900">
        <div className="flex flex-col flex-1">
          {/* Sidebar Header */}
          <div className="p-6 border-b border-emerald-900/60 bg-emerald-950">
            <div className="flex items-center gap-3">
              <img 
                src="/gallery/logo4.png" 
                alt="Foundation Logo" 
                className="w-10 h-10 object-contain"
              />
              <div className="min-w-0">
                <p className="font-extrabold text-white leading-none text-base tracking-wide truncate">ECO VIGYAN</p>
                <p className="text-[9px] tracking-widest text-emerald-400 font-bold uppercase mt-1">Admin Portal</p>
              </div>
            </div>
          </div>

          {/* Navigation Options */}
          <div className="p-4 space-y-1 flex-1 overflow-y-auto">
            <nav className="space-y-1.5">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveSection(item.id);
                      setCurrentPage(1);
                      setUsersPage(1);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl font-bold text-sm transition-all ${
                      isActive
                        ? 'bg-emerald-800 text-white shadow-lg'
                        : 'text-emerald-100/70 hover:bg-emerald-900/50 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                        isActive ? 'bg-white text-emerald-800' : 'bg-red-500 text-white'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Sidebar Footer (Profile, Logout, Website Link) */}
        <div className="p-4 border-t border-emerald-900 bg-emerald-950/40 space-y-3 shrink-0">
          <div className="flex items-center gap-3 px-2 py-1">
            {user?.dp?.url ? (
              <img
                src={user.dp.url}
                alt={user.name}
                className="w-10 h-10 rounded-full object-cover border border-emerald-850"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-extrabold text-sm border border-emerald-850">
                {user?.name?.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2) || 'A'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-bold text-white text-sm truncate leading-snug">{user?.name}</p>
              <p className="text-[11px] text-emerald-400 truncate mt-0.5">{user?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-emerald-900/50">
            <Link
              href="/"
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-900/30 hover:bg-emerald-900/60 text-emerald-300 hover:text-emerald-100 rounded-xl text-xs font-bold transition-all border border-emerald-800/40 text-center"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Website</span>
            </Link>
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to sign out?")) {
                  logout();
                }
              }}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-red-950/30 hover:bg-red-900/30 text-red-300 hover:text-red-100 rounded-xl text-xs font-bold transition-all border border-red-900/20 text-center"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto bg-stone-50 flex flex-col h-full">
        
        {/* Dynamic header depending on the active option */}
        <div className="p-6 md:p-8 pb-0 shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-gray-200 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">ECO VIGYAN CENTRAL COMMAND</span>
              </div>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                {activeSection === 'overview' && 'Console Dashboard'}
                {activeSection === 'observations' && 'Observations Verification'}
                {activeSection === 'users' && 'Volunteer Directory'}
              </h1>
              <p className="text-sm text-gray-500 mt-1 font-medium">
                {activeSection === 'overview' && 'Platform status overview, task summary and direct quick links'}
                {activeSection === 'observations' && 'Review and approve/reject volunteer-submitted mushroom findings'}
                {activeSection === 'users' && 'Manage system users, view accumulated leaderboard points and ban status'}
              </p>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              {/* Notifications drop menu */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 bg-white rounded-xl border border-gray-200 shadow-sm hover:bg-gray-50 transition-all"
                >
                  <Bell className="w-5 h-5 text-gray-700" />
                  {pendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                      {pendingCount}
                    </span>
                  )}
                </button>
                
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 animate-in fade-in zoom-in duration-200"
                    >
                      <div className="p-4 border-b border-gray-100">
                        <h3 className="font-bold text-gray-900">Notifications</h3>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {pendingCount === 0 ? (
                          <div className="p-8 text-center text-gray-500">
                            <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                            <p className="text-sm">No new notifications</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-100">
                            <button
                              onClick={() => {
                                setActiveSection('observations');
                                setObservationFilter('pending');
                                setCurrentPage(1);
                                setShowNotifications(false);
                              }}
                              className="w-full p-4 hover:bg-gray-50 transition-all text-left"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                  <MapPin className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-semibold text-gray-900 text-sm">
                                    {pendingCount} Pending Observation{pendingCount > 1 ? 's' : ''}
                                  </p>
                                  <p className="text-xs text-gray-500">Needs review</p>
                                </div>
                              </div>
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 bg-white rounded-xl border border-gray-200 shadow-sm hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 text-gray-700 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* SECTION CONTENT CONTAINER */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 pt-6">
          <AnimatePresence mode="wait">
            
            {/* SECTION: OVERVIEW */}
            {activeSection === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                {/* Stats Grid */}
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-emerald-600" />
                      </div>
                    </div>
                    <h3 className="text-3xl font-extrabold text-gray-900 mb-1">{stats.totalObservations}</h3>
                    <p className="text-sm text-gray-500 font-semibold mb-4">Total Observations</p>
                    <div className="flex items-center gap-4 text-xs font-bold">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span className="text-gray-600">{stats.approvedObservations} Approved</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                        <span className="text-gray-600">{stats.pendingObservations} Pending</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                        <Clock className="w-6 h-6 text-amber-600" />
                      </div>
                    </div>
                    <h3 className="text-3xl font-extrabold text-gray-900 mb-1">{stats.pendingObservations}</h3>
                    <p className="text-sm text-gray-500 font-semibold mb-4">Pending Reviews</p>
                    {stats.pendingObservations > 0 && (
                      <button
                        onClick={() => {
                          setActiveSection('observations');
                          setObservationFilter('pending');
                          setCurrentPage(1);
                        }}
                        className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
                      >
                        Review submissions now <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                        <Upload className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                    <h3 className="text-3xl font-extrabold text-gray-900 mb-1">{stats.systemImports}</h3>
                    <p className="text-sm text-gray-500 font-semibold mb-4">System Ingested Data</p>
                    <button
                      onClick={() => {
                        setActiveSection('observations');
                        setObservationFilter('system-imports');
                        setCurrentPage(1);
                      }}
                      className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1"
                    >
                      View imports list <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Admin Shortcuts Grid */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Administrative Action Panel</h2>
                  <div className="grid md:grid-cols-3 gap-4">
                    <button
                      onClick={() => setIsImportModalOpen(true)}
                      className="group flex items-center gap-4 p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl hover:shadow-md transition-all border border-purple-200 text-left"
                    >
                      <div className="w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-purple-900 mb-0.5">Import Excel</div>
                        <div className="text-xs text-purple-700">Bulk upload scientific datasets</div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-purple-600 group-hover:translate-x-1 transition-transform" />
                    </button>

                    <button
                      onClick={() => setActiveSection('users')}
                      className="group flex items-center gap-4 p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl hover:shadow-md transition-all border border-blue-200 text-left w-full"
                    >
                      <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-blue-900 mb-0.5">Volunteers Directory</div>
                        <div className="text-xs text-blue-700">Review users and ban status</div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
                    </button>

                    <Link
                      href="/explore"
                      className="group flex items-center gap-4 p-4 bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl hover:shadow-md transition-all border border-teal-200"
                    >
                      <div className="w-12 h-12 rounded-xl bg-teal-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <MapPin className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-teal-900 mb-0.5">Mushroom Mania</div>
                        <div className="text-xs text-teal-700">Interactive ecological map</div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-teal-600 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}

            {/* SECTION: OBSERVATIONS */}
            {activeSection === 'observations' && (
              <motion.div
                key="observations"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {[
                    { label: 'All', value: stats.totalObservations, icon: Filter, color: 'bg-blue-500' },
                    { label: 'Pending', value: stats.pendingObservations, icon: Clock, color: 'bg-amber-500' },
                    { label: 'Approved', value: stats.approvedObservations, icon: CheckCircle, color: 'bg-emerald-500' },
                    { label: 'Rejected', value: stats.rejectedObservations, icon: XCircle, color: 'bg-red-500' },
                    { label: 'System-Imports', value: stats.systemImports, icon: Upload, color: 'bg-purple-500' },
                  ].map((stat) => {
                    const Icon = stat.icon;
                    const isActive = observationFilter === stat.label.toLowerCase();
                    
                    return (
                      <button
                        key={stat.label}
                        onClick={() => { setObservationFilter(stat.label.toLowerCase()); setCurrentPage(1); }}
                        className={`p-4 rounded-2xl border-2 transition-all ${
                          isActive 
                            ? 'bg-white border-emerald-500 shadow-md scale-102' 
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <span className="text-2xl font-bold text-gray-900">{stat.value}</span>
                        </div>
                        <div className="text-sm font-semibold text-gray-505">{stat.label}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Bulk Actions & Search */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                  <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-4">
                    <div className="text-sm text-gray-500">
                      Showing <span className="font-bold text-gray-900">{observations.length}</span> of <span className="font-bold text-gray-900">{totalCount}</span> {observationFilter === 'all' ? 'total' : observationFilter.replace('-', ' ')} submission{totalCount !== 1 ? 's' : ''}
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-all flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        Import Excel
                      </button>

                      {filteredObservations.length > 0 && observationFilter === 'pending' && (
                        <>
                          <button
                            onClick={() => selectAll(filteredObservations)}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-all"
                          >
                            Select All
                          </button>
                          {selectedItems.size > 0 && (
                            <>
                              <button
                                onClick={deselectAll}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-all"
                              >
                                Deselect All
                              </button>
                              <button
                                onClick={handleBulkApprove}
                                disabled={bulkApproving}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all disabled:opacity-50"
                              >
                                {bulkApproving ? 'Approving...' : `Approve (${selectedItems.size})`}
                              </button>
                              <button
                                onClick={handleBulkDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-all"
                              >
                                Delete (${selectedItems.size})
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search observations..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Observations List */}
                <div className="space-y-4">
                  {loading ? (
                    <div className="bg-white rounded-2xl p-12 text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                      <p className="text-gray-505">Loading observations...</p>
                    </div>
                  ) : filteredObservations.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
                      <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-505 mb-2 font-semibold">No observations found</p>
                    </div>
                  ) : (
                    filteredObservations.map((obs, index) => (
                      <motion.div
                        key={obs._id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                      >
                        <div className="p-6">
                          <div className="flex flex-col md:flex-row gap-6">
                            {observationFilter === 'pending' && (
                              <input
                                type="checkbox"
                                checked={selectedItems.has(obs._id)}
                                onChange={() => toggleItemSelection(obs._id)}
                                className="mt-1 w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 self-start"
                              />
                            )}
                            
                            {/* Observation Image */}
                            <div className="w-full md:w-48 h-48 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                              {obs.images && obs.images.length > 0 ? (
                                <ImageWithFallback
                                  src={obs.images[0].url} 
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="w-12 h-12 text-gray-300" />
                                </div>
                              )}
                            </div>
                          
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                                    {obs.commonName || 'Unidentified Mushroom'}
                                  </h3>
                                  {obs.scientificName && (
                                    <p className="text-sm text-gray-505 italic mb-2">{obs.scientificName}</p>
                                  )}
                                </div>
                                <div className="ml-4">
                                  {getStatusBadge(obs.status)}
                                </div>
                              </div>

                              {/* Description */}
                              {obs.description && (
                                <p className="text-sm text-gray-700 mb-3 leading-relaxed">{obs.description}</p>
                              )}

                              {/* Location & Time Info */}
                              <div className="grid md:grid-cols-2 gap-3 mb-3 text-sm">
                                <div className="flex items-center gap-2 text-gray-500">
                                  <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                  <span className="truncate">
                                    {obs.location?.latitude?.toFixed(4)}, {obs.location?.longitude?.toFixed(4)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-500">
                                  <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                  <span>{new Date(obs.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              </div>

                              {/* Status-Specific Info */}
                              {obs.status === 'approved' && obs.approvedAt && (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-3">
                                  <div className="flex items-start gap-2">
                                    <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                                    <div className="text-sm">
                                      <p className="font-semibold text-emerald-900">
                                        Approved on {new Date(obs.approvedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                        {obs.reviewedBy && ` by admin`}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {obs.status === 'rejected' && obs.rejectionReason && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3">
                                  <div className="flex items-start gap-2">
                                    <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                                    <div className="text-sm">
                                      <p className="font-semibold text-red-900 mb-1">Rejection Reason:</p>
                                      <p className="text-red-700">{obs.rejectionReason}</p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Action Buttons */}
                              <div className="flex gap-2 flex-wrap">
                                <button
                                  onClick={() => setObservationToReview(obs)}
                                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all"
                                >
                                  <FileEdit className="w-4 h-4" />
                                  Review
                                </button>
                                
                                {obs.status === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => updateObservationStatus(obs._id, 'approved')}
                                      disabled={isObservationLoading(obs._id, 'approve')}
                                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {isObservationLoading(obs._id, 'approve') ? (
                                        <>
                                          <RefreshCw className="w-4 h-4 animate-spin" />
                                          Approving...
                                        </>
                                      ) : (
                                        <>
                                          <CheckCircle className="w-4 h-4" />
                                          Approve
                                        </>
                                      )}
                                    </button>
                                    <button
                                      onClick={() => {
                                        setObservationToReject(obs);
                                        setRejectionReasonInput('');
                                      }}
                                      disabled={isObservationLoading(obs._id, 'reject')}
                                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {isObservationLoading(obs._id, 'reject') ? (
                                        <>
                                          <RefreshCw className="w-4 h-4 animate-spin" />
                                          Rejecting...
                                        </>
                                      ) : (
                                        <>
                                          <XCircle className="w-4 h-4" />
                                          Reject
                                        </>
                                      )}
                                    </button>
                                  </>
                                )}
                                
                                <button
                                  onClick={() => handleDeleteObservation(obs)}
                                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 transition-all ml-auto"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <p className="text-sm text-gray-505">
                        Page {currentPage} of {totalPages}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="flex items-center gap-1 px-3 py-2 text-sm font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                          <ChevronLeft className="w-4 h-4" /> Prev
                        </button>
                        <div className="flex gap-1">
                          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                            const page = currentPage <= 3
                              ? i + 1
                              : currentPage >= totalPages - 2
                              ? totalPages - 4 + i
                              : currentPage - 2 + i;
                            if (page < 1 || page > totalPages) return null;
                            return (
                              <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`w-9 h-9 text-sm font-semibold rounded-xl transition-all ${
                                  page === currentPage
                                    ? 'bg-emerald-600 text-white'
                                    : 'border border-gray-200 hover:bg-gray-50 text-gray-700'
                                }`}
                              >
                                {page}
                              </button>
                            );
                          })}
                        </div>
                        <button
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="flex items-center gap-1 px-3 py-2 text-sm font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                          Next <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* SECTION: USER DIRECTORY */}
            {activeSection === 'users' && (
              <motion.div
                key="users"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                {/* Search & Stats Banner */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500 font-semibold">
                      Total Registered Volunteers: <span className="font-bold text-gray-900">{usersTotalCount}</span>
                    </div>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search users by name, username, or email..."
                      value={usersSearch}
                      onChange={(e) => {
                        setUsersSearch(e.target.value);
                        setUsersPage(1); // Reset page to 1
                      }}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                    />
                  </div>
                </div>

                {/* Users List */}
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                  {usersLoading ? (
                    <div className="p-12 text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                      <p className="text-gray-500">Retrieving volunteer database...</p>
                    </div>
                  ) : usersList.length === 0 ? (
                    <div className="p-12 text-center">
                      <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-bold">No volunteers found matching your query</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50 text-gray-500 font-bold text-xs uppercase tracking-wider border-b border-gray-100">
                            <th className="px-6 py-4">Volunteer</th>
                            <th className="px-6 py-4">Username & Email</th>
                            <th className="px-6 py-4">System Role</th>
                            <th className="px-6 py-4">Points</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                          {usersList.map((targetUser) => {
                            const isSelf = targetUser._id === user.id;
                            const isAdminRole = targetUser.role === 'admin';
                            const isBanned = targetUser.isBanned;
                            const isActionLoading = actionLoadingStates[targetUser._id] || false;

                            return (
                              <tr key={targetUser._id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center gap-3">
                                    {targetUser.dp?.url ? (
                                      <img
                                        src={targetUser.dp.url}
                                        alt={targetUser.name}
                                        className="w-10 h-10 rounded-full object-cover border border-gray-200"
                                      />
                                    ) : (
                                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-extrabold text-sm border border-gray-200">
                                        {targetUser.name?.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2) || 'U'}
                                      </div>
                                    )}
                                    <div>
                                      <p className="font-bold text-gray-900">{targetUser.name}</p>
                                      <p className="text-xs text-gray-500 mt-0.5">ID: {targetUser._id ? targetUser._id.slice(-8) : ''}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <p className="font-semibold text-gray-700">@{targetUser.username}</p>
                                  <p className="text-xs text-gray-505 mt-0.5">{targetUser.email}</p>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {isAdminRole ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      <Shield className="w-3 h-3" />
                                      Administrator
                                    </span>
                                  ) : targetUser.role === 'writer' ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                      <FileText className="w-3 h-3" />
                                      Writer
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-600 border border-gray-200">
                                      Volunteer
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center gap-1 text-amber-600 font-bold">
                                    <Award className="w-4 h-4" />
                                    <span>{targetUser.points || 0} pts</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {isBanned ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                                      <Ban className="w-3 h-3" />
                                      Suspended
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      <UserCheck className="w-3 h-3" />
                                      Active
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                  {isSelf ? (
                                    <span className="text-xs text-gray-400 italic font-semibold px-3 py-1">You</span>
                                  ) : isAdminRole ? (
                                    <span className="text-xs text-gray-400 italic font-semibold px-3 py-1">Protected Admin</span>
                                  ) : (
                                    <button
                                      onClick={() => handleBanToggle(targetUser)}
                                      disabled={isActionLoading}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 border ${
                                        isBanned
                                          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                          : 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
                                      } disabled:opacity-50`}
                                    >
                                      {isActionLoading ? (
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                      ) : isBanned ? (
                                        <>
                                          <UserCheck className="w-3.5 h-3.5" />
                                          Unban User
                                        </>
                                      ) : (
                                        <>
                                          <Ban className="w-3.5 h-3.5" />
                                          Ban User
                                        </>
                                      )}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Users Pagination */}
                  {!usersLoading && usersTotalPages > 1 && (
                    <div className="flex items-center justify-between p-6 border-t border-gray-100">
                      <p className="text-sm text-gray-500">
                        Page {usersPage} of {usersTotalPages}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setUsersPage(p => Math.max(1, p - 1))}
                          disabled={usersPage === 1}
                          className="flex items-center gap-1 px-3 py-2 text-sm font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-all"
                        >
                          <ChevronLeft className="w-4 h-4" /> Prev
                        </button>
                        <div className="flex gap-1">
                          {Array.from({ length: usersTotalPages }, (_, i) => (
                            <button
                              key={i + 1}
                              onClick={() => setUsersPage(i + 1)}
                              className={`w-9 h-9 text-sm font-semibold rounded-xl transition-all ${
                                i + 1 === usersPage
                                  ? 'bg-emerald-600 text-white shadow-md'
                                  : 'border border-gray-200 hover:bg-gray-50 text-gray-700'
                              }`}
                            >
                              {i + 1}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => setUsersPage(p => Math.min(usersTotalPages, p + 1))}
                          disabled={usersPage === usersTotalPages}
                          className="flex items-center gap-1 px-3 py-2 text-sm font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-all"
                        >
                          Next <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>

      {/* Observation Delete Confirmation */}
      <DeleteConfirmModal
        isOpen={!!observationToDelete}
        onClose={() => setObservationToDelete(null)}
        onConfirm={confirmDeleteObservation}
        title="Delete Observation"
        message="Are you sure you want to delete this observation? This action cannot be undone."
        isLoading={deletingObservation}
      />

      {/* Bulk Delete Confirmation */}
      <DeleteConfirmModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={confirmBulkDelete}
        title="Delete Multiple Observations"
        message={`Are you sure you want to delete ${selectedItems.size} observation${selectedItems.size > 1 ? 's' : ''}? This action cannot be undone.`}
        isLoading={bulkDeleting}
      />

      {/* Review Observation Modal */}
      <ReviewObservationModal
        isOpen={!!observationToReview}
        onClose={() => setObservationToReview(null)}
        observation={observationToReview}
        onSave={handleSaveReview}
        onApprove={(id) => updateObservationStatus(id, 'approved')}
        onReject={(id, reason) => updateObservationStatus(id, 'rejected', reason)}
      />

      {/* Rejection Confirm Modal */}
      <AnimatePresence>
        {observationToReject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border-2 border-red-200"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                <XCircle className="w-6 h-6 text-red-600" />
                Reject Observation
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Are you sure you want to reject this observation? You can optionally choose a preset reason or write a custom one below.
              </p>

              {/* Presets */}
              <div className="flex gap-2 mb-4 flex-wrap">
                {['Not a fungi', 'Duplicate observation'].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setRejectionReasonInput(reason)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-2 ${
                      rejectionReasonInput === reason
                        ? 'bg-red-600 text-white border-red-600 shadow-sm'
                        : 'bg-white text-gray-700 hover:bg-red-50 border-red-200'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
                {rejectionReasonInput && (
                  <button
                    type="button"
                    onClick={() => setRejectionReasonInput('')}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-2 bg-gray-100 hover:bg-gray-200 text-gray-600 border-gray-200"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Custom Input */}
              <textarea
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                placeholder="Custom reason (optional)..."
                rows={3}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm mb-6 transition-all"
              />

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setObservationToReject(null)}
                  className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const id = observationToReject._id;
                    setObservationToReject(null);
                    await updateObservationStatus(id, 'rejected', rejectionReasonInput || undefined);
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-md transition-all"
                >
                  Confirm Reject
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Import Excel Modal */}
      <ImportExcelModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={loadObservations}
      />
    </div>
  );
}
