
export const extractPresentationIdFromSlideUrl = (url: string) => {
    const regex = /\/d\/([a-zA-Z0-9-_]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
};