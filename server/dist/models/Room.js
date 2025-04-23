"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Room = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const roomSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
    roomTypeId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'RoomType', required: true },
    spaceId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Space', required: true },
    users: [{ type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User' }],
    roomAssets: [{
            assetId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Asset' },
            posX: Number,
            posY: Number
        }]
}, { timestamps: true });
exports.Room = mongoose_1.default.model('Room', roomSchema);
