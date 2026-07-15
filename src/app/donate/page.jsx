"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Sprout, Mountain, Recycle, Leaf, FlaskConical, TreePine, Shield, Mail, Phone, Heart, Star, Award, Users, Building2, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';

export default function DonatePage() {
  const [copiedField, setCopiedField] = useState(null);

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const impactPoints = [
    {
      icon: Sprout,
      text: "Children grow into environmental leaders through stronger eco-clubs.",
      color: "from-emerald-500 to-emerald-600",
      bgColor: "from-emerald-50 to-emerald-100/50"
    },
    {
      icon: Mountain,
      text: "Fragile Himalayan ecosystems get the care and protection they need.",
      color: "from-teal-500 to-teal-600",
      bgColor: "from-teal-50 to-teal-100/50"
    },
    {
      icon: Recycle,
      text: "Communities learn to manage waste more responsibly.",
      color: "from-green-500 to-green-600",
      bgColor: "from-green-50 to-green-100/50"
    },
    {
      icon: Leaf,
      text: "School mushroom gardens add nutrition and hands-on learning.",
      color: "from-amber-500 to-amber-600",
      bgColor: "from-amber-50 to-amber-100/50"
    },
    {
      icon: FlaskConical,
      text: "Families discover safer, chemical-free ways of living.",
      color: "from-lime-500 to-lime-600",
      bgColor: "from-lime-50 to-lime-100/50"
    },
    {
      icon: TreePine,
      text: "Fungal mapping helps us understand and protect nature better.",
      color: "from-emerald-600 to-emerald-700",
      bgColor: "from-emerald-50 to-emerald-100/50"
    }
  ];

  const trustIndicators = [
    { icon: Shield, text: "80G Tax Exemption", subtext: "CIN: U85300HP2023NPL009540" },
    { icon: Award, text: "Registered Non-Profit", subtext: "Transparent & Accountable" },
    { icon: Users, text: "Community Impact", subtext: "15+ Schools & Communities" },
    { icon: Building2, text: "HDFC Bank Partnership", subtext: "Secure Transactions" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-50 font-sans selection:bg-emerald-200 selection:text-emerald-900">
      
      {/* Compact Header */}
      <section className="relative pt-32 pb-20 bg-gradient-to-b from-emerald-700 to-emerald-800 overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-600/50 text-white text-sm font-semibold mb-6">
              <Sparkles className="w-4 h-4" />
              Support Our Mission
            </div>

            <h1 className="text-5xl md:text-6xl font-bold font-serif text-white mb-6">
              Support Our Mission
            </h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
              Your contribution powers ecological education and conservation across the Himalayas
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section id="donate-now" className="py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8 md:gap-12">
            
            {/* Left Column - Impact */}
            <div className="space-y-8">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="bg-gradient-to-br from-orange-50 via-white to-emerald-50 rounded-3xl p-8 md:p-10 border-2 border-orange-200/50 shadow-xl"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center">
                    <span className="text-2xl">🧡</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold font-serif text-emerald-950">
                    You Give. The Planet Wins
                  </h2>
                </div>
                
                <p className="text-emerald-800/80 text-lg mb-8 leading-relaxed">
                  When you donate, you're not just supporting a cause — you're helping real change happen. Because of you:
                </p>

                <div className="space-y-4">
                  {impactPoints.map((point, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      className="flex gap-4 items-start group hover:bg-white/60 p-4 rounded-2xl transition-all"
                    >
                      <div className={`w-12 h-12 bg-gradient-to-br ${point.color} rounded-xl flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform`}>
                        <point.icon className="w-6 h-6 text-white" />
                      </div>
                      <p className="text-emerald-900/80 leading-relaxed pt-2">
                        {point.text}
                      </p>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-8 pt-8 border-t-2 border-emerald-200/50">
                  <p className="text-emerald-700 italic text-center font-medium text-lg">
                    Your support touches classrooms, communities, and ecosystems — thank you for making this possible. 💚
                  </p>
                </div>
              </motion.div>

              {/* Tax Exempt Notice */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-3xl p-8 text-white shadow-xl border-2 border-emerald-500"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shrink-0">
                    <Shield className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold font-serif mb-3">Your Donation is Tax-Exempt!</h3>
                    <p className="text-emerald-50/90 leading-relaxed">
                      Eco Vigyan Foundation (CIN: U85300HP2023NPL009540) is a registered non-profit. Your generous donations are exempt from tax under <strong>Section 80G</strong> of the Indian Tax Act.
                    </p>
                    <p className="text-emerald-100 text-sm mt-3">
                      You will receive your official 80G receipt via email shortly after your contribution.
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Contact Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="bg-white rounded-3xl p-8 shadow-xl border-2 border-emerald-100"
              >
                <h3 className="text-2xl font-bold font-serif text-emerald-950 mb-6">Need Assistance?</h3>
                <p className="text-emerald-800/70 mb-6">
                  For donation queries or more information, please contact us:
                </p>
                <div className="space-y-4">
                  <a 
                    href="mailto:ecovigyan@gmail.com"
                    className="flex items-center gap-3 text-emerald-700 hover:text-emerald-900 transition-colors group"
                  >
                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                      <Mail className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-lg">ecovigyan@gmail.com</span>
                  </a>
                  <a 
                    href="tel:+918894486066"
                    className="flex items-center gap-3 text-emerald-700 hover:text-emerald-900 transition-colors group"
                  >
                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                      <Phone className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-lg">+91 8894486066</span>
                  </a>
                </div>
              </motion.div>
            </div>

            {/* Right Column - Payment Methods */}
            <div className="space-y-8">
              
              {/* Bank Transfer */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="bg-white rounded-3xl p-8 md:p-10 shadow-2xl border-2 border-emerald-200/50 sticky top-24"
              >
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl md:text-3xl font-bold font-serif text-emerald-950">
                    🏦 Bank Transfer (NEFT/IMPS)
                  </h2>
                  <span className="px-4 py-2 bg-red-100 text-red-700 text-sm font-bold rounded-full">
                    Tax Exempt
                  </span>
                </div>

                <div className="space-y-6">
                  {/* Account Name */}
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-200/50">
                    <label className="text-sm font-semibold text-emerald-700 uppercase tracking-wide mb-2 block">
                      Account Name
                    </label>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xl font-bold text-emerald-950">Eco Vigyan Foundation</p>
                      <button
                        onClick={() => copyToClipboard('Eco Vigyan Foundation', 'accountName')}
                        className="p-2 hover:bg-emerald-200/50 rounded-lg transition-colors shrink-0"
                        aria-label="Copy account name"
                      >
                        {copiedField === 'accountName' ? (
                          <Check className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <Copy className="w-5 h-5 text-emerald-600" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Account Number */}
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-200/50">
                    <label className="text-sm font-semibold text-emerald-700 uppercase tracking-wide mb-2 block">
                      Account Number
                    </label>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xl font-bold text-emerald-950 font-mono">50100584067512</p>
                      <button
                        onClick={() => copyToClipboard('50100584067512', 'accountNumber')}
                        className="p-2 hover:bg-emerald-200/50 rounded-lg transition-colors shrink-0"
                        aria-label="Copy account number"
                      >
                        {copiedField === 'accountNumber' ? (
                          <Check className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <Copy className="w-5 h-5 text-emerald-600" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* IFSC Code */}
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-200/50">
                    <label className="text-sm font-semibold text-emerald-700 uppercase tracking-wide mb-2 block">
                      IFSC Code
                    </label>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xl font-bold text-emerald-950 font-mono">HDFC0004184</p>
                      <button
                        onClick={() => copyToClipboard('HDFC0004184', 'ifsc')}
                        className="p-2 hover:bg-emerald-200/50 rounded-lg transition-colors shrink-0"
                        aria-label="Copy IFSC code"
                      >
                        {copiedField === 'ifsc' ? (
                          <Check className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <Copy className="w-5 h-5 text-emerald-600" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Bank Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-gray-50 to-emerald-50 rounded-2xl p-5 border border-emerald-200/50">
                      <label className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2 block">
                        Bank
                      </label>
                      <p className="text-base font-bold text-emerald-950">HDFC Bank Ltd</p>
                    </div>
                    <div className="bg-gradient-to-br from-gray-50 to-emerald-50 rounded-2xl p-5 border border-emerald-200/50">
                      <label className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2 block">
                        Branch
                      </label>
                      <p className="text-base font-bold text-emerald-950">Totu Cheli Choupala- 4184</p>
                    </div>
                  </div>
                </div>

                {/* QR Code Section */}
                <div className="mt-10 pt-8 border-t-2 border-emerald-200/50">
                  <h3 className="text-2xl font-bold font-serif text-emerald-950 mb-6 text-center">
                    Scan to Donate
                  </h3>
                  <p className="text-center text-emerald-700 mb-6">
                    Use any UPI App (GPay, PhonePe, Paytm)
                  </p>
                  
                  <div className="bg-gradient-to-br from-white to-emerald-50 rounded-3xl p-8 border-2 border-emerald-200/50 shadow-lg">
                    <div className="flex justify-center mb-6">
                      <div className="bg-white p-6 rounded-2xl shadow-xl border-2 border-emerald-200">
                        <img 
                          src="/images/qr.jpeg" 
                          alt="UPI QR Code for Eco Vigyan Foundation" 
                          className="w-64 h-64 object-contain"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-3 bg-emerald-50/50 rounded-2xl p-6 border border-emerald-200/50">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-emerald-700">Beneficiary Name:</span>
                        <span className="font-bold text-emerald-950">Eco Vigyan Foundation</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-emerald-700">Linked UPI/Mobile Number Snippet:</span>
                        <span className="font-mono font-bold text-emerald-950">62948388 (Linked Mobile/VPA)</span>
                      </div>
                    </div>

                    <p className="text-center text-sm text-red-600 font-medium mt-6 bg-red-50 py-3 px-4 rounded-xl border border-red-200">
                      **Please verify the beneficiary name before proceeding.**
                    </p>
                  </div>
                </div>
              </motion.div>

            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
