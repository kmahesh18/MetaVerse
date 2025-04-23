"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomType = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const roomTypeSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true, unique: true },
    description: String,
    sizeX: { type: Number, default: 800 },
    sizeY: { type: Number, default: 600 },
    defaultAssets: [{
            assetId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Asset' },
            posX: Number,
            posY: Number
        }]
}, { timestamps: true });
exports.RoomType = mongoose_1.default.model('RoomType', roomTypeSchema);
