import { Router } from "express";
import {
	createSpace as svcCreateSpace,
	getSpaces,
	getSpaceById,
	updateSpace,
	deleteSpace,
} from "../services/spaceService";
import {
	addUserToSpace,
	removeUserFromSpace,
} from "../services/membershipService";

// Remove getUserById import from here if not used elsewhere in this file
// import{ getUserById } from "../services/userService";

export const spaceRouter = Router();

spaceRouter.post("/", async (req, res) => {
	const { companyId, name, numRooms = 1 } = req.body;
	const space = await svcCreateSpace(companyId, name, numRooms);
	res.status(201).json(space);
});

spaceRouter.get("/", async (_req, res) => {
	const list = await getSpaces();
	res.json(list);
});

spaceRouter.get("/:id", async (req, res) => {
	const space = await getSpaceById(req.params.id);
	if (space) res.json(space);
	else res.status(404).send("Not found");
});

spaceRouter.put("/:id", async (req, res) => {
	const updated = await updateSpace(req.params.id, req.body);
	res.json(updated);
});

spaceRouter.delete("/:id", async (req, res) => {
	await deleteSpace(req.params.id);
	res.status(204).end();
});

spaceRouter.post("/:id/join", async (req, res) => {
	const { userId } = req.body;
	const spaceId = req.params.id;

	if (!userId) {
		return res
			.status(400)
			.json({ error: "userId is required in the request body" });
	}

	try {
		// 1. Update the User record to set their spaceId
		// This function handles finding/creating the user and setting the spaceId
		const updatedUser = await addUserToSpace(userId, spaceId);

		if (!updatedUser) {
			// This might happen if the temporary user creation failed unexpectedly
			return res.status(500).json({ error: "Failed to add user to space" });
		}

		// 2. Get the details of the space (including rooms) to send back
		const space = await getSpaceById(spaceId, { include: { rooms: true } });

		if (!space) {
			// Although addUserToSpace might create a user, the space itself might not exist
			// Or maybe the user update happened but fetching the space failed.
			// It's good practice to keep this check.
			return res
				.status(404)
				.json({ error: `Space with ID ${spaceId} not found` });
		}

		// 3. Send the successful response
		res.json({
			success: true,
			spaceId: space.id, // Use the ID from the fetched space object
			rooms: space.rooms.map((r) => r.id),
		});
	} catch (error) {
		console.error(`Error joining space ${spaceId} for user ${userId}:`, error);
		// Send a generic error message or be more specific based on the error type
		res
			.status(500)
			.json({
				error: `An error occurred while joining the space: ${
					(error as Error).message
				}`,
			});
	}
});

spaceRouter.post("/:id/leave", async (req, res) => {
	const { userId } = req.body;

	try {
		await removeUserFromSpace(userId);
		res.json({ success: true });
	} catch (error) {
		res.status(400).json({ error: (error as Error).message });
	}
});
