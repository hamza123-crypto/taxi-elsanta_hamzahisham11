import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Calculate price based on distance
function calculatePrice(distance: number): number {
  const basePrice = 5; // 5 جنيه فتح عداد
  const pricePerKm = 3; // 3 جنيه لكل كيلو
  return basePrice + (distance * pricePerKm);
}

// Create a new ride request
export const createRide = mutation({
  args: {
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
    distance: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile || profile.role !== "passenger") {
      throw new Error("Only passengers can create rides");
    }

    // Check if user has an active ride
    const activeRide = await ctx.db
      .query("rides")
      .withIndex("by_passenger", (q) => q.eq("passengerId", userId))
      .filter((q) => 
        q.or(
          q.eq(q.field("status"), "searching"),
          q.eq(q.field("status"), "accepted"),
          q.eq(q.field("status"), "driver_arriving"),
          q.eq(q.field("status"), "in_progress")
        )
      )
      .first();

    if (activeRide) {
      throw new Error("You already have an active ride");
    }

    const estimatedPrice = calculatePrice(args.distance);

    const rideId = await ctx.db.insert("rides", {
      passengerId: userId,
      pickupLocation: args.pickupLocation,
      dropoffLocation: args.dropoffLocation,
      estimatedPrice,
      distance: args.distance,
      status: "searching",
      passengerPhone: profile.phone,
      notes: args.notes,
    });

    return rideId;
  },
});

// Get available rides for drivers
export const getAvailableRides = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const driver = await ctx.db
      .query("drivers")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!driver || driver.status !== "online") return [];

    const rides = await ctx.db
      .query("rides")
      .withIndex("by_status", (q) => q.eq("status", "searching"))
      .order("desc")
      .take(10);

    const ridesWithPassenger = await Promise.all(
      rides.map(async (ride) => {
        const passenger = await ctx.db
          .query("userProfiles")
          .withIndex("by_user_id", (q) => q.eq("userId", ride.passengerId))
          .unique();
        
        return {
          ...ride,
          passengerName: passenger?.name || "Unknown",
        };
      })
    );

    return ridesWithPassenger;
  },
});

// Accept a ride (driver)
export const acceptRide = mutation({
  args: {
    rideId: v.id("rides"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const driver = await ctx.db
      .query("drivers")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!driver || driver.status !== "online") {
      throw new Error("Driver not available");
    }

    const ride = await ctx.db.get(args.rideId);
    if (!ride || ride.status !== "searching") {
      throw new Error("Ride not available");
    }

    const driverProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!driverProfile) throw new Error("Driver profile not found");

    // Update ride
    await ctx.db.patch(args.rideId, {
      driverId: userId,
      status: "accepted",
      driverPhone: driverProfile.phone,
    });

    // Update driver status to busy
    await ctx.db.patch(driver._id, {
      status: "busy",
    });

    return args.rideId;
  },
});

// Update ride status
export const updateRideStatus = mutation({
  args: {
    rideId: v.id("rides"),
    status: v.union(
      v.literal("driver_arriving"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    finalPrice: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const ride = await ctx.db.get(args.rideId);
    if (!ride) throw new Error("Ride not found");

    // Check if user is authorized to update this ride
    if (ride.passengerId !== userId && ride.driverId !== userId) {
      throw new Error("Not authorized");
    }

    const updateData: any = { status: args.status };
    if (args.finalPrice !== undefined) {
      updateData.finalPrice = args.finalPrice;
    }

    await ctx.db.patch(args.rideId, updateData);

    // If ride is completed or cancelled, update driver status
    if (args.status === "completed" || args.status === "cancelled") {
      if (ride.driverId) {
        const driver = await ctx.db
          .query("drivers")
          .withIndex("by_user_id", (q) => q.eq("userId", ride.driverId!))
          .unique();

        if (driver) {
          const newTotalRides = args.status === "completed" ? driver.totalRides + 1 : driver.totalRides;
          await ctx.db.patch(driver._id, {
            status: "online",
            totalRides: newTotalRides,
          });
        }
      }
    }

    return args.rideId;
  },
});

// Get user's rides
export const getUserRides = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) return [];

    let rides;
    if (profile.role === "passenger") {
      rides = await ctx.db
        .query("rides")
        .withIndex("by_passenger", (q) => q.eq("passengerId", userId))
        .order("desc")
        .take(20);
    } else if (profile.role === "driver") {
      rides = await ctx.db
        .query("rides")
        .withIndex("by_driver", (q) => q.eq("driverId", userId))
        .order("desc")
        .take(20);
    } else {
      return [];
    }

    return rides;
  },
});

// Get current active ride
export const getCurrentRide = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) return null;

    let ride;
    if (profile.role === "passenger") {
      ride = await ctx.db
        .query("rides")
        .withIndex("by_passenger", (q) => q.eq("passengerId", userId))
        .filter((q) => 
          q.or(
            q.eq(q.field("status"), "searching"),
            q.eq(q.field("status"), "accepted"),
            q.eq(q.field("status"), "driver_arriving"),
            q.eq(q.field("status"), "in_progress")
          )
        )
        .first();
    } else if (profile.role === "driver") {
      ride = await ctx.db
        .query("rides")
        .withIndex("by_driver", (q) => q.eq("driverId", userId))
        .filter((q) => 
          q.or(
            q.eq(q.field("status"), "accepted"),
            q.eq(q.field("status"), "driver_arriving"),
            q.eq(q.field("status"), "in_progress")
          )
        )
        .first();
    }

    if (!ride) return null;

    // Get additional info based on user role
    if (profile.role === "passenger" && ride.driverId) {
      const driverProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_user_id", (q) => q.eq("userId", ride.driverId!))
        .unique();
      
      const driver = await ctx.db
        .query("drivers")
        .withIndex("by_user_id", (q) => q.eq("userId", ride.driverId!))
        .unique();

      return {
        ...ride,
        driverName: driverProfile?.name,
        carNumber: driver?.carNumber,
      };
    } else if (profile.role === "driver") {
      const passengerProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_user_id", (q) => q.eq("userId", ride.passengerId))
        .unique();

      return {
        ...ride,
        passengerName: passengerProfile?.name,
      };
    }

    return ride;
  },
});

// Delete ride (admin only)
export const deleteRide = mutation({
  args: {
    rideId: v.id("rides"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    
    // Check if admin
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile || profile.role !== "admin") {
      throw new Error("Admin access required");
    }

    const ride = await ctx.db.get(args.rideId);
    if (!ride) throw new Error("Ride not found");

    // If ride was completed, we might need to adjust revenue tracking
    // For now, just delete the ride
    await ctx.db.delete(args.rideId);

    // If driver was assigned and is still busy, set them back to online
    if (ride.driverId && ["accepted", "driver_arriving", "in_progress"].includes(ride.status)) {
      const driver = await ctx.db
        .query("drivers")
        .withIndex("by_user_id", (q) => q.eq("userId", ride.driverId!))
        .unique();

      if (driver) {
        await ctx.db.patch(driver._id, {
          status: "online",
        });
      }
    }

    return args.rideId;
  },
});
