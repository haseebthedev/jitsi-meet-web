import React, { useEffect, useMemo, useRef, useState } from "react";
import { FileUpload } from "./WhiteboardFileUpload";
import { WhiteboardEditor } from "./whiteboard/WhiteboardEditor";
import { Sidebar } from "./WhiteboardSidebar";
import { AssetRecordType, createShapeId, Editor, TLImageShape } from "tldraw";
import { useSelector } from "react-redux";
import { IReduxState } from "../../../../app/types";
import { isLocalParticipantModerator } from "../../../../base/participants/functions";

const WhiteboardApp = () => {
    const editorsRef = useRef<Editor[]>([]);

    const state = useSelector((state: IReduxState) => state);

    const { local, remote } = useSelector((state: IReduxState) => state["features/base/participants"]);
    const { room } = useSelector((state: IReduxState) => state["features/base/conference"]);

    console.log("state === ", state);

    const iamModerator = isLocalParticipantModerator(state);

    const [isModalOpen, setModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [classId, setClassId] = useState("12345678");
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
            // @ts-ignore
            const uniqueParticipants = new Set(participants.map((p) => p?.id)); // Track existing IDs

            remote.forEach((value, key) => {
                if (key.toLowerCase() !== "whiteboard" && !uniqueParticipants.has(value.id)) {
                    setParticipants((prev) => [...prev, value] as any); // Add unique participant
                    uniqueParticipants.add(value.id); // Add ID to the set
                }
            });
        }
    }, [state, room, remote]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 2000);
        return () => clearTimeout(timer); // Cleanup timer on unmount
    }, []);

    const handleFileUpload = (images: string[]) => {
        if (!images || images.length === 0) return;

        editorsRef.current.forEach((editor) => {
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
                            w: 1366,
                            h: 768,
                            mimeType: "image/png",
                            src: image,
                            name: `image-${index + 1}`,
                            isAnimated: false,
                        },
                    },
                ]);

                const pageId = `page:${index + 1}` as any;
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
                    isLocked: false,
                    props: {
                        w: 1600,
                        h: 900,
                        assetId,
                    },
                });
            });

            const firstPage = editor.getPages()[0];
            if (firstPage) {
                editor.setCurrentPage(firstPage.id);
            }

            editor.zoomToFit();
        });

        setModalOpen(false);
    };

    const clearAllWhiteboards = () => {
        editorsRef.current.forEach((editor) => {
            const pageIds = editor.getPages().map((page) => page.id);

            pageIds.forEach((pageId) => {
                if (pageId !== editor.getCurrentPageId()) {
                    editor.deletePage(pageId);
                }
            });

            const currentPageId = editor.getCurrentPageId();
            const shapeIds = Array.from(editor.getPageShapeIds(currentPageId));
            editor.deleteShapes(shapeIds);

            editor.renamePage(currentPageId, "Page");

            const assetIds = editor.getAssets().map((asset) => asset.id);
            editor.deleteAssets(assetIds);

            editor.clearHistory();
            editor.zoomToFit();
        });
    };

    const handleClosePreview = () => setWhiteboardPreview(null);

    if (isLoading) return <div className="centered-content">Loading...</div>;

    if (!local) return <div className="centered-content">Unable to determine user. Please try again.</div>;

    return (
        <div className="app-container">
            <div className="app-container__main-content">
                {iamModerator && (
                    <FileUpload
                        iamModerator
                        isModalOpen={isModalOpen}
                        setModalOpen={setModalOpen}
                        onFileUpload={handleFileUpload}
                        onClear={clearAllWhiteboards}
                    />
                )}

                <div
                    className={`content-area ${isModalOpen ? "modal-open" : ""}`}
                    style={whiteboardPreview ? { opacity: 0 } : {}}
                >
                    <WhiteboardEditor
                        classId={classId}
                        occupantId={local?.id}
                        autoFocus
                        onMount={(editor) => editorsRef.current.push(editor)}
                    />
                </div>
            </div>

            <Sidebar
                classId={classId}
                iamModerator={iamModerator}
                occupants={participants}
                onPreviewClick={(occupantId: any) => setWhiteboardPreview(occupantId)}
                editorsRef={editorsRef}
            />

            {whiteboardPreview && (
                <div className="app-container__fullscreen-preview">
                    <button onClick={handleClosePreview} className="primary-button">
                        Go Back
                    </button>
                    <div className="fullscreen-editor">
                        <WhiteboardEditor
                            classId={classId}
                            occupantId={whiteboardPreview.split(".net/")[1]}
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
