import React, { memo, useEffect, useState } from "react";
import { useSyncDemo } from "@tldraw/sync";
import {
    Tldraw,
    Editor,
    TLComponents,
    TldrawProps,
    useDialogs,
    TldrawUiDialogHeader,
    TldrawUiDialogTitle,
    TldrawUiDialogCloseButton,
    TldrawUiDialogBody,
    TldrawUiDialogFooter,
    TldrawUiButton,
    TldrawUiButtonLabel,
    TldrawUiInput,
    DefaultSizeStyle,
    DefaultFontStyle,
    TLUiEventHandler,
} from "tldraw";
import { multiplayerAssets, unfurlBookmarkUrl } from "./useSyncStore";
import { processSlideUrl } from "./api";
import Icon from "../../../../../base/icons/components/Icon";
import { IconTrash, IconUndo, IconRedo } from "../../../../../base/icons/svg";
import { extractPresentationIdFromSlideUrl } from "../utils";
import "tldraw/tldraw.css";

interface WhiteboardEditorProps extends Omit<TldrawProps, "onMount"> {
    iamModerator?: boolean;
    classId: string;
    occupantId: string;
    persistenceKey?: string;
    isInSidebar?: boolean;
    previewMode?: boolean;
    onMount?: (editor: Editor) => void;
    onActivityUpload?: (images: string[], onClose: () => void) => void;
    onActivityRemove?: () => void;
    onClearPage?: () => void;
}

export const WhiteboardEditor: React.FC<WhiteboardEditorProps> = memo(
    ({
        iamModerator = false,
        classId,
        occupantId,
        isInSidebar = false,
        previewMode = false,
        onActivityUpload,
        onActivityRemove,
        onClearPage,
        onMount,
        ...rest
    }) => {
        const roomId = `${classId}-${occupantId}`;
        const [editor, setEditor] = useState<Editor | null>(null);

        const store = useSyncDemo({ roomId });
        // const store = useSync({ uri: `${WORKER_URL}/connect/${roomId}`, assets: multiplayerAssets });

        const UploadSlideDialog = ({ onClose }: { onClose(): void }) => {
            const [link, setLink] = useState<string | null>(null);
            const [loading, setLoading] = useState<boolean>(false); // New state for loader
            const [error, setError] = useState<string | null>(null);

            const handleUpload = async () => {
                if (!link) return;

                try {
                    setLoading(true);

                    const presentationId = extractPresentationIdFromSlideUrl(link);
                    if (!presentationId) {
                        setError("Invalid Google Slides link. Please enter a valid URL.");
                        return;
                    }
                    const images = await processSlideUrl(presentationId);
                    onActivityUpload?.(images, onClose);
                } catch (err) {
                    setError("Failed to process the presentation. Please try again.");
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
                        {/* @ts-ignore */}
                        <TldrawUiInput placeholder="Enter Google Slides URL" onValueChange={setLink} />
                        {error && <p className="error-message">{error}</p>}
                    </TldrawUiDialogBody>
                    <TldrawUiDialogFooter className="tlui-dialog__footer__actions">
                        {/* @ts-ignore */}
                        <TldrawUiButton type="normal" onClick={onClose}>
                            <TldrawUiButtonLabel>Cancel</TldrawUiButtonLabel>
                        </TldrawUiButton>
                        {/* @ts-ignore */}
                        <TldrawUiButton type="primary" disabled={loading ?? false} onClick={handleUpload}>
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
                    {!previewMode && (
                        <>
                            <button
                                className="primary-button"
                                onClick={() => addDialog({ component: UploadSlideDialog })}
                            >
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
                        </>
                    )}
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
                        onClick={() => editor?.undo()}
                    >
                        {/* @ts-ignore */}
                        <Icon src={IconUndo} alt="undo-icon" size={18} />
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
                        onClick={() => editor?.redo()}
                    >
                        {/* @ts-ignore */}
                        <Icon src={IconRedo} alt="redo-icon" size={18} />
                    </button>
                    {!previewMode && (
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
                            {/* @ts-ignore */}
                            <Icon src={IconTrash} alt="eraser-icon" size={16} />
                        </button>
                    )}
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
                        onClick={() => editor?.undo()}
                    >
                        {/* @ts-ignore */}
                        <Icon src={IconUndo} alt="undo-icon" size={18} />
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
                        onClick={() => editor?.redo()}
                    >
                        {/* @ts-ignore */}
                        <Icon src={IconRedo} alt="redo-icon" size={18} />
                    </button>
                    {!previewMode && (
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
                            {/* @ts-ignore */}
                            <Icon src={IconTrash} alt="trash-icon" size={16} />
                        </button>
                    )}
                </div>
            );
        };

        const renameDefaultPageonLoad = (editor: Editor) => {
            // Get all pages in the editor
            const pages = editor.getPages();

            // Check if any page already has the name "Whiteboard"
            const whiteboardExists = pages.some((page) => page.name === "Whiteboard");

            if (!whiteboardExists) {
                // Find the current page
                const currentPage = editor.getCurrentPage();

                // Rename the current page only if its name is "Page 1"
                if (currentPage && currentPage.name === "Page 1") {
                    editor.renamePage(currentPage.id, "Whiteboard");
                }
            }
        };

        const setDefaultFontStyling = (editor: Editor) => {
            editor?.setStyleForNextShapes(DefaultSizeStyle, "l", { history: "ignore" });
            editor?.setStyleForNextShapes(DefaultFontStyle, "sans", { history: "ignore" });
        };

        useEffect(() => {
            if (!editor) return;

            // Setting default font stylings
            setDefaultFontStyling(editor);

            // Renaming default page name
            renameDefaultPageonLoad(editor);
        }, [editor]);

        useEffect(() => {
            if (!editor) return;

            const handleChangeEvent = (change: any) => {
                Object.values(change.changes.updated).forEach(([from, to]: any) => {
                    const currentPageId = editor.getCurrentPageId();
                    // if (currentPageId.includes("page:IA") || isInSidebar || previewMode) {
                    if (currentPageId.includes("page:IA") || isInSidebar) {
                        editor.zoomToFit({ force: true, immediate: true }).setCameraOptions({ isLocked: true });
                    } else {
                        editor.setCameraOptions({ isLocked: false });
                    }
                });
            };

            // Register the event listener
            const cleanupFunction = editor.store.listen(handleChangeEvent, {
                scope: "all",
                source: "all",
            });

            // Cleanup listener on component unmount or when dependencies change
            return () => {
                cleanupFunction();
            };
        }, [editor, isInSidebar]);

        const components: TLComponents = {
            ...{
                SharePanel: iamModerator ? CustomSharePanelForModerator : CustomSharePanelForParticipant,
                Minimap: null,
                ZoomMenu: null,
                ...(previewMode && !iamModerator && { PageMenu: null }),
            },
        };

        const onUiEvent: TLUiEventHandler = (name) => {
            // For enforcing manual back-to-content logic
            if (name.toString() === "zoom-to-content") {
                editor?.zoomToFit({ force: true, immediate: true });
                editor?.resetZoom();
            }
        };

        return (
            <Tldraw
                store={store}
                forceMobile={true}
                components={components}
                onUiEvent={onUiEvent}
                onMount={(editor) => {
                    setEditor(editor);
                    editor.registerExternalAssetHandler("url", unfurlBookmarkUrl);

                    if (onMount) onMount(editor);
                }}
                {...rest}
            />
        );
    }
);
