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
exports.assetsRouter = void 0;
const express_1 = require("express");
const assetService_1 = require("../services/assetService");
exports.assetsRouter = (0, express_1.Router)();
// Get all assets
exports.assetsRouter.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const assets = yield (0, assetService_1.getAssets)();
        res.json(assets);
    }
    catch (error) {
        console.error("GET /api/assets - Error:", error.message);
        res.status(500).json({ error: error.message || "Error fetching assets" });
    }
}));
// Get only avatar assets
exports.assetsRouter.get("/avatars", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const avatarAssets = yield (0, assetService_1.getAvatarAssets)();
        res.json(avatarAssets);
    }
    catch (error) {
        console.error("GET /api/assets/avatars - Error:", error.message);
        res.status(500).json({ error: error.message || "Error fetching avatar assets" });
    }
}));
// Get asset by ID
exports.assetsRouter.get("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const asset = yield (0, assetService_1.getAssetById)(id);
        if (!asset) {
            return res.status(404).json({ error: "Asset not found" });
        }
        res.json(asset);
    }
    catch (error) {
        console.error(`GET /api/assets/${req.params.id} - Error:`, error.message);
        res.status(500).json({ error: error.message || "Error fetching asset" });
    }
}));
