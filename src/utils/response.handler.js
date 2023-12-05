//200 201 ...
export const successResponse = (res, statusCode, data, message) => {
    return res.status(statusCode).json({
        status: statusCode,
        message: `Request Successful: ${message}`,
        data: data,
    });
};

//403 404 ...
export const failedResponse = (res, statusCode, data, message) => {
    return res.status(statusCode).json({
        status: statusCode,
        message: `Request Failed: ${message}`,
        data: data,
    });
};

//400 401 ...
export const invalidRequest = (res, statusCode, data, message) => {
    return res.status(statusCode).json({
        status: statusCode,
        message: `Invalid Request: ${message}`,
        data: data,
    });
};

//500 502 504 ...
export const serverError = (res, statusCode, data, message) => {
    return res.status(statusCode).json({
        status: statusCode,
        message: `Server Error: ${message}`,
        data: data,
    });
};
