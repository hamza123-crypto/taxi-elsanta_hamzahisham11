import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  // Extended user profiles
  userProfiles: defineTable({
    userId: v.id("users"),
    name: v.string(),
    phone: v.string(),
    role: v.union(v.literal("passenger"), v.literal("driver"), v.literal("admin")),
    isActive: v.boolean(),
    city: v.optional(v.string()),
  })
    .index("by_user_id", ["userId"])
    .index("by_phone", ["phone"])
    .index("by_role", ["role"]),

  // Driver specific information
  drivers: defineTable({
    userId: v.id("users"),
    carNumber: v.string(),
    licenseNumber: v.string(),
    city: v.string(),
    status: v.union(v.literal("online"), v.literal("offline"), v.literal("busy")),
    verificationStatus: v.union(
      v.literal("pending_verification"), 
      v.literal("verified"), 
      v.literal("rejected")
    ),
    currentLocation: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
    })),
    totalRides: v.number(),
    rating: v.number(),
    isPremium: v.boolean(),
    // Required document storage (optional for premium drivers)
    criminalRecordId: v.optional(v.id("_storage")),
    idCardImageId: v.optional(v.id("_storage")),
    licenseImageId: v.optional(v.id("_storage")),
    // Verification details
    verifiedAt: v.optional(v.number()),
    verifiedBy: v.optional(v.id("users")),
    rejectionReason: v.optional(v.string()),
  })
    .index("by_user_id", ["userId"])
    .index("by_status", ["status"])
    .index("by_verification_status", ["verificationStatus"])
    .index("by_car_number", ["carNumber"])
    .index("by_city", ["city"]),

  // Rides
  rides: defineTable({
    passengerId: v.id("users"),
    driverId: v.optional(v.id("users")),
    pickupLocation: v.object({
      lat: v.number(),
      lng: v.number(),
      address: v.string(),
    }),
    dropoffLocation: v.object({
      lat: v.number(),
      lng: v.number(),
      address: v.string(),
    }),
    estimatedPrice: v.number(),
    finalPrice: v.optional(v.number()),
    distance: v.number(), // in kilometers
    status: v.union(
      v.literal("searching"),
      v.literal("accepted"),
      v.literal("driver_arriving"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    passengerPhone: v.string(),
    driverPhone: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_passenger", ["passengerId"])
    .index("by_driver", ["driverId"])
    .index("by_status", ["status"]),

  // System settings
  settings: defineTable({
    key: v.string(),
    value: v.union(v.string(), v.number(), v.boolean()),
    description: v.string(),
  })
    .index("by_key", ["key"]),

  // Payment records for driver registrations
  paymentRecords: defineTable({
    userId: v.id("users"),
    driverId: v.id("drivers"),
    amount: v.number(),
    type: v.literal("driver_registration"),
    createdAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_driver_id", ["driverId"])
    .index("by_type", ["type"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
