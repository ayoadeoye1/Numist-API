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
import axios from "axios";
import { countryToAlpha2 } from "country-to-iso";
import usersModel from "../models/users.model.js";
import photoUploader from "../utils/photoUploader.js";
import CollectionsModels from "../models/collections.models.js";

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

        const iso = countryToAlpha2(country.toLowerCase());

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
            iso_code: iso,
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
                role: userExist.role,
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
async function convertCurrency(currency, pcurrency, price) {
    try {
        // const xrate = await axios.get(`https://data.fixer.io/api/convert
        //     ? access_key = ${process.env.FIXER_API_KEY}
        //     & from = ${currency}
        //     & to = ${pcurrency}
        //     & amount = ${price}`);

        // console.log(currency, pcurrency, price);

        const { data } = await axios(
            `https://cdn.jsdelivr.net/gh/fawazahmed0/currency-api@1/latest/currencies/${currency}/${pcurrency}.json`
        );

        const xrate = Object.values(data);

        return Number(xrate[1]) * price;
    } catch (error) {
        console.log(error.message);
    }
}

export const getItems = async (req, res) => {
    try {
        const ip = req.ip || req.socket.remoteAddress;
        const uinfo = await userInfo(ip); //"212.113.115.165"
        // console.log(uinfo, ip);

        const limit = req.query.limit;
        const page = req.query.page;

        let country = req?.query.country
            ? req?.query.country
            : uinfo.country_name;

        let categ = req?.query.category ? req?.query.category : false;

        country = country?.toLowerCase();

        const userPreferredCurrency = uinfo.currency.toLowerCase();

        let items = [];
        let apage = [];

        const rate = await convertCurrency("usd", userPreferredCurrency, 1);

        if (!categ) {
            items = await ItemsModel.aggregate([
                {
                    $match: {
                        country: country,
                    },
                },
                {
                    $project: {
                        // about: 0,
                        delivery_options: 0,
                        password: 0,
                    },
                },
                {
                    $addFields: {
                        convertedPrice: {
                            $cond: {
                                if: {
                                    $eq: ["$currency", userPreferredCurrency],
                                },
                                then: "$price",
                                else: {
                                    // $function: {
                                    //     body: async function (
                                    //         currency,
                                    //         userPreferredCurrency,
                                    //         price
                                    //     ) {
                                    //         console.log(
                                    //             currency,
                                    //             userPreferredCurrency,
                                    //             price
                                    //         );

                                    //         const { data } = await axios(
                                    //             `https://cdn.jsdelivr.net/gh/fawazahmed0/currency-api@1/latest/currencies/${currency.toLowerCase}/${userPreferredCurrency.toLowerCase}.json`
                                    //         );

                                    //         const xrate = Object.values(data);

                                    //         return Number(xrate[1]) * price;
                                    //     },
                                    //     args: [
                                    //         "$currency",
                                    //         "userPreferredCurrency",
                                    //         "$price",
                                    //     ],
                                    //     lang: "js",
                                    // },
                                    $multiply: ["$price", rate],
                                },
                            },
                        },
                    },
                },
                {
                    $addFields: {
                        convertedCurrency: userPreferredCurrency,
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
                                    first_name: 1,
                                    last_name: 1,
                                },
                            },
                        ],
                        as: "seller_info",
                    },
                },
                {
                    $sort: {
                        createdAt: -1,
                    },
                },
                {
                    $skip: (Number(page) - 1) * Number(limit) || 0,
                },
                {
                    $limit: Number(limit) || 20,
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
            items = await ItemsModel.aggregate([
                {
                    $match: {
                        country: country,
                        category: categ,
                    },
                },
                {
                    $project: {
                        // about: 0,
                        delivery_options: 0,
                        password: 0,
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
                                    first_name: 1,
                                    last_name: 1,
                                },
                            },
                        ],
                        as: "seller_info",
                    },
                },
                {
                    $addFields: {
                        convertedPrice: {
                            $cond: {
                                if: {
                                    $eq: ["$currency", userPreferredCurrency],
                                },
                                then: "$price",
                                else: {
                                    // $function: {
                                    //     body: convertCurrency().toString(),
                                    //     args: [
                                    //         "$currency",
                                    //         userPreferredCurrency,
                                    //         "$price",
                                    //     ],
                                    //     lang: "js",
                                    // },
                                    $multiply: ["$price", rate],
                                },
                            },
                        },
                    },
                },
                {
                    $addFields: {
                        convertedCurrency: userPreferredCurrency,
                    },
                },
                {
                    $sort: {
                        createdAt: -1,
                    },
                },
                {
                    $skip: (Number(page) - 1) * Number(limit) || 0,
                },
                {
                    $limit: Number(limit) || 20,
                },
            ]);

            apage = await ItemsModel.aggregate([
                {
                    $match: {
                        country: country,
                        category: categ,
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
        const item = await ItemsModel.findOne({ _id: req.params.id });

        const ip = req.ip || req.socket.remoteAddress;
        const uinfo = await userInfo(ip); //"212.113.115.165"

        const userPreferredCurrency = uinfo.currency.toLowerCase();

        const rate = await convertCurrency(
            item.currency.toLowerCase(),
            userPreferredCurrency,
            1
        );

        const items = await ItemsModel.aggregate([
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
                $addFields: {
                    convertedPrice: {
                        $cond: {
                            if: {
                                $eq: ["$currency", userPreferredCurrency],
                            },
                            then: "$price",
                            else: {
                                $multiply: ["$price", rate],
                            },
                        },
                    },
                },
            },
            {
                $addFields: {
                    convertedCurrency: userPreferredCurrency,
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
            items,
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
        const limit = req.params.limit || 20;
        const page = req.params.page;

        const ip = req.ip || req.socket.remoteAddress;
        const uinfo = await userInfo(ip); //"212.113.115.165"
        // console.log(uinfo);

        let country = req?.query.country
            ? req?.query.country
            : uinfo.country_name;

        const sellers = await SellersModel.aggregate([
            {
                $match: {
                    role: "seller",
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
                    updatedAt: 1,
                },
            },
            {
                $skip: Number(Number(page) - 1) * Number(limit) || 0,
            },
            {
                $limit: Number(limit) || 20,
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
                                photo1: 1,
                                photo2: 1,
                                description: 1,
                                price: 1,
                            },
                        },
                        {
                            $sort: {
                                createdAt: 1,
                            },
                        },
                        {
                            $limit: 6,
                        },
                    ],
                    as: "seller_featured_items",
                },
            },
        ]);

        return successResponse(res, 200, seller[0], "sellers data");
    } catch (error) {
        return serverError(res, 500, null, error.message);
    }
};

export const sellerItems = async (req, res) => {
    try {
        const seller = req.params.id;

        const ip = req.ip || req.socket.remoteAddress;
        const uinfo = await userInfo(ip); //"212.113.115.165"
        // console.log(uinfo, ip);

        const limit = req.query.limit;
        const page = req.query.page;

        // let country = req?.query.country
        //     ? req?.query.country
        //     : uinfo.country_name;

        // let categ = req?.query.category ? req?.query.category : false;

        // country = country?.toLowerCase();

        const userPreferredCurrency = uinfo.currency.toLowerCase();

        // let items = [];
        // let apage = [];

        const rate = await convertCurrency("usd", userPreferredCurrency, 1);

        const items = await ItemsModel.aggregate([
            {
                $match: {
                    $expr: {
                        $eq: [
                            "$seller_id",
                            {
                                $toObjectId: seller,
                            },
                        ],
                    },
                },
            },
            {
                $addFields: {
                    convertedPrice: {
                        $cond: {
                            if: {
                                $eq: ["$currency", userPreferredCurrency],
                            },
                            then: "$price",
                            else: {
                                $multiply: ["$price", rate],
                            },
                        },
                    },
                },
            },
            {
                $addFields: {
                    convertedCurrency: userPreferredCurrency,
                },
            },
            {
                $sort: {
                    createdAt: -1,
                },
            },
            {
                $skip: (Number(page) - 1) * Number(limit) || 0,
            },
            {
                $limit: Number(limit) || 20,
            },
        ]);

        let apage = await ItemsModel.aggregate([
            {
                $match: {
                    country: country,
                    category: categ,
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
                items: items,
                page: `${page || 1} of ${Math.ceil(
                    apage[0]?.countPage / Number(limit)
                )}`,
            },
            "items data"
        );

        // return successResponse(res, 200, items, "seller items fetched");
    } catch (error) {
        return serverError(res, 500, null, error.message);
    }
};
// export const sellerItemsCateg = async (req, res) => {
//     try {
//         const seller = req.params.id;

//         const items = await ItemsModel.aggregate([
//             {
//                 $match: {
//                     $expr: {
//                         $eq: [
//                             "$seller_id",
//                             {
//                                 $toObjectId: seller,
//                             },
//                         ],
//                     },
//                 },
//             },
//             // {
//             //     $limit: 4,
//             // },
//             {
//                 $group: {
//                     _id: "$category",
//                     data: { $push: "$$ROOT" },
//                 },
//             },
//         ]);

//         return successResponse(res, 200, items, "seller items fetched");
//     } catch (error) {
//         return serverError(res, 500, null, error.message);
//     }
// };

export const sellerCollections = async (req, res) => {
    try {
        const sellerId = req.params.id;

        const collection = await CollectionsModels.aggregate([
            {
                $match: {
                    $expr: {
                        $eq: [
                            "$seller_id",
                            {
                                $toObjectId: sellerId,
                            },
                        ],
                    },
                },
            },
            {
                $lookup: {
                    from: "items",
                    let: {
                        iids: "$items_id",
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $in: [
                                        {
                                            $toString: "$_id",
                                        },
                                        "$$iids",
                                    ],
                                },
                            },
                        },
                        {
                            $project: {
                                _id: 1,
                                seller_id: 1,
                                name: 1,
                                description: 1,
                                photo1: 1,
                                photo2: 1,
                            },
                        },
                    ],
                    as: "coll_list",
                },
            },
        ]);

        return successResponse(res, 200, collection, "seller items collection");
    } catch (error) {
        return serverError(res, 500, null, error.message);
    }
};

export const sellerCollection = async (req, res) => {
    try {
        const sellerId = req.params.id;

        const coll_id = req.query.coll_id;

        const ip = req.ip || req.socket.remoteAddress;
        const uinfo = await userInfo("212.113.115.165"); //"212.113.115.165"
        // console.log(uinfo, ip);

        const userPreferredCurrency = uinfo.currency.toLowerCase();

        const rate = await convertCurrency("usd", userPreferredCurrency, 1);

        const collection = await CollectionsModels.aggregate([
            {
                $match: {
                    $expr: {
                        $and: {
                            $eq: [
                                "$seller_id",
                                {
                                    $toObjectId: sellerId,
                                },
                            ],
                            $eq: [
                                "$_id",
                                {
                                    $toObjectId: coll_id,
                                },
                            ],
                        },
                    },
                },
            },
            {
                $lookup: {
                    from: "items",
                    let: {
                        iids: "$items_id",
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $in: [
                                        {
                                            $toString: "$_id",
                                        },
                                        "$$iids",
                                    ],
                                },
                            },
                        },
                        {
                            $addFields: {
                                convertedPrice: {
                                    $cond: {
                                        if: {
                                            $eq: [
                                                "$currency",
                                                userPreferredCurrency,
                                            ],
                                        },
                                        then: "$price",
                                        else: {
                                            $multiply: ["$price", rate],
                                        },
                                    },
                                },
                            },
                        },
                        {
                            $addFields: {
                                convertedCurrency: userPreferredCurrency,
                            },
                        },
                        {
                            $sort: {
                                createdAt: -1,
                            },
                        },
                    ],
                    as: "coll_list",
                },
            },
        ]);

        return successResponse(res, 200, collection, "seller items collection");
    } catch (error) {
        return serverError(res, 500, null, error.message);
    }
};

//authenticated endpoints

/**
 * Auth Endpoints
 * @param {*} req
 * @param {*} res
 * @returns
 */

export const cgetProfile = async (req, res) => {
    try {
        const user = req.user;
        const userDtls = await UsersModel.aggregate([
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

export const cupdateProfile = async (req, res) => {
    try {
        const { first_name, last_name, country_code, mobile, about, country } =
            req.body;

        const user = req.user;

        const profilePix = await photoUploader(
            req,
            "profile_photo",
            `profile/${user.email}`
        );

        const seller = await UsersModel.findOne({
            _id: user._id,
        });

        await UsersModel.findOneAndUpdate(
            {
                _id: user._id,
            },
            {
                first_name: first_name,
                last_name: last_name,
                country_code: country_code,
                mobile: mobile,
                about: about,
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

        const alreadyExist = await FavouritesModel.findOne({
            collector_id: user._id,
            seller_id: seller_id,
        });

        if (alreadyExist) {
            return invalidRequest(
                res,
                400,
                null,
                "seller already in your favourite list"
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

        return successResponse(res, 200, fav, "favourite sellers list fetched");
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
            "seller removed to your favourite list"
        );
    } catch (error) {
        return serverError(res, 500, null, error.message);
    }
};

export const chatList = async (req, res) => {
    try {
        const user = req.user;
        const myRooms = await RoomsModel.aggregate([
            {
                $match: {
                    $expr: {
                        $or: {
                            $eq: [
                                "$sender_id",
                                {
                                    $toObjectId: user._id,
                                },
                            ],
                            $eq: [
                                "$receiver_id",
                                {
                                    $toObjectId: user._id,
                                },
                            ],
                        },
                    },
                },
            },
            {
                $lookup: {
                    from: "users",
                    let: { participants: ["$sender_id", "$receiver_id"] },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        {
                                            $ne: ["$_id", user._id],
                                        },
                                        {
                                            $in: ["$_id", "$$participants"],
                                        },
                                    ],
                                },
                            },
                        },
                        {
                            $project: {
                                _id: 1,
                                first_name: 1,
                                last_name: 1,
                                email: 1,
                                photo: 1,
                                country_code: 1,
                                mobile: 1,
                            },
                        },
                    ],
                    as: "user_details",
                },
            },
        ]);

        return successResponse(res, 200, myRooms, " chat list fetched");
    } catch (error) {
        return serverError(res, 500, null, error.message);
    }
};

export const chatMessages = async (req, res) => {
    try {
        const user = req.user;
        const room_id = req.params.id;

        const myChats = await MessageModel.aggregate([
            {
                $match: {
                    $expr: {
                        $eq: ["$room_id", room_id],
                    },
                },
            },
            {
                $sort: {
                    createdAt: -1,
                },
            },
        ]);

        return successResponse(res, 200, myChats, "chat messages fetched");
    } catch (error) {
        return serverError(res, 500, null, error.message);
    }
};
