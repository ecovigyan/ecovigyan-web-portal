import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import { getAuthenticatedUser } from "@/lib/auth";

export async function PUT(req, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    // Check admin authentication
    const { user } = await getAuthenticatedUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Update fields
    if (body.status !== undefined) {
      const allowedStatuses = ["pending", "processing", "shipped", "delivered", "cancelled"];
      if (!allowedStatuses.includes(body.status)) {
        return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
      }
      order.status = body.status;
    }

    if (body.paymentStatus !== undefined) {
      const allowedPaymentStatuses = ["pending", "paid", "failed"];
      if (!allowedPaymentStatuses.includes(body.paymentStatus)) {
        return NextResponse.json({ error: "Invalid paymentStatus value" }, { status: 400 });
      }
      order.paymentStatus = body.paymentStatus;
    }

    await order.save();

    return NextResponse.json({ order, message: "Order updated successfully!" }, { status: 200 });
  } catch (error) {
    console.error("Update order error:", error);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}
