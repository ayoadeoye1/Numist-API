import mongoose from "mongoose";

const FavouriteSellerModel = mongoose.Schema(
    {
        collector_id: {
            type: mongoose.SchemaTypes.ObjectId,
            ref: "users",
            required: true,
        },
        seller_id: {
            type: mongoose.SchemaTypes.ObjectId,
            ref: "sellers",
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("favourite_seller", FavouriteSellerModel);
