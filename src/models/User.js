import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// Delete cached model in development to ensure schema changes take effect
if (process.env.NODE_ENV !== 'production') {
  delete mongoose.models.User;
}

const userSchema = new mongoose.Schema(
  {
    /* ---------------- BASIC INFO ---------------- */
    name: {
      type: String,
      required: true,
      trim: true,
    },

    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: false, // Not required for OAuth users
      select: false, // IMPORTANT: never return password
    },

    /* ---------------- AUTH PROVIDER ---------------- */
    authProvider: {
      type: String,
      enum: ["credentials", "google"],
      default: "credentials",
    },

    /* ---------------- PROFILE ---------------- */
    dp: {
      public_id: String,
      url: String,
      // "google" pictures are refreshed on every Google login; "custom" (user
      // upload) and "none" (user removed it) must never be overwritten by it.
      source: { type: String, enum: ["google", "custom", "none"] },
    },

    bio: {
      type: String,
      default: "",
    },

    /* ---------------- ROLE SYSTEM ---------------- */
    // "admin" is retained as a legacy value only — it predates the
    // subadmin/superadmin split and is treated as superadmin by
    // lib/permissions.js so existing accounts keep working. New accounts
    // should be given "subadmin" or "superadmin".
    role: {
      type: String,
      enum: ["user", "writer", "subadmin", "superadmin", "admin"],
      default: "user",
    },

    /* ---------------- GAMIFICATION ---------------- */
    points: {
      type: Number,
      default: 0,
    },

    /* ---------------- TRUST / MODERATION ---------------- */
    isVerified: {
      type: Boolean,
      default: false,
    },

    isBanned: {
      type: Boolean,
      default: false,
    },

    /* ---------------- META ---------------- */
    lastLogin: Date,

    /* ---------------- SOFT DELETE ---------------- */
    deletedAt: {
      type: Date,
      default: null,
    },

    /* ---------------- PASSWORD RESET ---------------- */
    resetToken: {
      type: String,
      select: false,
    },
    resetTokenExpiry: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

/* ---------------- PASSWORD HASHING ---------------- */
// Most routes hash before saving; this catches the ones that don't (the
// mobile API upgrades legacy plain-text passwords on login). Values that are
// already bcrypt hashes pass through untouched.
userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password") || !this.password) return;
  if (this.password.startsWith("$2a$") || this.password.startsWith("$2b$")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

/* ---------------- SAFE EXPORT ---------------- */
export default mongoose.models.User || mongoose.model("User", userSchema);

