import ItemsModel from "../models/items.model.js";
import SellersModel from "../models/sellers.model.js";
import UsersModel from "../models/users.model.js";
import { authCode } from "../utils/authCode.js";
import { Encrypt } from "../utils/bcrypt.js";
import Email from "../utils/emailer.js";
import photoUploader from "../utils/photoUploader.js";
import videoUploader from "../utils/videoUploader.js";
import {
    successResponse,
    failedResponse,
    invalidRequest,
    serverError,
} from "../utils/response.handler.js";
import { countryToAlpha2, countryToAlpha3 } from "country-to-iso";
import FavouritesModel from "../models/favourites.model.js";

export const sellerSignUp = async (req, res) => {
    try {
        const {
            first_name,
            last_name,
            email,
            password,
            cpassword,
            country_code,
            mobile,
            about,
            delivery_option,
            country,
        } = req.body;

        if (
            !first_name ||
            !last_name ||
            !email ||
            !password ||
            !cpassword ||
            !country_code ||
            !mobile ||
            !about ||
            !delivery_option ||
            !country
        ) {
            return invalidRequest(res, 400, req.body, "all input are required");
        }

        const userExist = await UsersModel.findOne({
            email: email,
        });

        if (userExist) {
            return failedResponse(
                res,
                400,
                null,
                "User with email already this exist"
            );
        }

        if (password !== cpassword) {
            return invalidRequest(res, 400, null, "pasword does not match");
        }

        const rxPattern = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[a-zA-Z]).{8,}$/;

        if (!rxPattern.test(password)) {
            return invalidRequest(
                res,
                400,
                null,
                "password is too weak, use capital & small letter, interger and not less than 8 character"
            );
        }

        const iso = countryToAlpha3(country.toLowerCase());

        const pin = Number(authCode(6));

        const newUser = new SellersModel({
            first_name: first_name,
            last_name: last_name,
            email: email,
            password: await Encrypt(password),
            country_code: country_code,
            mobile: mobile,
            about: about,
            delivery_option: delivery_option,
            country: country,
            iso_code: iso,
            role: "seller",
            auth_code: pin,
        });

        await newUser.save();

        //todo, send welcome and pin to email
        const userData = {
            firstName: first_name,
            lastName: last_name,
            email: email,
        };

        new Email(userData).sendVerifyEmail(pin);

        return successResponse(res, 201, null, "New User Created successfully");
    } catch (error) {
        return serverError(res, 500, null, error.message);
    }
};

/**
 * Auth Endpoints
 * @param {*} req
 * @param {*} res
 * @returns
 */

export const getProfile = async (req, res) => {
    try {
        const user = req.user;
        const userDtls = await SellersModel.aggregate([
            {
                $match: {
                    _id: user._id,
                },
            },
            {
                $project: {
                    password: 0,
                    auth_code: 0,
                    __v: 0,
                },
            },
        ]);

        return successResponse(res, 200, userDtls[0], "seller details");
    } catch (error) {
        return serverError(res, 500, null, error.message);
    }
};

export const updateProfile = async (req, res) => {
    try {
        const {
            first_name,
            last_name,
            country_code,
            mobile,
            about,
            delivery_option,
            country,
        } = req.body;

        const user = req.user;

        const profilePix = await photoUploader(
            req,
            "profile_photo",
            `profile/${user.email}`
        );

        const seller = await SellersModel.findOne({
            _id: user._id,
        });

        await SellersModel.findOneAndUpdate(
            {
                _id: user._id,
            },
            {
                first_name: first_name,
                last_name: last_name,
                country_code: country_code,
                mobile: mobile,
                about: about,
                delivery_option: delivery_option,
                country: country,
                photo: profilePix === false ? seller.photo : profilePix,
            },
            {
                upsert: true,
            }
        );

        return successResponse(res, 200, null, "seller profile updated");
    } catch (error) {
        return serverError(res, 500, null, error.message);
    }
};

export const availableOn = async (req, res) => {
    try {
        const user = req.user;
        await SellersModel.findOneAndUpdate(
            {
                _id: user._id,
            },
            {
                available: true,
            },
            {
                upsert: true,
            }
        );

        return successResponse(res, 200, null, "availability turned on");
    } catch (error) {
        return serverError(res, 500, null, error.message);
    }
};

export const availableOff = async (req, res) => {
    try {
        const user = req.user;
        await SellersModel.findOneAndUpdate(
            {
                _id: user._id,
            },
            {
                available: false,
            },
            {
                upsert: true,
            }
        );

        return successResponse(res, 200, null, "availability turned off");
    } catch (error) {
        return serverError(res, 500, null, error.message);
    }
};

export const addItem = async (req, res) => {
    try {
        const { name, description, currency, price, category } = req.body;
        const user = req.user;

        if (
            !name ||
            !description ||
            !currency ||
            !price ||
            !category ||
            !req.files.photo1
        ) {
            return invalidRequest(
                res,
                400,
                req.body,
                "all input and photo1 are required"
            );
        }

        const photo1 = await photoUploader(req, "photo1", `item/${user.email}`);
        const photo2 = await photoUploader(req, "photo2", `item/${user.email}`);
        const photo3 = await photoUploader(req, "photo3", `item/${user.email}`);
        const video = await videoUploader(req, "video1", `item/${user.email}`);

        await new ItemsModel({
            seller_id: user._id,
            name: name,
            description: description,
            currency: currency,
            price: price,
            country: user.country,
            iso_code: user?.iso_code,
            category: category,
            photo1: photo1,
            photo2: photo2 || "",
            photo3: photo3 || "",
            video: video || "",
        }).save();

        return successResponse(res, 201, null, "new item added by you");
    } catch (error) {
        return serverError(res, 500, null, error.message);
    }
};

export const updateItem = async (req, res) => {
    try {
        const { name, description, currency, price, category } = req.body;
        const user = req.user;

        const photo1 = await photoUploader(req, "photo1", `item/${user.email}`);
        const photo2 = await photoUploader(req, "photo2", `item/${user.email}`);
        const photo3 = await photoUploader(req, "photo3", `item/${user.email}`);
        const video = await videoUploader(req, "video1", `item/${user.email}`);

        const oldVal = await ItemsModel.findOneAndUpdate({
            _id: req.params.id,
            seller_id: user._id,
        });

        await ItemsModel.findOneAndUpdate(
            {
                _id: req.params.id,
                seller_id: user._id,
            },
            {
                seller_id: user._id,
                name: name,
                description: description,
                currency: currency,
                price: price,
                photo1: photo1 === false ? oldVal.photo1 : photo1,
                photo2: photo2 === false ? oldVal.photo2 : photo2,
                photo3: photo3 === false ? oldVal.photo3 : photo3,
                video: video === false ? oldVal.video : video,
            },
            {
                upsert: true,
            }
        );

        return successResponse(
            res,
            201,
            null,
            `You updated one of your product ${oldVal._id}`
        );
    } catch (error) {
        return serverError(res, 500, null, error.message);
    }
};

export const sellerItems = async (req, res) => {
    try {
        const user = req.user;
        const userItems = await ItemsModel.aggregate([
            {
                $match: {
                    seller_id: user._id,
                },
            },
        ]);

        return successResponse(res, 200, userItems, "seller details");
    } catch (error) {
        return serverError(res, 500, null, error.message);
    }
};

export const sellerItem = async (req, res) => {
    try {
        const user = req.user;
        const userItem = await ItemsModel.findOne({
            seller_id: user._id,
            _id: req.params.id,
        });

        return successResponse(res, 200, userItem, "seller details");
    } catch (error) {
        return serverError(res, 500, null, error.message);
    }
};

export const sellerFavourites = async (req, res) => {
    try {
        const user = req.user;
        const userItem = await FavouritesModel.aggregate([
            {
                $match: {
                    seller_id: user._id,
                },
            },
            {
                $lookup: {
                    from: "users",
                    let: {
                        sid: "$collector_id",
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ["$_id", "$$sid"],
                                },
                            },
                        },
                        {
                            $project: {
                                first_name: 1,
                                last_name: 1,
                                photo: 1,
                                email: 1,
                                country: 1,
                                country_code: 1,
                                mobile: 1,
                                iso_code: 1,
                            },
                        },
                    ],
                    as: "seller",
                },
            },
        ]);

        return successResponse(res, 200, userItem, "seller details");
    } catch (error) {
        return serverError(res, 500, null, error.message);
    }
};
