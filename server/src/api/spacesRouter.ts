import { Router } from "express";
import {
  createSpace,
  giveUserAccesToSpace,
  joinSpace,
  LeaveSpace,
  getAccessibleUserids,
  getAdminid,
  getActiveUserIds,
  getRoomIds,
} from "../services/spaceServices";

export const spacesRouter = Router();

// Create a new space
spacesRouter.post("/", async (req, res) => {
  try {
    const { selectedRoomTypes, adminid } = req.body;
    if (!adminid || !selectedRoomTypes) {
      return res
        .status(400)
        .json({ message: "Missing adminid or selectedRoomTypes" });
    }
    const spaceId = await createSpace(adminid, selectedRoomTypes);
    // Return the ID of the created space
    res.status(201).json({ id: spaceId });
  } catch (error: any) {
    console.error("POST /api/spaces - Error:", error.message);
    // Send a generic error message, specific details logged server-side
    res.status(500).json({ message: error.message || "Error creating space" });
  }
});

// Get space details by ID
spacesRouter.get("/:id", async (req, res) => {
  try {
    const spaceId = req.params.id;
    const [adminId, accessibleUsers, activeUsers, roomIds] = await Promise.all([
      getAdminid(spaceId),
      getAccessibleUserids(spaceId),
      getActiveUserIds(spaceId),
      getRoomIds(spaceId),
    ]);

    // Check if the space exists (e.g., by checking if adminId was found)
    if (!adminId) {
      return res.status(404).json({ message: "Space not found" });
    }

    res.json({
      id: spaceId,
      adminid: adminId,
      accessibleuserids: accessibleUsers,
      activeuserids: activeUsers,
      roomids: roomIds,
    });
  } catch (error: any) {
    console.error(`GET /api/spaces/${req.params.id} - Error:`, error.message);
    res
      .status(500)
      .json({ message: error.message || "Error retrieving space details" });
  }
});

// Give user access to space (Invite)
spacesRouter.post("/:id/access", async (req, res) => {
  try {
    const { adminId, emailId } = req.body;
    const spaceId = req.params.id;

    if (!adminId || !emailId || !spaceId) {
      return res
        .status(400)
        .json({
          message: "Missing required fields: adminId, emailId, spaceId",
        });
    }

    const invitedClerkId = await giveUserAccesToSpace(
      adminId,
      spaceId,
      emailId,
    );
    res.json({ message: "User invited successfully", clerkId: invitedClerkId });
  } catch (error: any) {
    console.error(
      `POST /api/spaces/${req.params.id}/access - Error:`,
      error.message,
    );
    // Handle specific known errors from the service layer if needed
    if (error.message.includes("not the admin")) {
      return res
        .status(403)
        .json({ message: "Admin privileges required to invite users." });
    }
    if (error.message.includes("not found")) {
      return res.status(404).json({ message: error.message }); // e.g., "User not found", "Space not found"
    }
    res.status(500).json({ message: error.message || "Error inviting user" });
  }
});

// Join space (Mark user as active)
spacesRouter.post("/:id/join", async (req, res) => {
  try {
    console.log("Space router reached");
    const { clerkId } = req.body;
    const spaceId = req.params.id;

    if (!clerkId || !spaceId) {
      return res
        .status(400)
        .json({ message: "Missing required fields: clerkId, spaceId" });
    }

    const joinedClerkId = await joinSpace(spaceId, clerkId);
    res.json({ message: "Joined space successfully", clerkId: clerkId });
  } catch (error: any) {
    console.error(
      `POST /api/spaces/${req.params.id}/join - Error:`,
      error.message,
    );
    if (error.message.includes("not found")) {
      return res.status(404).json({ message: error.message });
    }
    if (error.message.includes("does not have access")) {
      return res
        .status(403)
        .json({ message: "User does not have access to this space." });
    }
    res.status(500).json({ message: error.message || "Error joining space" });
  }
});

// Leave space (Mark user as inactive)
spacesRouter.post("/:id/leave", async (req, res) => {
  try {
    const { clerkId } = req.body;
    const spaceId = req.params.id;

    if (!clerkId || !spaceId) {
      return res
        .status(400)
        .json({ message: "Missing required fields: clerkId, spaceId" });
    }

    const leftClerkId = await LeaveSpace(spaceId, clerkId);
    res.json({ message: "Left space successfully", clerkId: leftClerkId });
  } catch (error: any) {
    console.error(
      `POST /api/spaces/${req.params.id}/leave - Error:`,
      error.message,
    );
    // Leaving is generally permissive, but log errors
    res.status(500).json({ message: error.message || "Error leaving space" });
  }
});

spacesRouter.get("/:id/rooms", async (req, res) => {
  try {
    const spaceId = req.params.id;
    const roomIds = await getRoomIds(spaceId);
    res.json(roomIds);
  } catch (error: any) {
    console.error(
      `GET /api/spaces/${req.params.id}/rooms - Error:`,
      error.message,
    );
    res
      .status(500)
      .json({ message: error.message || "Error retrieving rooms" });
  }
});
