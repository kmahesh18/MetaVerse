import express from "express";
import { companyRouter } from "./api/companyRouter";
import { spaceRouter } from "./api/spaceRouter";
import { userRouter } from "./api/userRouter";

const app = express();
app.use(express.json());

// Fix the router mounting
app.use("/api/companies", companyRouter);
app.use("/api/spaces", spaceRouter);
app.use("/api/users", userRouter);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`HTTP server running on http://localhost:${PORT}`);
});

export { app };
