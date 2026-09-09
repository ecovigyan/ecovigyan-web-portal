import mongoose from "mongoose";

const MushroomSchema = new mongoose.Schema(
  {
    /* ================= USER SUBMISSION ================= */

    commonName: {
      type: String,
      trim: true,
      maxlength: 120,
    },

    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
        originalDriveLink: { type: String }, // Store original Google Drive link for system imports
      },
    ],

    location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },

    photoDateTime: {
      type: Date,
    },

    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /* ================= ADMIN CLASSIFICATION ================= */

    ecologicalRole: {
      type: [String],
      enum: ["decomposer", "symbiont", "parasite"],
      default: [],
    },

    texture: {
      type: String,
      enum: [
        "soft-to-touch",
        "hard-to-touch",
        "jelly-like",
        "leathery",
      ],
    },

    underside: {
      type: String,
      enum: [
        "gills",
        "pores",
        "teeth",
        "ball-with-no-distinctive-bottom",
        "cup-with-no-distinctive-bottom",
        "club-with-no-distinctive-bottom",
        "crust-on-wood-with-no-distinctive-bottom",
        "star-with-no-distinctive-bottom",
        "jelly-with-no-distinctive-bottom",
        "sponge-with-no-distinctive-bottom",
      ],
    },

    fruitingSurface: {
      type: String,
      enum: ["ground", "leaf", "wood", "dung"],
    },

    stemPresence: {
      type: String,
      enum: ["has-stem", "has-no-stem"],
    },

    commonUses: {
      type: [String],
      enum: [
        "edible",
        "inedible",
        "poisonous",
        "medicinal",
        "hallucinogenic",
        "other-uses",
        "mysterious",
      ],
      default: [],
    },

    scientificName: {
      type: String,
      trim: true,
    },

    description: {
      type: String,
      maxlength: 5000,
    },

    adminNotes: {
      type: String,
      maxlength: 2000,
    },

    /* ================= MODERATION ================= */

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    approvedAt: {
      type: Date,
    },

    rejectionReason: {
      type: String,
      maxlength: 1000,
    },
  },
  { timestamps: true }
);

MushroomSchema.index({ status: 1, approvedAt: -1 });

// Delete cached model to force reload of updated schema
if (mongoose.models.Mushroom) {
  delete mongoose.models.Mushroom;
}

export default mongoose.model("Mushroom", MushroomSchema);
