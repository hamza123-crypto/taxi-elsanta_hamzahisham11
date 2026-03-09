import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// El-Santa Center villages and cities
const EGYPTIAN_CITIES = [
  "السنطة", // مدينة (عاصمة المركز)
  "شبراقاص", // قرية
  "الجعفرية", // قرية
  "كفر كلا الباب", // قرية
  "بلكيم", // قرية
  "ميت يزيد", // قرية
  "القرشية", // قرية
  "شنراق", // قرية
  "دمنهور الوحش", // قرية
  "ميت حواي", // قرية
  "ميت غزال", // قرية
  "مسحلة", // قرية
  "كفر الحاج داود", // قرية
  "كفر سالم النحال", // قرية
  "كفر الجعفرية", // قرية
  "كفر ميت يزيد", // قرية
  "تطاي", // قرية
  "كفر شبراقاص", // قرية
  "كفر بلكيم", // قرية
  "الكرما", // قرية
];

// Admin secret code
const ADMIN_SECRET_CODE = "hazo123#fg";

// Driver verification code (required for all drivers)
const DRIVER_VERIFICATION_CODE = "12335";

// Get current user profile
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user) return null;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    return {
      ...user,
      profile,
    };
  },
});

// Create user profile
export const createProfile = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    role: v.union(v.literal("passenger"), v.literal("driver")),
    city: v.optional(v.string()),
    carNumber: v.optional(v.string()),
    licenseNumber: v.optional(v.string()),
    criminalRecordId: v.optional(v.id("_storage")),
    idCardImageId: v.optional(v.id("_storage")),
    licenseImageId: v.optional(v.id("_storage")),
    adminCode: v.optional(v.string()),
    driverCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if profile already exists
    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (existingProfile) {
      throw new Error("Profile already exists");
    }

    // Check admin code if provided
    let finalRole: "passenger" | "driver" | "admin" = args.role;
    
    if (args.adminCode === ADMIN_SECRET_CODE) {
      finalRole = "admin";
    }

    // Verify driver code for all drivers
    if (finalRole === "driver") {
      if (!args.driverCode || args.driverCode !== DRIVER_VERIFICATION_CODE) {
        throw new Error("كود السائق غير صحيح. يجب إدخال كود 12335");
      }
    }

    // Validate city for drivers
    if (finalRole === "driver" && (!args.city || !EGYPTIAN_CITIES.includes(args.city))) {
      throw new Error("Please select a valid city");
    }

    // Validate required documents for ALL drivers
    if (finalRole === "driver") {
      if (!args.carNumber || !args.licenseNumber) {
        throw new Error("Car number and license number are required for drivers");
      }
      if (!args.criminalRecordId || !args.idCardImageId || !args.licenseImageId) {
        throw new Error("All documents (Criminal Record, ID Card, License) are required for drivers");
      }
    }

    // Create user profile
    const profileId = await ctx.db.insert("userProfiles", {
      userId,
      name: args.name,
      phone: args.phone,
      role: finalRole,
      isActive: true,
      city: args.city,
    });

    // If driver, create driver record - ALL drivers need verification
    if (finalRole === "driver" && args.carNumber && args.licenseNumber) {
      const driverId = await ctx.db.insert("drivers", {
        userId,
        carNumber: args.carNumber,
        licenseNumber: args.licenseNumber,
        city: args.city!,
        status: "offline",
        totalRides: 0,
        rating: 5.0,
        isPremium: false, // No premium drivers - everyone needs review
        verificationStatus: "pending_verification", // ALL drivers must be reviewed
        criminalRecordId: args.criminalRecordId!,
        idCardImageId: args.idCardImageId!,
        licenseImageId: args.licenseImageId!,
      });

      // Create payment record for driver registration fee (200 EGP)
      await ctx.db.insert("paymentRecords", {
        userId,
        driverId,
        amount: 200,
        type: "driver_registration",
        createdAt: Date.now(),
      });
    }

    return profileId;
  },
});

// Generate upload URL for documents
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Get cities list
export const getCities = query({
  args: {},
  handler: async () => {
    return EGYPTIAN_CITIES;
  },
});

// Update driver status - ONLY FOR VERIFIED DRIVERS
export const updateDriverStatus = mutation({
  args: {
    status: v.union(v.literal("online"), v.literal("offline")),
    location: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const driver = await ctx.db
      .query("drivers")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!driver) throw new Error("Driver not found");

    // Check if driver is verified
    if (driver.verificationStatus !== "verified") {
      throw new Error("Driver must be verified before going online");
    }

    await ctx.db.patch(driver._id, {
      status: args.status,
      currentLocation: args.location,
    });

    return driver._id;
  },
});

// Get driver info
export const getDriverInfo = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const driver = await ctx.db
      .query("drivers")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!driver) return null;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    return {
      ...driver,
      profile,
    };
  },
});
