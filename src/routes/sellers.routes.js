import express from "express";
import {
    addItem,
    availableOff,
    availableOn,
    getProfile,
    sellerItem,
    sellerItems,
    sellerSignUp,
    updateItem,
    updateProfile,
} from "../controllers/sellers.controllers.js";
import sellerAuth from "../middlewares/sellers.middleware.js";

const routerTwo = express.Router();

routerTwo.post("/signup", sellerSignUp);

//protected endpoints
routerTwo.use(sellerAuth);

routerTwo.post("/add-item", addItem);

routerTwo.put("/update-item/:id", updateItem);

routerTwo.get("/seller-items", sellerItems);

routerTwo.get("/seller-item/:id", sellerItem);

routerTwo.get("/profile/fetch", getProfile);

routerTwo.put("/profile/update", updateProfile);

routerTwo.post("/available/on", availableOn);

routerTwo.post("/available/off", availableOff);

//chat pending

export default routerTwo;
