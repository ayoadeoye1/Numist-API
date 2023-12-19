import mongoose from "mongoose";

const ProductsCollectionsModel = mongoose.Schema(
    {
        seller_id: {
            type: mongoose.SchemaTypes.ObjectId,
            ref: "sellers",
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        items_id: {
            type: Array,
            ref: "items",
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("products_collections", ProductsCollectionsModel);
