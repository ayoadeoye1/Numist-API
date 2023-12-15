import UsersModel from "../models/users.model.js";
import { validateToken } from "../utils/jwt.js";

const socketAuth = async (token) => {
    if (!token) {
        return {
            status: 400,
            message: "User not logged-in",
            data: null,
        };
    }

    try {
        const authUser = await validateToken(token);

        if (!authUser || authUser == "jwt expired") {
            console.log({
                status: 400,
                message: "invalid token/expired",
                data: null,
            });
            return null;
        }

        const id = Object.values(authUser)[0];
        const user = await UsersModel.findById({ _id: id });

        return {
            status: 200,
            data: user,
            message: "socket user validated",
        };
    } catch (error) {
        console.log({
            status: 400,
            message: "Socket Error" + error.message,
            data: null,
        });
        return null;
    }
};

export default socketAuth;
