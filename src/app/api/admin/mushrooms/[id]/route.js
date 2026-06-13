import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Mushroom from "@/models/Mushroom";
import User from "@/models/User";
import { getAuthenticatedUser } from "@/lib/auth";
import { sendMushroomApprovedEmail } from "@/lib/mushroomApprovalEmail";

export async function GET(req, { params }) {
  try {
    await connectDB();

    /* ================= AUTH ================= */
    const { user, error } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    /* ================= FETCH ================= */
    const { id } = await params;
    
    const mushroom = await Mushroom.findById(id)
      .populate("submittedBy", "name username email");

    if (!mushroom) {
      return NextResponse.json(
        { error: "Mushroom not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ mushroom }, { status: 200 });
  } catch (error) {
    console.error("Admin get mushroom error:", error);
    return NextResponse.json(
      { error: "Failed to fetch mushroom" },
      { status: 500 }
    );
  }
}

export async function PATCH(req, { params }) {
  try {
    await connectDB();

    /* ================= AUTH ================= */
    const { user: admin, error } = await getAuthenticatedUser();
    if (!admin) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    if (admin.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    /* ================= FETCH MUSHROOM ================= */
    const { id } = await params;
    
    const mushroom = await Mushroom.findById(id);
    if (!mushroom) {
      return NextResponse.json(
        { error: "Mushroom not found" },
        { status: 404 }
      );
    }

    /* ================= PARSE BODY ================= */
    const body = await req.json();
    const {
      commonName,
      scientificName,
      description,
      ecologicalRole,
      texture,
      underside,
      fruitingSurface,
      stemPresence,
      commonUses,
      adminNotes,
      status,
      action,
      rejectionReason,
    } = body;

    const moderationAction =
      action ||
      (status === "approved"
        ? "approve"
        : status === "rejected"
        ? "reject"
        : status === "pending"
        ? "pending"
        : null);

    /* ================= UPDATE FIELDS ================= */
    const updateData = {};

    if (commonName !== undefined) {
      updateData.commonName = commonName || null;
    }
    if (scientificName !== undefined) {
      updateData.scientificName = scientificName || null;
    }
    if (description !== undefined) {
      updateData.description = description || null;
    }
    if (ecologicalRole !== undefined) {
      updateData.ecologicalRole = ecologicalRole || null;
    }
    if (texture !== undefined) {
      updateData.texture = texture || null;
    }
    if (underside !== undefined) {
      updateData.underside = underside || null;
    }
    if (fruitingSurface !== undefined) {
      updateData.fruitingSurface = fruitingSurface || null;
    }
    if (stemPresence !== undefined) {
      updateData.stemPresence = stemPresence || null;
    }
    if (commonUses !== undefined) {
      updateData.commonUses = Array.isArray(commonUses) ? commonUses : [];
    }
    if (adminNotes !== undefined) {
      updateData.adminNotes = adminNotes || null;
    }

    let shouldSendApprovalEmail = false;

    /* ================= HANDLE STATUS ================= */
    if (moderationAction === "approve") {
      const wasApproved = mushroom.status === "approved";
      updateData.status = "approved";
      updateData.reviewedBy = admin._id;
      updateData.approvedAt = new Date();
      updateData.rejectionReason = null;
      
      // Award points to the submitter if this is the first time being approved
      if (!wasApproved && mushroom.submittedBy) {
        await User.findByIdAndUpdate(mushroom.submittedBy, {
          $inc: { points: 1 },
        });
      }

      if (!wasApproved) {
        shouldSendApprovalEmail = true;
        await mushroom.populate("submittedBy", "name username email");
      }
    } else if (moderationAction === "reject") {
      const wasApproved = mushroom.status === "approved";
      updateData.status = "rejected";
      updateData.reviewedBy = admin._id;
      updateData.rejectionReason = rejectionReason || null;
      
      // Remove points if previously approved and now being rejected
      if (wasApproved && mushroom.submittedBy) {
        await User.findByIdAndUpdate(mushroom.submittedBy, {
          $inc: { points: -1 },
        });
      }
    } else if (moderationAction === "pending") {
      const wasApproved = mushroom.status === "approved";
      updateData.status = "pending";
      updateData.reviewedBy = null;
      updateData.approvedAt = null;
      updateData.rejectionReason = null;
      
      // Remove points if previously approved and now set back to pending
      if (wasApproved && mushroom.submittedBy) {
        await User.findByIdAndUpdate(mushroom.submittedBy, {
          $inc: { points: -1 },
        });
      }
    }

    /* ================= SAVE ================= */
    Object.assign(mushroom, updateData);
    await mushroom.save();

    if (
      shouldSendApprovalEmail &&
      mushroom.submittedBy &&
      typeof mushroom.submittedBy === "object"
    ) {
      try {
        await sendMushroomApprovedEmail({
          mushroom,
          recipient: mushroom.submittedBy,
        });
      } catch (emailError) {
        console.error("Failed to send mushroom approval email:", emailError);
      }
    }

    return NextResponse.json(
      { message: "Mushroom updated successfully", mushroom },
      { status: 200 }
    );
  } catch (error) {
    console.error("Admin update mushroom error:", error);
    return NextResponse.json(
      { error: "Failed to update mushroom" },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();

    /* ================= AUTH ================= */
    const { user: admin, error } = await getAuthenticatedUser();
    if (!admin) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    if (admin.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    /* ================= DELETE MUSHROOM ================= */
    const { id } = await params;
    
    const mushroom = await Mushroom.findById(id).populate("submittedBy", "username email");
    
    if (!mushroom) {
      return NextResponse.json(
        { error: "Mushroom not found" },
        { status: 404 }
      );
    }

    // Check if it's a system import
    const isSystemUser =
      mushroom.submittedBy?.email === "system@ecovigyan.org" ||
      mushroom.submittedBy?.username === "system" ||
      mushroom.submittedBy?.name === "System Import";

    if (!isSystemUser) {
      return NextResponse.json(
        { error: "Only system-imported mushrooms can be deleted" },
        { status: 403 }
      );
    }

    await Mushroom.findByIdAndDelete(id);

    return NextResponse.json(
      { message: "Mushroom deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Admin delete mushroom error:", error);
    return NextResponse.json(
      { error: "Failed to delete mushroom" },
      { status: 500 }
    );
  }
}
