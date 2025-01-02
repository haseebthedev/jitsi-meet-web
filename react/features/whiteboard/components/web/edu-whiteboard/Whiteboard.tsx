import React, { useEffect, useRef, useState } from "react";
import { WhiteboardEditor } from "./whiteboard/WhiteboardEditor";
import { Sidebar } from "./WhiteboardSidebar";
import { AssetRecordType, createShapeId, Editor, TLImageShape, transact, TLFrameShape } from "tldraw";
import { useSelector } from "react-redux";
import { IReduxState } from "../../../../app/types";
import { isLocalParticipantModerator } from "../../../../base/participants/functions";
import { WhiteboarMobileTopBar } from "./WhiteboardMobileTopBar";

const WhiteboardApp = () => {
    const editorsRef = useRef(new Map<string, Editor>());

    const state = useSelector((state: IReduxState) => state);

    const { local, remote } = useSelector((state: IReduxState) => state["features/base/participants"]);
    const { room } = useSelector((state: IReduxState) => state["features/base/conference"]);

    const iamModerator = isLocalParticipantModerator(state);

    const [isLoading, setIsLoading] = useState(true);
    const [participants, setParticipants] = useState([]);
    const [whiteboardPreview, setWhiteboardPreview] = useState<string | null>(null);

    // Initialize participants with the local participant
    useEffect(() => {
        if (local) {
            setParticipants([local] as any);
        }
    }, [local]);

    useEffect(() => {
        if (room && remote) {
            console.log("remote ==== ", remote);

            // Track existing IDs
            // @ts-ignore
            const uniqueParticipants = new Set(participants.map((p) => p?.name));

            remote.forEach((value, key) => {
                if (
                    !uniqueParticipants.has(value.name) &&
                    (value.role === "moderator" || value.role === "participant")
                ) {
                    setParticipants((prev) => [...prev, value] as any);
                    uniqueParticipants.add(value.name);
                }
            });
        }
    }, [state, room, remote]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 2000);
        return () => clearTimeout(timer);
    }, []);

    const onActivityUpload = (images: string[], onClose: Function) => {
        if (!images || images.length === 0) return;

        // Works like transaction, it would ensure it would execute this block before executing another command for tldraw
        transact(() => {
            editorsRef.current.forEach((editor) => {
                // Start creating pages and shapes for images
                images.forEach((image, index) => {
                    const assetId = AssetRecordType.createId();
                    const shapeId = createShapeId();

                    editor.createAssets([
                        {
                            id: assetId,
                            typeName: "asset",
                            type: "image",
                            meta: {},
                            props: {
                                w: 1920,
                                h: 1080,
                                mimeType: "image/png",
                                src: image,
                                name: `image-${index + 1}`,
                                isAnimated: false,
                            },
                        },
                    ]);

                    const pageId = `page:activity-${index + 1}` as any;
                    editor.createPage({
                        id: pageId,
                        name: `Page ${index + 1}`,
                        meta: {},
                    });

                    editor.setCurrentPage(pageId);

                    editor.createShape<TLImageShape>({
                        id: shapeId,
                        type: "image",
                        x: 0,
                        y: 0,
                        props: {
                            w: 1920,
                            h: 1080,
                            assetId,
                        },
                        isLocked: true,
                    });
                });

                // Adjust zoom level to fit the first page
                editor.zoomToFit();
                editor.setCameraOptions({ isLocked: true });
            });
        });

        onClose?.();
    };

    const onActivityRemove = () => {
        transact(() => {
            editorsRef.current.forEach((editor) => {
                const currentPageId = editor.getCurrentPageId();

                // Unlock all image shapes
                const shapeIds = Array.from(editor.getPageShapeIds(currentPageId));

                shapeIds.forEach((shapeId) => {
                    const shape = editor.getShape(shapeId);
                    if (shape?.type === "image" && shape.isLocked) {
                        editor.updateShape({ ...shape, isLocked: false });
                    }
                });

                const pageIds = editor.getPages().map((page) => page.id);

                pageIds.forEach((pageId) => {
                    if (pageId !== editor.getCurrentPageId()) {
                        editor.deletePage(pageId);
                    }
                });

                editor.deleteShapes(shapeIds);

                editor.renamePage(currentPageId, "Page");

                const assetIds = editor.getAssets().map((asset) => asset.id);
                editor.deleteAssets(assetIds);

                editor.clearHistory();
                editor.zoomToFit();
            });
        });
    };

    const handleClosePreview = () => setWhiteboardPreview(null);

    const handleClearUserContent = () => {
        transact(() => {
            editorsRef.current.forEach((editor) => {
                const currentPageId = editor.getCurrentPageId();

                // Get all shapes on the current page
                const allShapeIds = Array.from(editor.getPageShapeIds(currentPageId));

                // Filter out frame shapes and their children from the deletion list
                const shapesToDelete = allShapeIds.filter((shapeId) => {
                    const shape = editor.getShape(shapeId);
                    // @ts-ignore
                    return shape?.type !== "frame" && shape?.type !== "image";
                    // return shape?.props?.name !== "Frame" && !shape.props?.name?.startsWith("Image");
                });
                editor.deleteShapes(shapesToDelete);
            });
        });
    };

    if (isLoading) return <div className="centered-content">Loading...</div>;

    if (!local) return <div className="centered-content">Unable to determine user. Please try again.</div>;

    if (!room) return <div className="centered-content">Invalid room. Please try again.</div>;

    return (
        <div className="app-container">
            <div className="app-container__main-content">
                {/* For Mobile View - Participants */}
                <WhiteboarMobileTopBar
                    iamModerator={iamModerator}
                    occupants={participants}
                    onPreviewClick={(occupantId: string) => setWhiteboardPreview(occupantId)}
                />
                <div className="content-area" style={whiteboardPreview ? { opacity: 0 } : {}}>
                    <WhiteboardEditor
                        iamModerator={iamModerator}
                        classId={room}
                        occupantId={local?.name as any}
                        autoFocus={true}
                        onMount={(editor) => {
                            editorsRef.current.set(String(local?.id), editor);
                        }}
                        onActivityUpload={onActivityUpload}
                        onActivityRemove={onActivityRemove}
                        onClearPage={handleClearUserContent}
                    />
                </div>
            </div>

            <Sidebar
                classId={room}
                iamModerator={iamModerator}
                occupants={participants}
                onPreviewClick={(occupantId: string) => setWhiteboardPreview(occupantId)}
                editorsRef={editorsRef}
            />

            {whiteboardPreview && (
                <div className="app-container__fullscreen-preview">
                    <button onClick={handleClosePreview} className="primary-button">
                        Go Back
                    </button>
                    <div className="fullscreen-editor">
                        <WhiteboardEditor
                            classId={room}
                            occupantId={whiteboardPreview}
                            autoFocus
                            onMount={(editor) => editor.resetZoom()}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export { WhiteboardApp };
