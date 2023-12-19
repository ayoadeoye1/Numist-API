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
import RoomsModel from "../models/rooms.model.js";
import MessageModel from "../models/message.model.js";
import CollectionsModels from "../models/collections.models.js";
import { userInfo } from "../utils/userInfo.js";
import axios from "axios";

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

        const userExist = await SellersModel.findOne({
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

export const sellerItems = async (req, res) => {
    try {
        const user = req.user;

        const ip = req.ip || req.socket.remoteAddress;
        const uinfo = await userInfo(ip); //"212.113.115.165"
        // console.log(uinfo, ip);

        const limit = req.query.limit || 20;
        const page = req.query.page || 1;

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
                                $toObjectId: user._id,
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
                    createdAt: 1,
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
                    seller_id: user._id,
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

export const sellerItem = async (req, res) => {
    try {
        const user = req.user;
        const param = req.params;
        // const userItem = await ItemsModel.findOne({
        //     seller_id: user._id,
        //     _id: req.params.id,
        // });

        const ip = req.ip || req.socket.remoteAddress;
        const uinfo = await userInfo(ip); //"212.113.115.165"
        // console.log(uinfo, ip);

        const userPreferredCurrency = uinfo.currency.toLowerCase();

        const rate = await convertCurrency("usd", userPreferredCurrency, 1);

        const userItem = await ItemsModel.aggregate([
            {
                $match: {
                    $expr: {
                        $and: [
                            {
                                $eq: [
                                    "$seller_id",
                                    {
                                        $toObjectId: user._id,
                                    },
                                ],
                            },
                            {
                                $eq: [
                                    "$_id",
                                    {
                                        $toObjectId: param.id,
                                    },
                                ],
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
        ]);

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
            {
                //to count unread messages in a chat, from a sender
                $lookup: {
                    from: "messages",
                    let: {
                        rid: "$room_id",
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        {
                                            $eq: ["$room_id", "$$rid"],
                                        },
                                        {
                                            $ne: [
                                                "$sender_id",
                                                {
                                                    $toObjectId: user._id,
                                                },
                                            ],
                                        },
                                        {
                                            $eq: ["$seen_status", false],
                                        },
                                    ],
                                },
                            },
                        },
                        {
                            $count: "counts",
                        },
                    ],
                    as: "unread_msg",
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

export const createCollection = async (req, res) => {
    try {
        const user = req.user;
        const { name, item_id } = req.body;

        if (!name || !item_id) {
            return invalidRequest(
                res,
                400,
                null,
                "name and item_id is required"
            );
        }

        const checkItem = await ItemsModel.findOne({
            _id: item_id,
            seller_id: user._id,
        });

        if (!checkItem) {
            return invalidRequest(res, 400, null, "item not found");
        }

        const newCollection = new CollectionsModels({
            seller_id: user._id,
            name: name,
            items_id: [],
        });

        await newCollection.items_id.push(item_id);

        await newCollection.save();

        return successResponse(res, 200, null, "collection created");
    } catch (error) {
        return serverError(res, 500, null, error.message);
    }
};

export const fetchCollections = async (req, res) => {
    try {
        const sellerId = req.user.id;

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

export const addItemToCollection = async (req, res) => {
    try {
        const user = req.user;
        const collection_id = req.params.id;
        const { item_id } = req.body;

        if (!item_id || !collection_id) {
            return invalidRequest(
                res,
                400,
                null,
                "collection_id and item_id is required"
            );
        }

        const checkItem = await ItemsModel.findOne({
            _id: item_id,
            seller_id: user._id,
        });

        if (!checkItem) {
            return invalidRequest(res, 400, null, "item not found");
        }

        await CollectionsModels.findOneAndUpdate(
            {
                _id: collection_id,
                seller_id: user._id,
            },
            {
                $push: {
                    items_id: item_id,
                },
            },
            {
                new: true,
            }
        );

        return successResponse(res, 200, null, "item added to collection");
    } catch (error) {
        return serverError(res, 500, null, error.message);
    }
};

export const remItemFromCollection = async (req, res) => {
    try {
        const user = req.user;
        const collection_id = req.params.id;
        const { item_id } = req.body;

        if (!item_id || !collection_id) {
            return invalidRequest(
                res,
                400,
                null,
                "collection_id and item_id is required"
            );
        }

        const checkItem = await ItemsModel.findOne({
            _id: item_id,
            seller_id: user._id,
        });

        if (!checkItem) {
            return invalidRequest(res, 400, null, "item not found");
        }

        await CollectionsModels.findOneAndUpdate(
            {
                _id: collection_id,
                seller_id: user._id,
            },
            {
                $pull: {
                    items_id: item_id,
                },
            },
            {
                new: true,
            }
        );

        return successResponse(res, 200, null, "item removed to collection");
    } catch (error) {
        return serverError(res, 500, null, error.message);
    }
};

export const deleteCollection = async (req, res) => {
    try {
        const user = req.user;
        const colid = req.params.id;

        await CollectionsModels.findOneAndDelete({
            _id: colid,
            seller_id: user.id,
        });

        return successResponse(res, 200, null, "collection deleted");
    } catch (error) {
        return serverError(res, 500, null, error.message);
    }
};
