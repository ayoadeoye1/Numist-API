import express from "express";
import { adminSignIn, adminSignUp } from "../controllers/admin.controllers.js";
import adminAuth from "../middlewares/admin.middleware.js";

const routerThree = express.Router();

routerThree.post("/signup", adminSignUp);
routerThree.post("/signin", adminSignIn);

//protected endpoint, admin
routerThree.use(adminAuth);

export default routerThree;
