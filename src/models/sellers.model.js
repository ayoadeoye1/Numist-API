import mongoose from "mongoose";

const SellerModel = mongoose.Schema({
    first_name: {
        type: String,
        lowercase: true,
        trim: true,
        required: true,
    },
    last_name: {
        type: String,
        lowercase: true,
        trim: true,
        required: true,
    },
    email: {
        type: String,
        lowercase: true,
        trim: true,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    photo: {
        type: String,
    },
    country_code: {
        type: String,
        trim: true,
        required: true,
    },
    mobile: {
        type: String,
        trim: true,
        required: true,
    },
    role: {
        type: String,
        enum: ["collector", "seller", "admin"],
        required: true,
    },
    about: {
        type: String,
    },
    delivery_option: {
        type: String,
    },
    country: {
        type: String,
    },
    iso_code: {
        type: String,
    },
    auth_code: {
        type: Number,
    },
    available: {
        type: Boolean,
        default: true,
    },
    level: {
        type: String,
        enum: ["new", "verified", "trusted"],
        default: "new",
    },
    verify: {
        type: Boolean,
        default: false,
    },
    approved: {
        type: Boolean,
        default: false,
    },
    suspended: {
        type: Boolean,
        default: false,
    },
});

SellerModel.index({ location: "2dsphere" });

export default mongoose.model("sellers", SellerModel, "users");
