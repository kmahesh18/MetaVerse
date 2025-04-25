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
exports.getAccessibleUserids = getAccessibleUserids;
exports.getAdminid = getAdminid;
exports.getActiveUserIds = getActiveUserIds;
exports.getRoomIds = getRoomIds;
const db_1 = require("../db");
const SpaceType_1 = require("../Models/SpaceType");
function getAccessibleUserids(spaceid) {
    return __awaiter(this, void 0, void 0, function* () {
        const db = yield (0, db_1.getDB)();
        const res = yield db.collection(SpaceType_1.Space_Collection).findOne({ id: spaceid });
        const accessibleUsers = res === null || res === void 0 ? void 0 : res.accessibleuserids;
        return accessibleUsers;
    });
}
function getAdminid(spaceid) {
    return __awaiter(this, void 0, void 0, function* () {
        const db = yield (0, db_1.getDB)();
        const res = yield db.collection(SpaceType_1.Space_Collection).findOne({ id: spaceid });
        const adminid = res === null || res === void 0 ? void 0 : res.adminid;
        return adminid;
    });
}
function getActiveUserIds(spaceid) {
    return __awaiter(this, void 0, void 0, function* () {
        const db = yield (0, db_1.getDB)();
        const res = yield db.collection(SpaceType_1.Space_Collection).findOne({ id: spaceid });
        const activeusers = res === null || res === void 0 ? void 0 : res.activeuserids;
        return activeusers;
    });
}
function getRoomIds(spaceid) {
    return __awaiter(this, void 0, void 0, function* () {
        const db = yield (0, db_1.getDB)();
        const res = yield db.collection(SpaceType_1.Space_Collection).findOne({ id: spaceid });
        const roomids = res === null || res === void 0 ? void 0 : res.roomids;
        return roomids;
    });
}
