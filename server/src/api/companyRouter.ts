import { Router } from "express";
import { createCompany, getCompanies } from "../services/companyService";

export const companyRouter = Router();

companyRouter.post("/", async (req, res) => {
	const { name } = req.body;
	const company = await createCompany(name);
	res.status(201).json(company);
});

companyRouter.get("/", async (_req, res) => {
	const list = await getCompanies();
	res.json(list);
});
