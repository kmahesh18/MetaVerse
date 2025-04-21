import { prisma } from "../prisma";
import type { User } from "@prisma/client";
import { createUser, getUserById } from "./userService";

export async function addUserToSpace(
	userId: string,
	spaceId: string
): Promise<User | null> {
	// Check if user exists first
	const user = await getUserById(userId);

	if (!user) {
		console.log(`No user found with ID ${userId}, creating temporary record`);

		// Get the space to find its company
		const space = await prisma.space.findUnique({
			where: { id: spaceId },
			select: { companyId: true },
		});

		if (!space) {
			throw new Error(`Space ${spaceId} not found`);
		}

		// Create user with createUser function from userService
		const newUser = await createUser({
			id: userId,
			account: `temp-${userId.substring(0, 8)}`,
			name: `Visitor-${userId.substring(0, 5)}`,
			email: `temp-${userId.substring(0, 8)}@example.com`,
			password: "temporary",
		});

		// Then connect to space and company
		return prisma.user.update({
			where: { id: userId },
			data: {
				spaceId,
				companyId: space.companyId,
			},
		});
	}

	return prisma.user.update({
		where: { id: userId },
		data: { spaceId },
	});
}

export async function removeUserFromSpace(userId: string): Promise<User> {
	return prisma.user.update({
		where: { id: userId },
		data: { spaceId: null },
	});
}

export async function addUserToRoom(
	userId: string,
	roomId: string
): Promise<User> {
	return prisma.user.update({
		where: { id: userId },
		data: {
			room: { connect: { id: roomId } },
		},
	});
}

export async function removeUserFromRoom(userId: string): Promise<User> {
	return prisma.user.update({
		where: { id: userId },
		data: {
			room: { disconnect: true },
		},
	});
}
