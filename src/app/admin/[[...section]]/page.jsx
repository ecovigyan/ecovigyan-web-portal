"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  Pencil,
  ChevronLeft,
  ChevronRight,
  Shield,
  Users,
  Ban,
  UserCheck,
  Award,
  Globe,
  LogOut,
  ShoppingBag,
  ClipboardList,
  Menu,
  ChevronDown,
  Camera,
  Star,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ReviewObservationModal } from '@/components/ReviewObservationModal';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import { ImageWithFallback } from '@/components/ImageWithFallback';
import { ImportExcelModal } from '@/components/ImportExcelModal';
import { hasAdminAccess, isSuperAdmin, roleLabel } from '@/lib/permissions';

const VALID_SECTIONS = new Set(['overview', 'observations', 'users', 'products', 'orders', 'reviews']);

export default function AdminPanel() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const params = useParams();
  const routeSection = Array.isArray(params?.section) ? params.section[0] : undefined;
  const currentSection = routeSection && VALID_SECTIONS.has(routeSection) ? routeSection : 'overview';
  
  // Navigation Section State (sidebar option)
  const [activeSection, setActiveSection] = useState(currentSection);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Observations State
  const [observationFilter, setObservationFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  // Submitter (user) filter — only applies to the pending queue
  const [submitterFilter, setSubmitterFilter] = useState(null);
  const [submitters, setSubmitters] = useState([]);
  const [submittersLoading, setSubmittersLoading] = useState(false);
  const [submitterSearch, setSubmitterSearch] = useState('');
  const [showSubmitterDropdown, setShowSubmitterDropdown] = useState(false);
  const submitterDropdownRef = useRef(null);
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
  const [userForDpUpdate, setUserForDpUpdate] = useState(null);
  const dpInputRef = useRef(null);
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
  const [selectedUserProfile, setSelectedUserProfile] = useState(null);
  const [editingUserRole, setEditingUserRole] = useState('user');
  const [savingUserProfile, setSavingUserProfile] = useState(false);

  // Products State
  const [productsList, setProductsList] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    specification: '',
    price: '',
    shippingFee: '',
    image: '',
    gallery: '',
    category: 'kits',
    stock: '',
    isActive: true,
    features: ''
  });
  const [isUploadingMainImage, setIsUploadingMainImage] = useState(false);
  const [isUploadingGalleryImage, setIsUploadingGalleryImage] = useState(false);

  // Orders State
  const [ordersList, setOrdersList] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersSearch, setOrdersSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  /* ---------------- PRODUCT REVIEWS ---------------- */
  const [reviewsList, setReviewsList] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewFilter, setReviewFilter] = useState('pending');
  const [reviewCounts, setReviewCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [reviewActionId, setReviewActionId] = useState(null);

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

  useEffect(() => {
    setActiveSection(currentSection);
  }, [currentSection]);

  useEffect(() => {
    if (routeSection && !VALID_SECTIONS.has(routeSection)) {
      router.replace('/admin');
    }
  }, [routeSection, router]);

  const navigateToSection = (section) => {
    setActiveSection(section);
    setCurrentPage(1);
    setUsersPage(1);
    setSidebarOpen(false);
    router.push(section === 'overview' ? '/admin' : `/admin/${section}`);
  };

  // Security guard
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (!hasAdminAccess(user)) {
      router.push('/dashboard');
      return;
    }
  }, [user, authLoading, router]);

  // Load observations data
  useEffect(() => {
    if (hasAdminAccess(user) && activeSection === 'observations') {
      loadObservations();
    }
  }, [user, activeSection, observationFilter, currentPage, submitterFilter?._id]);

  // System imports all belong to one system account, so a submitter filter
  // there is meaningless — drop it. Every other tab keeps the selection, so
  // switching between Pending and Approved stays scoped to the same person.
  useEffect(() => {
    if (observationFilter === 'system-imports') {
      setSubmitterFilter(null);
      setSubmitterSearch('');
      setShowSubmitterDropdown(false);
    }
  }, [observationFilter]);

  // Load the submitters for the tab in view (debounced search). Counts shown
  // in the dropdown are scoped to that tab, so they always agree with the list
  // behind it.
  useEffect(() => {
    if (!hasAdminAccess(user)) return;
    if (activeSection !== 'observations' || observationFilter === 'system-imports') return;
    if (!showSubmitterDropdown) return;

    const timer = setTimeout(() => {
      loadSubmitters(submitterSearch, observationFilter);
    }, 300);

    return () => clearTimeout(timer);
  }, [user, activeSection, observationFilter, showSubmitterDropdown, submitterSearch]);

  // Close the submitter dropdown when clicking outside of it
  useEffect(() => {
    if (!showSubmitterDropdown) return;

    const handleClickOutside = (event) => {
      if (submitterDropdownRef.current && !submitterDropdownRef.current.contains(event.target)) {
        setShowSubmitterDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSubmitterDropdown]);

  // Load users data
  useEffect(() => {
    if (hasAdminAccess(user) && activeSection === 'users') {
      loadUsers();
    }
  }, [user, activeSection, usersPage, usersSearch]);

  // Load products data
  useEffect(() => {
    if (hasAdminAccess(user) && activeSection === 'products') {
      loadProducts();
    }
  }, [user, activeSection]);

  // Load orders data
  useEffect(() => {
    if (hasAdminAccess(user) && activeSection === 'orders') {
      loadOrders();
    }
  }, [user, activeSection, ordersSearch]);

  // Load product reviews
  useEffect(() => {
    if (hasAdminAccess(user) && activeSection === 'reviews') {
      loadReviews();
    }
  }, [user, activeSection, reviewFilter]);

  // Review counts drive the sidebar badge, so they load regardless of section
  useEffect(() => {
    if (hasAdminAccess(user)) {
      fetchReviewCounts();
    }
  }, [user]);

  // Initial load of counts/stats
  useEffect(() => {
    if (hasAdminAccess(user)) {
      fetchCounts();
    }
  }, [user]);

  const loadObservations = async () => {
    try {
      setLoading(true);
      // The submitter filter applies to every tab except system imports,
      // where every record belongs to the same system account anyway.
      const submitterParam =
        observationFilter !== 'system-imports' && submitterFilter?._id
          ? `&userId=${submitterFilter._id}`
          : '';

      const url = observationFilter === 'system-imports'
        ? `/api/admin/mushrooms?systemImports=true&page=${currentPage}&limit=24`
        : observationFilter === 'all'
        ? `/api/admin/mushrooms?page=${currentPage}${submitterParam}`
        : `/api/admin/mushrooms?status=${observationFilter}&page=${currentPage}${submitterParam}`;

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

  const loadSubmitters = async (search = '', status = 'pending') => {
    try {
      setSubmittersLoading(true);
      const res = await fetch(
        `/api/admin/mushrooms?submitters=true&status=${status}&search=${encodeURIComponent(search)}`
      );
      const data = await res.json();

      if (res.ok) {
        setSubmitters(data.submitters || []);
      } else {
        throw new Error(data.error || 'Failed to load submitters');
      }
    } catch (error) {
      console.error('Load submitters error:', error);
      toast.error(error.message || 'Failed to load submitters');
    } finally {
      setSubmittersLoading(false);
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

  const loadProducts = async () => {
    try {
      setProductsLoading(true);
      const res = await fetch('/api/products?admin=true');
      const data = await res.json();
      if (res.ok) {
        setProductsList(data.products || []);
      } else {
        throw new Error(data.error || 'Failed to load products');
      }
    } catch (error) {
      console.error('Load products error:', error);
      toast.error(error.message || 'Failed to load products');
    } finally {
      setProductsLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      setOrdersLoading(true);
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (res.ok) {
        let orders = data.orders || [];
        if (ordersSearch) {
          const s = ordersSearch.toLowerCase();
          orders = orders.filter(o => 
            o.customerName?.toLowerCase().includes(s) || 
            o.customerEmail?.toLowerCase().includes(s) || 
            o.phone?.includes(s) ||
            o._id?.toLowerCase().includes(s)
          );
        }
        setOrdersList(orders);
      } else {
        throw new Error(data.error || 'Failed to load orders');
      }
    } catch (error) {
      console.error('Load orders error:', error);
      toast.error(error.message || 'Failed to load orders');
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleMainImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingMainImage(true);
      const { uploadToCloudinary } = await import('@/lib/uploadToCloudinary');
      const uploadRes = await uploadToCloudinary(file, { folder: 'products' });
      setProductForm(prev => ({ ...prev, image: uploadRes.secure_url }));
      toast.success('Main image uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload main image');
    } finally {
      setIsUploadingMainImage(false);
    }
  };

  const handleGalleryImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingGalleryImage(true);
      const { uploadToCloudinary } = await import('@/lib/uploadToCloudinary');
      const uploadRes = await uploadToCloudinary(file, { folder: 'products' });
      
      const currentGallery = productForm.gallery 
        ? productForm.gallery.split(',').map(img => img.trim()).filter(Boolean) 
        : [];
      currentGallery.push(uploadRes.secure_url);
      
      setProductForm(prev => ({ 
        ...prev, 
        gallery: currentGallery.join(', ') 
      }));
      toast.success('Gallery image uploaded!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload gallery image');
    } finally {
      setIsUploadingGalleryImage(false);
    }
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    try {
      const isEdit = !!editingProduct;
      const url = isEdit ? `/api/products/${editingProduct._id}` : '/api/products';
      const method = isEdit ? 'PUT' : 'POST';

      const payload = {
        ...productForm,
        price: Number(productForm.price),
        shippingFee: Number(productForm.shippingFee || 0),
        stock: Number(productForm.stock || 0),
        gallery: productForm.gallery.split(',').map(img => img.trim()).filter(Boolean),
        features: productForm.features.split(';').map(f => f.trim()).filter(Boolean)
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || 'Operation successful!');
        setShowProductModal(false);
        setEditingProduct(null);
        setProductForm({
          name: '',
          description: '',
          specification: '',
          price: '',
          shippingFee: '',
          image: '',
          gallery: '',
          category: 'kits',
          stock: '',
          isActive: true,
          features: ''
        });
        loadProducts();
      } else {
        throw new Error(data.error || 'Failed to save product');
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message);
    }
  };

  const handleEditProductClick = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name || '',
      description: product.description || '',
      specification: product.specification || '',
      price: product.price || '',
      shippingFee: product.shippingFee || '',
      image: product.image || '',
      gallery: (product.gallery || []).join(', '),
      category: product.category || 'kits',
      stock: product.stock || '',
      isActive: product.isActive !== undefined ? product.isActive : true,
      features: (product.features || []).join('; ')
    });
    setShowProductModal(true);
  };

  const handleDeleteProductClick = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      const res = await fetch(`/api/products/${productId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Product deleted successfully!');
        loadProducts();
      } else {
        throw new Error(data.error || 'Failed to delete product');
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message);
    }
  };

  const handleUpdateOrderStatus = async (orderId, updates) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Order updated successfully!');
        loadOrders();
        if (selectedOrder && selectedOrder._id === orderId) {
          setSelectedOrder(prev => ({ ...prev, ...updates }));
        }
      } else {
        throw new Error(data.error || 'Failed to update order');
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message);
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

  const triggerDpUpload = (targetUser) => {
    setUserForDpUpdate(targetUser);
    if (dpInputRef.current) {
      dpInputRef.current.click();
    }
  };

  const handleDpFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !userForDpUpdate) return;

    // Reset input value
    e.target.value = '';

    const toastId = toast.loading('Uploading profile picture...');
    try {
      const { uploadToCloudinary } = await import('@/lib/uploadToCloudinary');
      const uploadRes = await uploadToCloudinary(file, { folder: 'profile_pics' });
      
      const newDp = {
        url: uploadRes.secure_url,
        public_id: uploadRes.public_id
      };

      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userForDpUpdate._id,
          dp: newDp
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update user profile picture');
      }

      toast.success('Profile picture updated successfully!', { id: toastId });
      await loadUsers();
    } catch (err) {
      console.error('DP upload error:', err);
      toast.error(err.message || 'Failed to update profile picture', { id: toastId });
    } finally {
      setUserForDpUpdate(null);
    }
  };

  const openUserProfile = (targetUser) => {
    setSelectedUserProfile(targetUser);
    setEditingUserRole(targetUser.role || 'user');
  };

  const closeUserProfile = () => {
    if (savingUserProfile) return;
    setSelectedUserProfile(null);
    setEditingUserRole('user');
  };

  const handleUserRoleSave = async () => {
    if (!selectedUserProfile) return;

    setSavingUserProfile(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserProfile._id,
          role: editingUserRole
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update user role');
      }

      setSelectedUserProfile(prev => prev ? { ...prev, role: data.user.role } : prev);
      setUsersList(prev =>
        prev.map(userItem =>
          userItem._id === selectedUserProfile._id
            ? { ...userItem, role: data.user.role }
            : userItem
        )
      );
      toast.success('User role updated successfully');
      await loadUsers();
    } catch (error) {
      toast.error(error.message || 'Failed to update user role');
    } finally {
      setSavingUserProfile(false);
    }
  };

  const fetchReviewCounts = async () => {
    try {
      const res = await fetch('/api/admin/reviews?countsOnly=true');
      const data = await res.json();
      if (res.ok) setReviewCounts(data.counts || { pending: 0, approved: 0, rejected: 0 });
    } catch (error) {
      console.error('Fetch review counts error:', error);
    }
  };

  const loadReviews = async () => {
    try {
      setReviewsLoading(true);
      const res = await fetch(`/api/admin/reviews?status=${reviewFilter}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to load reviews');

      setReviewsList(data.reviews || []);
      await fetchReviewCounts();
    } catch (error) {
      console.error('Load reviews error:', error);
      toast.error(error.message || 'Failed to load reviews');
    } finally {
      setReviewsLoading(false);
    }
  };

  const updateReviewStatus = async (id, status) => {
    // Rejections carry an optional reason, shown back to the review author
    let rejectionReason;
    if (status === 'rejected') {
      rejectionReason = window.prompt('Reason for rejecting this review (optional):') || undefined;
    }

    try {
      setReviewActionId(id);
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, rejectionReason }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update review');

      toast.success(data.message || `Review ${status}`);
      await loadReviews();
    } catch (error) {
      toast.error(error.message || 'Failed to update review');
    } finally {
      setReviewActionId(null);
    }
  };

  const deleteReview = async (id) => {
    if (!window.confirm('Delete this review permanently? This cannot be undone.')) return;

    try {
      setReviewActionId(id);
      const res = await fetch(`/api/admin/reviews/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete review');

      toast.success('Review deleted');
      await loadReviews();
    } catch (error) {
      toast.error(error.message || 'Failed to delete review');
    } finally {
      setReviewActionId(null);
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

  // Shows how the submitter supplied the photo. Gallery uploads are admin-only,
  // so a gallery badge on a non-admin's submission is worth a second look.
  const getCaptureBadge = (captureMethod) => {
    const config = {
      camera: { label: 'Camera', style: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icon: Camera },
      gallery: { label: 'Gallery', style: 'bg-purple-50 text-purple-700 border-purple-200', Icon: ImageIcon },
      unknown: { label: 'Unknown', style: 'bg-gray-50 text-gray-500 border-gray-200', Icon: AlertCircle },
    };
    const { label, style, Icon } = config[captureMethod] || config.unknown;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${style}`}>
        <Icon className="w-3.5 h-3.5" />
        {label}
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
  if (!user || !hasAdminAccess(user)) {
    return null;
  }

  // Sidebar Menu Items
  // Superadmins get the destructive and trust-related controls; subadmins
  // see the same panel with those actions hidden. The server enforces this
  // regardless — these checks only keep buttons out of the UI that would
  // return 403.
  const canManageUsers = isSuperAdmin(user);
  const canDelete = isSuperAdmin(user);

  const sidebarItems = [
    { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'observations', label: 'Observations Review', icon: MapPin, badge: stats.pendingObservations },
    { id: 'users', label: 'Volunteer Directory', icon: Users },
    { id: 'products', label: 'Products Directory', icon: ShoppingBag },
    { id: 'orders', label: 'Orders Registry', icon: ClipboardList },
    { id: 'reviews', label: 'Product Reviews', icon: Star, badge: reviewCounts.pending }
  ];

  return (
    <div className="bg-gray-50 flex flex-col md:flex-row h-[100dvh] overflow-hidden">

      {/* MOBILE TOP BAR */}
      <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-emerald-950 text-white shrink-0 shadow-lg">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 -ml-2 rounded-xl hover:bg-emerald-900/60 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        <img src="/gallery/logo4.png" alt="Foundation Logo" className="w-8 h-8 object-contain" />
        <div className="min-w-0 flex-1">
          <p className="font-extrabold leading-none text-sm tracking-wide truncate">ECO VIGYAN</p>
          <p className="text-[9px] tracking-widest text-emerald-400 font-bold uppercase mt-0.5">Admin Portal</p>
        </div>
        {pendingCount > 0 && (
          <span className="w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shrink-0">
            {pendingCount}
          </span>
        )}
      </div>

      {/* MOBILE DRAWER BACKDROP */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 md:z-10 w-72 md:w-64 max-w-[85vw] bg-emerald-950 text-white shrink-0 flex flex-col justify-between shadow-xl border-r border-emerald-900 transition-transform duration-300 md:transition-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Sidebar Header */}
          <div className="p-6 border-b border-emerald-900/60 bg-emerald-950">
            <div className="flex items-center gap-3">
              <img
                src="/gallery/logo4.png"
                alt="Foundation Logo"
                className="w-10 h-10 object-contain"
              />
              <div className="min-w-0 flex-1">
                <p className="font-extrabold text-white leading-none text-base tracking-wide truncate">ECO VIGYAN</p>
                <p className="text-[9px] tracking-widest text-emerald-400 font-bold uppercase mt-1">Admin Portal</p>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="md:hidden p-1.5 -mr-1.5 rounded-lg hover:bg-emerald-900/60 transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
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
                    onClick={() => navigateToSection(item.id)}
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
        <div className="p-4 sm:p-6 md:p-8 pb-0 shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 sm:pb-6 border-b border-gray-200 gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">ECO VIGYAN CENTRAL COMMAND</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                {activeSection === 'overview' && 'Console Dashboard'}
                {activeSection === 'observations' && 'Observations Verification'}
                {activeSection === 'users' && 'Volunteer Directory'}
                {activeSection === 'products' && 'Products Inventory'}
                {activeSection === 'orders' && 'Orders Registry'}
                {activeSection === 'reviews' && 'Product Reviews'}
              </h1>
              <p className="text-sm text-gray-500 mt-1 font-medium">
                {activeSection === 'overview' && 'Platform status overview, task summary and direct quick links'}
                {activeSection === 'observations' && 'Review and approve/reject volunteer-submitted mushroom findings'}
                {activeSection === 'users' && 'Manage system users, view accumulated leaderboard points and ban status'}
                {activeSection === 'products' && 'Manage e-commerce products: add, edit, or delete items and edit specifications'}
                {activeSection === 'orders' && 'Track orders, verify shipping details, update status, and manage payment states'}
                {activeSection === 'reviews' && 'Approve or reject customer product reviews before they appear publicly'}
              </p>
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
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
                      className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-lg border border-gray-200 z-50 animate-in fade-in zoom-in duration-200"
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
                                navigateToSection('observations');
                                setObservationFilter('pending');
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 pt-4 sm:pt-6">
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
                          navigateToSection('observations');
                          setObservationFilter('pending');
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
                        navigateToSection('observations');
                        setObservationFilter('system-imports');
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
                      onClick={() => navigateToSection('users')}
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
                      {submitterFilter && (
                        <> from <span className="font-bold text-emerald-700">{submitterFilter.name || submitterFilter.username || submitterFilter.email}</span></>
                      )}
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
                              {canDelete && (
                              <button
                                onClick={handleBulkDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-all"
                              >
                                Delete (${selectedItems.size})
                              </button>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search observations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    {/* Submitter filter — every tab except system imports */}
                    {observationFilter !== 'system-imports' && (
                      <div className="relative md:w-72" ref={submitterDropdownRef}>
                        <button
                          type="button"
                          onClick={() => setShowSubmitterDropdown((open) => !open)}
                          className={`w-full flex items-center gap-2 px-4 py-3 border rounded-xl text-sm font-semibold transition-all ${
                            submitterFilter
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                              : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                          }`}
                        >
                          <Users className="w-4 h-4 shrink-0" />
                          <span className="flex-1 text-left truncate">
                            {submitterFilter
                              ? submitterFilter.name || submitterFilter.username || submitterFilter.email
                              : 'Filter by user'}
                          </span>
                          {submitterFilter ? (
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSubmitterFilter(null);
                                setCurrentPage(1);
                                deselectAll();
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setSubmitterFilter(null);
                                  setCurrentPage(1);
                                  deselectAll();
                                }
                              }}
                              className="p-0.5 rounded hover:bg-emerald-100"
                              aria-label="Clear user filter"
                            >
                              <X className="w-4 h-4" />
                            </span>
                          ) : (
                            <ChevronDown className="w-4 h-4 shrink-0 text-gray-400" />
                          )}
                        </button>

                        {showSubmitterDropdown && (
                          <div className="absolute z-30 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                            <div className="p-2 border-b border-gray-100">
                              <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                  type="text"
                                  autoFocus
                                  placeholder="Search users..."
                                  value={submitterSearch}
                                  onChange={(e) => setSubmitterSearch(e.target.value)}
                                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                              </div>
                            </div>

                            <div className="max-h-72 overflow-y-auto">
                              {submittersLoading ? (
                                <div className="p-4 text-center text-sm text-gray-500">Loading users...</div>
                              ) : submitters.length === 0 ? (
                                <div className="p-4 text-center text-sm text-gray-500">
                                  No users with {observationFilter === 'all' ? '' : `${observationFilter} `}observations
                                </div>
                              ) : (
                                submitters.map((submitter) => (
                                  <button
                                    key={submitter._id}
                                    type="button"
                                    onClick={() => {
                                      setSubmitterFilter(submitter);
                                      setShowSubmitterDropdown(false);
                                      setCurrentPage(1);
                                      deselectAll();
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                                      submitterFilter?._id === submitter._id ? 'bg-emerald-50' : ''
                                    }`}
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="text-sm font-semibold text-gray-900 truncate">
                                        {submitter.name || submitter.username || 'Unnamed user'}
                                      </div>
                                      <div className="text-xs text-gray-500 truncate">
                                        {submitter.email}
                                      </div>
                                      {submitter.lastSubmittedAt && (
                                        <div className="text-[11px] text-gray-400">
                                          Latest: {new Date(submitter.lastSubmittedAt).toLocaleDateString()}
                                        </div>
                                      )}
                                    </div>
                                    <span className="shrink-0 px-2 py-1 rounded-lg bg-amber-100 text-amber-700 text-xs font-bold">
                                      {submitter.count}
                                    </span>
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
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
                        <div className="p-4 sm:p-6">
                          <div className="flex flex-col md:flex-row gap-4 sm:gap-6">
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
                                <div className="ml-4 flex flex-wrap items-center justify-end gap-2">
                                  {getCaptureBadge(obs.captureMethod)}
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
                                
                                {canDelete && (
                                  <button
                                    onClick={() => handleDeleteObservation(obs)}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 transition-all ml-auto"
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
                            const isAdminRole = hasAdminAccess(targetUser);
                            const isBanned = targetUser.isBanned;
                            const isActionLoading = actionLoadingStates[targetUser._id] || false;

                            return (
                              <tr key={targetUser._id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center gap-3">
                                    <div className="relative group shrink-0">
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
                                      {/* Hover Overlay */}
                                      <button
                                        onClick={() => triggerDpUpload(targetUser)}
                                        className="absolute inset-0 flex items-center justify-center bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                                        title="Update profile picture"
                                      >
                                        <Upload className="w-4 h-4" />
                                      </button>
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <p className="font-bold text-gray-900">{targetUser.name}</p>
                                        <button
                                          onClick={() => triggerDpUpload(targetUser)}
                                          className="text-gray-400 hover:text-emerald-600 transition-colors"
                                          title="Change profile picture"
                                        >
                                          <Upload className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
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
                                  <div className="flex items-center justify-end gap-2">
                                    {!canManageUsers && (
                                      <span className="text-xs text-gray-400 italic font-semibold px-3 py-1">
                                        View only
                                      </span>
                                    )}
                                    {canManageUsers && (
                                    <button
                                      onClick={() => openUserProfile(targetUser)}
                                      className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 border bg-white hover:bg-gray-50 text-gray-700 border-gray-200"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                      Edit
                                    </button>
                                    )}
                                    {canManageUsers && (isSelf ? (
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
                                    ))}
                                  </div>
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

            {/* SECTION: PRODUCTS */}
            {activeSection === 'products' && (
              <motion.div
                key="products"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                {/* Header Banner */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="text-sm text-gray-500 font-semibold text-center sm:text-left">
                    Manage store catalog inventory items. Total products: <span className="font-bold text-gray-900">{productsList.length}</span>
                  </div>
                  <button
                    onClick={() => {
                      setEditingProduct(null);
                      setProductForm({
                        name: '',
                        description: '',
                        specification: '',
                        price: '',
                        shippingFee: '',
                        image: '',
                        gallery: '',
                        category: 'kits',
                        stock: '',
                        isActive: true,
                        features: ''
                      });
                      setShowProductModal(true);
                    }}
                    className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-600/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New Product</span>
                  </button>
                </div>

                {/* Products Table */}
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                  {productsLoading ? (
                    <div className="p-12 text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                      <p className="text-gray-500">Retrieving catalog directory...</p>
                    </div>
                  ) : productsList.length === 0 ? (
                    <div className="p-16 text-center text-gray-500">
                      <ShoppingBag className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                      <p className="font-bold text-lg text-gray-700 mb-1">No products found</p>
                      <p className="text-sm text-gray-500">Click the button above to add your first product.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold uppercase tracking-wider text-gray-500">
                            <th className="px-6 py-4">Item Details</th>
                            <th className="px-6 py-4">Category</th>
                            <th className="px-6 py-4">Price / Shipping</th>
                            <th className="px-6 py-4">Stock</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm font-medium text-gray-700">
                          {productsList.map((prod) => (
                            <tr key={prod._id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <img src={prod.image} className="w-12 h-12 rounded-lg object-cover border border-gray-200 animate-in fade-in" alt={prod.name} />
                                  <div className="min-w-0">
                                    <p className="font-bold text-gray-900 truncate max-w-xs">{prod.name}</p>
                                    <p className="text-xs text-gray-500 truncate max-w-xs">{prod.description}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-100 text-xs font-bold rounded-full capitalize">
                                  {prod.category}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-gray-900">
                                <span className="font-bold">₹{prod.price}</span>
                                {prod.shippingFee > 0 ? (
                                  <span className="text-xs text-amber-750 block">+ ₹{prod.shippingFee} shipping</span>
                                ) : (
                                  <span className="text-xs text-emerald-700 block">Free shipping</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`font-bold ${prod.stock <= 5 ? 'text-red-600 font-extrabold' : 'text-gray-900'}`}>
                                  {prod.stock} items
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                {prod.isActive ? (
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-850 text-xs font-bold rounded-full">Active</span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-gray-100 text-gray-650 text-xs font-bold rounded-full">Inactive</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleEditProductClick(prod)}
                                    className="p-2 hover:bg-gray-100 rounded-lg text-emerald-700 transition-colors border border-gray-200 bg-white shadow-sm"
                                    title="Edit Product"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteProductClick(prod._id)}
                                    className="p-2 hover:bg-red-50 rounded-lg text-red-650 transition-colors border border-gray-200 bg-white shadow-sm"
                                    title="Delete Product"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* SECTION: ORDERS */}
            {activeSection === 'orders' && (
              <motion.div
                key="orders"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                {/* Search Header */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500 font-semibold">
                      Manage checkout orders registry. Total orders: <span className="font-bold text-gray-900">{ordersList.length}</span>
                    </div>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search orders by customer name, email, phone, or order ID..."
                      value={ordersSearch}
                      onChange={(e) => setOrdersSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-gray-50/50 text-emerald-950"
                    />
                  </div>
                </div>

                {/* Orders registry list */}
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                  {ordersLoading ? (
                    <div className="p-12 text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                      <p className="text-gray-500">Retrieving orders database...</p>
                    </div>
                  ) : ordersList.length === 0 ? (
                    <div className="p-16 text-center text-gray-500">
                      <ClipboardList className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                      <p className="font-bold text-lg text-gray-700 mb-1">No orders found</p>
                      <p className="text-sm text-gray-500">Check back later or test placing an order in the public store.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold uppercase tracking-wider text-gray-500">
                            <th className="px-6 py-4">Order ID & Date</th>
                            <th className="px-6 py-4">Customer Details</th>
                            <th className="px-6 py-4">Total Amount</th>
                            <th className="px-6 py-4">Payment Status</th>
                            <th className="px-6 py-4">Delivery Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm font-medium text-gray-700">
                          {ordersList.map((order) => {
                            const dateStr = new Date(order.createdAt).toLocaleDateString("en-IN", {
                              day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            });
                            return (
                              <tr key={order._id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4">
                                  <p className="font-bold text-gray-900 select-all font-mono text-xs">{order._id}</p>
                                  <p className="text-xs text-gray-505 mt-0.5">{dateStr}</p>
                                </td>
                                <td className="px-6 py-4">
                                  <p className="font-bold text-gray-950">{order.customerName}</p>
                                  <p className="text-xs text-gray-500 font-semibold">{order.customerEmail}</p>
                                  <p className="text-xs text-gray-505">{order.phone}</p>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="font-extrabold text-gray-900">₹{order.totalAmount}</span>
                                  <span className="text-[10px] text-gray-400 block uppercase font-bold">{order.paymentMethod}</span>
                                </td>
                                <td className="px-6 py-4">
                                  <select
                                    value={order.paymentStatus}
                                    onChange={(e) => handleUpdateOrderStatus(order._id, { paymentStatus: e.target.value })}
                                    className={`px-2.5 py-1 text-xs font-black rounded-lg uppercase tracking-wide border cursor-pointer ${
                                      order.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-805 border-emerald-200' :
                                      order.paymentStatus === 'failed' ? 'bg-red-50 text-red-805 border-red-200' :
                                      'bg-amber-50 text-amber-805 border-amber-200'
                                    }`}
                                  >
                                    <option value="pending">Pending</option>
                                    <option value="paid">Paid</option>
                                    <option value="failed">Failed</option>
                                  </select>
                                </td>
                                <td className="px-6 py-4">
                                  <select
                                    value={order.status}
                                    onChange={(e) => handleUpdateOrderStatus(order._id, { status: e.target.value })}
                                    className={`px-2.5 py-1 text-xs font-black rounded-lg uppercase tracking-wide border cursor-pointer ${
                                      order.status === 'delivered' ? 'bg-emerald-50 text-emerald-805 border-emerald-200' :
                                      order.status === 'cancelled' ? 'bg-red-50 text-red-805 border-red-200' :
                                      order.status === 'shipped' ? 'bg-blue-50 text-blue-805 border-blue-200' :
                                      'bg-amber-50 text-amber-805 border-amber-200'
                                    }`}
                                  >
                                    <option value="pending">Pending</option>
                                    <option value="processing">Processing</option>
                                    <option value="shipped">Shipped</option>
                                    <option value="delivered">Delivered</option>
                                    <option value="cancelled">Cancelled</option>
                                  </select>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <button
                                    onClick={() => setSelectedOrder(order)}
                                    className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg text-xs font-bold text-gray-700 transition-colors shadow-sm inline-flex items-center gap-1"
                                  >
                                    View Items
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ================= PRODUCT REVIEWS ================= */}
            {activeSection === 'reviews' && (
              <motion.div
                key="reviews"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                {/* Status tabs */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Pending', value: reviewCounts.pending, key: 'pending', color: 'bg-amber-500' },
                    { label: 'Approved', value: reviewCounts.approved, key: 'approved', color: 'bg-emerald-500' },
                    { label: 'Rejected', value: reviewCounts.rejected, key: 'rejected', color: 'bg-red-500' },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setReviewFilter(tab.key)}
                      className={`p-4 rounded-2xl border-2 transition-all text-left ${
                        reviewFilter === tab.key
                          ? 'bg-white border-emerald-500 shadow-md'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className={`w-10 h-10 rounded-lg ${tab.color} flex items-center justify-center`}>
                          <Star className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-2xl font-bold text-gray-900">{tab.value}</span>
                      </div>
                      <div className="text-sm font-semibold text-gray-505">{tab.label}</div>
                    </button>
                  ))}
                </div>

                {/* Review list */}
                {reviewsLoading ? (
                  <div className="bg-white rounded-2xl p-12 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                    <p className="text-gray-505">Loading reviews...</p>
                  </div>
                ) : reviewsList.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
                    <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-505 font-semibold">No {reviewFilter} reviews</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviewsList.map((review) => (
                      <div
                        key={review._id}
                        className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
                      >
                        <div className="flex flex-col md:flex-row gap-5">
                          {review.product?.image && (
                            <img
                              src={review.product.image}
                              alt={review.product?.name || 'Product'}
                              className="w-20 h-20 rounded-xl object-cover border border-gray-200 shrink-0"
                            />
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div className="min-w-0">
                                <p className="font-bold text-gray-900 truncate">
                                  {review.product?.name || 'Unknown product'}
                                </p>
                                <p className="text-xs text-gray-505">
                                  by <span className="font-semibold text-gray-700">{review.reviewerName || review.user?.name || 'Unknown'}</span>
                                  {review.occupation && ` · ${review.occupation}`}
                                  {/* Reviews need no account, so say which kind this is —
                                      a guest's name is whatever they typed. */}
                                  <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    review.user ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                                  }`}>
                                    {review.user ? 'Member' : 'Guest'}
                                  </span>
                                  {review.user?.email && <span className="block mt-0.5">{review.user.email}</span>}
                                </p>
                              </div>
                              <div className="shrink-0">{getStatusBadge(review.status)}</div>
                            </div>

                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`w-4 h-4 ${
                                      star <= review.rating ? 'text-amber-400' : 'text-gray-300'
                                    }`}
                                    fill="currentColor"
                                  />
                                ))}
                              </div>
                              <span className="text-xs font-bold text-gray-700">{review.rating}/5</span>
                              <span className="text-xs text-gray-400">
                                {new Date(review.createdAt).toLocaleDateString()}
                              </span>
                            </div>

                            {review.title && (
                              <p className="font-bold text-gray-900 text-sm mb-1">{review.title}</p>
                            )}
                            {review.comment && (
                              <p className="text-sm text-gray-700 leading-relaxed">{review.comment}</p>
                            )}
                            {review.status === 'rejected' && review.rejectionReason && (
                              <p className="text-xs text-red-600 mt-2">
                                <span className="font-bold">Rejection reason:</span> {review.rejectionReason}
                              </p>
                            )}

                            {/* Actions */}
                            <div className="flex flex-wrap gap-2 mt-4">
                              {review.status !== 'approved' && (
                                <button
                                  onClick={() => updateReviewStatus(review._id, 'approved')}
                                  disabled={reviewActionId === review._id}
                                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-all disabled:opacity-50"
                                >
                                  {reviewActionId === review._id ? 'Working...' : 'Approve'}
                                </button>
                              )}
                              {review.status !== 'rejected' && (
                                <button
                                  onClick={() => updateReviewStatus(review._id, 'rejected')}
                                  disabled={reviewActionId === review._id}
                                  className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-semibold hover:bg-amber-700 transition-all disabled:opacity-50"
                                >
                                  Reject
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={() => deleteReview(review._id)}
                                  disabled={reviewActionId === review._id}
                                  className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition-all disabled:opacity-50"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                {['Not a fungi', 'Duplicate observation', 'Unclear photo'].map((reason) => (
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

      {/* Hidden file input for DP upload */}
      <input
        type="file"
        ref={dpInputRef}
        onChange={handleDpFileChange}
        accept="image/*"
        className="hidden"
      />

      <AnimatePresence>
        {selectedUserProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden border border-gray-200"
            >
              <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-600">Volunteer Profile</p>
                  <h3 className="text-2xl font-extrabold text-gray-900 mt-1">{selectedUserProfile.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">Review profile details and update access level.</p>
                </div>
                <button
                  onClick={closeUserProfile}
                  disabled={savingUserProfile}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  Close
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-88px)] space-y-6">
                <div className="grid lg:grid-cols-[240px_minmax(0,1fr)] gap-6">
                  <div className="bg-emerald-950 rounded-3xl p-6 text-white">
                    <div className="flex flex-col items-center text-center">
                      {selectedUserProfile.dp?.url ? (
                        <img
                          src={selectedUserProfile.dp.url}
                          alt={selectedUserProfile.name}
                          className="w-28 h-28 rounded-full object-cover border-4 border-white/20"
                        />
                      ) : (
                        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-extrabold text-3xl border-4 border-white/10">
                          {selectedUserProfile.name?.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2) || 'U'}
                        </div>
                      )}
                      <h4 className="text-xl font-bold mt-4">{selectedUserProfile.name}</h4>
                      <p className="text-emerald-200 text-sm mt-1">@{selectedUserProfile.username}</p>
                      <div className="mt-4 flex flex-wrap justify-center gap-2">
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 border border-white/10">
                          {selectedUserProfile.isBanned ? 'Suspended' : 'Active'}
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 border border-white/10">
                          {selectedUserProfile.points || 0} pts
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="rounded-2xl border border-gray-200 p-4 bg-gray-50">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Email</p>
                        <p className="text-sm font-semibold text-gray-900 mt-2 break-all">{selectedUserProfile.email}</p>
                      </div>
                      <div className="rounded-2xl border border-gray-200 p-4 bg-gray-50">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Auth Provider</p>
                        <p className="text-sm font-semibold text-gray-900 mt-2 capitalize">{selectedUserProfile.authProvider || 'credentials'}</p>
                      </div>
                      <div className="rounded-2xl border border-gray-200 p-4 bg-gray-50">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Joined</p>
                        <p className="text-sm font-semibold text-gray-900 mt-2">
                          {selectedUserProfile.createdAt ? new Date(selectedUserProfile.createdAt).toLocaleString() : 'Unknown'}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-gray-200 p-4 bg-gray-50">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Last Login</p>
                        <p className="text-sm font-semibold text-gray-900 mt-2">
                          {selectedUserProfile.lastLogin ? new Date(selectedUserProfile.lastLogin).toLocaleString() : 'No login recorded'}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-200 p-5">
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Bio</p>
                      <p className="text-sm text-gray-700 mt-3 leading-relaxed">
                        {selectedUserProfile.bio?.trim() || 'No bio added yet.'}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-gray-200 p-5 space-y-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Access Control</p>
                          <p className="text-sm text-gray-600 mt-1">Change what this user can do across the platform.</p>
                        </div>
                        {selectedUserProfile._id === user.id && (
                          <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
                            Your account
                          </span>
                        )}
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                            Current Role
                          </label>
                          <div className="px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-800 capitalize">
                            {selectedUserProfile.role}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                            Change Role
                          </label>
                          <select
                            value={editingUserRole}
                            onChange={(e) => setEditingUserRole(e.target.value)}
                            disabled={selectedUserProfile._id === user.id || savingUserProfile}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                          >
                            <option value="user">Volunteer</option>
                            <option value="writer">Writer</option>
                            <option value="subadmin">Sub Admin</option>
                            <option value="superadmin">Super Admin</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-3 gap-3 text-xs font-semibold">
                        <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 text-gray-600">
                          `Volunteer` can submit and manage their own observations.
                        </div>
                        <div className="rounded-xl bg-purple-50 border border-purple-200 p-3 text-purple-700">
                          `Writer` can also manage article content.
                        </div>
                        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-emerald-700">
                          `Admin` gets access to the full admin portal.
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-2">
                        <button
                          onClick={closeUserProfile}
                          disabled={savingUserProfile}
                          className="px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleUserRoleSave}
                          disabled={
                            savingUserProfile ||
                            selectedUserProfile._id === user.id ||
                            editingUserRole === selectedUserProfile.role
                          }
                          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-50"
                        >
                          {savingUserProfile ? 'Saving...' : 'Save Role'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* E-COMMERCE: PRODUCT ADD/EDIT MODAL */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="fixed inset-0" onClick={() => setShowProductModal(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden z-10"
          >
            <form onSubmit={handleProductSubmit}>
              <div className="p-6 bg-emerald-950 text-white">
                <h3 className="text-xl font-bold font-serif">{editingProduct ? 'Edit Product Item' : 'Add Catalog Product'}</h3>
                <p className="text-xs text-emerald-300 mt-1">Provide product pricing, specifications, inventory and graphics details.</p>
              </div>

              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Product Title</label>
                    <input
                      type="text"
                      required
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-emerald-950 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Price (INR)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={productForm.price}
                      onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-emerald-950 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Shipping Fee (INR)</label>
                    <input
                      type="number"
                      min="0"
                      value={productForm.shippingFee}
                      onChange={(e) => setProductForm({ ...productForm, shippingFee: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-emerald-950 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Category</label>
                    <select
                      value={productForm.category}
                      onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm bg-white text-emerald-950 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="kits">Grow Kits</option>
                      <option value="mushrooms">Mushrooms & Extracts</option>
                      <option value="merch">Merchandise</option>
                      <option value="education">Educational Media</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Stock Count</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={productForm.stock}
                      onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-emerald-950 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Cloudinary Image Upload Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-gray-150 pt-4">
                  {/* Main Image Uploader */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-gray-700 uppercase">Main Product Image</label>
                    <div className="flex items-center gap-3">
                      {productForm.image ? (
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200 bg-stone-50 shrink-0">
                          <img src={productForm.image} className="w-full h-full object-cover" alt="Main" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-xl border border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-400 bg-gray-50 shrink-0">
                          No Image
                        </div>
                      )}
                      
                      <div className="flex-1 space-y-1.5">
                        <input
                          type="text"
                          required
                          value={productForm.image}
                          onChange={(e) => setProductForm({ ...productForm, image: e.target.value })}
                          placeholder="Image URL or upload below..."
                          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs text-emerald-950 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        />
                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleMainImageUpload}
                            className="hidden"
                            id="product-main-image-upload"
                            disabled={isUploadingMainImage}
                          />
                          <label
                            htmlFor="product-main-image-upload"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 cursor-pointer disabled:opacity-50"
                          >
                            {isUploadingMainImage ? (
                              <>
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="w-3 h-3" />
                                Upload File
                              </>
                            )}
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Gallery Images Uploader */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-gray-700 uppercase">Gallery Images</label>
                    <div className="flex items-start gap-3">
                      <div className="flex-1 space-y-1.5">
                        <input
                          type="text"
                          value={productForm.gallery}
                          onChange={(e) => setProductForm({ ...productForm, gallery: e.target.value })}
                          placeholder="Comma separated image URLs..."
                          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs text-emerald-950 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        />
                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleGalleryImageUpload}
                            className="hidden"
                            id="product-gallery-image-upload"
                            disabled={isUploadingGalleryImage}
                          />
                          <label
                            htmlFor="product-gallery-image-upload"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 cursor-pointer disabled:opacity-50"
                          >
                            {isUploadingGalleryImage ? (
                              <>
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                Add Upload file
                              </>
                            )}
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Gallery Preview Thumbnails */}
                    {productForm.gallery && (
                      <div className="flex flex-wrap gap-2 pt-1.5">
                        {productForm.gallery.split(',').map((imgUrl, i) => (
                          <div key={i} className="relative w-10 h-10 rounded-lg overflow-hidden border border-gray-200 bg-stone-50 shrink-0">
                            <img src={imgUrl.trim()} className="w-full h-full object-cover" alt="Gallery" />
                            <button
                              type="button"
                              onClick={() => {
                                const list = productForm.gallery.split(',').map(u => u.trim()).filter(Boolean);
                                list.splice(i, 1);
                                setProductForm(prev => ({ ...prev, gallery: list.join(', ') }));
                              }}
                              className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-650 text-white rounded-bl flex items-center justify-center hover:bg-red-700 text-[8px] font-bold"
                              title="Remove image"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-gray-150 pt-4">
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Product Description</label>
                  <textarea
                    required
                    rows="3"
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-emerald-950 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Product Specifications (Separated by Semicolon)</label>
                  <input
                    type="text"
                    value={productForm.specification}
                    onChange={(e) => setProductForm({ ...productForm, specification: e.target.value })}
                    placeholder="Weight: 1.5kg; Dimensions: 15x15x20cm; Substrate: straw"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-emerald-950 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Features Highlights (Separated by Semicolon)</label>
                  <input
                    type="text"
                    value={productForm.features}
                    onChange={(e) => setProductForm({ ...productForm, features: e.target.value })}
                    placeholder="100% organic; First harvest in 10 days"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-emerald-950 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={productForm.isActive}
                    onChange={(e) => setProductForm({ ...productForm, isActive: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="isActive" className="text-sm font-bold text-gray-700 cursor-pointer">Display item publicly in store</label>
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm font-bold bg-white hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-600/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Save Product
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* E-COMMERCE: ORDER DETAILS VIEW OVERLAY */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="fixed inset-0" onClick={() => setSelectedOrder(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden z-10"
          >
            <div className="p-6 bg-emerald-950 text-white">
              <h3 className="text-xl font-bold font-serif">Order Invoice Details</h3>
              <p className="text-xs text-emerald-300 mt-1">Ref ID: {selectedOrder._id}</p>
            </div>

            <div className="p-6 space-y-5 text-sm text-gray-700 font-medium">
              {/* Customer Section */}
              <div className="space-y-1">
                <p className="text-xs uppercase font-bold text-emerald-700">Customer Profile</p>
                <p className="text-gray-900 font-bold">{selectedOrder.customerName}</p>
                <p className="text-xs font-semibold text-gray-500">{selectedOrder.customerEmail}</p>
                <p className="text-xs text-gray-500">Phone: {selectedOrder.phone}</p>
              </div>

              {/* Shipping address details */}
              <div className="space-y-1 border-t border-gray-100 pt-3">
                <p className="text-xs uppercase font-bold text-emerald-700">Shipping Destination</p>
                <p className="text-xs leading-relaxed text-gray-600">
                  {selectedOrder.shippingAddress?.street}, {selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state} - {selectedOrder.shippingAddress?.zipCode}, {selectedOrder.shippingAddress?.country}
                </p>
              </div>

              {/* Items Ordered List */}
              <div className="space-y-2 border-t border-gray-100 pt-3">
                <p className="text-xs uppercase font-bold text-emerald-700">Items Catalog Details</p>
                <div className="space-y-2">
                  {selectedOrder.items?.map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-xs bg-gray-50 border border-gray-100 rounded-xl p-3">
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 truncate">{item.name}</p>
                        <p className="text-gray-505 font-medium">{item.quantity} units × ₹{item.price}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-gray-900">₹{item.price * item.quantity}</p>
                        {item.shippingFee > 0 && (
                          <p className="text-[10px] text-amber-705">+ ₹{item.shippingFee} shipping</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Billing Summary */}
              <div className="flex justify-between items-center border-t border-gray-100 pt-3 text-base">
                <span className="font-bold text-emerald-950">Total Amount Due</span>
                <span className="font-extrabold text-emerald-800 text-lg">₹{selectedOrder.totalAmount}</span>
              </div>

              {/* UPI Payment Proof Verification */}
              {selectedOrder.paymentProof && (
                <div className="space-y-1.5 border-t border-gray-100 pt-3">
                  <p className="text-xs uppercase font-bold text-emerald-700">UPI Payment Proof Receipt</p>
                  <div className="relative border border-gray-200 rounded-2xl overflow-hidden bg-gray-50 max-h-48 flex items-center justify-center p-2 hover:bg-gray-100 transition-colors">
                    <a href={selectedOrder.paymentProof} target="_blank" rel="noopener noreferrer" className="block w-full text-center">
                      <img
                        src={selectedOrder.paymentProof}
                        className="max-h-40 mx-auto object-contain rounded-lg"
                        alt="Payment Proof Receipt Screenshot"
                      />
                      <p className="text-[10px] text-gray-500 font-bold mt-1">Click to open full-size screenshot</p>
                    </a>
                  </div>
                </div>
              )}

              {/* Order statuses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Payment Status</label>
                  <select
                    value={selectedOrder.paymentStatus}
                    onChange={(e) => handleUpdateOrderStatus(selectedOrder._id, { paymentStatus: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-gray-300 bg-white text-emerald-950 cursor-pointer"
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Delivery Status</label>
                  <select
                    value={selectedOrder.status}
                    onChange={(e) => handleUpdateOrderStatus(selectedOrder._id, { status: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-gray-300 bg-white text-emerald-950 cursor-pointer"
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-6 py-2.5 bg-gray-950 hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Close Invoice
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
