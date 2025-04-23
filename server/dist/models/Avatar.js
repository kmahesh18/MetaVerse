"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Avatar = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const avatarSchema = new mongoose_1.default.Schema({
    avatarId: { type: String, required: true },
    name: { type: String, required: true },
    previewUrl: { type: String, required: true }
}, { timestamps: true });
exports.Avatar = mongoose_1.default.model('Avatar', avatarSchema);
