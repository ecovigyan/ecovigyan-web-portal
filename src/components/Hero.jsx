"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Play, ChevronDown } from "lucide-react";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative py-20 lg:py-28 overflow-hidden">
      {/* Enhanced Background Decor */}
      <div className="absolute top-0 right-0 -z-10 w-1/2 h-full bg-gradient-to-l from-emerald-50 to-transparent rounded-bl-[100px]" />
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-100/30 rounded-full blur-3xl" />
      <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-amber-100/20 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-700 text-sm font-semibold mb-6 border border-emerald-200/50">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              HEAD, HEART & HAND LEARNING
            </div>
            <h1 className="text-5xl lg:text-7xl font-bold font-serif text-emerald-950 mb-6 leading-[1.1]">
              Bringing{" "}
              <span className="text-emerald-600 relative">
                Science
                <svg
                  className="absolute -bottom-2 left-0 w-full"
                  height="8"
                  viewBox="0 0 200 8"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M1 5.5C50 1.5 150 1.5 199 5.5"
                    stroke="#10B981"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </span>{" "}
              closer to{" "}
              <span className="italic text-emerald-800">
                Nature
              </span>
            </h1>
            <p className="text-xl text-emerald-800/70 mb-10 max-w-xl leading-relaxed font-light">
              Eco Vigyan Foundation works to conserve biodiversity through citizen science, community action, and strong school eco-clubs.
              We inspire young minds to think scientifically, care deeply, and act responsibly for nature.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/programs">
                <button className="flex items-center gap-2 bg-emerald-900 text-white px-8 py-4 rounded-full font-bold hover:bg-emerald-950 transition-all group shadow-lg shadow-emerald-900/20">
                  Explore Our Programs
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              <Link href="/explore">
                <button className="flex items-center gap-2 bg-white text-emerald-900 border-2 border-emerald-200 px-8 py-4 rounded-full font-bold hover:bg-emerald-50 transition-all">
                  Mushroom Mania
                </button>
              </Link>
            </div>
          </motion.div>

          {/* Right Column - Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="relative rounded-[40px] overflow-hidden shadow-2xl z-10 aspect-[4/5] lg:aspect-square">
              {/* Gradient Overlay for better text contrast */}
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/40 via-transparent to-transparent z-10" />
              <img
                src="/gallery/img11.jpeg"
                alt="Students learning outdoors in nature"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Pattern Backdrop */}
            <div className="absolute -top-10 -right-10 w-64 h-64 border-8 border-emerald-100/50 rounded-full -z-10" />
            <div className="absolute -bottom-8 -right-8 w-48 h-48 bg-gradient-to-br from-amber-100 to-emerald-100 rounded-full -z-10 opacity-60" />
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.5 }}
          className="flex justify-center mt-16"
        >
          <button
            onClick={() => {
              const nextSection = document.querySelector("#vision-mission");
              if (nextSection) {
                nextSection.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }
            }}
            className="flex flex-col items-center gap-2 text-emerald-600 cursor-pointer group hover:text-emerald-700 transition-colors"
            aria-label="Scroll to next section"
          >
            <span className="text-xs font-semibold uppercase tracking-wider">
              Discover More
            </span>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="group-hover:text-emerald-800 transition-colors"
            >
              <ChevronDown className="w-5 h-5" />
            </motion.div>
          </button>
        </motion.div>
      </div>
    </section>
  );
}
