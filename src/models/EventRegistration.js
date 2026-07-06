import mongoose from "mongoose";

const eventRegistrationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    role: {
      type: String,
      required: true,
      trim: true,
    },
    emailSent: {
      type: Boolean,
      default: false,
    },
    emailError: {
      type: String,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Indexes for query optimization
eventRegistrationSchema.index({ email: 1 });
eventRegistrationSchema.index({ createdAt: -1 });

// Delete existing model in development to avoid OverwriteModelError
if (mongoose.models.EventRegistration) {
  delete mongoose.models.EventRegistration;
}

const EventRegistration = mongoose.model(
  "EventRegistration",
  eventRegistrationSchema
);

export default EventRegistration;
