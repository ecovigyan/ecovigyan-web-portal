"use client";

import { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export function ImportExcelModal({ isOpen, onClose, onImport }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (['xlsx', 'xls', 'csv'].includes(fileExtension)) {
        setSelectedFile(file);
      } else {
        toast.error('Please select a valid Excel (.xlsx, .xls) or CSV file');
      }
    }
  };

  const downloadTemplate = async () => {
    const { utils, write } = await import('xlsx');

    const headers = [
      'Photo/Image Link', 'Latitude', 'Longitude',
      'Common Name', 'Scientific Name',
      'Stem Presence', 'Underside', 'Texture',
      'Ecological Role', 'Common Uses',
    ];
    const rows = [
      [
        'https://drive.google.com/file/d/YOUR_FILE_ID/view',
        19.0760, 72.8777,
        'Button Mushroom', 'Agaricus bisporus',
        'has-stem', 'gills', 'soft-to-touch', 'decomposer', 'edible',
      ],
      [
        'https://drive.google.com/file/d/ANOTHER_FILE_ID/view',
        28.6139, 77.2090,
        'Oyster Mushroom', 'Pleurotus ostreatus',
        'has-no-stem', 'gills', 'soft-to-touch', 'decomposer', 'edible',
      ],
    ];

    const ws = utils.aoa_to_sheet([headers, ...rows]);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Mushrooms');

    const buf = write(wb, { type: 'array', bookType: 'xlsx' });
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mushroom_import_template.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success('Template downloaded!');
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error('Please select a file first');
      return;
    }

    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch('/api/admin/import-mushrooms', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Import failed');
      }

      toast.success(
        `Import completed: ${data.results.success} successful, ${data.results.failed} failed`
      );

      if (data.results.errors.length > 0) {
        console.error('Import errors:', data.results.errors);
        const errorPreview = data.results.errors.slice(0, 3).join('\n');
        if (data.results.errors.length > 3) {
          toast.error(
            `Some errors occurred. Check console for details.\n${errorPreview}...`,
            { duration: 6000 }
          );
        } else {
          toast.error(`Errors:\n${errorPreview}`, { duration: 6000 });
        }
      }

      // Call the onImport callback to refresh data
      if (onImport) {
        onImport();
      }
      
      // Reset and close
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onClose();
    } catch (error) {
      console.error('Import error:', error);
      toast.error(error.message || 'Failed to import Excel file. Please check the format.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between rounded-t-2xl z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Import System Data</h2>
                <p className="text-sm text-gray-600 mt-1">Bulk upload reference mushroom data from Excel</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isProcessing}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="px-8 py-6 space-y-6">
            {/* Download Template Button */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-purple-900">Need a template?</h3>
                <p className="text-sm text-purple-700">Download our CSV template with sample data</p>
              </div>
              <button
                onClick={downloadTemplate}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Template
              </button>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Excel or CSV File (.xlsx, .xls, .csv)
              </label>
              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  disabled={isProcessing}
                  className="block w-full text-sm text-gray-900 border border-gray-300 rounded-xl cursor-pointer bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent p-3 disabled:opacity-50"
                />
                {selectedFile && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-purple-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>{selectedFile.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Expected Format Guide */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-purple-900 mb-4">Expected Excel Format:</h3>
              
              <div className="space-y-2 text-sm">
                <p className="text-xs text-purple-600 font-semibold uppercase tracking-wide mb-3">Column order must match exactly — use the template above</p>
                <div className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1.5">
                  <span className="font-bold text-purple-800">Col 1 — Photo/Image Link</span>
                  <span className="text-purple-700">Google Drive sharing URL <span className="text-red-600">*Required</span></span>

                  <span className="font-bold text-purple-800">Col 2 — Latitude</span>
                  <span className="text-purple-700">Decimal format, e.g. 19.0760 <span className="text-red-600">*Required</span></span>

                  <span className="font-bold text-purple-800">Col 3 — Longitude</span>
                  <span className="text-purple-700">Decimal format, e.g. 72.8777 <span className="text-red-600">*Required</span></span>

                  <span className="font-bold text-purple-800">Col 4 — Common Name</span>
                  <span className="text-purple-700">e.g. "Button Mushroom"</span>

                  <span className="font-bold text-purple-800">Col 5 — Scientific Name</span>
                  <span className="text-purple-700">e.g. "Agaricus bisporus"</span>

                  <span className="font-bold text-purple-800">Col 6 — Stem Presence</span>
                  <span className="text-purple-700">"has-stem" or "has-no-stem"</span>

                  <span className="font-bold text-purple-800">Col 7 — Underside</span>
                  <span className="text-purple-700">"gills", "pores", "teeth"</span>

                  <span className="font-bold text-purple-800">Col 8 — Texture</span>
                  <span className="text-purple-700">"soft-to-touch", "hard-to-touch", "jelly-like", "leathery"</span>

                  <span className="font-bold text-purple-800">Col 9 — Ecological Role</span>
                  <span className="text-purple-700">"decomposer", "symbiont", "parasite"</span>

                  <span className="font-bold text-purple-800">Col 10 — Common Uses</span>
                  <span className="text-purple-700">"edible", "inedible", "poisonous", "medicinal"</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-purple-200">
                <p className="text-sm text-purple-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span><strong>System Imports:</strong> All imported observations are automatically approved, assigned to system@ecovigyan.org, and can be filtered separately in the dashboard.</span>
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-8 py-4 flex items-center justify-end gap-3 rounded-b-2xl">
            <button
              onClick={handleClose}
              disabled={isProcessing}
              className="px-6 py-2.5 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!selectedFile || isProcessing}
              className="px-6 py-2.5 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {isProcessing ? 'Importing...' : 'Import'}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
