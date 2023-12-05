import cloudinary from "./cloudinary.js";

const photoUploader = async (req, fileHandle, unique) => {
    if (!req.files) return false;
    if (!req.files[fileHandle]) return false;
    let file = { ...req.files[fileHandle] };

    const vidRes = new Promise(async (resolve, reject) => {
        cloudinary.uploader.upload(
            file.tempFilePath,
            {
                folder: `NumismaticFiles/videos/${unique}`,
                resource_type: "video",
                quality: 90,
                eager: [
                    {
                        format: "mp4",
                        transformation: [
                            { width: 640, height: 480, crop: "pad" },
                        ],
                    },
                ],
            },
            (err, file) => {
                if (file) {
                    console.log(file);
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
        const res = await vidRes;
        // console.log(res);
        return res;
    } catch (error) {
        console.log(error);
        return error;
    }
};

export default photoUploader;
