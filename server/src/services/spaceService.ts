import { v4 } from "uuid";
import { prisma } from "../prisma";
// Optional: Add a more specific return type that includes rooms
import { Space, Room } from "@prisma/client";

type SpaceWithRooms = Space & {
	rooms: Room[];
};

export async function createSpace(
	companyId: string,
	name: string,
	numRooms: number
): Promise<SpaceWithRooms | null> {
	const spaceId = v4();
	await prisma.space.create({
		data: {
			id: spaceId,
			name,
			companyId,
			rooms: {
				create: Array.from({ length: numRooms }, (_, i) => ({
					id: v4(),
					name: `Room-${i + 1}`,
					companyId,
				})),
			},
		},
	});
	// Fix: Include rooms in the return value
	return prisma.space.findUnique({
		where: { id: spaceId },
		include: { rooms: true },
	});
}

export async function getSpaces() {
	return prisma.space.findMany();
}

export async function getSpaceById(
	id: string,
	options?: Omit<Parameters<typeof prisma.space.findUnique>[0], "where">
): Promise<SpaceWithRooms | null> {
	return prisma.space.findUnique({
		where: { id },
		...options,
	}) as Promise<SpaceWithRooms | null>;
}

export async function updateSpace(
	id: string,
	data: Partial<{ name: string; description: string }>
) {
	return prisma.space.update({ where: { id }, data });
}

export async function deleteSpace(id: string) {
	return prisma.space.delete({ where: { id } });
}
