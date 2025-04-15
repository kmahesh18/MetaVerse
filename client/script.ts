import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    const user1 = await prisma.user.create({
        data: { name: "Mahesh" },
    });
    console.log(user1);
}

main()
    .catch((e) => {
        console.error(e.message);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
