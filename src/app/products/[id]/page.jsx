"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  ShoppingBag, 
  Truck, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle, 
  Loader2, 
  AlertCircle, 
  Plus, 
  Minus,
  MapPin,
  Phone,
  Mail,
  User,
  Heart,
  Upload
} from "lucide-react";
import toast from "react-hot-toast";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Gallery slider state
  const [activeImage, setActiveImage] = useState("");

  // Quantity selector state
  const [quantity, setQuantity] = useState(1);

  // Checkout modal state
  const [showCheckout, setShowCheckout] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);

  // Shipping form fields
  const [shippingForm, setShippingForm] = useState({
    customerName: "",
    customerEmail: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "India",
    paymentMethod: "UPI/QR",
    paymentProof: ""
  });

  const [isUploadingProof, setIsUploadingProof] = useState(false);

  const getSubtotal = () => {
    if (!product) return 0;
    if (product.category === "education" && quantity === 2) {
      return 899;
    }
    return product.price * quantity + product.shippingFee;
  };

  const handleProofUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingProof(true);
      const { uploadToCloudinary } = await import('@/lib/uploadToCloudinary');
      const uploadRes = await uploadToCloudinary(file, { folder: 'payment_proofs' });
      setShippingForm(prev => ({ ...prev, paymentProof: uploadRes.secure_url }));
      toast.success("Payment proof screenshot uploaded successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload payment proof screenshot");
    } finally {
      setIsUploadingProof(false);
    }
  };

  // Pre-fill user data when modal opens or auth changes
  useEffect(() => {
    if (isAuthenticated && user) {
      setShippingForm(prev => ({
        ...prev,
        customerName: user.name || "",
        customerEmail: user.email || ""
      }));
    }
  }, [isAuthenticated, user, showCheckout]);

  // Fetch product detail
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/products/${params.id}`);
        const data = await res.json();
        if (res.ok) {
          setProduct(data.product);
          setActiveImage(data.product.image);
        } else {
          throw new Error(data.error || "Failed to fetch product details");
        }
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (params.id) {
      fetchProduct();
    }
  }, [params.id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setShippingForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();

    // Validation
    const { customerName, customerEmail, phone, street, city, state, zipCode, country, paymentProof } = shippingForm;
    if (!customerName || !customerEmail || !phone || !street || !city || !state || !zipCode || !country) {
      toast.error("Please fill in all checkout fields.");
      return;
    }

    if (!paymentProof) {
      toast.error("Please upload payment proof screenshot first.");
      return;
    }

    try {
      setPlacingOrder(true);
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerEmail,
          phone,
          shippingAddress: { street, city, state, zipCode, country },
          paymentMethod: "UPI/QR",
          paymentProof,
          items: [
            {
              product: product._id,
              quantity: quantity
            }
          ]
        })
      });

      const data = await res.json();

      if (res.ok) {
        setOrderSuccess(data.order);
        toast.success("Order placed successfully!");
        
        // Update local stock count immediately
        setProduct(prev => ({
          ...prev,
          stock: Math.max(0, prev.stock - quantity)
        }));
      } else {
        throw new Error(data.error || "Failed to complete checkout");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message);
    } finally {
      setPlacingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAF8] flex items-center justify-center pt-20">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-700 mx-auto mb-4" />
          <p className="text-emerald-800 font-medium">Retrieving product catalog details...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-[#F9FAF8] pt-32 pb-20">
        <div className="max-w-md mx-auto bg-red-50 border border-red-200 rounded-3xl p-8 text-center shadow-sm">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h3 className="font-bold text-lg text-red-950 mb-2">Failed to load product</h3>
          <p className="text-sm text-red-800/80 mb-6">{error || "Product not found."}</p>
          <button 
            onClick={() => router.push("/products")} 
            className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl text-sm"
          >
            Return to Store
          </button>
        </div>
      </div>
    );
  }

  const galleryImages = [product.image, ...(product.gallery || [])].filter(Boolean);
  const isOutOfStock = product.stock <= 0;

  return (
    <div className="min-h-screen bg-[#F9FAF8] font-sans selection:bg-emerald-200 selection:text-emerald-900 pt-28 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Back Navigation Button */}
        <button
          onClick={() => router.push("/products")}
          className="group inline-flex items-center gap-2 mb-8 px-4 py-2 bg-white hover:bg-emerald-50 border border-emerald-100/50 hover:border-emerald-200 rounded-full text-sm font-semibold text-emerald-900 transition-all shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Store
        </button>

        {/* Product Visual Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 bg-white rounded-[32px] border border-emerald-100/30 shadow-xl overflow-hidden p-6 md:p-10">
          
          {/* LEFT: Image Gallery (5 cols) */}
          <div className="lg:col-span-6 space-y-6">
            {/* Main Visual Display */}
            <div className="relative aspect-[4/3] rounded-3xl bg-emerald-50/30 border border-emerald-50 overflow-hidden shadow-inner">
              <img
                src={activeImage}
                alt={product.name}
                className="w-full h-full object-contain p-4 bg-stone-50/30"
              />
              <span className="absolute top-4 left-4 px-3 py-1 bg-white/90 backdrop-blur-sm text-[10px] font-black text-emerald-800 rounded-full uppercase tracking-wider shadow-sm border border-emerald-50">
                {product.category}
              </span>
              {isOutOfStock && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex items-center justify-center">
                  <span className="bg-red-600 text-white font-black text-xs uppercase px-5 py-2 rounded-full tracking-wider shadow-lg">
                    Out of Stock
                  </span>
                </div>
              )}
            </div>

            {/* Thumbnail Carousel */}
            {galleryImages.length > 1 && (
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
                {galleryImages.map((imgUrl, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveImage(imgUrl)}
                    className={`relative w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all shrink-0 ${
                      activeImage === imgUrl 
                        ? "border-emerald-600 scale-95 shadow-md shadow-emerald-600/10" 
                        : "border-emerald-100 hover:border-emerald-300"
                    }`}
                  >
                    <img src={imgUrl} alt={`Gallery index ${index}`} className="w-full h-full object-contain p-1 bg-stone-50/20" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Content Descriptions (6 cols) */}
          <div className="lg:col-span-6 flex flex-col justify-between">
            <div className="space-y-6">
              {/* Product Badge & Stock Status */}
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold rounded-full uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  Verified Product
                </div>

                {isOutOfStock ? (
                  <span className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-100">
                    Currently Unavailable
                  </span>
                ) : (
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                    In Stock ({product.stock} items)
                  </span>
                )}
              </div>

              {/* Title & Pricing */}
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold font-serif text-emerald-950 tracking-tight leading-tight mb-3">
                  {product.name}
                </h1>
                
                <div className="flex items-baseline gap-4 mt-2">
                  <span className="text-4xl font-black text-emerald-950">
                    ₹{product.price}
                  </span>
                  
                  {product.shippingFee > 0 ? (
                    <span className="flex items-center gap-1 text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200/50 px-3 py-1 rounded-full">
                      <Truck className="w-4 h-4 text-amber-600" />
                      + ₹{product.shippingFee} shipping fee
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/50 px-3 py-1 rounded-full">
                      <Truck className="w-4 h-4 text-emerald-600" />
                      Free Shipping
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="border-t border-emerald-50 pt-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600/70 mb-3">Product Description</h3>
                <p className="text-emerald-950/80 leading-relaxed text-base font-light whitespace-pre-line">
                  {product.description}
                </p>
              </div>

              {/* Specifications */}
              {product.specification && (
                <div className="border-t border-emerald-50 pt-6">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600/70 mb-3">Product Specifications</h3>
                  <div className="bg-emerald-50/20 border border-emerald-100/50 rounded-2xl p-5 text-sm text-emerald-950 font-light space-y-2">
                    {product.specification.split(/[;\n]+/).map(s => s.trim()).filter(Boolean).map((spec, i) => {
                      const parts = spec.split(':');
                      if (parts.length >= 2) {
                        return (
                          <div key={i} className="flex justify-between border-b border-emerald-100/10 pb-2 last:border-0 last:pb-0 gap-4">
                            <span className="font-semibold text-emerald-900/80 capitalize shrink-0">{parts[0].trim()}</span>
                            <span className="text-emerald-955 text-right">{parts.slice(1).join(':').trim()}</span>
                          </div>
                        );
                      }
                      return (
                        <div key={i} className="text-emerald-900/80 border-b border-emerald-100/10 pb-2 last:border-0 last:pb-0">
                          {spec.trim()}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Features List */}
              {product.features && product.features.length > 0 && (
                <div className="border-t border-emerald-50 pt-6 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600/70 mb-1">Key Highlights</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {product.features.map((feature, index) => (
                      <div key={index} className="flex gap-2.5 items-start">
                        <CheckCircle className="w-4 h-4 text-emerald-600 mt-1 shrink-0" />
                        <span className="text-sm font-medium text-emerald-900/90 leading-snug">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Cart Selector / Buy Action Button */}
            <div className="border-t border-emerald-50 pt-8 mt-8 space-y-6">
              {!isOutOfStock && (
                <div className="flex items-center gap-6">
                  <span className="text-sm font-bold text-emerald-900 uppercase tracking-wider">Quantity</span>
                  <div className="flex items-center bg-emerald-50 border border-emerald-100 rounded-full px-2 py-1">
                    <button
                      onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                      className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-emerald-100 text-emerald-950 font-black text-lg transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-10 text-center font-bold text-emerald-950">{quantity}</span>
                    <button
                      onClick={() => setQuantity(prev => Math.min(Math.min(product.stock, 2), prev + 1))}
                      className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-emerald-100 text-emerald-955 font-black text-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-sm font-medium text-emerald-600/70 italic">
                    Subtotal: ₹{getSubtotal()}
                  </span>
                </div>
              )}

              <div className="flex gap-4">
                {isOutOfStock ? (
                  <button
                    disabled
                    className="w-full bg-gray-100 text-gray-400 py-4.5 rounded-full font-bold text-base cursor-not-allowed text-center uppercase tracking-wider border border-gray-200"
                  >
                    Out of Stock
                  </button>
                ) : (
                  <button
                    onClick={() => setShowCheckout(true)}
                    className="w-full bg-emerald-800 hover:bg-emerald-900 text-white py-4.5 rounded-full font-bold text-base shadow-xl shadow-emerald-800/10 hover:shadow-emerald-800/20 active:scale-98 transition-all flex items-center justify-center gap-3 uppercase tracking-wider"
                  >
                    <ShoppingBag className="w-5 h-5" />
                    Order Now (Scan & Pay)
                  </button>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* CHECKOUT MODAL DRAWER */}
      <AnimatePresence>
        {showCheckout && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !orderSuccess && setShowCheckout(false)}
              className="fixed inset-0 bg-emerald-950/40 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <div className="flex min-h-screen items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 30 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl border border-emerald-100 overflow-hidden z-10"
              >
                {!orderSuccess ? (
                  // CHECKOUT FORM
                  <form onSubmit={handleCheckoutSubmit} className="flex flex-col">
                    {/* Header */}
                    <div className="p-6 md:p-8 bg-gradient-to-r from-emerald-800 to-emerald-900 text-white">
                      <h3 className="text-2xl font-bold font-serif mb-2">Order Details</h3>
                      <p className="text-emerald-100/80 text-sm font-light">
                        Complete your purchase details below. We accept Cash on Delivery (COD) for convenience.
                      </p>
                    </div>

                    <div className="p-6 md:p-8 space-y-6 max-h-[60vh] overflow-y-auto">
                      
                      {/* Order Summary Item */}
                      <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-2xl p-4 flex gap-4 items-center">
                        <img src={product.image} className="w-16 h-16 rounded-xl object-cover border border-emerald-100" alt={product.name} />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-emerald-950 truncate text-base">{product.name}</h4>
                          <p className="text-sm text-emerald-800/70 font-semibold">Qty: {quantity} × ₹{product.price}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Total amount</p>
                          <p className="text-xl font-black text-emerald-950">₹{getSubtotal()}</p>
                          <p className="text-[10px] text-amber-700 italic">
                            {product.category === "education" && quantity === 2 ? "Special Bundle Pricing (Incl. shipping)" : `Incl. ₹${product.shippingFee} shipping`}
                          </p>
                        </div>
                      </div>

                      {/* Customer Fields */}
                      <div className="space-y-4">
                        <h4 className="font-bold text-sm text-emerald-800 uppercase tracking-wider">Contact Information</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="relative">
                            <label className="block text-xs font-bold text-emerald-900 mb-1.5 uppercase">Full Name</label>
                            <div className="relative">
                              <input
                                type="text"
                                name="customerName"
                                required
                                value={shippingForm.customerName}
                                onChange={handleInputChange}
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-700 text-sm bg-gray-50/50"
                              />
                              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-700/60" />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-emerald-900 mb-1.5 uppercase">Email Address</label>
                            <div className="relative">
                              <input
                                type="email"
                                name="customerEmail"
                                required
                                value={shippingForm.customerEmail}
                                onChange={handleInputChange}
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-700 text-sm bg-gray-50/50"
                              />
                              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-700/60" />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-emerald-900 mb-1.5 uppercase">Phone Number</label>
                          <div className="relative">
                            <input
                              type="tel"
                              name="phone"
                              required
                              placeholder="e.g. +91 98765 43210"
                              value={shippingForm.phone}
                              onChange={handleInputChange}
                              className="w-full pl-10 pr-4 py-3 rounded-xl border border-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-700 text-sm bg-gray-50/50"
                            />
                            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-700/60" />
                          </div>
                        </div>
                      </div>

                      {/* Shipping Address Fields */}
                      <div className="space-y-4 border-t border-emerald-50 pt-6">
                        <h4 className="font-bold text-sm text-emerald-800 uppercase tracking-wider">Shipping Address</h4>
                        
                        <div>
                          <label className="block text-xs font-bold text-emerald-900 mb-1.5 uppercase">Street Address</label>
                          <div className="relative">
                            <input
                              type="text"
                              name="street"
                              required
                              placeholder="House/Apartment no., Street name, Area"
                              value={shippingForm.street}
                              onChange={handleInputChange}
                              className="w-full pl-10 pr-4 py-3 rounded-xl border border-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-700 text-sm bg-gray-50/50"
                            />
                            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-700/60" />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="col-span-2">
                            <label className="block text-xs font-bold text-emerald-900 mb-1.5 uppercase">City</label>
                            <input
                              type="text"
                              name="city"
                              required
                              value={shippingForm.city}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 rounded-xl border border-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-700 text-sm bg-gray-50/50"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-emerald-900 mb-1.5 uppercase">State</label>
                            <input
                              type="text"
                              name="state"
                              required
                              value={shippingForm.state}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 rounded-xl border border-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-700 text-sm bg-gray-50/50"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-emerald-900 mb-1.5 uppercase">Zip Code</label>
                            <input
                              type="text"
                              name="zipCode"
                              required
                              value={shippingForm.zipCode}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 rounded-xl border border-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-700 text-sm bg-gray-50/50"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Payment Method Display */}
                      <div className="border-t border-emerald-50 pt-6 space-y-4">
                        <label className="block text-xs font-bold text-emerald-900 mb-2 uppercase">Payment Details (UPI Scan & Pay)</label>
                        
                        <div className="bg-emerald-50/30 border border-emerald-100/50 rounded-2xl p-5 text-center space-y-4">
                          <p className="text-xs text-emerald-800 font-semibold max-w-sm mx-auto leading-relaxed">
                            Scan the QR code below using any UPI app (GPay, PhonePe, Paytm, etc.) and pay the subtotal amount: <span className="font-extrabold text-emerald-955 text-sm">₹{getSubtotal()}</span>
                          </p>

                          <img
                            src="/images/qr.png"
                            alt="UPI QR Code for Eco Vigyan Foundation"
                            className="w-48 h-48 mx-auto object-contain border border-emerald-200 p-2 bg-white rounded-2xl shadow-sm"
                          />

                          <div className="space-y-3 pt-2">
                            <label className="block text-xs font-bold text-emerald-900 uppercase">Upload Transaction Payment Receipt Screenshot</label>
                            <div className="flex flex-col items-center gap-3">
                              {shippingForm.paymentProof ? (
                                <div className="relative w-28 h-28 rounded-xl overflow-hidden border border-emerald-250 bg-white shadow-sm shrink-0">
                                  <img src={shippingForm.paymentProof} className="w-full h-full object-cover" alt="Payment receipt proof" />
                                  <button
                                    type="button"
                                    onClick={() => setShippingForm(prev => ({ ...prev, paymentProof: "" }))}
                                    className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 text-xs font-bold shadow-md"
                                    title="Choose another file"
                                  >
                                    ×
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleProofUpload}
                                    className="hidden"
                                    id="checkout-payment-proof-upload"
                                    disabled={isUploadingProof}
                                  />
                                  <label
                                    htmlFor="checkout-payment-proof-upload"
                                    className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold rounded-xl border border-emerald-600 cursor-pointer shadow-md shadow-emerald-700/10 transition-all active:scale-[0.98]"
                                  >
                                    {isUploadingProof ? (
                                      <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Uploading Screenshot...
                                      </>
                                    ) : (
                                      <>
                                        <Upload className="w-4 h-4" />
                                        Upload Payment Receipt File
                                      </>
                                    )}
                                  </label>
                                </>
                              )}
                              <p className="text-[10px] text-emerald-800/60 font-semibold italic text-center">Screenshots will be uploaded securely using Cloudinary storage.</p>
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 bg-emerald-50/50 border-t border-emerald-100 flex gap-4 justify-end">
                      <button
                        type="button"
                        onClick={() => setShowCheckout(false)}
                        disabled={placingOrder || isUploadingProof}
                        className="px-6 py-3 border border-emerald-100 hover:bg-emerald-50 text-emerald-900 font-bold rounded-full text-sm disabled:opacity-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={placingOrder || isUploadingProof || !shippingForm.paymentProof}
                        className="px-8 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-full text-sm disabled:opacity-50 transition-colors flex items-center gap-2 shadow-lg shadow-emerald-800/10"
                      >
                        {placingOrder ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Placing Order...
                          </>
                        ) : (
                          "Place Order"
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  // SUCCESS SCREEN
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-8 text-center space-y-6"
                  >
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-700 shadow-inner">
                      <CheckCircle className="w-12 h-12" />
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-3xl font-bold font-serif text-emerald-950">Thank you for your order!</h3>
                      <p className="text-emerald-800/70 max-w-md mx-auto text-sm leading-relaxed">
                        Your order has been recorded successfully. We will ship your organic products shortly. A confirmation reference is details below.
                      </p>
                    </div>

                    {/* Order Reference Details */}
                    <div className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-2xl text-left max-w-md mx-auto space-y-2.5 text-sm text-emerald-950 font-medium">
                      <div className="flex justify-between border-b border-emerald-100 pb-2">
                        <span className="text-emerald-700/60 uppercase text-xs font-bold">Order ID</span>
                        <span className="font-bold text-gray-900 select-all">{orderSuccess._id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Items Ordered</span>
                        <span>{quantity} × {product.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Customer Name</span>
                        <span>{orderSuccess.customerName}</span>
                      </div>
                      <div className="flex justify-between border-t border-emerald-100/50 pt-2 font-bold text-base">
                        <span className="text-emerald-900">Amount to Pay (COD)</span>
                        <span className="text-emerald-800 font-extrabold">₹{orderSuccess.totalAmount}</span>
                      </div>
                    </div>

                    <div className="pt-4">
                      <button
                        onClick={() => {
                          setShowCheckout(false);
                          setOrderSuccess(null);
                          setQuantity(1);
                        }}
                        className="px-8 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-full text-sm shadow-lg shadow-emerald-800/10 transition-colors uppercase tracking-wider"
                      >
                        Continue Shopping
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
