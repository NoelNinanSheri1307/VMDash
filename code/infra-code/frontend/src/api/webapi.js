import axios from "axios";

const webApi = axios.create({
    baseURL: process.env.REACT_APP_HOST_URL,
    withCredentials: true
});

export default webApi;