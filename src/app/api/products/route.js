import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Product from "@/models/Product";
import { getAuthenticatedUser } from "@/lib/auth";

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search") || "";
    const adminMode = searchParams.get("admin") === "true";

    // Build filter query
    const filter = {};

    if (adminMode) {
      // For admin mode, check if authenticated user is admin
      const { user } = await getAuthenticatedUser();
      if (!user || user.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      // Public only sees active products
      filter.isActive = true;
    }

    if (category && category !== "all") {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });
    return NextResponse.json({ products }, { status: 200 });
  } catch (error) {
    console.error("Fetch products error:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    await connectDB();

    // Check admin authentication
    const { user } = await getAuthenticatedUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      description,
      specification,
      price,
      shippingFee,
      image,
      gallery,
      category,
      stock,
      isActive,
      features,
    } = body;

    // Validation
    if (!name || !description || price === undefined || !image || !category) {
      return NextResponse.json(
        { error: "Missing required fields: name, description, price, image, or category." },
        { status: 400 }
      );
    }

    const product = new Product({
      name,
      description,
      specification: specification || "",
      price: Number(price),
      shippingFee: Number(shippingFee || 0),
      image,
      gallery: Array.isArray(gallery) ? gallery : [],
      category,
      stock: Number(stock || 0),
      isActive: isActive !== undefined ? isActive : true,
      features: Array.isArray(features) ? features : [],
    });

    await product.save();

    return NextResponse.json({ product, message: "Product created successfully!" }, { status: 201 });
  } catch (error) {
    console.error("Create product error:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
