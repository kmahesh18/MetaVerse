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
exports.getAvatars = getAvatars;
exports.getAvatarById = getAvatarById;
const mongodb_1 = require("mongodb");
const db_1 = require("../db");
<<<<<<< HEAD
function getAvatars() {
    return __awaiter(this, void 0, void 0, function* () {
        const db = yield (0, db_1.getDB)();
        return db.collection("avatars").find({}).toArray();
=======
const AvatarModel_1 = require("../models/AvatarModel");
function getAvatars() {
    return __awaiter(this, void 0, void 0, function* () {
        const db = yield (0, db_1.getDB)();
        return db.collection(AvatarModel_1.AVATARS_COLLECTION).find({}).toArray();
>>>>>>> 4410ea2acdac28177a285241b07c4a11c5962382
    });
}
function getAvatarById(id) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!mongodb_1.ObjectId.isValid(id)) {
            throw new Error("Invalid avatar ID format");
        }
        const db = yield (0, db_1.getDB)();
<<<<<<< HEAD
        return db.collection("avatars").findOne({ _id: new mongodb_1.ObjectId(id) });
=======
        return db.collection(AvatarModel_1.AVATARS_COLLECTION).findOne({ _id: new mongodb_1.ObjectId(id) });
>>>>>>> 4410ea2acdac28177a285241b07c4a11c5962382
    });
}
