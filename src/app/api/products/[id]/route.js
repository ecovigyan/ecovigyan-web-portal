import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Product from "@/models/Product";
import { getAuthenticatedUser } from "@/lib/auth";
import { hasAdminAccess } from "@/lib/permissions";

export async function GET(req, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ product }, { status: 200 });
  } catch (error) {
    console.error("Fetch product error:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

export async function PUT(req, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    // Check admin authentication
    const { user } = await getAuthenticatedUser();
    if (!user || !hasAdminAccess(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Update fields
    if (body.name !== undefined) product.name = body.name;
    if (body.description !== undefined) product.description = body.description;
    if (body.specification !== undefined) product.specification = body.specification;
    if (body.price !== undefined) product.price = Number(body.price);
    if (body.shippingFee !== undefined) product.shippingFee = Number(body.shippingFee);
    if (body.image !== undefined) product.image = body.image;
    if (body.gallery !== undefined) product.gallery = Array.isArray(body.gallery) ? body.gallery : [];
    if (body.category !== undefined) product.category = body.category;
    if (body.stock !== undefined) product.stock = Number(body.stock);
    if (body.isActive !== undefined) product.isActive = body.isActive;
    if (body.features !== undefined) product.features = Array.isArray(body.features) ? body.features : [];

    await product.save();

    return NextResponse.json({ product, message: "Product updated successfully!" }, { status: 200 });
  } catch (error) {
    console.error("Update product error:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    // Check admin authentication
    const { user } = await getAuthenticatedUser();
    if (!user || !hasAdminAccess(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Product deleted successfully!" }, { status: 200 });
  } catch (error) {
    console.error("Delete product error:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
