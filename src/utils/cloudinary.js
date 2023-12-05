import { v2 as cloudinary } from "cloudinary";

import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.join(__dirname, "..", "..", "/.env") });

cloudinary.config({
    cloud_name: process.env.C_NAME,
    api_key: process.env.C_APIKEY,
    api_secret: process.env.C_APISECRET,
});

export default cloudinary;
