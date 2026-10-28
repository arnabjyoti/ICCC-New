const axios = require("axios");

const BASE_URL = "http://43.204.86.252/ReportServices";

async function loginAndGetToken() {
    try {

        const response = await axios.post(
            `${BASE_URL}/config/usertoken`,
            {
                username: "info@starsolutions.biz",
                password: "India@2025"
            }
        );

        return response.data.auth_token;

    } catch (error) {

        console.log("Login Error:", error.response?.data || error.message);
        throw error;
    }
}

async function getTravelHistory(imeiNumbers = []) {

    try {

        // STEP 1: GET TOKEN
        const token = await loginAndGetToken();

        // STEP 2: FETCH DATA
        const response = await axios.post(
            `${BASE_URL}/customapi/objectstatusreport?user_api_config_id=379`,
            {
                imei_nos: imeiNumbers
            },
            {
                headers: {
                    Authorization: token,
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
            }
        );

        console.log("API RESPONSE:", response.data);
        console.log("TYPE:", typeof response.data);

        if (typeof response.data === "string") {

    try {
        return JSON.parse(response.data);
    } catch (e) {
        return response.data;
    }
}

return response.data;

    } catch (error) {

        console.log(
            "Travel History Error:",
            error.response?.data || error.message
        );

        throw error;
    }
}

module.exports = {
    getTravelHistory
};