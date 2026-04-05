"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Play, X, Award } from 'lucide-react';

export default function WhoWeAre() {
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [selectedFounder, setSelectedFounder] = useState(null);

  const founders = [
    {
      name: 'Shrey Gupta',
      role: 'Co-Founder & Sustainability Educator',
      image: '/images/founders/shrey.jpeg'
    },
    {
      name: 'Ashish Palyal',
      role: 'Co-Founder & Sustainability Educator',
      image: '/images/founders/ashish.jpeg'
    }
  ];

  return (
    <section id="who-we-are" className="py-24 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Story Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold mb-6">
              <Heart className="w-4 h-4" />
              Our Story
            </div>
            <h2 className="text-4xl md:text-5xl font-bold font-serif text-emerald-950 mb-6">
              Who We Are
            </h2>
            <p className="text-emerald-800/80 text-lg leading-relaxed mb-6">
              Eco Vigyan Foundation came into existence in <span className="font-bold text-emerald-900">2022</span> with 
              a clear purpose – to enhance eco-club activities in schools throughout India. We hold a special 
              fascination for unveiling the hidden significance of fungi in the grand tapestry of nature.
            </p>
            <p className="text-emerald-800/70 leading-relaxed mb-6">
              This endeavour was co-founded by <span className="font-bold text-emerald-900">Shrey Gupta</span> & <span className="font-bold text-emerald-900">Ashish Palyal</span>, 
              sustainability educators with a profound commitment to environmental causes. Their expertise spans 
              biodiversity conservation, waste management, and fostering learning through nature.
            </p>
            <p className="text-emerald-800/70 leading-relaxed mb-8">
              Together, they've collaborated with <strong className="text-emerald-900">over 200 schools</strong>, reached more than 
              <strong className="text-emerald-900"> 10,000 students</strong>, partnered with <strong className="text-emerald-900">300+ teachers</strong>, 
              and shared their knowledge with <strong className="text-emerald-900">over 100 community members and naturalists</strong>.
            </p>
            <p className="text-emerald-800/70 leading-relaxed mb-8">
              Our journey is rooted in the belief that <span className="font-semibold text-emerald-900">every child harbours a budding 
              scientist within</span> and every educator has the potential to be a nature guide. Our mission is to foster 
              a culture of sustainability and learning through nature in schools across India.
            </p>

            {/* Founders */}
            <div className="border-t border-emerald-100 pt-8 mt-8">
              <h4 className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-4">
                Meet Our Founders
              </h4>
              <div className="flex flex-wrap gap-4">
                {founders.map((founder, index) => (
                  <motion.div
                    key={founder.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    whileHover={{ scale: 1.05, y: -4 }}
                    onClick={() => setSelectedFounder(founder)}
                    className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-emerald-100 hover:border-emerald-300 transition-all group cursor-pointer hover:shadow-lg"
                  >
                    <div className="w-12 h-12 group-hover:w-16 group-hover:h-16 rounded-full overflow-hidden border-2 border-emerald-200 group-hover:border-emerald-400 transition-all duration-300 bg-emerald-100 flex items-center justify-center shrink-0">
                      <img
                        src={founder.image}
                        alt={founder.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                    <div>
                      <div className="font-bold text-emerald-900 text-sm group-hover:text-emerald-700 transition-colors">{founder.name}</div>
                      <div className="text-xs text-emerald-600">{founder.role}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

          </motion.div>

          {/* Right: Video */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            {/* Main Image with Play Button */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
              onClick={() => setIsVideoOpen(true)}
              className="relative rounded-[40px] overflow-hidden shadow-2xl aspect-square cursor-pointer group"
            >
              <img
                src="https://img.youtube.com/vi/cZVHtG2_Vhs/maxresdefault.jpg"
                alt="Team in field research"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/60 via-transparent to-transparent" />
              
              {/* Play Button Overlay */}
              <motion.div
                whileHover={{ scale: 1.1 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                  className="w-20 h-20 bg-white/95 backdrop-blur-sm rounded-full flex items-center justify-center shadow-2xl group-hover:bg-emerald-600 transition-colors"
                >
                  <Play className="w-10 h-10 text-emerald-600 group-hover:text-white transition-colors ml-1" fill="currentColor" />
                </motion.div>
              </motion.div>
              
              {/* Overlay Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-sm p-6 rounded-2xl"
              >
                <div className="flex items-center gap-4">
                  <motion.div
                    whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                    transition={{ duration: 0.5 }}
                    className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-full flex items-center justify-center"
                  >
                    <Award className="w-6 h-6 text-white" />
                  </motion.div>
                  <div>
                    <div className="text-emerald-900 font-bold">Watch Our Story</div>
                    <div className="text-emerald-600 text-sm">Click to play video</div>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Decorative Elements */}
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.6, 0.8, 0.6]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute -top-6 -right-6 w-32 h-32 bg-gradient-to-br from-emerald-200 to-amber-200 rounded-full blur-2xl -z-10"
            />
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.5, 0.7, 0.5]
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1
              }}
              className="absolute -bottom-6 -left-6 w-40 h-40 bg-gradient-to-br from-emerald-100 to-transparent rounded-full blur-xl -z-10"
            />
          </motion.div>
        </div>
      </div>

      {/* Founder Image Modal */}
      <AnimatePresence>
        {selectedFounder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedFounder(null)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="relative bg-white rounded-3xl overflow-hidden shadow-2xl max-w-sm w-full"
            >
              <button
                onClick={() => setSelectedFounder(null)}
                className="absolute top-4 right-4 z-10 w-9 h-9 bg-black/20 hover:bg-black/40 rounded-full flex items-center justify-center text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={selectedFounder.image}
                alt={selectedFounder.name}
                className="w-full object-cover"
              />
              <div className="p-5">
                <div className="font-bold text-emerald-900 text-lg">{selectedFounder.name}</div>
                <div className="text-emerald-600 text-sm mt-1">{selectedFounder.role}</div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video Modal */}
      <AnimatePresence>
        {isVideoOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsVideoOpen(false)}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-5xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl"
            >
              {/* Close Button */}
              <button
                onClick={() => setIsVideoOpen(false)}
                className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/10 backdrop-blur-md hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all group"
                aria-label="Close video"
              >
                <X className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </button>

              {/* YouTube Embed */}
              <iframe
                className="w-full h-full"
                src="https://www.youtube.com/embed/cZVHtG2_Vhs?autoplay=1&rel=0"
                title="Eco Vigyan Foundation Story"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
