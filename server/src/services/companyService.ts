import { prisma } from "../prisma";

export async function createCompany(name: string) {
	return prisma.company.create({ data: { name } });
}

export async function getCompanies() {
	return prisma.company.findMany();
}
