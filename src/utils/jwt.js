import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "prfvwegecxiagauswJt";

export const accessToken = (id, email, role) => {
    try {
        const token = jwt.sign(
            {
                _id: id,
                email: email,
                role: role,
            },
            JWT_SECRET,
            {
                expiresIn: "24h",
            }
        );

        return token;
    } catch (error) {
        console.log(error.message);
        return error.message;
    }
};

export const validateToken = async (token) => {
    try {
        const data = jwt.verify(token, JWT_SECRET);
        return data;
    } catch (error) {
        console.log(error.message);
        return error.message;
    }
};

export const logoutUser = async (id, email, role) => {
    try {
        const token = jwt.sign(
            {
                _id: id,
                email: email,
                role: role,
            },
            JWT_SECRET,
            {
                expiresIn: "1",
            }
        );

        return token;
    } catch (error) {
        console.log(error.message);
        return error.message;
    }
};
