"use client";

import React, { createContext, useContext } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import toast from "react-hot-toast";
import { isWriterOrAdmin as isWriterOrAdminRole } from "@/lib/permissions";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { data: session, status, update } = useSession();
  const loading = status === "loading";
  const user = session?.user || null;

  const login = async (email, password) => {
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error(result.error);
        return { success: false, error: result.error };
      }

      if (result?.ok) {
        toast.success(`Welcome back!`);
        return { success: true, user: session?.user };
      }

      return { success: false, error: "Login failed" };
    } catch (error) {
      toast.error(error.message || "Login failed");
      return { success: false, error: error.message };
    }
  };

  const loginWithGoogle = async () => {
    try {
      await signIn("google", { callbackUrl: "/explore" });
    } catch (error) {
      toast.error("Google sign-in failed");
    }
  };

  const logout = async () => {
    try {
      // Clear localStorage
      localStorage.removeItem("user");
      localStorage.clear();

      // Sign out with NextAuth
      await signOut({ callbackUrl: "/" });
    } catch (error) {
      console.error("Logout error:", error);
      // Force redirect even on error
      window.location.href = "/";
    }
  };

  const updateUser = async (userData) => {
    // Update localStorage for backward compatibility
    if (userData) {
      localStorage.setItem("user", JSON.stringify(userData));
    } else {
      localStorage.removeItem("user");
    }
    
    // Trigger NextAuth session refresh
    // This will fetch fresh data from the JWT callback
    await update();
  };

  const fetchUser = async () => {
    // Trigger NextAuth session refresh
    await update();
  };

  const isAuthenticated = () => {
    return user !== null;
  };

  const isWriterOrAdmin = () => {
    return user && isWriterOrAdminRole(user);
  };

  const value = {
    user,
    loading,
    login,
    loginWithGoogle,
    logout,
    updateUser,
    fetchUser,
    isAuthenticated,
    isWriterOrAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
