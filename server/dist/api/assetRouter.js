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
exports.assetRouter = void 0;
const express_1 = require("express");
const assetService_1 = require("../services/assetService");
const mongodb_1 = require("mongodb");
exports.assetRouter = (0, express_1.Router)();
// Get all avatars
exports.assetRouter.get("/", (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const assets = yield (0, assetService_1.getAssets)();
        res.json(assets);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
}));
// Get avatar by ID
exports.assetRouter.get("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!mongodb_1.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid asset ID format" });
        }
        const asset = yield (0, assetService_1.getAssetById)(id);
        if (!asset) {
            return res.status(404).json({ error: "Asset not found" });
        }
        res.json(asset);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
}));
// Get avatar assets
exports.assetRouter.get("/avatars", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const avatarAssets = yield (0, assetService_1.getAvatarAssets)();
        res.json(avatarAssets);
    }
    catch (error) {
        console.error("GET /api/roomtypes/avatars - Error:", error.message);
        res.status(500).json({ message: error.message || "Error fetching avatar assets" });
    }
}));
