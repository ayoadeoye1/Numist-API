import express from "express";
import {
    addItem,
    addItemToCollection,
    availableOff,
    availableOn,
    chatList,
    chatMessages,
    createCollection,
    deleteCollection,
    fetchCollections,
    getProfile,
    remItemFromCollection,
    sellerFavourites,
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

routerTwo.get("/favourites", sellerFavourites);

//chat pending
routerTwo.get("/chat/list", chatList);

routerTwo.get("/chat/messages/:id", chatMessages);

routerTwo.post("/collection/create", createCollection);

routerTwo.get("/collection/fetch", fetchCollections);

routerTwo.post("/collection/add-item/:id", addItemToCollection);

routerTwo.post("/collection/rem-item/:id", remItemFromCollection);

routerTwo.delete("/collection/drop/:id", deleteCollection);

export default routerTwo;
