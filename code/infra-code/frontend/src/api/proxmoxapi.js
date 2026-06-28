import axios from "axios";

const proxmoxApi = axios.create({
    baseURL: process.env.REACT_APP_PROXMOX_URL,
    timeout: 300000,
    withCredentials: true
});

proxmoxApi.interceptors.request.use((config) => {
    const user = JSON.parse(localStorage.getItem("user")) || {};
    if (user.staff_code) {
        config.headers["X-User-Staff-Code"] = user.staff_code;
    }
    if (user.role) {
        config.headers["X-User-Role"] = user.role;
    }
    return config;
});

export default proxmoxApi;