"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSpace = createSpace;
exports.getSpaces = getSpaces;
exports.getSpaceById = getSpaceById;
exports.updateSpace = updateSpace;
exports.deleteSpace = deleteSpace;
const uuid_1 = require("uuid");
const prisma_1 = require("../prisma");
function createSpace(companyId, name, numRooms) {
    return __awaiter(this, void 0, void 0, function* () {
        const spaceId = (0, uuid_1.v4)();
        yield prisma_1.prisma.space.create({
            data: {
                id: spaceId,
                name,
                companyId,
                rooms: {
                    create: Array.from({ length: numRooms }, (_, i) => ({
                        id: (0, uuid_1.v4)(),
                        name: `Room-${i + 1}`,
                        companyId,
                    })),
                },
            },
        });
        // Fix: Include rooms in the return value
        return prisma_1.prisma.space.findUnique({
            where: { id: spaceId },
            include: { rooms: true },
        });
    });
}
function getSpaces() {
    return __awaiter(this, void 0, void 0, function* () {
        return prisma_1.prisma.space.findMany();
    });
}
function getSpaceById(id, options) {
    return __awaiter(this, void 0, void 0, function* () {
        return prisma_1.prisma.space.findUnique(Object.assign({ where: { id } }, options));
    });
}
function updateSpace(id, data) {
    return __awaiter(this, void 0, void 0, function* () {
        return prisma_1.prisma.space.update({ where: { id }, data });
    });
}
function deleteSpace(id) {
    return __awaiter(this, void 0, void 0, function* () {
        return prisma_1.prisma.space.delete({ where: { id } });
    });
}
