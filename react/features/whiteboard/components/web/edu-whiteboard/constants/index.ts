export const FILE_SERVER_URL = "https://jitsi.withturtled.com:5001";
export const WORKER_URL = "https://jitsi.withturtled.com:5002";

export const DEFAULT_CAMERA_OPTS = {
    isLocked: true,
    wheelBehavior: "none",
    panSpeed: 0,
    zoomSpeed: 0,
    zoomSteps: [1],
    constraints: {
        initialZoom: "fit-x-100",
        baseZoom: "fit-x-100",
        bounds: {
            x: 0,
            y: 0,
            w: 1920,
            h: 1080,
        },
        behavior: { x: "inside", y: "inside" },
        padding: { x: 0, y: 0 },
        origin: { x: 0, y: 0 },
    },
}