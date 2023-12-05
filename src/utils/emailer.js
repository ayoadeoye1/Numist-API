import nodemailer from "nodemailer";
import path from "path";
import ejs from "ejs";

import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class Email {
    firstName = "";
    lastName = "";
    email = "";
    sender = "";

    constructor(recipientData) {
        this.firstName = recipientData.firstName;
        this.lastName = recipientData.lastName;
        this.email = recipientData.email;
        this.sender = process.env.MAILTRAP_USER;
    }

    async createTransport() {
        const transport = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.MAILTRAP_USER,
                pass: process.env.MAILTRAP_PASS,
            },
        });

        return transport;
    }

    async sendMsg(template, subject, pin) {
        const templatePath = path.join(
            __dirname,
            "..",
            "views",
            `${template}.ejs`
        );

        const html = await ejs.renderFile(templatePath, {
            name: `${this.firstName}, ${this.lastName}`,
            pin: pin,
        });

        const mailOptions = {
            from: {
                name: process.env.MAIL_SENDER,
                address: this.sender,
            },
            to: this.email,
            subject,
            html,
            text: html,
        };

        const mail = await this.createTransport();
        await mail.sendMail(mailOptions);
    }

    sendVerifyEmail(pin) {
        this.sendMsg("verify-email", "Welcome On Board", pin);
    }

    sendResetPasswordToken(pin) {
        this.sendMsg("reset-pass", "Reset Password Token", pin);
    }
}

export default Email;
