import { Router } from "express";
import {
	createUser,
	getUsers,
	getUserById,
	updateUser,
	deleteUser,
} from "../services/userService";

export const userRouter = Router();

userRouter.post("/", async (req, res) => {
	const user = await createUser(req.body);
	res.status(201).json(user);
});

userRouter.get("/", async (_req, res) => {
	const list = await getUsers();
	res.json(list);
});

userRouter.get("/:id", async (req, res) => {
	const user = await getUserById(req.params.id);
	if (user) res.json(user);
	else res.status(404).send("Not found");
});

userRouter.put("/:id", async (req, res) => {
	const updated = await updateUser(req.params.id, req.body);
	res.json(updated);
});

userRouter.delete("/:id", async (req, res) => {
	await deleteUser(req.params.id);
	res.status(204).end();
});
