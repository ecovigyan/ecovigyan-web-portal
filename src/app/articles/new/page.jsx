"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import { BookOpen, X, Upload, ArrowLeft, FileText, AlertCircle } from "lucide-react";
import {
  ARTICLE_CONTENT_MAX_LENGTH,
  ARTICLE_CONTENT_MIN_LENGTH,
  ARTICLE_TITLE_MAX_LENGTH,
  ARTICLE_TITLE_MIN_LENGTH,
} from "@/lib/articleValidation";

export default function NewArticlePage() {
  const router = useRouter();
  const { isWriterOrAdmin, loading: authLoading } = useAuth();

  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    image1: null,
    image1Preview: null,
    image2: null,
    image2Preview: null,
  });

  // Redirect if not authorized
  React.useEffect(() => {
    if (!authLoading && !isWriterOrAdmin()) {
      toast.error("Only writers and admins can upload articles");
      router.push("/articles");
    }
  }, [authLoading, isWriterOrAdmin, router]);

  // Handle image selection
  const handleImageSelect = (e, imageNumber) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please select a JPEG, PNG, or WebP image");
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image size must be less than 10MB");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      if (imageNumber === 1) {
        setFormData({
          ...formData,
          image1: file,
          image1Preview: reader.result,
        });
      } else {
        setFormData({
          ...formData,
          image2: file,
          image2Preview: reader.result,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // Remove image
  const removeImage = (imageNumber) => {
    if (imageNumber === 1) {
      setFormData({
        ...formData,
        image1: null,
        image1Preview: null,
      });
    } else {
      setFormData({
        ...formData,
        image2: null,
        image2Preview: null,
      });
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error("Title and content are required");
      return;
    }

    if (formData.title.trim().length < ARTICLE_TITLE_MIN_LENGTH || formData.title.trim().length > ARTICLE_TITLE_MAX_LENGTH) {
      toast.error(`Title must be between ${ARTICLE_TITLE_MIN_LENGTH} and ${ARTICLE_TITLE_MAX_LENGTH} characters`);
      return;
    }

    if (formData.content.trim().length < ARTICLE_CONTENT_MIN_LENGTH || formData.content.trim().length > ARTICLE_CONTENT_MAX_LENGTH) {
      toast.error(`Content must be between ${ARTICLE_CONTENT_MIN_LENGTH} and ${ARTICLE_CONTENT_MAX_LENGTH} characters`);
      return;
    }

    setUploading(true);
    try {
      const submitFormData = new FormData();
      submitFormData.append("title", formData.title.trim());
      submitFormData.append("content", formData.content.trim());

      if (formData.image1) {
        submitFormData.append("image1", formData.image1);
      }
      if (formData.image2) {
        submitFormData.append("image2", formData.image2);
      }

      const res = await fetch("/api/articles/upload", {
        method: "POST",
        body: submitFormData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      toast.success("Article published successfully!");

      // Redirect to articles page
      setTimeout(() => {
        router.push("/articles");
      }, 1000);
    } catch (error) {
      toast.error(error.message || "Failed to publish article");
    } finally {
      setUploading(false);
    }
  };

  const titleCharCount = formData.title.length;
  const contentCharCount = formData.content.length;
  const titleColor = titleCharCount < ARTICLE_TITLE_MIN_LENGTH || titleCharCount > ARTICLE_TITLE_MAX_LENGTH ? "text-red-600" : "text-emerald-600";
  const contentColor = contentCharCount < ARTICLE_CONTENT_MIN_LENGTH || contentCharCount > ARTICLE_CONTENT_MAX_LENGTH ? "text-red-600" : "text-emerald-600";

  // Show loading or unauthorized message
  if (authLoading) {
    return (
      <main className="min-h-screen bg-stone-50 flex items-center justify-center">
        <p className="text-slate-400 font-bold">Loading...</p>
      </main>
    );
  }

  if (!isWriterOrAdmin()) {
    return null; // Will redirect
  }

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
            <Link
              href="/articles"
              className="inline-flex items-center gap-2 text-emerald-100 hover:text-white mb-6 transition-colors font-semibold"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Articles
            </Link>
            
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-white/90 text-sm font-medium mb-6">
              <FileText className="w-4 h-4" />
              <span>Create Content</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 font-serif">
              WRITE NEW ARTICLE
            </h1>
            <p className="text-xl md:text-2xl text-emerald-50 max-w-4xl mx-auto leading-relaxed">
              Share your environmental insights and stories with the community
            </p>
          </motion.div>
        </div>
      </section>

      {/* Form Section */}
      <section className="py-20 bg-gradient-to-b from-white to-emerald-50/30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            onSubmit={handleSubmit}
            className="bg-white rounded-3xl shadow-xl border border-emerald-100 p-8 space-y-6"
          >
            {/* Title */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-gray-700">
                  Title <span className="text-red-500">*</span>
                </label>
                <span className={`text-xs font-semibold ${titleColor}`}>
                  {titleCharCount}/{ARTICLE_TITLE_MAX_LENGTH}
                </span>
              </div>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={`Enter article title (${ARTICLE_TITLE_MIN_LENGTH}-${ARTICLE_TITLE_MAX_LENGTH} characters)`}
                required
                minLength={ARTICLE_TITLE_MIN_LENGTH}
                maxLength={ARTICLE_TITLE_MAX_LENGTH}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors"
              />
              {titleCharCount > 0 && titleCharCount < ARTICLE_TITLE_MIN_LENGTH && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {`Title must be at least ${ARTICLE_TITLE_MIN_LENGTH} characters`}
                </p>
              )}
            </div>

            {/* Content */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-gray-700">
                  Content <span className="text-red-500">*</span>
                </label>
                <span className={`text-xs font-semibold ${contentColor}`}>
                  {contentCharCount}/{ARTICLE_CONTENT_MAX_LENGTH.toLocaleString()}
                </span>
              </div>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder={`Write your article content here (${ARTICLE_CONTENT_MIN_LENGTH}-${ARTICLE_CONTENT_MAX_LENGTH.toLocaleString()} characters)...`}
                required
                minLength={ARTICLE_CONTENT_MIN_LENGTH}
                maxLength={ARTICLE_CONTENT_MAX_LENGTH}
                rows={15}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 resize-none transition-colors"
              />
              {contentCharCount > 0 && contentCharCount < ARTICLE_CONTENT_MIN_LENGTH && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {`Content must be at least ${ARTICLE_CONTENT_MIN_LENGTH} characters`}
                </p>
              )}
            </div>

            {/* Image 1 */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">
                Image 1 (Optional)
              </label>
              {formData.image1Preview ? (
                <div className="relative group rounded-xl overflow-hidden border-2 border-gray-200">
                  <div className="relative w-full h-48">
                    <Image
                      src={formData.image1Preview}
                      alt="Preview 1"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeImage(1)}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-emerald-300 rounded-xl cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-all">
                  <Upload className="w-12 h-12 text-emerald-500 mb-2" />
                  <span className="text-sm font-semibold text-emerald-700">
                    Click to upload image
                  </span>
                  <span className="text-xs text-gray-500 mt-1">
                    JPEG, PNG, or WebP (max 10MB)
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={(e) => handleImageSelect(e, 1)}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Image 2 */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">
                Image 2 (Optional)
              </label>
              {formData.image2Preview ? (
                <div className="relative group rounded-xl overflow-hidden border-2 border-gray-200">
                  <div className="relative w-full h-48">
                    <Image
                      src={formData.image2Preview}
                      alt="Preview 2"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeImage(2)}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-emerald-300 rounded-xl cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-all">
                  <Upload className="w-12 h-12 text-emerald-500 mb-2" />
                  <span className="text-sm font-semibold text-emerald-700">
                    Click to upload image
                  </span>
                  <span className="text-xs text-gray-500 mt-1">
                    JPEG, PNG, or WebP (max 10MB)
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={(e) => handleImageSelect(e, 2)}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-4">
              <Link
                href="/articles"
                className={`flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all text-center ${
                  uploading ? "pointer-events-none opacity-50" : ""
                }`}
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={uploading || titleCharCount < ARTICLE_TITLE_MIN_LENGTH || contentCharCount < ARTICLE_CONTENT_MIN_LENGTH || titleCharCount > ARTICLE_TITLE_MAX_LENGTH || contentCharCount > ARTICLE_CONTENT_MAX_LENGTH}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Publish Article
                  </>
                )}
              </button>
            </div>
          </motion.form>
        </div>
      </section>
    </div>
  );
}





