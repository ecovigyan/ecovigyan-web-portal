import mongoose from "mongoose";

// The website reads trail points as { lat, lng } and the mobile apps read
// { latitude, longitude }. Both pairs are stored so neither client loses data
// when the other one saves; the pre-validate hook below keeps them in sync.
const pointSchema = new mongoose.Schema(
  {
    lat: { type: Number },
    lng: { type: Number },
    latitude: { type: Number },
    longitude: { type: Number },
  },
  { _id: false }
);

const trailSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    difficulty: {
      type: String,
      enum: ["Easy", "Moderate", "Hard"],
      default: "Moderate",
    },

    // Total routed walking distance in kilometres.
    length: {
      type: Number,
      min: 0,
    },

    location: {
      type: {
        type: String,
        enum: ["trail"],
        default: "trail",
      },
      // The trailhead: where a walker must physically be to start.
      currentLocation: pointSchema,
      center: pointSchema,
      boundary: {
        type: mongoose.Schema.Types.Mixed, // Can be array of coordinates or null
      },
    },

    mushrooms: [
      {
        type: mongoose.Schema.Types.Mixed, // Store full mushroom data as embedded documents
      },
    ],
  },
  {
    timestamps: true,
  }
);

const fillPoint = (point) => {
  if (!point) return;
  if (point.latitude == null && point.lat != null) point.latitude = point.lat;
  if (point.longitude == null && point.lng != null) point.longitude = point.lng;
  if (point.lat == null && point.latitude != null) point.lat = point.latitude;
  if (point.lng == null && point.longitude != null) point.lng = point.longitude;
};

trailSchema.pre("validate", function syncPointShapes() {
  fillPoint(this.location?.currentLocation);
  fillPoint(this.location?.center);
});

// Index for faster queries
trailSchema.index({ user: 1, createdAt: -1 });

export default mongoose.models.Trail ||
  mongoose.model("Trail", trailSchema);
