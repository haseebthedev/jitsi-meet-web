import React, { useState } from "react";
import { TldrawUiDialogBody, TldrawUiDialogFooter, TldrawUiInput } from "tldraw";
import { processSlideUrl } from "./api";

interface UploadSlideDialogProps {
    onActivityUpload: (images: string[], onClose: () => void) => void;
    onClose: () => void;
}

export const UploadSlideDialog: React.FC<UploadSlideDialogProps> = ({ onActivityUpload, onClose }) => {
    const [link, setLink] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleUpload = async () => {
        if (!link) return;

        try {
            setLoading(true);
            const images = await processSlideUrl(link);
            onActivityUpload(images, onClose);
        } catch (err) {
            setError("Failed to process the presentation. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <TldrawUiDialogBody>
                {/* @ts-ignore */}
                <TldrawUiInput placeholder="Enter Google Slides URL" onValueChange={setLink} />
                {error && <p className="error-message">{error}</p>}
            </TldrawUiDialogBody>
            <TldrawUiDialogFooter>
                <button onClick={onClose}>Cancel</button>
                <button onClick={handleUpload} disabled={loading}>
                    {loading ? "Uploading..." : "Upload"}
                </button>
            </TldrawUiDialogFooter>
        </div>
    );
};
