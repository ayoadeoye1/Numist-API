import mongoose from "mongoose";

const ItemsModel = mongoose.Schema(
    {
        seller_id: {
            type: mongoose.SchemaTypes.ObjectId,
            ref: "sellers",
            required: true,
        },
        name: {
            type: String,
            lowercase: true,
            trim: true,
            required: true,
        },
        description: {
            type: String,
            trim: true,
            required: true,
        },
        country: {
            type: String,
            lowercase: true,
        },
        iso_code: {
            type: String,
            required: true,
        },
        photo1: {
            type: String,
        },
        photo2: {
            type: String,
        },
        photo3: {
            type: String,
        },
        video: {
            type: String,
        },
        currency: {
            type: String,
            trim: true,
        },
        price: {
            //default currency is USD
            type: Number,
            required: true,
        },
        category: {
            type: String,
            enum: [
                "banknote",
                "coin",
                "medal",
                "stamp",
                "postcard",
                "envelope",
                "voucher",
                "token",
                "accessory",
                "other",
            ],
            required: true,
        },
        available: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("items", ItemsModel);
