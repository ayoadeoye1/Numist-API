import axios from "axios";

export const userInfo = async (ip) => {
    const url = `https://api.ipdata.co/${ip}?api-key=${process.env.IPDATA_APIKEY}`;

    try {
        const data = await axios.get(url);

        return {
            ip: data.data.ip,
            city: data.data.city,
            country_name: data.data.country_name,
            lat: data.data.latitude,
            long: data.data.longitude,
            flag: data.data.flag,
            emoji_flag: data.data.emoji_flag,
            currency: data.data.currency.code,
            current_time: data.data.time_zone.current_time,
        };
    } catch (error) {
        console.log(error.message);
        return error.message;
    }
};
