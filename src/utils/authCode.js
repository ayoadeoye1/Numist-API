export const authCode = (digit) => {
    const pin = [];
    for (let i = 0; i < digit; i++) {
        const num = Math.floor(Math.random() * 10);
        pin.push(num);
    }
    return pin.toString().split(",").join("");
};
