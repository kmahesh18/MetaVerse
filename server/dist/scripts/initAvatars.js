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
const db_1 = require("../db");
const Avatar_1 = require("../models/Avatar");
const avatars = [
    {
        avatarId: "1",
        name: "Classic Boy",
        previewUrl: "/assets/1.png"
    },
    {
        avatarId: "2",
        name: "Classic Girl",
        previewUrl: "/assets/2.png"
    },
    {
        avatarId: "3",
        name: "Cool Boy",
        previewUrl: "/assets/3.png"
    },
    {
        avatarId: "4",
        name: "Cool Girl",
        previewUrl: "/assets/4.png"
    }
];
function initAvatars() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield (0, db_1.connectDB)();
            yield Avatar_1.Avatar.deleteMany({}); // Clear existing avatars
            yield Avatar_1.Avatar.insertMany(avatars);
            console.log('Avatars initialized successfully');
            process.exit(0);
        }
        catch (error) {
            console.error('Error initializing avatars:', error);
            process.exit(1);
        }
    });
}
initAvatars();
