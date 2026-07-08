"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, Video, BookOpen, Users, CheckCircle2, ArrowRight, X, Sparkles, ZoomIn } from "lucide-react";
import toast from "react-hot-toast";

export default function EventFlyer() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "Nature Lover",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/event-register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to register. Please try again.");
      }

      setIsRegistered(true);
      toast.success(data.message || "Successfully registered for the event!");
    } catch (error) {
      console.error("Event registration error:", error);
      toast.error(error.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", email: "", role: "Nature Lover" });
    setIsRegistered(false);
    setIsModalOpen(false);
  };

  return (
    <section id="event-announcement" className="pt-32 pb-16 lg:pt-36 lg:pb-20 bg-[#F9FAF8] relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-1/3 left-0 w-80 h-80 bg-emerald-100/40 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-0 w-96 h-96 bg-amber-100/30 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative bg-gradient-to-br from-[#FAF8F5] via-white to-[#F2EFE8] border-2 border-emerald-900/10 rounded-[40px] shadow-xl overflow-hidden p-8 md:p-12 lg:p-16">
          {/* Decorative subtle leaves pattern representation */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-800/5 rounded-full blur-xl pointer-events-none" />

          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center relative z-10">
            {/* Left side info column */}
            <div className="lg:col-span-7 flex flex-col justify-between h-full">
              <div>
                {/* Live Tag */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-800/10 text-emerald-800 text-xs font-bold tracking-wider uppercase mb-6"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                  </span>
                  Live Online Session
                </motion.div>

                {/* Title */}
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                  className="text-4xl md:text-5xl lg:text-6xl font-bold font-serif text-emerald-950 leading-[1.15] mb-4"
                >
                  Let's Put <span className="text-orange-600 italic">Fun</span> in <span className="text-emerald-700">Fungi</span>
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                  className="text-lg text-emerald-900/80 mb-8 max-w-2xl font-light"
                >
                  Join us for an exciting free online session celebrating the launch of our new nature book by <strong className="font-semibold text-emerald-950">Shrey Gupta</strong>. Perfect for children, educators, and anyone curious about the magical world of mushrooms!
                </motion.p>

                {/* Event Highlights Quick Grid */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                  className="grid sm:grid-cols-3 gap-4 mb-8 bg-white/70 backdrop-blur-sm p-6 rounded-3xl border border-emerald-900/5"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-orange-50 rounded-2xl text-orange-600">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs text-emerald-900/50 uppercase tracking-wider font-semibold">Date</div>
                      <div className="text-sm font-bold text-emerald-950">Sun, 19 July 2026</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-700">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs text-emerald-900/50 uppercase tracking-wider font-semibold">Time</div>
                      <div className="text-sm font-bold text-emerald-950">5:00 - 6:00 PM IST</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                      <Video className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs text-emerald-900/50 uppercase tracking-wider font-semibold">Platform</div>
                      <div className="text-sm font-bold text-emerald-950">Google Meet</div>
                    </div>
                  </div>
                </motion.div>

                {/* Experience Highlights */}
                <div className="space-y-3 mb-10">
                  <h4 className="text-sm font-bold text-emerald-900/70 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-orange-500" /> What You'll Experience
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {[
                      { title: "Discover", desc: "The fascinating world of mushrooms around us." },
                      { title: "Understand", desc: "Why fungi are crucial for healthy ecosystems." },
                      { title: "Sneak Peek", desc: "Exclusive intro to the new illustrated book." },
                      { title: "Ask Anything", desc: "Live interactive Q&A session with the author." }
                    ].map((item, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 * idx }}
                        className="flex items-start gap-3"
                      >
                        <div className="p-1 bg-emerald-50 rounded-full text-emerald-700 mt-0.5">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="font-semibold text-emerald-950 text-sm">{item.title}</h5>
                          <p className="text-xs text-emerald-900/70">{item.desc}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Area */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="flex flex-wrap items-center gap-6 border-t border-emerald-900/10 pt-8"
              >
                <a
                  href="https://docs.google.com/forms/d/e/1FAIpQLSeRlksLTD-ss9rCze7zWeKttcpzTY4ysYYmGMZDoqDjv3Mw1g/viewform"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-8 py-4 bg-emerald-900 hover:bg-emerald-950 text-white rounded-full font-bold shadow-lg shadow-emerald-900/20 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
                >
                  Register Now
                  <ArrowRight className="w-5 h-5" />
                </a>

                <div className="text-sm text-emerald-900/60 flex items-center gap-2">
                  <Users className="w-4 h-4 text-orange-500" />
                  <span>Free registration • Limited seats remaining</span>
                </div>
              </motion.div>
            </div>

            {/* Right side poster column */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-5 flex justify-center items-center"
            >
              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSeRlksLTD-ss9rCze7zWeKttcpzTY4ysYYmGMZDoqDjv3Mw1g/viewform"
                target="_blank"
                rel="noopener noreferrer"
                className="relative max-w-md w-full bg-white p-4 rounded-[32px] shadow-2xl border border-emerald-900/5 group cursor-pointer block"
              >
                {/* Image container */}
                <div className="relative rounded-2xl overflow-hidden aspect-[3/4] bg-emerald-50">
                  <img
                    src="/images/event-fungi-live.jpeg"
                    alt="Let's Put Fun in Fungi Live Session Poster"
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                  />
                  {/* Zoom Overlay on Hover */}
                  <div className="absolute inset-0 bg-emerald-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="p-3 bg-white/95 text-emerald-900 rounded-full shadow-lg flex items-center gap-2 text-sm font-semibold transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                      <Sparkles className="w-4 h-4 text-orange-500 animate-pulse" />
                      Register via Google Form
                    </div>
                  </div>
                </div>
                {/* Tiny caption */}
                <p className="text-center text-xs text-emerald-900/40 mt-3 font-medium uppercase tracking-wider">
                  Click image to register via Google Form
                </p>
              </a>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Registration Modal Dialog */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={resetForm}
              className="fixed inset-0 bg-emerald-950/40 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden border border-emerald-900/10 z-10"
            >
              {/* Top Banner decoration */}
              <div className="bg-gradient-to-r from-emerald-900 to-emerald-800 p-8 text-white relative">
                <button
                  onClick={resetForm}
                  className="absolute top-4 right-4 text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-2 text-orange-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <Sparkles className="w-4 h-4" />
                  Free Registration
                </div>
                <h3 className="text-2xl font-bold font-serif">Reserve Your Spot</h3>
                <p className="text-sm text-emerald-100 font-light mt-1">
                  Let's Put Fun in Fungi Live • 19 July 2026, 5:00 PM IST
                </p>
              </div>

              {/* Form Content */}
              <div className="p-8">
                {!isRegistered ? (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-emerald-950 mb-2">
                        Your Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        placeholder="Enter your full name"
                        className="w-full px-4 py-3 rounded-2xl border border-emerald-900/10 focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 outline-none transition-all text-emerald-950 placeholder-emerald-900/30"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-emerald-950 mb-2">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        placeholder="you@example.com"
                        className="w-full px-4 py-3 rounded-2xl border border-emerald-900/10 focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 outline-none transition-all text-emerald-950 placeholder-emerald-900/30"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-emerald-950 mb-2">
                        I am registering as a <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="role"
                        value={formData.role}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-2xl border border-emerald-900/10 focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 outline-none transition-all bg-white text-emerald-950"
                      >
                        <option value="Student">Student</option>
                        <option value="Teacher">Teacher / Educator</option>
                        <option value="Parent">Parent</option>
                        <option value="Nature Lover">Nature Lover</option>
                        <option value="Beginner">Beginner / Curious</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-4 bg-emerald-900 hover:bg-emerald-950 disabled:bg-emerald-800/50 text-white rounded-2xl font-bold shadow-lg shadow-emerald-900/20 hover:shadow-xl transition-all flex items-center justify-center gap-2 mt-4"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Processing Reservation...
                        </>
                      ) : (
                        <>
                          Confirm Free Reservation
                          <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-6"
                  >
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h4 className="text-2xl font-bold font-serif text-emerald-950 mb-2">You're Registered!</h4>
                    <p className="text-emerald-900/70 text-sm max-w-sm mx-auto mb-8 font-light">
                      Thank you for joining, <span className="font-semibold text-emerald-900">{formData.name}</span>. We've sent a confirmation email to <span className="font-semibold text-emerald-900">{formData.email}</span> with details.
                    </p>

                    <div className="bg-[#FAF8F5] border border-emerald-900/5 rounded-2xl p-5 mb-8 text-left max-w-md mx-auto">
                      <h5 className="font-bold text-xs text-orange-600 uppercase tracking-wider mb-2">Meeting Details</h5>
                      <p className="text-sm font-semibold text-emerald-950 flex items-center gap-2 mb-2">
                        <Video className="w-4 h-4 text-emerald-700" /> Google Meet Live Session
                      </p>
                      <a
                        href="https://meet.google.com/zpp-hgnb-zus"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-full py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-bold text-sm mb-3 shadow transition-all"
                      >
                        Join Google Meet
                      </a>
                      <p className="text-xs text-emerald-900/60 leading-relaxed font-light">
                        Please check your inbox at <span className="font-semibold">{formData.email}</span> (including spam/promotions) for the calendar invite `.ics` file.
                      </p>
                    </div>

                    <button
                      onClick={resetForm}
                      className="px-8 py-3 bg-emerald-900 hover:bg-emerald-950 text-white rounded-full font-bold shadow-md transition-all"
                    >
                      Done
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lightbox Modal (For enlarging poster image) */}
      <AnimatePresence>
        {isLightboxOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLightboxOpen(false)}
              className="fixed inset-0 bg-emerald-950/90 backdrop-blur-md"
            />

            {/* Close Button */}
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="fixed top-6 right-6 text-white/80 hover:text-white p-3 rounded-full bg-white/10 hover:bg-white/20 transition-all z-20"
              aria-label="Close flyer"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Poster Image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-h-[85vh] max-w-[90vw] aspect-[3/4] bg-white rounded-3xl overflow-hidden shadow-2xl z-10 p-2"
            >
              <img
                src="/images/event-fungi-live.jpeg"
                alt="Enlarged Event Poster"
                className="w-full h-full object-contain rounded-2xl"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
