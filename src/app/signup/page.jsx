"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import {
  Mail,
  Lock,
  ArrowRight,
  Leaf,
  User,
  CheckCircle2,
  Camera,
  AtSign,
} from "lucide-react";

/* ---------------------------------------------------
   SIGN UP PAGE
--------------------------------------------------- */
export default function SignUpPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push("/explore");
    }
  }, [user, router]);

  /* ---------------- IMAGE HANDLER ---------------- */
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImageFile(file);

    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  /* ---------------- SUBMIT HANDLER ---------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!imageFile) {
        toast.error("Please upload a profile picture");
        setLoading(false);
        return;
      }

      const body = new FormData();
      body.append("name", formData.name);
      body.append("username", formData.username);
      body.append("email", formData.email);
      body.append("password", formData.password);
      body.append("dp", imageFile);

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        body,
        credentials: "include",
      });

      let data;
      try {
        const text = await res.text();
        if (text) {
          data = JSON.parse(text);
        } else {
          data = {};
        }
      } catch (parseError) {
        console.error("Failed to parse response:", parseError);
        throw new Error(`Server error: ${res.status} ${res.statusText}`);
      }

      if (!res.ok) {
        throw new Error(data.error || data.message || "Signup failed");
      }

      toast.success("Account created! Signing you in...");
      
      // Auto-login with NextAuth after successful signup
      const signInResult = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (signInResult?.ok) {
        router.push("/explore");
        router.refresh();
      } else {
        // If auto-login fails, redirect to login page
        router.push("/login");
      }
    } catch (err) {
      const errorMessage = err.message || "Signup failed. Please try again.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- GOOGLE SIGN UP ---------------- */
  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    try {
      await signIn("google", { callbackUrl: "/explore" });
    } catch (err) {
      setError("Google sign-up failed");
      setGoogleLoading(false);
    }
  };

  /* ---------------------------------------------------
     UI
  --------------------------------------------------- */
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="max-w-5xl w-full bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row border border-stone-100">
        
        {/* LEFT PANEL */}
        <div className="hidden md:flex md:w-[40%] bg-emerald-950 p-12 flex-col justify-between relative overflow-hidden">
          <div className="absolute -bottom-20 -right-20 opacity-10">
            <Leaf className="w-80 h-80 text-emerald-400 -rotate-12" />
          </div>

          <div className="relative z-10 space-y-6">
            <h1 className="text-4xl font-extrabold text-white leading-tight">
              Start Your <span className="text-emerald-400">Green Journey</span>
            </h1>

            <ul className="space-y-4">
              {[
                "Access exclusive research articles",
                "Track your conservation impact",
                "Join a community of experts",
              ].map((text, i) => (
                <li key={i} className="flex items-center gap-3 text-emerald-100/80">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-medium">{text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative z-10 p-6 bg-white/5 rounded-2xl border border-white/10">
            <p className="text-emerald-100/60 text-xs italic">
              "The best time to plant a tree was 20 years ago. The second best time is now."
            </p>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="w-full md:w-[60%] p-8 lg:p-12 overflow-y-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-800">Create Account</h2>
            <p className="text-slate-500 mt-2">
              Join the foundation and make a difference.
            </p>
          </div>

          {/* GOOGLE SIGN UP - First for convenience */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-3 mb-6 bg-white border-2 border-stone-100 rounded-2xl font-bold hover:bg-stone-50 disabled:opacity-50 transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {googleLoading ? "Signing up..." : "Sign up with Google"}
          </button>

          {/* DIVIDER */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-4 text-slate-400 font-medium">
                Or create with email
              </span>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            
            {/* PROFILE PIC */}
            <div>
              <label className="block text-sm font-bold mb-2">Profile Picture</label>
              <div className="relative w-20 h-20">
                <div className="w-20 h-20 rounded-full bg-stone-100 border-2 border-dashed flex items-center justify-center overflow-hidden">
                  {imagePreview ? (
                    <img src={imagePreview} className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="text-stone-400" />
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>

            {/* NAME + USERNAME */}
            <div className="grid md:grid-cols-2 gap-4">
              <Input
                icon={User}
                placeholder="Full Name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
              <Input
                icon={AtSign}
                placeholder="Username"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
              />
            </div>

            {/* EMAIL */}
            <Input
              icon={Mail}
              placeholder="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />

            {/* PASSWORD */}
            <Input
              icon={Lock}
              placeholder="Password"
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
            />

            {error && (
              <p className="text-red-600 text-sm text-center">{error}</p>
            )}

            <button
              disabled={loading}
              className="w-full flex items-center justify-center py-4 bg-emerald-700 text-white font-bold rounded-2xl hover:bg-emerald-800 transition disabled:opacity-50"
            >
              {loading ? "Creating Account..." : "Create My Account"}
              <ArrowRight className="ml-2 w-4 h-4" />
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            Already a member?{" "}
            <Link href="/login" className="text-emerald-700 font-bold">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------
   REUSABLE INPUT
--------------------------------------------------- */
function Input({ icon: Icon, ...props }) {
  return (
    <div className="relative">
      <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
      <input
        {...props}
        className="w-full pl-11 pr-4 py-3 rounded-2xl border bg-stone-50 focus:ring-2 focus:ring-emerald-500 outline-none"
      />
    </div>
  );
}
