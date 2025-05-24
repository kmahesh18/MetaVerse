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
exports.handlePlayerPosUpdate = handlePlayerPosUpdate;
const state_1 = require("../state/state");
function handlePlayerPosUpdate(client, message) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!client.userId || !client.roomId) {
            return client.sendToSelf({
                type: "error",
                payload: "Must be authenticated and in a room first",
            });
        }
        const { posX, posY } = message.payload;
        if (typeof posX !== "number" || typeof posY !== "number") {
            return client.sendToSelf({
                type: "error",
                payload: "Invalid position data",
            });
        }
        // Broadcast the updated position to other clients in the room
        const msRoom = state_1.roomsById.get(client.roomId);
        if (msRoom) {
            msRoom.broadcastMessage(client.id, {
                type: "broadcastPlayerPos",
                payload: {
                    userId: client.userId,
                    position: { x: posX, y: posY }
                },
            });
        }
    });
}
