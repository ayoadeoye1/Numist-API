import mongoose from "mongoose";
import ItemsModel from "../models/items.model.js";
import SellersModel from "../models/sellers.model.js";
import UsersModel from "../models/users.model.js";
import { authCode } from "../utils/authCode.js";
import { Encrypt, Decrypt } from "../utils/bcrypt.js";
import Email from "../utils/emailer.js";
import { userInfo } from "../utils/userInfo.js";
import { accessToken, logoutUser } from "../utils/jwt.js";
import {
    successResponse,
    failedResponse,
    invalidRequest,
    serverError,
} from "../utils/response.handler.js";
import FavouritesModel from "../models/favourites.model.js";

export const collectorSignUp = async (req, res) => {
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

        const pin = Number(authCode(6));

        const newUser = new UsersModel({
            first_name: first_name,
            last_name: last_name,
            email: email,
            password: await Encrypt(password),
            country_code: country_code,
            mobile: mobile,
            about: about,
            country: country,
            role: "collector",
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

        return successResponse(
            res,
            201,
            null,
            "New User Created successfully, check your email for verification token"
        );
    } catch (error) {
        return serverError(res, 500, null, error.message);
    }
};

export const signIn = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return invalidRequest(res, 400, req.body, "all input are required");
        }

        const userExist = await UsersModel.findOne({
            email: email,
        });

        if (!userExist) {
            return failedResponse(res, 400, null, "User does not exist");
        }

        const passVerify = await Decrypt(password, userExist.password);

        if (!passVerify) {
            return invalidRequest(res, 400, null, "incorrect password");
        }

        const pin = Number(authCode(6));

        if (!userExist.verify) {
            //todo send email.....
            await UsersModel.findOneAndUpdate(
                {
                    email: userExist.email,
                },
                {
                    auth_code: pin,
                },
                {
                    upsert: true,
                }
            );

            const userData = {
                firstName: userExist.first_name,
                lastName: userExist.last_name,
                email: userExist.email,
            };

            new Email(userData).sendVerifyEmail(pin);

            return invalidRequest(
                res,
                400,
                null,
                "user email not verified, check your email for verification code"
            );
        }

        if (userExist.suspended) {
            return invalidRequest(
                res,
                400,
                null,
                "you have been suspended from using our services, contact the admin"
            );
        }

        const token = await accessToken(
            userExist._id,
            userExist.email,
            userExist.role
        );

        return successResponse(
            res,
            201,
            {
                email: userExist.email,
                token: token,
            },
            "Sign In successful"
        );
    } catch (error) {
        return serverError(res, 500, null, error.message);
    }
};

export const verifyEmail = async (req, res) => {
    try {
        const { email, pin } = req.body;
        if (!email || !pin) {
            return invalidRequest(res, 400, null, "all input are required");
        }

        const pinUser = await UsersModel.findOne({
            email: email,
            verify: false,
        });

        if (!pinUser) {
            return invalidRequest(
                res,
                400,
                null,
                "invalid email or user email already verified"
            );
        }

        const pinVer = await UsersModel.findOne({
            email: email,
            auth_code: Number(pin),
        });

        if (!pinVer) {
            return invalidRequest(res, 400, null, "incorrect pin");
        }

        await UsersModel.findOneAndUpdate(
            {
                _id: pinVer._id,
                email: pinVer.email,
            },
            {
                verify: true,
                auth_code: undefined,
            },
            {
                upsert: true,
            }
        );

        return successResponse(res, 200, null, "user email verified");
    } catch (error) {
        console.log(error.message);
        return serverError(res, 500, null, error.message);
    }
};

export const passwordChangeCode = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return invalidRequest(res, 400, null, "all input are required");
        }

        const emailUser = await UsersModel.findOne({
            email: email,
        });

        if (!emailUser) {
            return invalidRequest(
                res,
                400,
                null,
                "invalid email , user does not exist"
            );
        }

        const pin = Number(authCode(8));

        await UsersModel.findOneAndUpdate(
            {
                _id: emailUser._id,
                email: emailUser.email,
            },
            {
                auth_code: pin,
            },
            {
                upsert: true,
            }
        );
        //todo send reset pass email

        const userData = {
            firstName: emailUser.first_name,
            lastName: emailUser.last_name,
            email: emailUser.email,
        };

        new Email(userData).sendResetPasswordToken(pin);

        return successResponse(
            res,
            200,
            null,
            "password reset email sent to registered email"
        );
    } catch (error) {
        console.log(error.message);
        return serverError(res, 500, null, error.message);
    }
};

export const passwordChange = async (req, res) => {
    try {
        const { email, pin, password, cpassword } = req.body;
        if (!email || !pin || !password || !cpassword) {
            return invalidRequest(res, 400, null, "all input are required");
        }

        const pinUser = await UsersModel.findOne({
            email: email,
            auth_code: Number(pin),
        });

        if (!pinUser) {
            return invalidRequest(
                res,
                400,
                null,
                "invalid credentials supplied"
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

        const newPass = await Encrypt(password);
        await UsersModel.findOneAndUpdate(
            {
                _id: pinUser._id,
                email: pinUser.email,
            },
            {
                password: newPass,
                auth_code: null,
            },
            {
                upsert: true,
            }
        );

        return successResponse(res, 200, null, "password changed successfully");
    } catch (error) {
        console.log(error.message);
        return serverError(res, 500, null, error.message);
    }
};

export const logOut = async (req, res) => {
    try {
        const user = await UsersModel.findOne({
            _id: req.user._id,
        });

        if (!user) {
            return failedResponse(res, 400, null, "something went wrong");
        }

        const token = await logoutUser(user._id, user.email, user.role);

        return successResponse(res, 200, token, "user signed out");
    } catch (error) {
        console.log(error.message);
        return serverError(res, 500, null, error.message);
    }
};

/**
 * get items, get item
 */
export const getItems = async (req, res) => {
    try {
        const ip = req.ip || req.connection.remoteAddress;
        const uinfo = await userInfo("194.112.5.89");
        // console.log(uinfo);

        const limit = req.params.limit;
        const page = req.params.page;

        let country = req?.params.country;
        country = country?.toLowerCase();

        let items = [];

        let apage = [];

        if (country) {
            items = await ItemsModel.aggregate([
                {
                    $match: {
                        country: country,
                    },
                },
                {
                    $project: {
                        about: 0,
                        delivery_options: 0,
                        password: 0,
                    },
                },
                {
                    $sort: {
                        createdAt: -1,
                    },
                },
                {
                    $limit: Number(limit) || 20,
                },
                {
                    $skip: Number(Number(page) - 1) * Number(limit) || 0,
                },
            ]);

            apage = await ItemsModel.aggregate([
                {
                    $match: {
                        country: country,
                    },
                },
                {
                    $count: "countPage",
                },
            ]);
        } else {
            let country_nam = uinfo.country_name;
            country_nam = country_nam.toLowerCase;

            items = await ItemsModel.aggregate([
                {
                    $match: {
                        country: country_nam,
                    },
                },
                {
                    $project: {
                        about: 0,
                        delivery_options: 0,
                        password: 0,
                    },
                },
                {
                    $sort: {
                        createdAt: -1,
                    },
                },
                {
                    $limit: Number(limit) || 20,
                },
                {
                    $skip: Number(Number(page) - 1) * Number(limit) || 0,
                },
            ]);

            apage = await ItemsModel.aggregate([
                {
                    $match: {
                        country: country_nam,
                    },
                },
                {
                    $count: "countPage",
                },
            ]);
        }

        return successResponse(
            res,
            200,
            {
                items: items,
                page: `${page || 1} of ${Math.ceil(
                    apage[0]?.countPage / Number(limit)
                )}`,
            },
            "items data"
        );
    } catch (error) {
        return serverError(res, 500, null, error.message);
    }
};

export const getItem = async (req, res) => {
    try {
        const sellers = await ItemsModel.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(req.params.id),
                },
            },
            {
                $project: {
                    __v: 0,
                },
            },
            {
                $lookup: {
                    from: "users",
                    let: {
                        sid: "$seller_id",
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ["$_id", { $toObjectId: "$$sid" }],
                                },
                            },
                        },
                        {
                            $project: {
                                password: 0,
                            },
                        },
                    ],
                    as: "seller_info",
                },
            },
            {
                $lookup: {
                    from: "items",
                    let: {
                        iid: "$_id",
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $ne: ["$_id", "$$iid"],
                                },
                            },
                        },
                        {
                            $project: {
                                __v: 0,
                            },
                        },
                    ],
                    as: "other_seller_items",
                },
            },
        ]);

        return successResponse(
            res,
            200,
            sellers,
            "one item data with details fetched"
        );
    } catch (error) {
        console.log(error);
        return serverError(res, 500, null, error.message);
    }
};

/**
 * get sellers, get seller
 */
export const getSellers = async (req, res) => {
    try {
        const limit = req.params.limit;
        const page = req.params.page;

        const sellers = await SellersModel.aggregate([
            {
                $match: {
                    role: "seller",
                },
            },
            {
                $project: {
                    about: 0,
                    delivery_options: 0,
                    password: 0,
                },
            },
            {
                $sort: {
                    createdAt: -1,
                },
            },
            {
                $limit: Number(limit) || 20,
            },
            {
                $skip: Number(Number(page) - 1) * Number(limit) || 0,
            },
        ]);

        const apage = await ItemsModel.aggregate([
            {
                $match: {
                    role: "seller",
                },
            },
            {
                $count: "countPage",
            },
        ]);

        return successResponse(
            res,
            200,
            {
                sellers: sellers,
                page: `${page || 1} of ${Math.ceil(
                    apage[0]?.countPage / Number(limit)
                )}`,
            },
            "sellers data"
        );
    } catch (error) {
        return serverError(res, 500, null, error.message);
    }
};

export const getSeller = async (req, res) => {
    try {
        const seller = await SellersModel.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(req.params.id),
                },
            },
            {
                $project: {
                    password: 0,
                },
            },
            {
                $lookup: {
                    from: "items",
                    let: {
                        sid: "$_id",
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ["$seller_id", "$$sid"],
                                },
                            },
                        },
                        {
                            $project: {
                                name: 1,
                                picture1: 1,
                                picture2: 1,
                                description: 1,
                            },
                        },
                    ],
                    as: "seller_items",
                },
            },
        ]);

        return successResponse(res, 200, seller[0], "sellers data");
    } catch (error) {
        return serverError(res, 500, null, error.message);
    }
};

//authenticated endpoints

export const addFavourite = async (req, res) => {
    try {
        const { seller_id } = req.body;
        const user = req.user;

        if (!seller_id) {
            return invalidRequest(
                res,
                400,
                null,
                "seller_id field is required"
            );
        }

        await new FavouritesModel({
            collector_id: user._id,
            seller_id: seller_id,
        }).save();

        return successResponse(
            res,
            200,
            null,
            "seller added to your favourite list"
        );
    } catch (error) {
        return serverError(res, 500, null, error.message);
    }
};

export const getFavourite = async (req, res) => {
    try {
        const user = req.user;

        const fav = await FavouritesModel.aggregate([
            {
                $match: {
                    collector_id: user._id,
                },
            },
        ]);

        return successResponse(
            res,
            200,
            fav,
            "seller added to your favourite list"
        );
    } catch (error) {
        return serverError(res, 500, null, error.message);
    }
};

export const removeFavourite = async (req, res) => {
    try {
        const { seller_id } = req.body;
        const user = req.user;

        if (!seller_id) {
            return invalidRequest(
                res,
                400,
                null,
                "seller_id field is required"
            );
        }

        await FavouritesModel.findOneAndDelete({
            collector_id: user._id,
            seller_id: seller_id,
        });

        return successResponse(
            res,
            200,
            null,
            "seller added to your favourite list"
        );
    } catch (error) {
        return serverError(res, 500, null, error.message);
    }
};
