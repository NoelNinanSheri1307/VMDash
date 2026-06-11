export function notifyPostMade() {
    const event = new Event("post request made on /proxmox/vms/<uuid>/addUsers");
    window.dispatchEvent(event);
}

export function notifyRemovePostMade() {
    const event = new Event("post request made on /proxmox/vms/<uuid>/removeUsers");
    window.dispatchEvent(event);
}

export const triggerVmRefresh = () => {
    const event = new Event("post request made on /proxmox/vms/sync");
    window.dispatchEvent(event);
};