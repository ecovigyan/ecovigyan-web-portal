import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import Product from "@/models/Product";
import { getAuthenticatedUser } from "@/lib/auth";

export async function GET(req) {
  try {
    await connectDB();

    const { user } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let query = {};
    if (user.role !== "admin") {
      // Regular users only see their own orders
      query.user = user._id;
    }

    const orders = await Order.find(query)
      .populate("items.product", "name image price category")
      .sort({ createdAt: -1 });

    return NextResponse.json({ orders }, { status: 200 });
  } catch (error) {
    console.error("Fetch orders error:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    await connectDB();

    const { user } = await getAuthenticatedUser(); // optional
    const body = await req.json();

    const { customerName, customerEmail, phone, shippingAddress, items, paymentMethod, paymentProof } = body;

    // Basic Validation
    if (!customerName || !customerEmail || !phone || !shippingAddress || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Missing required checkout fields: customer details, shipping address, or items." },
        { status: 400 }
      );
    }

    // Payment proof validation - if they clicked QR/UPI pay, proof is required
    if (!paymentProof) {
      return NextResponse.json(
        { error: "Payment proof is required. Please scan the QR code and upload your transaction receipt screenshot." },
        { status: 400 }
      );
    }

    // Address verification
    const { street, city, state, zipCode, country } = shippingAddress;
    if (!street || !city || !state || !zipCode || !country) {
      return NextResponse.json(
        { error: "Missing shipping address components." },
        { status: 400 }
      );
    }

    // Process and validate items
    const orderItems = [];
    let calculatedTotal = 0;

    for (const item of items) {
      if (!item.product || !item.quantity || item.quantity < 1) {
        return NextResponse.json(
          { error: "Invalid item or quantity." },
          { status: 400 }
        );
      }

      // Max copies is 2
      if (item.quantity > 2) {
        return NextResponse.json(
          { error: "You can order at most two copies of this product." },
          { status: 400 }
        );
      }

      const dbProduct = await Product.findById(item.product);
      if (!dbProduct) {
        return NextResponse.json(
          { error: `Product with ID ${item.product} not found.` },
          { status: 404 }
        );
      }

      if (!dbProduct.isActive) {
        return NextResponse.json(
          { error: `Product '${dbProduct.name}' is no longer available.` },
          { status: 400 }
        );
      }

      if (dbProduct.stock < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for '${dbProduct.name}'. Available: ${dbProduct.stock}` },
          { status: 400 }
        );
      }

      // Deduct stock
      dbProduct.stock -= item.quantity;
      await dbProduct.save();

      // Pricing logic: 2 copies of educational product cost 899 total flat
      let itemPrice = dbProduct.price;
      let itemShipping = dbProduct.shippingFee || 0;
      let itemTotal = 0;

      if (dbProduct.category === "education" && item.quantity === 2) {
        itemPrice = 449.5; // 449.50 * 2 = 899 total cost
        itemShipping = 0;
        itemTotal = 899;
      } else {
        itemTotal = itemPrice * item.quantity + itemShipping;
      }

      calculatedTotal += itemTotal;

      orderItems.push({
        product: dbProduct._id,
        name: dbProduct.name,
        price: itemPrice,
        shippingFee: itemShipping,
        quantity: item.quantity,
      });
    }

    const order = new Order({
      customerName,
      customerEmail,
      phone,
      shippingAddress: { street, city, state, zipCode, country },
      items: orderItems,
      totalAmount: calculatedTotal,
      status: "pending",
      paymentMethod: paymentMethod || "UPI/QR",
      paymentStatus: "pending",
      paymentProof,
      user: user ? user._id : undefined,
    });

    await order.save();

    return NextResponse.json(
      { order, message: "Order placed successfully!" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Place order error:", error);
    return NextResponse.json(
      { error: "Failed to place order" },
      { status: 500 }
    );
  }
}
