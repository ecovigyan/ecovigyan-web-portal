"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Loader } from "lucide-react";

export default function ArtworkUploadModal({
  isOpen,
  onClose,
  onSubmit,
  editData = null,
  isEditing = false,
}) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    imageUrl: "",
    category: "Nature Art",
    studentName: "",
    schoolName: "",
    program: "",
    year: new Date().getFullYear().toString(),
    theme: "",
  });
  const [isUploading, setIsUploading] = useState(false);

  const categories = [
    "Nature Art",
    "Recycled Materials",
    "Paintings",
    "Posters",
    "Collage",
    "Mixed Media",
  ];

  const programs = [
    "Wipro Earthian Program",
    "Chemical Free Living Series",
    "Mastering Solid Waste Management",
    "Smart Ways of Handling Post-Harvest Losses",
    "Nature Based Learning",
    "Nurturing Native Trees",
    "Other",
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
    if (!isEditing) {
      setFormData({
        title: "",
        description: "",
        imageUrl: "",
        category: "Nature Art",
        studentName: "",
        schoolName: "",
        program: "",
        year: new Date().getFullYear().toString(),
        theme: "",
      });
    }
    onClose();
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, imageUrl: reader.result });
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  // Update form data when editData changes
  useEffect(() => {
    if (editData) {
      setFormData(editData);
    } else {
      setFormData({
        title: "",
        description: "",
        imageUrl: "",
        category: "Nature Art",
        studentName: "",
        schoolName: "",
        program: "",
        year: new Date().getFullYear().toString(),
        theme: "",
      });
    }
  }, [editData, isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4">
        <div className="w-full flex items-end sm:items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-3xl w-full max-h-[92dvh] sm:max-h-[90dvh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 rounded-t-3xl flex-shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white font-serif">
                  {isEditing ? "Edit Artwork" : "Upload New Artwork"}
                </h2>
                <button
                  onClick={onClose}
                  type="button"
                  className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Form - Scrollable */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="p-8 space-y-6">
                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Artwork Image *
                  </label>
                  <div className="relative">
                    {formData.imageUrl ? (
                      <div className="relative aspect-video rounded-xl overflow-hidden border-4 border-emerald-100">
                        <img
                          src={formData.imageUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({ ...formData, imageUrl: "" })
                          }
                          className="absolute top-3 right-3 w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center aspect-video border-4 border-dashed border-emerald-200 rounded-xl cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-all">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        {isUploading ? (
                          <Loader className="w-12 h-12 text-emerald-500 animate-spin mb-3" />
                        ) : (
                          <Upload className="w-12 h-12 text-emerald-500 mb-3" />
                        )}
                        <span className="text-emerald-700 font-semibold">
                          {isUploading
                            ? "Uploading..."
                            : "Click to upload image"}
                        </span>
                        <span className="text-sm text-gray-500 mt-1">
                          PNG, JPG up to 10MB
                        </span>
                      </label>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Or paste an image URL in the field below
                  </p>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, imageUrl: e.target.value })
                    }
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none mt-2"
                  />
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Artwork Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="e.g., Butterfly Symphony"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Describe the artwork, materials used, and its environmental message..."
                    rows={4}
                    maxLength={500}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.description.length}/500 characters
                  </p>
                </div>

                {/* Two Column Layout */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Category */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="">Select a category</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Year */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Year
                    </label>
                    <input
                      type="text"
                      value={formData.year}
                      onChange={(e) =>
                        setFormData({ ...formData, year: e.target.value })
                      }
                      placeholder="2024"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* Student Name */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Student/Artist Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.studentName}
                      onChange={(e) =>
                        setFormData({ ...formData, studentName: e.target.value })
                      }
                      placeholder="e.g., Wipro Earthian Team"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* School */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      School *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.schoolName}
                      onChange={(e) =>
                        setFormData({ ...formData, schoolName: e.target.value })
                      }
                      placeholder="e.g., GGSS SAMBOG SHIMLA"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* Program */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Program
                    </label>
                    <select
                      value={formData.program}
                      onChange={(e) =>
                        setFormData({ ...formData, program: e.target.value })
                      }
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="">Select a program</option>
                      {programs.map((prog) => (
                        <option key={prog} value={prog}>
                          {prog}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Theme */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Theme
                    </label>
                    <input
                      type="text"
                      value={formData.theme}
                      onChange={(e) =>
                        setFormData({ ...formData, theme: e.target.value })
                      }
                      placeholder="e.g., Biodiversity & Nature Care"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!formData.imageUrl || !formData.studentName || !formData.schoolName}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-200"
                  >
                    {isEditing ? "Save Changes" : "Upload Artwork"}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
