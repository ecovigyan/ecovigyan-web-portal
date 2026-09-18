"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { uploadToCloudinary } from "@/lib/uploadToCloudinary";
import ArtworkUploadModal from "@/components/ArtworkUploadModal";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import {
  ChevronLeft,
  ChevronRight,
  Palette,
  School,
  User,
  Upload,
  Users,
  Calendar,
  Award,
  Edit,
  Trash2,
  X,
} from "lucide-react";

/* ---------------------------------------------------------
   GALLERY DATA & CONFIG
--------------------------------------------------------- */
const IMAGES_PER_PAGE = 12;

const CATEGORIES = [
  "All",
  "Nature Art",
  "Recycled Materials",
  "Paintings",
  "Posters",
  "Collage",
  "Mixed Media",
];

function EcoArtGalleryContent() {
  const { user, isWriterOrAdmin } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [totalStats, setTotalStats] = useState({ totalArtworks: 0, totalSchools: 0, totalStudents: 0 });
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingArtwork, setEditingArtwork] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingArtwork, setDeletingArtwork] = useState(null);
  const [viewingImage, setViewingImage] = useState(null);

  // Fetch images from API (server-side pagination)
  const fetchImages = useCallback(async (page, category) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(IMAGES_PER_PAGE),
      });
      if (category && category !== "All") params.set("category", category);

      const res = await fetch(`/api/gallery?${params}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to load");

      const formatted = (data.images || []).map((img) => ({
        id: img._id || img.id,
        src: img.image.url,
        studentName: img.studentName,
        schoolName: img.schoolName,
        description: img.description || "",
        title: img.title || "",
        category: img.category || "",
        program: img.program || "",
        year: img.year || "",
        theme: img.theme || "",
      }));

      setUploadedImages(formatted);
      setTotalPages(data.totalPages || 1);
      if (data.stats) setTotalStats(data.stats);
    } catch (error) {
      console.error("Error fetching gallery images:", error);
      toast.error("Failed to load gallery");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on page or category change
  useEffect(() => {
    fetchImages(currentPage, categoryFilter);
  }, [currentPage, categoryFilter, fetchImages]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilter]);

  // Sync viewing state with URL parameter
  useEffect(() => {
    const imageId = searchParams.get("image");
    if (imageId && uploadedImages.length > 0) {
      const image = uploadedImages.find((img) => img.id === imageId);
      if (image) {
        setViewingImage(image);
      } else if (!loading) {
        router.push("/gallery", { scroll: false });
      }
    } else if (!imageId && viewingImage) {
      setViewingImage(null);
    }
  }, [searchParams, uploadedImages, loading, viewingImage, router]);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleViewImage = (image) => {
    setViewingImage(image);
    router.push(`/gallery?image=${image.id}`, { scroll: false });
  };

  const handleCloseImage = () => {
    setViewingImage(null);
    router.push("/gallery", { scroll: false });
  };

  const canUpload = isWriterOrAdmin();

  // Handle upload — direct browser→Cloudinary, then POST JSON to API
  const handleUploadSubmit = async (formData) => {
    try {
      let imageFile = null;

      if (formData.imageUrl.startsWith("data:")) {
        const response = await fetch(formData.imageUrl);
        const blob = await response.blob();
        imageFile = new File([blob], "artwork.jpg", { type: blob.type });
      } else {
        toast.error("Please upload an image file");
        return;
      }

      toast.loading("Uploading to Cloudinary...", { id: "gallery-upload" });
      const uploaded = await uploadToCloudinary(imageFile, { folder: "gallery" });
      toast.loading("Saving...", { id: "gallery-upload" });

      const res = await fetch("/api/gallery/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: uploaded.secure_url,
          publicId: uploaded.public_id,
          studentName: formData.studentName.trim(),
          schoolName: formData.schoolName.trim(),
          description: formData.description?.trim() || "",
          title: formData.title?.trim() || "",
          category: formData.category || "",
          program: formData.program || "",
          year: formData.year || "",
          theme: formData.theme || "",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      toast.success("Artwork uploaded successfully!", { id: "gallery-upload" });

      // Prepend to current page and update stats
      const newItem = {
        id: data.galleryItem.id,
        src: data.galleryItem.image.url,
        studentName: data.galleryItem.studentName,
        schoolName: data.galleryItem.schoolName,
        description: data.galleryItem.description || "",
        title: formData.title?.trim() || "",
        category: formData.category || "",
        program: formData.program || "",
        year: formData.year || "",
        theme: formData.theme || "",
      };
      setUploadedImages((prev) => [newItem, ...prev]);
      setTotalStats((prev) => ({ ...prev, totalArtworks: prev.totalArtworks + 1 }));
      setShowUploadModal(false);
    } catch (error) {
      toast.error(error.message || "Failed to upload artwork", { id: "gallery-upload" });
    }
  };

  // Handle edit from modal (metadata only — no image re-upload)
  const handleEditSubmit = async (formData) => {
    try {
      const res = await fetch(`/api/gallery/${editingArtwork.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: formData.studentName.trim(),
          schoolName: formData.schoolName.trim(),
          description: formData.description.trim(),
          title: formData.title?.trim() || "",
          category: formData.category || "",
          program: formData.program || "",
          year: formData.year || "",
          theme: formData.theme || "",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");

      toast.success("Artwork updated successfully!");

      setUploadedImages(
        uploadedImages.map((img) =>
          img.id === editingArtwork.id
            ? {
                ...img,
                studentName: formData.studentName,
                schoolName: formData.schoolName,
                description: formData.description,
                title: formData.title || "",
                category: formData.category || "",
                program: formData.program || "",
                year: formData.year || "",
                theme: formData.theme || "",
              }
            : img
        )
      );

      setEditingArtwork(null);
    } catch (error) {
      toast.error(error.message || "Failed to update artwork");
    }
  };

  // Handle delete
  const handleDeleteConfirm = async () => {
    if (!deletingArtwork) return;

    try {
      const res = await fetch(`/api/gallery/${deletingArtwork.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");

      toast.success("Artwork deleted successfully!");

      setUploadedImages(uploadedImages.filter((img) => img.id !== deletingArtwork.id));
      setTotalStats((prev) => ({ ...prev, totalArtworks: Math.max(0, prev.totalArtworks - 1) }));

      if (viewingImage?.id === deletingArtwork.id) handleCloseImage();

      setDeletingArtwork(null);
    } catch (error) {
      toast.error(error.message || "Failed to delete artwork");
    }
  };

  const handleEdit = (artwork) => {
    setEditingArtwork({
      id: artwork.id,
      studentName: artwork.studentName,
      schoolName: artwork.schoolName,
      description: artwork.description || "",
      title: artwork.title || "",
      category: artwork.category || "Nature Art",
      program: artwork.program || "",
      year: artwork.year || new Date().getFullYear().toString(),
      theme: artwork.theme || "",
      imageUrl: artwork.src,
    });
    setShowUploadModal(true);
  };

  const confirmDelete = (artwork) => {
    setDeletingArtwork(artwork);
    setShowDeleteConfirm(true);
  };

  return (
    <main className="min-h-screen bg-white font-sans">
      {/* --- Hero Section --- */}
      <section className="relative pt-32 pb-20 bg-gradient-to-br from-emerald-700 to-emerald-900 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-96 h-96 border-2 border-white rounded-full" />
          <div className="absolute bottom-10 right-10 w-64 h-64 border-2 border-white rounded-full" />
          <div className="absolute top-1/2 left-1/2 w-80 h-80 border border-white rounded-full" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-white/90 text-sm font-medium mb-6">
              <Palette className="w-4 h-4" />
              <span>Student Creativity</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 font-serif">
              ECO-ART GALLERY
            </h1>
            <p className="text-xl md:text-2xl text-emerald-50 max-w-4xl mx-auto leading-relaxed">
              Art is where young minds speak for the Earth. This gallery
              showcases artwork created by students as part of our nature
              education initiatives, especially the Wipro Earthian Program.
              Explore each artwork to learn about the student behind it, their
              school, and the story their art tells.
            </p>

            {canUpload && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                onClick={() => {
                  setEditingArtwork(null);
                  setShowUploadModal(true);
                }}
                className="mt-8 inline-flex items-center gap-2 bg-white text-emerald-900 px-8 py-4 rounded-xl font-bold hover:bg-emerald-50 transition-all shadow-xl hover:shadow-2xl hover:scale-105"
              >
                <Upload className="w-5 h-5" />
                Upload Artwork
              </motion.button>
            )}
          </motion.div>
        </div>
      </section>

      {/* --- Statistics Banner --- */}
      <section className="py-12 bg-gradient-to-r from-emerald-50 to-teal-50 border-y border-emerald-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-emerald-900 mb-2">
                {totalStats.totalArtworks}
              </div>
              <div className="text-sm text-emerald-600 font-medium">
                Artworks Showcased
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-emerald-900 mb-2">
                {totalStats.totalSchools}
              </div>
              <div className="text-sm text-emerald-600 font-medium">
                Schools Represented
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-emerald-900 mb-2">
                {totalStats.totalStudents}
              </div>
              <div className="text-sm text-emerald-600 font-medium">
                Young Artists
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-emerald-900 mb-2">
                3
              </div>
              <div className="text-sm text-emerald-600 font-medium">
                Education Programs
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- Category Filter Section --- */}
      <section className="py-8 bg-white border-b border-emerald-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-3 justify-center">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setCategoryFilter(category)}
                className={`px-6 py-2.5 rounded-full font-semibold text-sm transition-all ${
                  categoryFilter === category
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* --- Gallery Grid --- */}
      <section className="py-20 bg-gradient-to-b from-white to-emerald-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({ length: IMAGES_PER_PAGE }).map((_, index) => (
                <div key={index} className="bg-white p-4 rounded-[2rem] shadow-xl">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-stone-200 mb-4">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                  </div>
                  <div className="px-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-stone-200 animate-pulse" />
                      <div className="h-4 bg-stone-200 rounded flex-grow max-w-[60%] animate-pulse" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-stone-200 animate-pulse" />
                      <div className="h-3 bg-stone-200 rounded flex-grow max-w-[50%] animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <AnimatePresence mode="wait">
                {uploadedImages.length === 0 ? (
                  <div className="col-span-full text-center py-20">
                    <Palette className="w-16 h-16 text-emerald-300 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      No artworks found
                    </h3>
                    <p className="text-gray-600">
                      {categoryFilter !== "All"
                        ? "Try selecting a different category"
                        : "No images in gallery yet."}
                    </p>
                  </div>
                ) : (
                  uploadedImages.map((artwork, index) => (
                    <motion.div
                      key={artwork.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      whileHover={{ y: -8, transition: { duration: 0.2 } }}
                      onClick={() => handleViewImage(artwork)}
                      className="group cursor-pointer bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border-4 border-white hover:border-emerald-200"
                    >
                      {/* Artwork Image */}
                      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50">
                        <Image
                          src={artwork.src}
                          alt={artwork.title || `Artwork by ${artwork.studentName}`}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        <div className="absolute bottom-0 left-0 right-0 p-4 text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                          <div className="text-sm font-semibold mb-1">
                            {artwork.title || "Student Artwork"}
                          </div>
                          <div className="text-xs opacity-90">Click to view details</div>
                        </div>

                        {canUpload && (
                          <div
                            className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEdit(artwork); }}
                              className="p-2 bg-white/90 rounded-full hover:bg-white transition shadow-lg"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4 text-emerald-700" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); confirmDelete(artwork); }}
                              className="p-2 bg-red-500/90 rounded-full hover:bg-red-500 transition shadow-lg"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4 text-white" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Card Footer */}
                      <div className="p-6 bg-white">
                        <div className="flex items-start gap-3 mb-4">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shrink-0">
                            <Users className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-emerald-900 text-sm mb-1 truncate">
                              {artwork.studentName}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                              <School className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{artwork.schoolName}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          {artwork.category ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 text-xs font-semibold">
                              <Award className="w-3.5 h-3.5" />
                              {artwork.category}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 text-xs font-semibold">
                              <Palette className="w-3.5 h-3.5" />
                              Student Art
                            </span>
                          )}
                          <span className="text-xs text-gray-500 font-medium">
                            {artwork.year || "2023"}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          )}

          {/* --- Pagination Controls --- */}
          {totalPages > 1 && (
            <div className="mt-16 flex justify-center items-center gap-4">
              <button
                onClick={() => paginate(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-3 rounded-full bg-white shadow-md hover:bg-emerald-50 disabled:opacity-30 transition-all"
              >
                <ChevronLeft className="w-6 h-6 text-emerald-700" />
              </button>

              <div className="flex gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                  <button
                    key={number}
                    onClick={() => paginate(number)}
                    className={`w-12 h-12 rounded-full font-bold transition-all shadow-sm ${
                      currentPage === number
                        ? "bg-emerald-600 text-white scale-110 shadow-emerald-200"
                        : "bg-white text-stone-600 hover:bg-emerald-50"
                    }`}
                  >
                    {number}
                  </button>
                ))}
              </div>

              <button
                onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-3 rounded-full bg-white shadow-md hover:bg-emerald-50 disabled:opacity-30 transition-all"
              >
                <ChevronRight className="w-6 h-6 text-emerald-700" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* --- Quote Footer --- */}
      <section className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-stone-400 italic font-medium text-lg">
          &ldquo;Every child is an artist. The problem is how to remain an
          artist once he grows up.&rdquo;
        </p>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-br from-emerald-900 to-teal-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 w-96 h-96 border border-white rounded-full" />
          <div className="absolute bottom-10 left-10 w-64 h-64 border border-white rounded-full" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Palette className="w-16 h-16 text-emerald-400 mx-auto mb-6" />
          <h2 className="text-4xl font-bold text-white mb-6 font-serif">
            Want to Showcase Your Art?
          </h2>
          <p className="text-xl text-emerald-100 mb-8 leading-relaxed">
            Join our education programs and let your creativity speak for the
            Earth. Every artwork tells a story of environmental awareness and
            action.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/programs"
              className="bg-white text-emerald-900 px-8 py-4 rounded-xl font-bold hover:bg-emerald-50 transition-all shadow-xl inline-block text-center"
            >
              Explore Programs
            </a>
            {canUpload && (
              <button
                onClick={() => {
                  setEditingArtwork(null);
                  setShowUploadModal(true);
                }}
                className="bg-emerald-700 text-white px-8 py-4 rounded-xl font-bold hover:bg-emerald-600 transition-all border-2 border-emerald-500"
              >
                Submit Your Artwork
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Upload/Edit Modal */}
      <ArtworkUploadModal
        isOpen={showUploadModal}
        onClose={() => {
          setShowUploadModal(false);
          setEditingArtwork(null);
        }}
        onSubmit={editingArtwork ? handleEditSubmit : handleUploadSubmit}
        editData={editingArtwork}
        isEditing={!!editingArtwork}
      />

      {/* View Image Modal */}
      <AnimatePresence>
        {viewingImage && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="relative w-full max-w-5xl max-h-[90vh]">
              {/* Navigation Buttons */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const currentIndex = uploadedImages.findIndex((img) => img.id === viewingImage.id);
                  const previousIndex = (currentIndex - 1 + uploadedImages.length) % uploadedImages.length;
                  handleViewImage(uploadedImages[previousIndex]);
                }}
                className="fixed left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white shadow-xl flex items-center justify-center text-gray-700 hover:bg-emerald-50 transition-colors z-10"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const currentIndex = uploadedImages.findIndex((img) => img.id === viewingImage.id);
                  const nextIndex = (currentIndex + 1) % uploadedImages.length;
                  handleViewImage(uploadedImages[nextIndex]);
                }}
                className="fixed right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white shadow-xl flex items-center justify-center text-gray-700 hover:bg-emerald-50 transition-colors z-10"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              >
                <div className="relative bg-gradient-to-r from-emerald-500 to-teal-600 p-12">
                  <button
                    onClick={handleCloseImage}
                    className="absolute top-8 right-8 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors z-10"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto">
                  <div className="mb-4 rounded-2xl overflow-hidden border-4 border-emerald-100">
                    <img
                      src={viewingImage.src}
                      alt={viewingImage.title || `Artwork by ${viewingImage.studentName}`}
                      className="w-full max-h-[40vh] object-contain bg-gradient-to-br from-emerald-50 to-teal-50"
                    />
                  </div>

                  <div className="space-y-6">
                    {/* No generic "Student Artwork" fallback heading: on a phone
                        it took two lines of large serif type and pushed the
                        description, artists and school below the fold. A real
                        title is still shown when the artwork has one. */}
                    {(viewingImage.title || viewingImage.category) && (
                      <div>
                        {viewingImage.title && (
                          <h2 className="text-2xl md:text-4xl font-bold text-emerald-900 mb-2 font-serif">
                            {viewingImage.title}
                          </h2>
                        )}
                        {viewingImage.category && (
                          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 text-sm font-semibold">
                            <Award className="w-4 h-4" />
                            {viewingImage.category}
                          </span>
                        )}
                      </div>
                    )}

                    {viewingImage.description && (
                      <div className="bg-emerald-50 p-4 rounded-2xl">
                        <p className="text-base text-gray-700 leading-relaxed">
                          {viewingImage.description}
                        </p>
                      </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-emerald-50 p-4 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
                            <Users className="w-6 h-6 text-white" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs text-emerald-600 font-semibold uppercase tracking-wide">Artist(s)</div>
                            <div className="text-sm font-bold text-emerald-900 truncate">{viewingImage.studentName}</div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-blue-50 p-4 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                            <School className="w-6 h-6 text-white" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs text-blue-600 font-semibold uppercase tracking-wide">School</div>
                            <div className="text-sm font-bold text-blue-900 truncate">{viewingImage.schoolName}</div>
                          </div>
                        </div>
                      </div>

                      {viewingImage.program && (
                        <div className="bg-purple-50 p-4 rounded-2xl">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center shrink-0">
                              <Palette className="w-6 h-6 text-white" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs text-purple-600 font-semibold uppercase tracking-wide">Program</div>
                              <div className="text-sm font-bold text-purple-900 truncate">{viewingImage.program}</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {(viewingImage.year || viewingImage.theme) && (
                        <div className="bg-amber-50 p-4 rounded-2xl">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-amber-600 flex items-center justify-center shrink-0">
                              <Calendar className="w-6 h-6 text-white" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs text-amber-600 font-semibold uppercase tracking-wide">
                                {viewingImage.year && viewingImage.theme ? "Year & Theme" : viewingImage.year ? "Year" : "Theme"}
                              </div>
                              <div className="text-sm font-bold text-amber-900 truncate">
                                {viewingImage.year && viewingImage.theme
                                  ? `${viewingImage.year} - ${viewingImage.theme}`
                                  : viewingImage.year || viewingImage.theme}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {canUpload && (
                      <div className="flex gap-3 pt-4 border-t border-stone-200">
                        <button
                          onClick={() => { handleCloseImage(); handleEdit(viewingImage); }}
                          className="flex-1 px-6 py-3 rounded-xl border-2 border-emerald-600 text-emerald-700 font-bold hover:bg-emerald-50 transition flex items-center justify-center gap-2"
                        >
                          <Edit className="w-4 h-4" />
                          Edit Details
                        </button>
                        <button
                          onClick={() => { handleCloseImage(); confirmDelete(viewingImage); }}
                          className="flex-1 px-6 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition flex items-center justify-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeletingArtwork(null);
        }}
        onConfirm={handleDeleteConfirm}
        title={deletingArtwork?.title || "Student Artwork"}
        itemName={
          deletingArtwork
            ? `By ${deletingArtwork.studentName} from ${deletingArtwork.schoolName}`
            : ""
        }
      />
    </main>
  );
}

export default function EcoArtGallery() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-stone-50 flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <EcoArtGalleryContent />
    </Suspense>
  );
}
