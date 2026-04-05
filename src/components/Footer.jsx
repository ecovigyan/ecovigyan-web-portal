"use client";

import React from 'react';
import { Mail, Phone, MapPin, Facebook, Instagram, Linkedin, Youtube, Leaf, Heart } from 'lucide-react';
import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer id="contact" className="bg-gradient-to-br from-emerald-900 via-emerald-950 to-emerald-900 text-emerald-50 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-20 w-96 h-96 border border-white rounded-full" />
        <div className="absolute bottom-10 right-10 w-64 h-64 border border-white rounded-full" />
      </div>

      {/* Main Footer Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-4 gap-12 mb-12">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img 
                src="/gallery/logo1.png"
                alt="Eco Vigyan Foundation Logo" 
                className="w-12 h-12 object-contain"
              />
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-white leading-none">ECO VIGYAN</span>
                <span className="text-[10px] tracking-[0.2em] text-emerald-400 font-semibold uppercase">Foundation</span>
              </div>
            </div>
            <p className="text-emerald-100/70 text-sm leading-relaxed mb-6">
              Bridging science and conservation through research, education, and community engagement.
            </p>
            
            {/* Social Links */}
            <div className="flex gap-3">
              <a 
                href="https://www.instagram.com/ecovigyan/?igsh=MXdpdWFhbDd5amg4dQ%3D%3D#"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-10 h-10 rounded-lg bg-emerald-800/50 border border-emerald-700/50 flex items-center justify-center hover:bg-emerald-600 hover:border-emerald-600 hover:scale-110 transition-all group"
              >
                <Instagram size={18} className="text-emerald-200 group-hover:text-white transition-colors" />
              </a>
              <a 
                href="https://www.facebook.com/people/Eco-Vigyan-Foundation/100090610935292/?rdid=qQ3Ik930QW0SHoiR&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F1BcJ2mxyDF%2F"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-10 h-10 rounded-lg bg-emerald-800/50 border border-emerald-700/50 flex items-center justify-center hover:bg-emerald-600 hover:border-emerald-600 hover:scale-110 transition-all group"
              >
                <Facebook size={18} className="text-emerald-200 group-hover:text-white transition-colors" />
              </a>
              <a 
                href="https://www.linkedin.com/in/eco-vigyan-2a51b536b/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="w-10 h-10 rounded-lg bg-emerald-800/50 border border-emerald-700/50 flex items-center justify-center hover:bg-emerald-600 hover:border-emerald-600 hover:scale-110 transition-all group"
              >
                <Linkedin size={18} className="text-emerald-200 group-hover:text-white transition-colors" />
              </a>
              <a 
                href="https://www.youtube.com/@EcoVigyan-le3es"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="w-10 h-10 rounded-lg bg-emerald-800/50 border border-emerald-700/50 flex items-center justify-center hover:bg-emerald-600 hover:border-emerald-600 hover:scale-110 transition-all group"
              >
                <Youtube size={18} className="text-emerald-200 group-hover:text-white transition-colors" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Quick Links</h4>
            <ul className="space-y-3 text-emerald-100/70 text-sm">
              <li>
                <Link 
                  href="/#about"
                  className="hover:text-emerald-400 transition-colors inline-flex items-center group"
                >
                  <span className="group-hover:translate-x-1 transition-transform">About Us</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="/programs"
                  className="hover:text-emerald-400 transition-colors inline-flex items-center group"
                >
                  <span className="group-hover:translate-x-1 transition-transform">Our Programs</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="/gallery"
                  className="hover:text-emerald-400 transition-colors inline-flex items-center group"
                >
                  <span className="group-hover:translate-x-1 transition-transform">Art Gallery</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="/articles"
                  className="hover:text-emerald-400 transition-colors inline-flex items-center group"
                >
                  <span className="group-hover:translate-x-1 transition-transform">Articles</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="/reports"
                  className="hover:text-emerald-400 transition-colors inline-flex items-center group"
                >
                  <span className="group-hover:translate-x-1 transition-transform">Reports & Docs</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Get Involved */}
          <div>
            <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Get Involved</h4>
            <ul className="space-y-3 text-emerald-100/70 text-sm">
              <li>
                <Link 
                  href="/join-us"
                  className="hover:text-emerald-400 transition-colors inline-flex items-center group"
                >
                  <span className="group-hover:translate-x-1 transition-transform">Join Our Team</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="/programs"
                  className="hover:text-emerald-400 transition-colors inline-flex items-center group"
                >
                  <span className="group-hover:translate-x-1 transition-transform">Enroll in Programs</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="/donate"
                  className="hover:text-emerald-400 transition-colors inline-flex items-center group"
                >
                  <span className="group-hover:translate-x-1 transition-transform">Donate</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="/dashboard"
                  className="hover:text-emerald-400 transition-colors inline-flex items-center group"
                >
                  <span className="group-hover:translate-x-1 transition-transform">Member Portal</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Contact</h4>
            <ul className="space-y-4 text-emerald-100/70 text-sm">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Village Jadheni, Shimla<br />Himachal Pradesh 171011</span>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <a href="mailto:ecovigyan@gmail.com" className="hover:text-emerald-400 transition-colors">
                  ecovigyan@gmail.com
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <a href="tel:+918894486066" className="hover:text-emerald-400 transition-colors">
                  +91 88 9448 6066
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-emerald-800/50">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-emerald-100/50">
            <p className="flex items-center gap-2">
              © {currentYear} Eco Vigyan Foundation. Made with <Heart className="w-4 h-4 text-red-400 fill-red-400" /> for Nature
            </p>
            <p className="text-xs">
              Empowering communities through ecological education
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
