import express from "express";
import {
    addFavourite,
    collectorSignUp,
    getFavourite,
    getItem,
    getItems,
    getSeller,
    getSellers,
    logOut,
    passwordChange,
    passwordChangeCode,
    removeFavourite,
    signIn,
    verifyEmail,
} from "../controllers/collectors.controllers.js";
import collectorAuth from "../middlewares/collectors.middleware.js";
// import sellerAuth from "../middlewares/sellers.middleware.js";
// import adminAuth from "../middlewares/admin.middleware.js";

const routerOne = express.Router();

routerOne.post("/collector/signup", collectorSignUp);

routerOne.post("/general/signin", signIn);

routerOne.post("/general/verify-email", verifyEmail);

routerOne.post("/general/password/getcode", passwordChangeCode);

routerOne.post("/general/password/change", passwordChange);

/**
 * BREAK
 */

routerOne.get("/collector/get-items", getItems);

routerOne.get("/collector/get-item/:id", getItem);

routerOne.get("/collector/get-sellers", getSellers);

routerOne.get("/collector/get-seller/:id", getSeller);

//auth endpoint
// routerOne.post(
//     "/general/logout",
//     collectorAuth || sellerAuth || adminAuth,
//     logOut
// );

routerOne.use(collectorAuth);
routerOne.post("/collector/add-fav", addFavourite);

routerOne.get("/collector/get-fav", getFavourite);

routerOne.delete("/collector/rem-fav", removeFavourite);

export default routerOne;
