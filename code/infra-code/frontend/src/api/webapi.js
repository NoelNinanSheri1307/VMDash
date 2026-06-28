import axios from "axios";

const webApi = axios.create({
    baseURL: process.env.REACT_APP_HOST_URL,
    withCredentials: true
});

webApi.interceptors.request.use((config) => {
    if (config.url === "/vms" || config.url.startsWith("/vms/")) {
        config.baseURL = process.env.REACT_APP_PROXMOX_URL;
        const user = JSON.parse(localStorage.getItem("user")) || {};
        if (user.staff_code) {
            config.headers["X-User-Staff-Code"] = user.staff_code;
        }
        if (user.role) {
            config.headers["X-User-Role"] = user.role;
        }
    }
    return config;
});

export default webApi;