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
    const [participantPreview, setParticipantPreview] = useState<string | null>(null);

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
            const uniqueParticipants = new Set(participants.map((p) => String(p?.name).toLowerCase()));

            remote.forEach((value, key) => {
                if (
                    !uniqueParticipants.has(String(value.name).toLowerCase()) &&
                    (value.role === "moderator" || value.role === "participant")
                ) {
                    setParticipants((prev) => [...prev, value] as any);
                    uniqueParticipants.add(String(value.name).toLowerCase());
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

        // Works like transaction to ensure atomicity
        transact(() => {
            editorsRef.current.forEach((editor) => {
                // Fetch existing pages to avoid overwriting
                const existingPages = editor.getPages();
                const existingPageIds = new Set(existingPages?.map((page) => page.id));

                // Create pages and shapes for each image
                images.forEach((image, index) => {
                    const assetId = AssetRecordType.createId();
                    const shapeId = createShapeId();
                    const pageId = `page:IA-${String(index + 1).padStart(2, "0")}` as any;

                    // Skip creating a page if it already exists
                    if (!existingPageIds.has(pageId)) {
                        editor.createPage({
                            id: pageId,
                            name: `IA-${String(index + 1).padStart(2, "0")}`,
                            meta: {},
                        });
                    }

                    // Set the current page to the newly created or existing page
                    editor.setCurrentPage(pageId);

                    // Create the image asset and shape
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

                // Navigate to the first page (IA-01)
                const firstPageId = `page:IA-01` as any;
                if (existingPageIds.has(firstPageId) || images.length > 0) {
                    editor.setCurrentPage(firstPageId);
                }

                // // Adjust zoom level and lock the camera
                editor.zoomToFit({ force: true, immediate: true });
                editor.setCameraOptions({ isLocked: true });
            });
        });

        onClose?.();
    };

    const onActivityRemove = () => {
        transact(() => {
            editorsRef.current.forEach((editor) => {
                // Get all pages
                const pages = editor.getPages();

                // Identify IA pages based on their IDs or names
                const iaPages = pages.filter((page) => page.name.startsWith("IA-"));
                const iaPageIds = new Set(iaPages.map((page) => page.id));

                // Delete IA pages
                iaPages.forEach((page) => {
                    editor.deletePage(page.id);
                });

                // Get all shapes from all IA pages and delete them
                iaPages.forEach((page) => {
                    const shapeIds = Array.from(editor.getPageShapeIds(page.id));
                    shapeIds.forEach((shapeId) => {
                        const shape = editor.getShape(shapeId);
                        if (shape?.type === "image" && shape.isLocked) {
                            editor.updateShape({ ...shape, isLocked: false });
                        }
                    });
                    editor.deleteShapes(shapeIds);
                });

                // Delete all assets used in IA pages
                const assetIdsToDelete = editor
                    .getAssets()
                    // @ts-ignore
                    .filter((asset) => iaPages.some((page) => asset.props?.name?.startsWith("image")))
                    .map((asset) => asset.id);

                editor.deleteAssets(assetIdsToDelete);

                // If the current page is deleted, switch to another existing page
                const currentPageId = editor.getCurrentPageId();
                if (iaPageIds.has(currentPageId)) {
                    const remainingPages = pages.filter((page) => !iaPageIds.has(page.id));
                    if (remainingPages.length > 0) {
                        editor.setCurrentPage(remainingPages[0].id);
                    }
                }

                // Clear history and reset view
                editor.clearHistory();
                editor.zoomToFit();
            });
        });
    };

    // const handleClosePreview = () => setParticipantPreview(null);

    const handleClosePreview = (occupantId: string) => {
        const editor = editorsRef.current.get(occupantId);
        if (editor) {
            // Fetch the current page from the occupant's whiteboard
            const currentPageId = editor.getCurrentPageId();

            // Update the sidebar editor to match
            editor.setCurrentPage(currentPageId);
            setParticipantPreview(null);
        }
    };

    const handleClearUserContent = () => {
        transact(() => {
            const editor = editorsRef.current.get(String(local?.name).toLowerCase());
            if (!editor) return;

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
                    onPreviewClick={(occupantId: string) => setParticipantPreview(occupantId)}
                />
                <div className="content-area" style={participantPreview ? { opacity: 0 } : {}}>
                    <WhiteboardEditor
                        autoFocus={true}
                        iamModerator={iamModerator}
                        classId={room}
                        occupantId={local?.name?.toLowerCase() as any}
                        onActivityUpload={onActivityUpload}
                        onActivityRemove={onActivityRemove}
                        onClearPage={handleClearUserContent}
                        onMount={(editor) => {
                            editorsRef.current.set(String(local?.name?.toLowerCase()), editor);
                        }}
                    />
                </div>
            </div>

            <Sidebar
                classId={room}
                iamModerator={iamModerator}
                occupants={participants}
                onPreviewClick={(occupantId: string) => setParticipantPreview(occupantId)}
                editorsRef={editorsRef}
            />

            {participantPreview && (
                <div className="app-container__fullscreen-preview">
                    <button
                        onClick={() => {
                            handleClosePreview(participantPreview);
                        }}
                        className="primary-button"
                    >
                        Go Back
                    </button>
                    <div className="fullscreen-editor">
                        <WhiteboardEditor
                            classId={room}
                            iamModerator={iamModerator}
                            occupantId={participantPreview}
                            autoFocus={false}
                            previewMode={true}
                            // onMount={(editor) => {
                            //     editor.zoomToFit({ force: true, immediate: true });
                            // }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export { WhiteboardApp };
