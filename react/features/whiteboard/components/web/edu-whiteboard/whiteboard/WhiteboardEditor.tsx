// @ts-nocheck
import React, { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { debounce } from "lodash";
import { useSync, useSyncDemo } from "@tldraw/sync";
import {
    Tldraw,
    Editor,
    TldrawProps,
    TLComponents,
    TldrawUiButton,
    TldrawUiButtonLabel,
    TldrawUiDialogBody,
    TldrawUiDialogCloseButton,
    TldrawUiDialogFooter,
    TldrawUiDialogHeader,
    TldrawUiDialogTitle,
    TldrawUiInput,
    useDialogs,
    TLRecord,
    TLUiOverrides,
    useEditor,
    track,
} from "tldraw";
import { multiplayerAssets, unfurlBookmarkUrl } from "./useSyncStore";
import { extractPresentationIdFromSlideUrl } from "../utils";
import { IconEraser, IconTrash } from "../../../../../base/icons/svg";
import Icon from "../../../../../base/icons/components/Icon";
import "tldraw/tldraw.css";

interface WhiteboardEditorProps extends Omit<TldrawProps, "onMount"> {
    iamModerator?: boolean;
    classId: string;
    occupantId: string;
    persistenceKey?: string;
    onMount?: (editor: Editor) => void;
    onActivityUpload?: (images: string[], onClose: () => void) => void;
    onActivityRemove?: () => void;
    onClearPage?: () => void;
}

// @ts-ignore
const isInstanceRecord = (record: TLRecord): record is { currentPageId: string } => "currentPageId" in record;

const WORKER_URL = "https://jitsi.withturtled.com:5002";

export const WhiteboardEditor: React.FC<WhiteboardEditorProps> = ({
    iamModerator = false,
    classId,
    occupantId,
    onActivityUpload,
    onActivityRemove,
    onClearPage,
    onMount,
    ...rest
}) => {
    const [editor, setEditor] = useState<Editor | null>(null); // State for the editor instance

    const roomId = `${classId}-${occupantId}`;

    // const store = useSync({ uri: `${WORKER_URL}/connect/${roomId}`, assets: multiplayerAssets });
    const store = useSyncDemo({ roomId });

    const UploadSlideDialog = ({ onClose }: { onClose(): void }) => {
        const [link, setLink] = useState<string | null>(null);
        const [loading, setLoading] = useState<boolean>(false); // New state for loader
        const [error, setError] = useState<string | null>(null);

        const startActivity = async () => {
            setError("");
            if (!link) return;

            const presentationId = extractPresentationIdFromSlideUrl(link);
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
                    if (!images) {
                        setError("Please enter the Google Slide URL.");
                        return;
                    }
                    onActivityUpload?.(images, onClose);
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

        return (
            <>
                <TldrawUiDialogHeader>
                    <TldrawUiDialogTitle className="font-bold">Create Interactive Activity</TldrawUiDialogTitle>
                    <TldrawUiDialogCloseButton />
                </TldrawUiDialogHeader>
                <TldrawUiDialogBody>
                    <TldrawUiInput placeholder="Enter Google Slides URL" onValueChange={setLink} />
                    {error && <p className="error-message">{error}</p>}
                </TldrawUiDialogBody>
                <TldrawUiDialogFooter className="tlui-dialog__footer__actions">
                    <TldrawUiButton type="normal" onClick={onClose}>
                        <TldrawUiButtonLabel>Cancel</TldrawUiButtonLabel>
                    </TldrawUiButton>
                    <TldrawUiButton type="primary" disabled={loading ?? false} onClick={startActivity}>
                        <TldrawUiButtonLabel>{loading ? "Please Wait..." : "Upload"}</TldrawUiButtonLabel>
                    </TldrawUiButton>
                </TldrawUiDialogFooter>
            </>
        );
    };

    const CustomSharePanelForModerator = () => {
        const { addDialog } = useDialogs();
        return (
            <div style={{ padding: 16, gap: 16, display: "flex", pointerEvents: "all" }}>
                <button className="primary-button" onClick={() => addDialog({ component: UploadSlideDialog })}>
                    Create Activity
                </button>
                <button
                    className="primary-button"
                    onClick={() =>
                        addDialog({
                            component: ({ onClose }) => {
                                onActivityRemove?.();
                                onClose();
                                return <></>;
                            },
                        })
                    }
                >
                    Remove Link
                </button>
                <button
                    className="primary-button"
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                    }}
                    onClick={onClearPage}
                >
                    <Icon src={IconTrash} alt="eraser-icon" size={16} />
                </button>
            </div>
        );
    };

    const CustomSharePanelForParticipant = () => {
        return (
            <div style={{ padding: 16, gap: 16, display: "flex", pointerEvents: "all" }}>
                <button
                    className="primary-button"
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                    }}
                    onClick={onClearPage}
                >
                    <Icon src={IconTrash} alt="trash-icon" />
                </button>
            </div>
        );
    };

    const components: TLComponents = {
        SharePanel: iamModerator ? CustomSharePanelForModerator : CustomSharePanelForParticipant,
        Minimap: null,
        ZoomMenu: null,
    };

    const handlePageChangeEvent = useCallback(() => {
        if (!editor) return;

        const debouncedHandleChangeEvent = debounce((change) => {
            // @ts-ignore
            for (const [from, to] of Object.values(change.changes.updated)) {
                if (isInstanceRecord(from) && isInstanceRecord(to) && from.currentPageId !== to.currentPageId) {
                    // @ts-ignore
                    editor.setCurrentPage(to.currentPageId); // Switch the page in the editor
                }

                const currentPageId = editor.getCurrentPageId();
                if (currentPageId.includes("page:activity")) {
                    editor.zoomToFit({ force: true, immediate: true }).setCameraOptions({ isLocked: true });
                }
            }
        }, 5); // Adjust debounce timing as necessary

        const cleanupFunction = editor.store.listen(debouncedHandleChangeEvent, { scope: "all", source: "remote" });

        return cleanupFunction; // Return the cleanup function for useEffect
    }, [editor]);

    useEffect(() => {
        if (!editor) return;

        const cleanup = handlePageChangeEvent();

        // Cleanup previous listeners before setting new ones
        return () => {
            if (cleanup) cleanup();
        };
    }, [editor, handlePageChangeEvent]);

    const options: Partial<TldrawOptions> = {
        cameraMovingTimeoutMs: 0,
    };

    return (
        <Tldraw
            store={store}
            autoFocus={true}
            forceMobile={true}
            options={options}
            components={components}
            onMount={(editor) => {
                setEditor(editor);

                editor.registerExternalAssetHandler("url", unfurlBookmarkUrl);
                if (onMount) onMount(editor);
            }}
            {...rest}
        />
    );
};
