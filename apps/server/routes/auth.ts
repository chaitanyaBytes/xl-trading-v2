import express from "express";
import { signin, signup, setTokenCookie } from "../controllers/auth";

const authRouter = express.Router();

authRouter.post("/signup", signup);
authRouter.post("/signin", signin);
authRouter.get("/signin/post", setTokenCookie);

export default authRouter;
