import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Check if user is admin
async function isAdmin(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return false;

  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_user_id", (q) => q.eq("userId", userId))
    .unique();

  return profile?.role === "admin";
}

// Get all users (admin only)
export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAdmin(ctx))) {
      throw new Error("Admin access required");
    }

    const profiles = await ctx.db.query("userProfiles").collect();
    
    const usersWithDetails = await Promise.all(
      profiles.map(async (profile) => {
        const user = await ctx.db.get(profile.userId);
        let driverInfo = null;
        
        if (profile.role === "driver") {
          driverInfo = await ctx.db
            .query("drivers")
            .withIndex("by_user_id", (q) => q.eq("userId", profile.userId))
            .unique();
        }

        return {
          ...profile,
          email: user?.email,
          driverInfo,
        };
      })
    );

    return usersWithDetails;
  },
});

// Get all drivers with complete details (admin only)
export const getAllDrivers = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAdmin(ctx))) {
      throw new Error("Admin access required");
    }

    // Get all driver profiles
    const driverProfiles = await ctx.db
      .query("userProfiles")
      .withIndex("by_role", (q) => q.eq("role", "driver"))
      .collect();
    
    const driversWithDetails = await Promise.all(
      driverProfiles.map(async (profile) => {
        const user = await ctx.db.get(profile.userId);
        const driver = await ctx.db
          .query("drivers")
          .withIndex("by_user_id", (q) => q.eq("userId", profile.userId))
          .unique();

        // Get document URLs
        const criminalRecordUrl = driver?.criminalRecordId ? await ctx.storage.getUrl(driver.criminalRecordId) : null;
        const idCardUrl = driver?.idCardImageId ? await ctx.storage.getUrl(driver.idCardImageId) : null;
        const licenseUrl = driver?.licenseImageId ? await ctx.storage.getUrl(driver.licenseImageId) : null;

        // Get payment records for this driver
        const paymentRecords = driver ? await ctx.db
          .query("paymentRecords")
          .withIndex("by_driver_id", (q) => q.eq("driverId", driver._id))
          .collect() : [];

        const totalPaid = paymentRecords.reduce((sum, record) => sum + record.amount, 0);

        return {
          ...profile,
          email: user?.email,
          driver,
          criminalRecordUrl,
          idCardUrl,
          licenseUrl,
          totalPaid,
        };
      })
    );

    return driversWithDetails;
  },
});

// Get pending verifications (admin only)
export const getPendingVerifications = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAdmin(ctx))) {
      throw new Error("Admin access required");
    }

    const pendingDrivers = await ctx.db
      .query("drivers")
      .withIndex("by_verification_status", (q) => q.eq("verificationStatus", "pending_verification"))
      .collect();

    const driversWithDetails = await Promise.all(
      pendingDrivers.map(async (driver) => {
        const profile = await ctx.db
          .query("userProfiles")
          .withIndex("by_user_id", (q) => q.eq("userId", driver.userId))
          .unique();

        const user = await ctx.db.get(driver.userId);

        // Get document URLs (handle optional documents for premium drivers)
        const criminalRecordUrl = driver.criminalRecordId ? await ctx.storage.getUrl(driver.criminalRecordId) : null;
        const idCardUrl = driver.idCardImageId ? await ctx.storage.getUrl(driver.idCardImageId) : null;
        const licenseUrl = driver.licenseImageId ? await ctx.storage.getUrl(driver.licenseImageId) : null;

        return {
          ...driver,
          profile,
          email: user?.email,
          criminalRecordUrl,
          idCardUrl,
          licenseUrl,
        };
      })
    );

    return driversWithDetails;
  },
});

// Verify or reject driver (admin only)
export const verifyDriver = mutation({
  args: {
    driverId: v.id("drivers"),
    action: v.union(v.literal("approve"), v.literal("reject")),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!(await isAdmin(ctx))) {
      throw new Error("Admin access required");
    }

    const driver = await ctx.db.get(args.driverId);
    if (!driver) throw new Error("Driver not found");

    if (args.action === "approve") {
      await ctx.db.patch(args.driverId, {
        verificationStatus: "verified",
        verifiedAt: Date.now(),
        verifiedBy: userId!,
        rejectionReason: undefined,
      });
    } else {
      await ctx.db.patch(args.driverId, {
        verificationStatus: "rejected",
        rejectionReason: args.rejectionReason || "Documents do not meet requirements",
      });
    }

    return args.driverId;
  },
});

// Get all rides (admin only)
export const getAllRides = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAdmin(ctx))) {
      throw new Error("Admin access required");
    }

    const rides = await ctx.db.query("rides").order("desc").take(100);
    
    const ridesWithDetails = await Promise.all(
      rides.map(async (ride) => {
        const passengerProfile = await ctx.db
          .query("userProfiles")
          .withIndex("by_user_id", (q) => q.eq("userId", ride.passengerId))
          .unique();

        let driverProfile = null;
        if (ride.driverId) {
          driverProfile = await ctx.db
            .query("userProfiles")
            .withIndex("by_user_id", (q) => q.eq("userId", ride.driverId!))
            .unique();
        }

        return {
          ...ride,
          passengerName: passengerProfile?.name || "Unknown",
          driverName: driverProfile?.name || "No Driver",
        };
      })
    );

    return ridesWithDetails;
  },
});

// Get dashboard stats (admin only)
export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAdmin(ctx))) {
      throw new Error("Admin access required");
    }

    const totalUsers = await ctx.db.query("userProfiles").collect();
    const totalDrivers = totalUsers.filter(u => u.role === "driver");
    const totalPassengers = totalUsers.filter(u => u.role === "passenger");
    
    const allDrivers = await ctx.db.query("drivers").collect();
    const verifiedDrivers = allDrivers.filter(d => d.verificationStatus === "verified");
    const pendingDrivers = allDrivers.filter(d => d.verificationStatus === "pending_verification");
    
    const onlineDrivers = await ctx.db
      .query("drivers")
      .withIndex("by_status", (q) => q.eq("status", "online"))
      .collect();

    const totalRides = await ctx.db.query("rides").collect();
    const completedRides = totalRides.filter(r => r.status === "completed");
    const activeRides = totalRides.filter(r => 
      ["searching", "accepted", "driver_arriving", "in_progress"].includes(r.status)
    );

    // Calculate revenue ONLY from driver registration fees (not rides)
    const paymentRecords = await ctx.db.query("paymentRecords").collect();
    const totalRevenue = paymentRecords.reduce((sum, record) => sum + record.amount, 0);

    return {
      totalUsers: totalUsers.length,
      totalDrivers: totalDrivers.length,
      totalPassengers: totalPassengers.length,
      verifiedDrivers: verifiedDrivers.length,
      pendingDrivers: pendingDrivers.length,
      onlineDrivers: onlineDrivers.length,
      totalRides: totalRides.length,
      completedRides: completedRides.length,
      activeRides: activeRides.length,
      totalRevenue,
    };
  },
});

// Toggle user active status (admin only)
export const toggleUserStatus = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) {
      throw new Error("Admin access required");
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .unique();

    if (!profile) throw new Error("User not found");

    await ctx.db.patch(profile._id, {
      isActive: !profile.isActive,
    });

    return profile._id;
  },
});

// Initialize system settings
export const initializeSettings = mutation({
  args: {},
  handler: async (ctx) => {
    if (!(await isAdmin(ctx))) {
      throw new Error("Admin access required");
    }

    const settings = [
      { key: "base_price", value: 5, description: "Base price for rides (جنيه)" },
      { key: "price_per_km", value: 3, description: "Price per kilometer (جنيه)" },
      { key: "commission_rate", value: 0.1, description: "Commission rate (10%)" },
    ];

    for (const setting of settings) {
      const existing = await ctx.db
        .query("settings")
        .withIndex("by_key", (q) => q.eq("key", setting.key))
        .unique();

      if (!existing) {
        await ctx.db.insert("settings", setting);
      }
    }

    return "Settings initialized";
  },
});

// Delete user (admin only)
export const deleteUser = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) {
      throw new Error("Admin access required");
    }

    // Get user profile
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .unique();

    if (!profile) throw new Error("User profile not found");

    // If driver, delete driver record and documents from storage
    if (profile.role === "driver") {
      const driver = await ctx.db
        .query("drivers")
        .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
        .unique();

      if (driver) {
        // Delete stored documents
        if (driver.criminalRecordId) {
          await ctx.storage.delete(driver.criminalRecordId);
        }
        if (driver.idCardImageId) {
          await ctx.storage.delete(driver.idCardImageId);
        }
        if (driver.licenseImageId) {
          await ctx.storage.delete(driver.licenseImageId);
        }
        
        // Delete payment records for this driver
        const paymentRecords = await ctx.db
          .query("paymentRecords")
          .withIndex("by_driver_id", (q) => q.eq("driverId", driver._id))
          .collect();
        
        for (const record of paymentRecords) {
          await ctx.db.delete(record._id);
        }
        
        // Delete driver record
        await ctx.db.delete(driver._id);
      }
    }

    // Delete user profile
    await ctx.db.delete(profile._id);

    // Delete auth account (this will also delete the user)
    // Note: Convex Auth doesn't provide a direct way to delete users from server functions
    // The user will be orphaned but won't have a profile
    
    return args.userId;
  },
});
