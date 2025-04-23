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
exports.avatarRouter = void 0;
const express_1 = require("express");
const avatarService_1 = require("../services/avatarService");
const mongodb_1 = require("mongodb");
exports.avatarRouter = (0, express_1.Router)();
// Get all avatars
exports.avatarRouter.get("/", (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const avatars = yield (0, avatarService_1.getAvatars)();
        res.json(avatars);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
}));
// Get avatar by ID
exports.avatarRouter.get("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!mongodb_1.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid avatar ID format" });
        }
        const avatar = yield (0, avatarService_1.getAvatarById)(id);
        if (!avatar) {
            return res.status(404).json({ error: "Avatar not found" });
        }
        res.json(avatar);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
}));
