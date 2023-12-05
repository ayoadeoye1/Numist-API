import cloudinary from "./cloudinary.js";

const photoUploader = async (req, fileHandle, unique) => {
    if (!req.files) return false;
    if (!req.files[fileHandle]) return false;
    let file = { ...req.files[fileHandle] };

    const pixRes = new Promise(async (resolve, reject) => {
        cloudinary.uploader.upload(
            file.tempFilePath,
            {
                folder: `NumismaticFiles/photos/${unique}`,
                resource_type: "image",
                transformation: [
                    {
                        quality: 80,
                        format: "png",
                    },
                ],
            },
            (err, file) => {
                if (file) {
                    resolve(file.secure_url);
                } else {
                    reject({
                        error: err.name,
                        message: `Error occured while uploading image: ${err.message}`,
                    });
                }
            }
        );
    });

    try {
        const res = await pixRes;
        // console.log(res);
        return res;
    } catch (error) {
        console.log(error);
        return error;
    }
};

export default photoUploader;
