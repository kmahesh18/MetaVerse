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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSpace = createSpace;
exports.getSpaces = getSpaces;
exports.getSpaceById = getSpaceById;
exports.updateSpace = updateSpace;
exports.deleteSpace = deleteSpace;
const Space_1 = require("../models/Space");
const Room_1 = require("../models/Room");
const RoomType_1 = require("../models/RoomType");
const mongoose_1 = __importDefault(require("mongoose"));
function createSpace(adminId_1, name_1) {
    return __awaiter(this, arguments, void 0, function* (adminId, name, numRooms = 1) {
        const session = yield mongoose_1.default.startSession();
        try {
            session.startTransaction();
            // Create the space
            const space = yield Space_1.Space.create([{
                    name,
                    adminId,
                    activeUsers: [adminId],
                    accessUsers: [adminId]
                }], { session });
            // Get default room type or create one if it doesn't exist
            let defaultRoomType = yield RoomType_1.RoomType.findOne({ name: 'default' });
            if (!defaultRoomType) {
                const createdRoomTypes = yield RoomType_1.RoomType.create([{
                        name: 'default',
                        description: 'Default room type',
                        sizeX: 800,
                        sizeY: 600
                    }], { session });
                defaultRoomType = createdRoomTypes[0];
            }
            // Create rooms
            const rooms = yield Room_1.Room.create(Array(numRooms).fill(0).map((_, i) => ({
                name: `Room-${i + 1}`,
                spaceId: space[0]._id,
                roomTypeId: defaultRoomType._id,
                isDefault: i === 0
            })), { session });
            yield session.commitTransaction();
            return Space_1.Space.findById(space[0]._id).populate('rooms');
        }
        catch (error) {
            yield session.abortTransaction();
            console.error('Error in createSpace:', error);
            throw error;
        }
        finally {
            session.endSession();
        }
    });
}
function getSpaces() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return Space_1.Space.find().populate('rooms');
        }
        catch (error) {
            console.error('Error in getSpaces:', error);
            throw error;
        }
    });
}
function getSpaceById(id, options) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const query = Space_1.Space.findById(id);
            if ((_a = options === null || options === void 0 ? void 0 : options.include) === null || _a === void 0 ? void 0 : _a.rooms) {
                query.populate('rooms');
            }
            return query;
        }
        catch (error) {
            console.error('Error in getSpaceById:', error);
            throw error;
        }
    });
}
function updateSpace(id, data) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return Space_1.Space.findByIdAndUpdate(id, data, { new: true });
        }
        catch (error) {
            console.error('Error in updateSpace:', error);
            throw error;
        }
    });
}
function deleteSpace(id) {
    return __awaiter(this, void 0, void 0, function* () {
        const session = yield mongoose_1.default.startSession();
        try {
            session.startTransaction();
            // Delete all rooms in the space
            yield Room_1.Room.deleteMany({ spaceId: id }, { session });
            // Delete the space
            yield Space_1.Space.findByIdAndDelete(id, { session });
            yield session.commitTransaction();
        }
        catch (error) {
            yield session.abortTransaction();
            console.error('Error in deleteSpace:', error);
            throw error;
        }
        finally {
            session.endSession();
        }
    });
}
