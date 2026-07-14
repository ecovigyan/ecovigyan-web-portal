"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  Truck, 
  ShieldCheck, 
  ArrowRight, 
  Sparkles, 
  Loader2, 
  Leaf, 
  AlertCircle 
} from "lucide-react";

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [error, setError] = useState(null);

  const categories = [
    { id: "all", label: "All Items", icon: Leaf },
    { id: "kits", label: "Grow Kits", icon: Sparkles },
    { id: "mushrooms", label: "Mushrooms & Extract", icon: Leaf },
    { id: "merch", label: "Merchandise", icon: ShoppingBag },
    { id: "education", label: "Educational Media", icon: ShieldCheck }
  ];

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const queryParams = new URLSearchParams();
      if (category && category !== "all") queryParams.append("category", category);
      if (search) queryParams.append("search", search);

      const res = await fetch(`/api/products?${queryParams.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setProducts(data.products || []);
      } else {
        throw new Error(data.error || "Failed to fetch products");
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [category]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProducts();
  };

  return (
    <div className="min-h-screen bg-[#F9FAF8] font-sans selection:bg-emerald-200 selection:text-emerald-900">
      {/* Hero Header Banner */}
      <section className="relative pt-32 pb-20 bg-gradient-to-b from-emerald-800 to-emerald-950 overflow-hidden">
        {/* Background shapes */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 rounded-full bg-emerald-400 blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-amber-400 blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-700/60 text-emerald-300 text-sm font-semibold mb-6 border border-emerald-600/40">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Eco Vigyan Foundation Store
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold font-serif text-white mb-6 tracking-tight leading-tight">
              Cultivate, Learn, and <span className="text-emerald-400">Co-Exist</span>
            </h1>
            <p className="text-lg md:text-xl text-emerald-100/90 max-w-3xl mx-auto leading-relaxed font-light">
              Every purchase directly supports our environmental conservation and community mushroom-growing programs in the Himalayan foothills.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Feature Badges Banner */}
      <div className="bg-white border-b border-emerald-100 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center gap-4 p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100/40">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-emerald-600/20">
                <Leaf className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-emerald-950 text-base">100% Sustainable</h4>
                <p className="text-sm text-emerald-800/70">Organic, bio-friendly and ethically sourced materials.</p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-4 p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100/40">
              <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-amber-500/20">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-emerald-950 text-base">Flat Shipping Fees</h4>
                <p className="text-sm text-emerald-800/70">Reasonable shipping fee dynamically calculated per product.</p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-4 p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100/40">
              <div className="w-12 h-12 rounded-xl bg-teal-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-teal-600/20">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-emerald-950 text-base">Supports a Cause</h4>
                <p className="text-sm text-emerald-800/70">100% of store profits directly fund school & village projects.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Catalog Section */}
      <section className="py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Controls: Search and Filters */}
          <div className="flex flex-col md:flex-row gap-6 justify-between items-center mb-10">
            {/* Category Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2 w-full md:w-auto scrollbar-none">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={`flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-300 border ${
                      isSelected
                        ? "bg-emerald-800 text-white border-emerald-800 shadow-md shadow-emerald-800/20"
                        : "bg-white text-emerald-900 border-emerald-100 hover:border-emerald-300"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 border border-emerald-100 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white text-sm text-emerald-950"
              />
              <button type="submit" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600 hover:text-emerald-800">
                <Search className="w-5 h-5" />
              </button>
            </form>
          </div>

          {/* Catalog Grid */}
          {loading ? (
            <div className="py-24 text-center">
              <Loader2 className="w-12 h-12 animate-spin text-emerald-700 mx-auto mb-4" />
              <p className="text-emerald-800 font-medium">Loading catalog items...</p>
            </div>
          ) : error ? (
            <div className="py-12 bg-red-50 border border-red-200 rounded-3xl p-8 max-w-lg mx-auto text-center">
              <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <h3 className="font-bold text-lg text-red-950 mb-2">Error loading products</h3>
              <p className="text-sm text-red-800/80 mb-6">{error}</p>
              <button 
                onClick={fetchProducts} 
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl"
              >
                Try Again
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="py-24 text-center bg-white rounded-3xl border border-emerald-100/50 shadow-sm max-w-2xl mx-auto px-6">
              <ShoppingBag className="w-16 h-16 text-emerald-600/30 mx-auto mb-4" />
              <h3 className="font-bold text-xl text-emerald-950 mb-2">No Products Found</h3>
              <p className="text-emerald-800/60 max-w-md mx-auto mb-6">
                We couldn't find any products matching your selection. Try clearing your filters or search terms.
              </p>
              <button
                onClick={() => {
                  setCategory("all");
                  setSearch("");
                }}
                className="px-6 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-full text-sm shadow-lg shadow-emerald-800/10"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.map((product) => (
                <Link key={product._id} href={`/products/${product._id}`}>
                  <motion.div
                    whileHover={{ y: -8 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="group bg-white rounded-3xl overflow-hidden border border-emerald-100/40 shadow-sm hover:shadow-xl hover:border-emerald-200/60 transition-all duration-300 flex flex-col h-full cursor-pointer"
                  >
                    {/* Image Area */}
                    <div className="relative aspect-[4/3] bg-emerald-50/50 overflow-hidden">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {/* Category Label */}
                      <span className="absolute top-4 left-4 px-3 py-1 bg-white/90 backdrop-blur-sm text-[10px] font-black text-emerald-800 rounded-full uppercase tracking-wider shadow-sm border border-emerald-50">
                        {product.category}
                      </span>
                      {product.stock <= 0 && (
                        <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex items-center justify-center">
                          <span className="bg-red-600 text-white font-black text-xs uppercase px-4 py-1.5 rounded-full tracking-wider shadow-lg">
                            Out of Stock
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Description Area */}
                    <div className="p-6 flex flex-col flex-1">
                      <h3 className="text-xl font-bold font-serif text-emerald-950 mb-2 group-hover:text-emerald-700 transition-colors">
                        {product.name}
                      </h3>
                      <p className="text-sm text-emerald-800/70 mb-4 line-clamp-3 leading-relaxed">
                        {product.description}
                      </p>

                      <div className="mt-auto pt-4 border-t border-emerald-50 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-emerald-600/60 uppercase tracking-wider leading-none">Price</p>
                          <span className="text-2xl font-black text-emerald-950">
                            ₹{product.price}
                          </span>
                          {product.shippingFee > 0 && (
                            <span className="text-[11px] text-amber-700 block font-medium mt-0.5">
                              + ₹{product.shippingFee} shipping
                            </span>
                          )}
                        </div>

                        <span className="flex items-center gap-1.5 text-xs font-black uppercase text-emerald-800 bg-emerald-50 border border-emerald-100 group-hover:bg-emerald-800 group-hover:text-white px-4 py-2.5 rounded-full transition-all duration-300 shrink-0">
                          View details
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
