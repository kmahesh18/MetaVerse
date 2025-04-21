import { prisma } from "../prisma";

export async function createUser(data: {
   id:string;
	account: string;
	name: string;
	email: string;
	password: string;
}) {
	return prisma.user.create({ data });
}

export async function getUsers() {
	return prisma.user.findMany();
}

export async function getUserById(id: string) {
	return prisma.user.findUnique({ where: { id } });
}

export async function updateUser(
	id: string,
	data: Partial<{
		account: string;
		name: string;
		email: string;
		password: string;
		posX: number;
		posY: number;
		roomId: string | null;
		companyId: string | null;
		roleId: string | null;
	}>
) {
	return prisma.user.update({ where: { id }, data });
}

export async function deleteUser(id: string) {
	return prisma.user.delete({ where: { id } });
}
