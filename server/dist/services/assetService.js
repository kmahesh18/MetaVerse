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
exports.getAssets = getAssets;
exports.getAssetById = getAssetById;
exports.getAvatarAssets = getAvatarAssets;
const mongodb_1 = require("mongodb");
const db_1 = require("../db");
const AssetModel_1 = require("../Models/AssetModel");
function getAssets() {
    return __awaiter(this, void 0, void 0, function* () {
        const db = yield (0, db_1.getDB)();
        return db.collection(AssetModel_1.ASSET_COLLECTION).find({}).toArray();
    });
}
function getAssetById(id) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!mongodb_1.ObjectId.isValid(id)) {
            throw new Error("Invalid asset ID format");
        }
        const db = yield (0, db_1.getDB)();
        return db.collection(AssetModel_1.ASSET_COLLECTION).findOne({ _id: new mongodb_1.ObjectId(id) });
    });
}
// Fetch avatar assets for avatar selection
function getAvatarAssets() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const db = yield (0, db_1.getDB)();
            const avatars = yield db
                .collection(AssetModel_1.ASSET_COLLECTION)
                .find({
                assetId: { $in: ["ch1_idle", "ch2_idle", "ch3_idle", "ch4_idle"] }
            })
                .toArray();
            console.log(avatars);
            return avatars;
        }
        catch (error) {
            console.error("Error fetching avatar assets:", error);
            throw new Error(`Failed to fetch avatar assets: ${error}`);
        }
    });
}
