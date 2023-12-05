import dotenv from "dotenv";
dotenv.config();
import fileUpload from "express-fileupload";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import router from "./routes/index.js";

import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

const dburl = process.env.MONGO_URL;

const connectDB = async () => {
    try {
        await mongoose.connect(dburl, {
            dbName: "numistics-db",
        });

        console.log("DB connected");
    } catch (error) {
        console.log(`DB Connection Error: ${error.message}`);
    }
};

connectDB();

app.use(
    cors({
        origin: "*",
    })
);

app.set("view engine", "ejs");
app.set("views", "./views");

app.get("/test", async (req, res) => {
    try {
        res.render("verify-email");
    } catch (error) {
        console.log(error.message);
    }
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(
    fileUpload({
        limits: { fileSize: 50 * 1024 * 1024 },
        useTempFiles: true,
        tempFileDir: "/tmp/",
    })
);

app.get("/", async (req, res) => {
    try {
        res.send("Numistic API Base Url");
    } catch (error) {
        console.log(error.message);
    }
});

app.use("/api", router);

export default app;
