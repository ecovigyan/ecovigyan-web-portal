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
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ReviewObservationModal } from '@/components/ReviewObservationModal';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import { ImageWithFallback } from '@/components/ImageWithFallback';
import { ImportExcelModal } from '@/components/ImportExcelModal';

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  // State
  const [activeTab, setActiveTab] = useState('overview');
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
  const [bulkApproving, setBulkApproving] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [actionLoadingStates, setActionLoadingStates] = useState({});
  const [deletingObservation, setDeletingObservation] = useState(false);

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

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    loadData();
  }, [user, authLoading, observationFilter, currentPage]);

  const loadData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      if (user.role === 'admin') {
        // Admin: Fetch based on filter
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
      } else {
        // User: Fetch own submissions
        const url = observationFilter === 'all'
          ? '/api/mushrooms/my-submissions'
          : `/api/mushrooms/my-submissions?status=${observationFilter}`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (res.ok) {
          setObservations(data.mushrooms || []);
          // Calculate counts from data
          const all = data.mushrooms || [];
          setStats({
            totalObservations: all.length,
            pendingObservations: all.filter(m => m.status === 'pending').length,
            approvedObservations: all.filter(m => m.status === 'approved').length,
            rejectedObservations: all.filter(m => m.status === 'rejected').length
          });
        } else {
          throw new Error(data.error || 'Failed to fetch submissions');
        }
      }
    } catch (error) {
      console.error('Load data error:', error);
      toast.error(error.message || 'Failed to load data');
    } finally {
      setLoading(false);
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
    await loadData();
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
      await loadData();
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

      await loadData();
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
      await loadData();
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
      await loadData();
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
      await loadData();
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
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">
                  Welcome back, {user.name}
                </h1>
                <p className="text-gray-600">
                  {user.role === 'admin' 
                    ? 'Manage submissions and oversee platform activities'
                    : 'Track your contributions and environmental impact'
                  }
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Notifications */}
                {user.role === 'admin' && (
                  <div className="relative">
                    <button
                      onClick={() => setShowNotifications(!showNotifications)}
                      className="relative p-2 bg-white rounded-lg border border-gray-200 shadow-sm hover:bg-gray-50 transition-all"
                    >
                      <Bell className="w-5 h-5 text-gray-700" />
                      {pendingCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                          {pendingCount}
                        </span>
                      )}
                    </button>
                    
                    {/* Notifications Dropdown */}
                    <AnimatePresence>
                      {showNotifications && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50"
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
                                    setActiveTab('observations');
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
                )}

                {/* Refresh Button */}
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="p-2 bg-white rounded-lg border border-gray-200 shadow-sm hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-5 h-5 text-gray-700 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>

                {/* Status Indicator */}
                <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200 shadow-sm">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Navigation Tabs */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2">
              <div className="flex gap-1 overflow-x-auto">
                {(user.role === 'admin' 
                  ? [
                      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
                      { id: 'observations', label: 'Mushroom Observations', icon: MapPin, count: stats.pendingObservations },
                    ]
                  : [
                      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
                      { id: 'observations', label: 'My Observations', icon: MapPin },
                    ]
                ).map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all relative ${
                        isActive
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="whitespace-nowrap">{tab.label}</span>
                      {tab.count !== undefined && tab.count > 0 && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          isActive ? 'bg-white text-emerald-600' : 'bg-red-500 text-white'
                        }`}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Content Area */}
          <AnimatePresence mode="wait">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Stats Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-emerald-600" />
                      </div>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900 mb-1">{stats.totalObservations}</h3>
                    <p className="text-sm text-gray-600 mb-4">{user.role === 'admin' ? 'Total' : 'My'} Observations</p>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span className="text-gray-600">{stats.approvedObservations} Approved</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                        <span className="text-gray-600">{stats.pendingObservations} Pending</span>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                        <Clock className="w-6 h-6 text-amber-600" />
                      </div>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900 mb-1">{stats.pendingObservations}</h3>
                    <p className="text-sm text-gray-600 mb-4">Pending Review</p>
                    {user.role === 'admin' && stats.pendingObservations > 0 && (
                      <button
                        onClick={() => {
                          setActiveTab('observations');
                          setObservationFilter('pending');
                          setCurrentPage(1);
                        }}
                        className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1"
                      >
                        Review now <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900 mb-1">{stats.approvedObservations}</h3>
                    <p className="text-sm text-gray-600 mb-4">Approved</p>
                    <Link
                      href="/explore"
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      View on map <ArrowRight className="w-3 h-3" />
                    </Link>
                  </motion.div>
                </div>

                {/* Quick Actions */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
                >
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
                  <div className="grid md:grid-cols-3 gap-4">
                    {user.role !== 'admin' && (
                      <Link
                        href="/dashboard"
                        className="group flex items-center gap-4 p-4 bg-gradient-to-br from-emerald-50 to-teal-100 rounded-xl hover:shadow-md transition-all border border-emerald-200"
                      >
                        <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                          <MapPin className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-emerald-900 mb-0.5">My Submissions</div>
                          <div className="text-xs text-emerald-700">Track your observations</div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-emerald-600 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    )}

                    <Link
                      href="/explore"
                      className="group flex items-center gap-4 p-4 bg-gradient-to-br from-teal-50 to-cyan-100 rounded-xl hover:shadow-md transition-all border border-teal-200"
                    >
                      <div className="w-12 h-12 rounded-xl bg-teal-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <MapPin className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-teal-900 mb-0.5">Mushroom Mania</div>
                        <div className="text-xs text-teal-700">Add new observations</div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-teal-600 group-hover:translate-x-1 transition-transform" />
                    </Link>

                    <Link
                      href="/programs"
                      className="group flex items-center gap-4 p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl hover:shadow-md transition-all border border-blue-200"
                    >
                      <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <BookOpen className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-blue-900 mb-0.5">Browse Programs</div>
                        <div className="text-xs text-blue-700">Enroll in eco programs</div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
                    </Link>

                    <Link
                      href="/gallery"
                      className="group flex items-center gap-4 p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl hover:shadow-md transition-all border border-purple-200"
                    >
                      <div className="w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <Palette className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-purple-900 mb-0.5">View Gallery</div>
                        <div className="text-xs text-purple-700">Browse artwork collection</div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-purple-600 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* Observations Tab */}
            {activeTab === 'observations' && (
              <motion.div
                key="observations"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Stats Cards - Better Design */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {[
                    { label: 'All', value: stats.totalObservations, icon: Filter, color: 'bg-blue-500' },
                    { label: 'Pending', value: stats.pendingObservations, icon: Clock, color: 'bg-amber-500' },
                    { label: 'Approved', value: stats.approvedObservations, icon: CheckCircle, color: 'bg-emerald-500' },
                    { label: 'Rejected', value: stats.rejectedObservations, icon: XCircle, color: 'bg-red-500' },
                    ...(user.role === 'admin' ? [{ label: 'System-Imports', value: stats.systemImports, icon: Upload, color: 'bg-purple-500' }] : []),
                  ].map((stat) => {
                    const Icon = stat.icon;
                    const isActive = observationFilter === stat.label.toLowerCase();
                    
                    return (
                      <button
                        key={stat.label}
                        onClick={() => { setObservationFilter(stat.label.toLowerCase()); setCurrentPage(1); }}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          isActive 
                            ? 'bg-white border-emerald-500 shadow-lg scale-105' 
                            : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <span className="text-2xl font-bold text-gray-900">{stat.value}</span>
                        </div>
                        <div className="text-sm font-semibold text-gray-600">{stat.label}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Admin Bulk Actions & Search */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-4">
                    <div className="text-sm text-gray-600">
                      Showing <span className="font-bold text-gray-900">{observations.length}</span> of <span className="font-bold text-gray-900">{totalCount}</span> {observationFilter === 'all' ? 'total' : observationFilter.replace('-', ' ')} submission{totalCount !== 1 ? 's' : ''}
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      {/* Import Excel Button - Admin Only */}
                      {user.role === 'admin' && (
                        <button
                          onClick={() => setIsImportModalOpen(true)}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition-all flex items-center gap-2"
                        >
                          <Upload className="w-4 h-4" />
                          Import Excel
                        </button>
                      )}

                      {user.role === 'admin' && filteredObservations.length > 0 && observationFilter === 'pending' && (
                        <>
                          <button
                            onClick={() => selectAll(filteredObservations)}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-all"
                          >
                            Select All
                          </button>
                          {selectedItems.size > 0 && (
                            <>
                              <button
                                onClick={deselectAll}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-all"
                              >
                                Deselect All
                              </button>
                              <button
                                onClick={handleBulkApprove}
                                disabled={bulkApproving}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-all disabled:opacity-50"
                              >
                                {bulkApproving ? 'Approving...' : `Approve (${selectedItems.size})`}
                              </button>
                              <button
                                onClick={handleBulkDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-all"
                              >
                                Delete ({selectedItems.size})
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
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Observations List */}
                <div className="space-y-4">
                  {loading ? (
                    <div className="bg-white rounded-xl p-12 text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading observations...</p>
                    </div>
                  ) : filteredObservations.length === 0 ? (
                    <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
                      <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-600 mb-2">No observations found</p>
                      {user.role !== 'admin' && (
                        <Link
                          href="/explore"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors mt-4"
                        >
                          <Plus className="w-4 h-4" />
                          Add Your First Observation
                        </Link>
                      )}
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
                        className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                      >
                        <div className="p-6">
                          <div className="flex flex-col md:flex-row gap-6">
                            {/* Checkbox for admin bulk actions */}
                            {user.role === 'admin' && observationFilter === 'pending' && (
                              <input
                                type="checkbox"
                                checked={selectedItems.has(obs._id)}
                                onChange={() => toggleItemSelection(obs._id)}
                                className="mt-1 w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 self-start"
                              />
                            )}
                            
                            {/* Observation Image - Larger thumbnail */}
                            <div className="w-full md:w-48 h-48 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
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
                                    <p className="text-sm text-gray-600 italic mb-2">{obs.scientificName}</p>
                                  )}
                                </div>
                                <div className="ml-4">
                                  {getStatusBadge(obs.status)}
                                </div>
                              </div>

                              {/* Description */}
                              {obs.description && (
                                <p className="text-sm text-gray-700 mb-3">{obs.description}</p>
                              )}

                              {/* Location & Time Info */}
                              <div className="grid md:grid-cols-2 gap-3 mb-3 text-sm">
                                <div className="flex items-center gap-2 text-gray-600">
                                  <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                  <span className="truncate">
                                    {obs.location?.latitude?.toFixed(4)}, {obs.location?.longitude?.toFixed(4)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                  <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                  <span>{new Date(obs.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              </div>

                              {/* Status-Specific Info */}
                              {obs.status === 'approved' && obs.approvedAt && (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-3">
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
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
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
                                {/* Review button - visible to admins */}
                                {user.role === 'admin' && (
                                  <button
                                    onClick={() => setObservationToReview(obs)}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all"
                                  >
                                    <FileEdit className="w-4 h-4" />
                                    Review
                                  </button>
                                )}
                                
                                {/* Admin actions */}
                                {user.role === 'admin' && obs.status === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => updateObservationStatus(obs._id, 'approved')}
                                      disabled={isObservationLoading(obs._id, 'approve')}
                                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                                        const reason = prompt('Enter rejection reason (visible to user):');
                                        if (reason) updateObservationStatus(obs._id, 'rejected', reason);
                                      }}
                                      disabled={isObservationLoading(obs._id, 'reject')}
                                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                                
                                {/* Delete button for own observations or admin */}
                                {(user.role === 'admin' || obs.submittedBy?._id === user._id) && (
                                  <button
                                    onClick={() => handleDeleteObservation(obs)}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50 transition-all ml-auto"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                  </button>
                                )}
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
                      <p className="text-sm text-gray-500">
                        Page {currentPage} of {totalPages}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="flex items-center gap-1 px-3 py-2 text-sm font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
                                className={`w-9 h-9 text-sm font-semibold rounded-lg transition-all ${
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
                          className="flex items-center gap-1 px-3 py-2 text-sm font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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

      {/* Import Excel Modal */}
      <ImportExcelModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={loadData}
      />
    </div>
  );
}
