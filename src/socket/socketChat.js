//import
import socketAuth from "../middlewares/socket.auth.js";
import MessageModel from "../models/message.model.js";
import RoomsModel from "../models/rooms.model.js";

const socketChat = async (io) => {
    io.on("connection", async (socket) => {
        const { token, name } = socket.handshake.query;

        const reslt = await socketAuth(token);

        if (reslt === null) {
            console.log("validation error");
        }

        console.log(
            "user connected",
            socket.id,
            socket.client.conn.server.clientsCount
        );

        socket.on("new message", async (data) => {
            const { sender_id, receiver_id, room_id, message, message_type } =
                data;

            const chatroom = room_id
                ? room_id
                : `private-${sender_id}-${receiver_id}`;

            let roomExist = await RoomsModel.findOne({
                room_id: chatroom,
            });

            if (!roomExist || roomExist.room_id !== chatroom) {
                const newRoom = new RoomsModel({
                    room_id: chatroom,
                    sender_id: sender_id,
                    receiver_id: receiver_id,
                });

                roomExist = await newRoom.save();
            }

            const rooms = [...socket.rooms];

            if (!rooms.includes(roomExist.room_id)) {
                socket.join(roomExist.room_id);
            }

            const nMessage = new MessageModel({
                room_id: roomExist.room_id,
                sender_id: sender_id,
                message: message,
                message_type: "text",
            });

            const newMessage = await nMessage.save();

            io.to(roomExist.room_id).emit("new message", {
                message: newMessage,
                room: roomExist,
            });
        });

        socket.on("seen status", async (data) => {
            const { time_seen, room_id } = data;

            const filter = {
                room_id: room_id,
                seen_status: false,
                timestamp: {
                    $lte: new Date(time_seen),
                },
            };

            const update = {
                $set: {
                    seen_status: true,
                },
            };

            await MessageModel.updateMany(filter, update);

            io.to(room_id).emit("seen status", data);
        });

        socket.on("disconnect", (reason) => {
            console.log(`user disconnected: ${reason}`);
        });
    });
};

export default socketChat;
