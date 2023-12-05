import bcrypt from "bcrypt";

export const Encrypt = async (password) => {
    try {
        const enc = await bcrypt.hash(password, 12);
        return enc;
    } catch (error) {
        return error.message;
    }
};

export const Decrypt = async (password, hpassword) => {
    try {
        const dec = await bcrypt.compare(password, hpassword);
        return dec;
    } catch (error) {
        return error.message;
    }
};
