import mongoose from "mongoose";

const UserModel = mongoose.Schema({
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
        uniq: true,
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
        // uniq: true,
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
    country: {
        type: String,
    },
    iso_code: {
        type: String,
    },
    auth_code: {
        type: Number,
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

UserModel.index({ location: "2dsphere" });

export default mongoose.model("users", UserModel);
