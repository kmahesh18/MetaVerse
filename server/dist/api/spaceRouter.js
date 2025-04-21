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
exports.spaceRouter = void 0;
const express_1 = require("express");
const spaceService_1 = require("../services/spaceService");
exports.spaceRouter = (0, express_1.Router)();
exports.spaceRouter.post("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { companyId, name, numRooms = 1 } = req.body;
    const space = yield (0, spaceService_1.createSpace)(companyId, name, numRooms);
    res.status(201).json(space);
}));
exports.spaceRouter.get("/", (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const list = yield (0, spaceService_1.getSpaces)();
    res.json(list);
}));
exports.spaceRouter.get("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const space = yield (0, spaceService_1.getSpaceById)(req.params.id);
    if (space)
        res.json(space);
    else
        res.status(404).send("Not found");
}));
exports.spaceRouter.put("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const updated = yield (0, spaceService_1.updateSpace)(req.params.id, req.body);
    res.json(updated);
}));
exports.spaceRouter.delete("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, spaceService_1.deleteSpace)(req.params.id);
    res.status(204).end();
}));
