import UsersModel from "../models/users.model.js";
import { Encrypt, Decrypt } from "../utils/bcrypt.js";
import { accessToken, logoutUser } from "../utils/jwt.js";
import {
    successResponse,
    failedResponse,
    invalidRequest,
    serverError,
} from "../utils/response.handler.js";

export const adminSignUp = async (req, res) => {
    try {
        const {
            first_name,
            last_name,
            email,
            password,
            cpassword,
            country_code,
            mobile,
        } = req.body;

        if (
            !first_name ||
            !last_name ||
            !email ||
            !password ||
            !cpassword ||
            !country_code ||
            !mobile
        ) {
            return invalidRequest(res, 400, req.body, "all input are required");
        }

        const userExist = await UsersModel.findOne({
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

        const newUser = new UsersModel({
            first_name: first_name,
            last_name: last_name,
            email: email,
            password: await Encrypt(password),
            country_code: country_code,
            mobile: mobile,
            about: "admin user",
            country: undefined,
            role: "admin",
            verify: true,
            suspended: undefined,
            auth_code: undefined,
        });

        await newUser.save();

        return successResponse(
            res,
            201,
            null,
            "New Admin User Created successfully"
        );
    } catch (error) {
        return serverError(res, 500, null, error.message);
    }
};

export const adminSignIn = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return invalidRequest(res, 400, req.body, "all input are required");
        }

        const userExist = await UsersModel.findOne({
            email: email,
        });

        if (!userExist) {
            return failedResponse(res, 400, null, "User does not exist");
        }

        if (userExist.role !== "admin") {
            return failedResponse(
                res,
                400,
                null,
                "You cannot sign-in here at admin login page"
            );
        }

        const passVerify = await Decrypt(password, userExist.password);

        if (!passVerify) {
            return invalidRequest(res, 400, null, "incorrect password");
        }

        if (!userExist.verify) {
            //todo send email.....
            return invalidRequest(
                res,
                400,
                null,
                "user email not verified, check your email for verification code"
            );
        }

        const token = await accessToken(
            userExist._id,
            userExist.email,
            userExist.role
        );

        return successResponse(
            res,
            201,
            {
                email: userExist.email,
                token: token,
            },
            "Sign In successful"
        );
    } catch (error) {
        return serverError(res, 500, null, error.message);
    }
};

// export const logOut = async (req, res) => {
//     try {
//         const user = await UsersModel.findOne({
//             _id: req.user._id,
//         });

//         if (!user) {
//             return failedResponse(res, 400, null, "something went wrong");
//         }

//         const token = await logoutUser(user._id, user.email, user.role);

//         return successResponse(res, 200, token, "user signed out");
//     } catch (error) {
//         console.log(error.message);
//         return serverError(res, 500, null, error.message);
//     }
// };
