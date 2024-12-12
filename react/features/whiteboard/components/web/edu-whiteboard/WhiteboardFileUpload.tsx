import React, { useEffect, useState } from "react";
import { X } from "lucide-react";

const FileUpload = ({ isModalOpen, setModalOpen, onFileUpload, onClear }: any) => {
    const [googleSlideLink, setGoogleSlideLink] = useState<string | null>(null);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false); // New state for loader

    const MAX_PREVIEWS = 3;
    const remainingImagesCount = imagePreviews.length - MAX_PREVIEWS;

    const handleClearWhiteboard = () => {
        onClear();
        console.log("Clear Whiteboard triggered!");
    };

    const extractPresentationId = (url: string) => {
        const regex = /\/d\/([a-zA-Z0-9-_]+)/;
        const match = url.match(regex);
        return match ? match[1] : null;
    };

    const handleProcessSlides = async () => {
        setError("");
        if (!googleSlideLink) return;

        const presentationId = extractPresentationId(googleSlideLink);
        if (!presentationId) {
            setError("Invalid Google Slides link. Please enter a valid URL.");
            return;
        }

        setLoading(true); // Start loader
        try {
            const response = await fetch(`https://jitsi.withturtled.com:5001/process/${presentationId}`, {
                method: "GET",
            });
            const result = await response.json();

            if (result && result.imageUrls) {
                const images = result.imageUrls.map((el: string) => `https://jitsi.withturtled.com:5001${el}`);
                setImagePreviews(images);
            } else {
                setError("Failed to process the presentation. Please check URL or permissions.");
            }
        } catch (err) {
            setError("Failed to process the presentation. Please try again.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const startActivityHandler = async () => {
        if (!imagePreviews) setError("Please enter the Google Slide URL.");
        onFileUpload(imagePreviews);
    };

    useEffect(() => {
        return () => {
            setGoogleSlideLink(null);
            setImagePreviews([]);
            setError(null);
            setLoading(false); // Reset loader
        };
    }, [isModalOpen]);

    return (
        <>
            {/* Buttons */}
            <div className="whiteboard-controls">
                <button onClick={() => setModalOpen(true)} className="primary-button">
                    Upload
                </button>
                <button onClick={handleClearWhiteboard} className="secondary-button">
                    Clear
                </button>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="modal">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>Upload PDF</h2>
                            <button
                                className="secondary-button"
                                style={{ padding: "2px", marginBottom: 20, backgroundColor: "grey" }}
                                onClick={() => setModalOpen(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="file-input">
                            <input
                                type="text"
                                placeholder="Enter Google Slide URL"
                                onChange={({ target: { value } }) => setGoogleSlideLink(value)}
                            />
                            <button
                                onClick={handleProcessSlides}
                                disabled={!googleSlideLink || loading}
                                className={googleSlideLink && !loading ? "primary-button" : "secondary-button"}
                            >
                                {loading ? "Processing..." : "Process"}
                            </button>
                        </div>

                        {error ? (
                            <p className="error-message">{error}</p>
                        ) : (
                            imagePreviews.length > 0 && (
                                <div className="previews">
                                    <h3>Preview:</h3>
                                    <div className="preview-container">
                                        {imagePreviews.slice(0, MAX_PREVIEWS).map((url, index) => (
                                            <img
                                                key={index}
                                                src={url}
                                                alt={`Preview ${index + 1}`}
                                                className="preview-image"
                                            />
                                        ))}
                                        {remainingImagesCount > 0 && (
                                            <div className="remaining-images">
                                                <p>{`+${remainingImagesCount} more images`}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        )}

                        {imagePreviews.length > 0 && (
                            <div className="actions">
                                <button onClick={() => setModalOpen(false)} className="secondary-button">
                                    Cancel
                                </button>
                                <button onClick={startActivityHandler} className="primary-button">
                                    Create
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export { FileUpload };
