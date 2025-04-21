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
exports.userRouter = void 0;
const express_1 = require("express");
const userService_1 = require("../services/userService");
exports.userRouter = (0, express_1.Router)();
exports.userRouter.post("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield (0, userService_1.createUser)(req.body);
    res.status(201).json(user);
}));
exports.userRouter.get("/", (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const list = yield (0, userService_1.getUsers)();
    res.json(list);
}));
exports.userRouter.get("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield (0, userService_1.getUserById)(req.params.id);
    if (user)
        res.json(user);
    else
        res.status(404).send("Not found");
}));
exports.userRouter.put("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const updated = yield (0, userService_1.updateUser)(req.params.id, req.body);
    res.json(updated);
}));
exports.userRouter.delete("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, userService_1.deleteUser)(req.params.id);
    res.status(204).end();
}));
