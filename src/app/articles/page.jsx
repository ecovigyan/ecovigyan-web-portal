"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { uploadToCloudinary } from "@/lib/uploadToCloudinary";
import { motion } from "framer-motion";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit,
  Trash2,
  User,
  Calendar,
  ChevronRight as ArrowIcon,
} from "lucide-react";
import ArticleCreateModal from "@/components/ArticleCreateModal";
import ArticleDeleteModal from "@/components/ArticleDeleteModal";

const ARTICLES_PER_PAGE = 5;

export default function ArticlesPage() {
  const { isWriterOrAdmin } = useAuth();

  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [deleteArticle, setDeleteArticle] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch articles
  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const res = await fetch("/api/articles");
        const data = await res.json();
        if (!res.ok) throw new Error();
        setArticles(data.articles || []);
      } catch {
        toast.error("Failed to load articles");
      } finally {
        setLoading(false);
      }
    };
    fetchArticles();
  }, []);

  // Pagination
  const totalPages = Math.ceil(articles.length / ARTICLES_PER_PAGE);
  const startIndex = (currentPage - 1) * ARTICLES_PER_PAGE;
  const paginatedArticles = articles.slice(startIndex, startIndex + ARTICLES_PER_PAGE);

  const paginate = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Upload a single image file to Cloudinary, returns { url, publicId } or null
  const uploadImage = async (file) => {
    if (!file) return null;
    const result = await uploadToCloudinary(file, { folder: "articles" });
    return { url: result.secure_url, publicId: result.public_id };
  };

  // Handle create/edit submit — images uploaded client-side first, then JSON to API
  const handleModalSubmit = async (formData) => {
    setSubmitting(true);
    try {
      if (editingArticle) {
        // EDIT MODE — upload any new images in parallel
        const [newImage1, newImage2] = await Promise.all([
          formData.image1 ? uploadImage(formData.image1) : null,
          formData.image2 ? uploadImage(formData.image2) : null,
        ]);

        const keepImage1 = !!formData.image1Preview || !!newImage1;
        const keepImage2 = !!formData.image2Preview || !!newImage2;

        const res = await fetch(`/api/articles/${editingArticle._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formData.title.trim(),
            content: formData.content.trim(),
            image1: newImage1 || null,
            image2: newImage2 || null,
            keepImage1,
            keepImage2,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Update failed");

        toast.success("Article updated successfully!");
      } else {
        // CREATE MODE — upload both images in parallel
        const [image1, image2] = await Promise.all([
          formData.image1 ? uploadImage(formData.image1) : null,
          formData.image2 ? uploadImage(formData.image2) : null,
        ]);

        const images = [image1, image2].filter(Boolean);

        const res = await fetch("/api/articles/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formData.title.trim(),
            content: formData.content.trim(),
            images,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");

        toast.success("Article published successfully!");
      }

      // Refresh articles list
      const articlesRes = await fetch("/api/articles");
      const articlesData = await articlesRes.json();
      if (articlesRes.ok) {
        setArticles(articlesData.articles || []);
      }

      setIsCreateModalOpen(false);
      setEditingArticle(null);
    } catch (error) {
      toast.error(error.message || "Failed to save article");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle edit click
  const handleEdit = (article) => {
    setEditingArticle(article);
    setIsCreateModalOpen(true);
  };

  // Handle delete
  const handleDeleteConfirm = async () => {
    if (!deleteArticle) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/articles/${deleteArticle._id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");

      toast.success("Article deleted successfully!");

      // Remove from list and adjust pagination if needed
      const updated = articles.filter((article) => article._id !== deleteArticle._id);
      setArticles(updated);

      if (updated.length <= (currentPage - 1) * ARTICLES_PER_PAGE && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }

      setDeleteArticle(null);
    } catch (error) {
      toast.error(error.message || "Failed to delete article");
    } finally {
      setDeleting(false);
    }
  };

  const truncateContent = (content, maxLength = 250) => {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + "...";
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
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
              <BookOpen className="w-4 h-4" />
              <span>Environmental Insights</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 font-serif">
              ARTICLES & STORIES
            </h1>
            <p className="text-xl md:text-2xl text-emerald-50 max-w-4xl mx-auto leading-relaxed mb-8">
              Explore our collection of environmental research, student experiences, and conservation stories from the field.
            </p>

            {/* Writer/Admin Create Button */}
            {isWriterOrAdmin() && (
              <button
                onClick={() => {
                  setEditingArticle(null);
                  setIsCreateModalOpen(true);
                }}
                className="inline-flex items-center gap-2 bg-white text-emerald-900 px-8 py-4 rounded-xl font-bold hover:bg-emerald-50 transition-all shadow-xl"
              >
                <Plus className="w-5 h-5" />
                Write New Article
              </button>
            )}
          </motion.div>
        </div>
      </section>

      {/* Articles List */}
      <section className="py-20 bg-gradient-to-b from-white to-emerald-50/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="text-center py-20">
              <p className="text-gray-500 font-medium">Loading articles...</p>
            </div>
          ) : paginatedArticles.length > 0 ? (
            <>
              <div className="space-y-8">
                {paginatedArticles.map((article, index) => (
                  <motion.article
                    key={article._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-emerald-100"
                  >
                    <div className="md:flex">
                      {/* Article Image */}
                      {article.images?.[0]?.url && (
                        <div className="md:w-2/5 relative">
                          <Link href={`/articles/${article._id}`}>
                            <div className="relative w-full h-64 md:h-full">
                              <Image
                                src={article.images[0].url}
                                alt={article.title}
                                fill
                                className="object-cover"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                            </div>
                          </Link>
                        </div>
                      )}

                      {/* Article Content */}
                      <div className={`${article.images?.[0]?.url ? "md:w-3/5" : "w-full"} p-8`}>
                        {/* Meta Info */}
                        <div className="flex items-center gap-4 mb-4 text-sm text-emerald-600">
                          <div className="flex items-center gap-1.5">
                            <User className="w-4 h-4" />
                            <span>{article.uploadedBy?.name || "Author"}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {new Date(article.createdAt).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Title */}
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 font-serif hover:text-emerald-700 transition-colors">
                          <Link href={`/articles/${article._id}`}>
                            {article.title}
                          </Link>
                        </h2>

                        {/* Excerpt */}
                        <p className="text-gray-700 leading-relaxed mb-6">
                          {truncateContent(article.content)}
                        </p>

                        {/* Actions */}
                        <div className="flex items-center justify-between">
                          <Link
                            href={`/articles/${article._id}`}
                            className="inline-flex items-center gap-2 text-emerald-600 font-semibold hover:text-emerald-700 transition-colors"
                          >
                            Read Full Article
                            <ArrowIcon className="w-4 h-4" />
                          </Link>

                          {/* Writer/Admin Actions */}
                          {isWriterOrAdmin() && (
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleEdit(article);
                                }}
                                className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors"
                                title="Edit article"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  setDeleteArticle(article);
                                }}
                                className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors"
                                title="Delete article"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-12 flex items-center justify-center gap-2">
                  <button
                    onClick={() => paginate(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="w-10 h-10 rounded-full bg-white border-2 border-emerald-300 text-emerald-700 flex items-center justify-center hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => paginate(page)}
                      className={`w-10 h-10 rounded-full font-semibold transition-colors ${
                        currentPage === page
                          ? "bg-emerald-600 text-white"
                          : "bg-white border-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="w-10 h-10 rounded-full bg-white border-2 border-emerald-300 text-emerald-700 flex items-center justify-center hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20">
              <BookOpen className="w-16 h-16 text-emerald-300 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No articles yet</h3>
              <p className="text-gray-600 mb-6">Be the first to share your environmental story!</p>
              {isWriterOrAdmin() && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  Write First Article
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Create/Edit Modal */}
      <ArticleCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          if (!submitting) {
            setIsCreateModalOpen(false);
            setEditingArticle(null);
          }
        }}
        onSubmit={handleModalSubmit}
        editData={editingArticle}
        isEditing={!!editingArticle}
        isSubmitting={submitting}
      />

      {/* Delete Confirm Modal */}
      <ArticleDeleteModal
        isOpen={!!deleteArticle}
        onClose={() => {
          if (!deleting) {
            setDeleteArticle(null);
          }
        }}
        onConfirm={handleDeleteConfirm}
        title={deleteArticle?.title || ""}
        author={deleteArticle?.uploadedBy?.name || ""}
        isDeleting={deleting}
      />
    </div>
  );
}
