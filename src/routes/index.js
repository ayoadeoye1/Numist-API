import express from "express";
import routerOne from "./collectors.routes.js";
import routerTwo from "./sellers.routes.js";
import routerThree from "./admin.routes.js";

const router = express.Router();

router.use("/duo", routerOne);

router.use("/seller", routerTwo);

router.use("/admin", routerThree);

export default router;
