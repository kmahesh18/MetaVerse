"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Space = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const spaceSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true },
    adminId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true },
    activeUsers: [{ type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User' }],
    accessUsers: [{ type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });
exports.Space = mongoose_1.default.model('Space', spaceSchema);
