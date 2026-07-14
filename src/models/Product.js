import mongoose from "mongoose";

// Delete cached model in development to ensure schema changes take effect
if (process.env.NODE_ENV !== 'production') {
  delete mongoose.models.Product;
}

const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    description: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    specification: {
      type: String,
      default: "",
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    shippingFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    image: {
      type: String,
      required: true,
    },
    gallery: {
      type: [String],
      default: [],
    },
    category: {
      type: String,
      required: true,
      enum: ["kits", "mushrooms", "merch", "education"],
      default: "kits",
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    features: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.models.Product || mongoose.model("Product", ProductSchema);
