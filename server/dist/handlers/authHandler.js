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
exports.handleAuthentication = handleAuthentication;
const userService_1 = require("../services/userService");
function handleAuthentication(client) {
    return __awaiter(this, void 0, void 0, function* () {
        // This case should only run if client is NOT already authenticated
        if (client.isAuthenticated) {
            return; // Or send an error
        }
        const userId = client.userId;
        if (!userId || typeof userId !== "string") {
            client.sendToSelf({
                type: "error",
                payload: "Invalid authentication payload",
            });
            return;
        }
        // Validate the user ID against the database
        const user = yield (0, userService_1.getUserByClerkId)(userId);
        if (user) {
            client.userId = user.clerkId; // Store the validated user ID
            client.isAuthenticated = true;
            if (!client.userId) {
                client.sendToSelf({
                    type: "error",
                    payload: "Authentication failed: User ID is null",
                });
            }
        }
        else {
            console.warn(`Authentication failed for connection ${client.id}: User ${userId} not found.`);
            client.sendToSelf({
                type: "error",
                payload: "Authentication failed: User not found",
            });
        }
    });
}
