import { FILE_SERVER_URL } from "../constants";

export const processSlideUrl = async (presentationId: string): Promise<string[]> => {
    const response = await fetch(`${FILE_SERVER_URL}/process/${presentationId}`, { method: "GET" });
    const result = await response.json();
    if (!result || !result.imageUrls) {
        throw new Error("Invalid response from server.");
    }
    return result.imageUrls.map((el: string) => `${FILE_SERVER_URL}${el}`);
};