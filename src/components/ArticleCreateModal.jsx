"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, FileText, AlertCircle } from "lucide-react";
import Image from "next/image";
import ArticleRichTextEditor from "@/components/ArticleRichTextEditor";
import { getArticleTextLength } from "@/lib/articleContent.shared";
import {
  ARTICLE_CONTENT_MAX_LENGTH,
  ARTICLE_CONTENT_MIN_LENGTH,
  ARTICLE_TITLE_MAX_LENGTH,
  ARTICLE_TITLE_MIN_LENGTH,
} from "@/lib/articleValidation";

export default function ArticleCreateModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  editData = null,
  isEditing = false,
  isSubmitting = false 
}) {
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    image1: null,
    image1Preview: null,
    image2: null,
    image2Preview: null,
  });

  const [errors, setErrors] = useState({});

  // Load edit data when editing
  useEffect(() => {
    if (editData && isEditing) {
      setFormData({
        title: editData.title || "",
        content: editData.content || "",
        image1: null,
        image1Preview: editData.images?.[0]?.url || null,
        image2: null,
        image2Preview: editData.images?.[1]?.url || null,
      });
    } else if (!isOpen) {
      // Reset form when modal closes
      setFormData({
        title: "",
        content: "",
        image1: null,
        image1Preview: null,
        image2: null,
        image2Preview: null,
      });
      setErrors({});
    }
  }, [editData, isEditing, isOpen]);

  const validateForm = () => {
    const newErrors = {};
    const contentLength = getArticleTextLength(formData.content);

    // Title validation
    if (formData.title.length < ARTICLE_TITLE_MIN_LENGTH) {
      newErrors.title = `Title must be at least ${ARTICLE_TITLE_MIN_LENGTH} characters`;
    } else if (formData.title.length > ARTICLE_TITLE_MAX_LENGTH) {
      newErrors.title = `Title cannot exceed ${ARTICLE_TITLE_MAX_LENGTH} characters`;
    }

    // Content validation
    if (contentLength < ARTICLE_CONTENT_MIN_LENGTH) {
      newErrors.content = `Content must be at least ${ARTICLE_CONTENT_MIN_LENGTH} characters`;
    } else if (contentLength > ARTICLE_CONTENT_MAX_LENGTH) {
      newErrors.content = `Content cannot exceed ${ARTICLE_CONTENT_MAX_LENGTH.toLocaleString()} characters`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleImageSelect = (e, imageNumber) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setErrors(prev => ({ 
        ...prev, 
        [`image${imageNumber}`]: "Please select a JPEG, PNG, or WebP image" 
      }));
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrors(prev => ({ 
        ...prev, 
        [`image${imageNumber}`]: "Image size must be less than 10MB" 
      }));
      return;
    }

    // Clear any previous error
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[`image${imageNumber}`];
      return newErrors;
    });

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      if (imageNumber === 1) {
        setFormData(prev => ({
          ...prev,
          image1: file,
          image1Preview: reader.result,
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          image2: file,
          image2Preview: reader.result,
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (imageNumber) => {
    if (imageNumber === 1) {
      setFormData(prev => ({
        ...prev,
        image1: null,
        image1Preview: null,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        image2: null,
        image2Preview: null,
      }));
    }
  };

  if (!isOpen) return null;

  const titleCharCount = formData.title.length;
  const contentCharCount = getArticleTextLength(formData.content);
  const titleColor = titleCharCount < ARTICLE_TITLE_MIN_LENGTH || titleCharCount > ARTICLE_TITLE_MAX_LENGTH ? "text-red-600" : "text-emerald-600";
  const contentColor = contentCharCount < ARTICLE_CONTENT_MIN_LENGTH || contentCharCount > ARTICLE_CONTENT_MAX_LENGTH ? "text-red-600" : "text-emerald-600";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center sm:p-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92dvh] sm:max-h-[90dvh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white font-serif">
                    {isEditing ? "Edit Article" : "Write New Article"}
                  </h2>
                  <p className="text-emerald-100 text-sm">
                    Share environmental insights and stories
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Form */}
          <div className="p-8 flex-1 overflow-y-auto">
            <div className="space-y-6">
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
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-colors ${
                    errors.title
                      ? "border-red-300 focus:border-red-500"
                      : "border-gray-200 focus:border-emerald-500"
                  }`}
                  maxLength={ARTICLE_TITLE_MAX_LENGTH}
                />
                {errors.title && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.title}
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
                <div
                  className={`rounded-2xl transition-colors ${
                    errors.content ? "ring-2 ring-red-300" : ""
                  }`}
                >
                  <ArticleRichTextEditor
                    value={formData.content}
                    onChange={(content) => setFormData({ ...formData, content })}
                    placeholder="Paste from Word or write your article content here..."
                    disabled={isSubmitting}
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  You can paste directly from Microsoft Word or import a `.docx` file. Headings, colors, bold text, and lists will be preserved where possible.
                </p>
                {errors.content && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.content}
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
                      onClick={() => handleRemoveImage(1)}
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
                {errors.image1 && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.image1}
                  </p>
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
                      onClick={() => handleRemoveImage(2)}
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
                {errors.image2 && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.image2}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-8 pb-8 pt-4 border-t border-gray-200 flex gap-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
                disabled={
                  isSubmitting ||
                  titleCharCount < ARTICLE_TITLE_MIN_LENGTH ||
                  titleCharCount > ARTICLE_TITLE_MAX_LENGTH ||
                  contentCharCount < ARTICLE_CONTENT_MIN_LENGTH ||
                  contentCharCount > ARTICLE_CONTENT_MAX_LENGTH
                }
              className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {isEditing ? "Updating..." : "Publishing..."}
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  {isEditing ? "Update Article" : "Publish Article"}
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
