import { prisma } from "../prisma";

export async function getRoomById(id: string) {
	return prisma.room.findUnique({
		where: { id },
	});
}

export async function isRoomInSpace(
	roomId: string,
	spaceId: string
): Promise<boolean> {
	const room = await prisma.room.findFirst({
		where: {
			id: roomId,
			spaceId,
		},
	});
	return !!room;
}
