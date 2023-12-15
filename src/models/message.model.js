import mongoose from "mongoose";

const MessageModel = mongoose.Schema(
    {
        room_id: {
            type: String,
            trim: true,
            required: true,
        },
        sender_id: {
            type: mongoose.SchemaTypes.ObjectId,
            ref: "users",
            required: true,
        },
        message: {
            type: String,
        },
        message_type: {
            type: String,
            enum: ["text", "image", "document", "audio", "video"],
        },
        seen_status: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("messages", MessageModel);
