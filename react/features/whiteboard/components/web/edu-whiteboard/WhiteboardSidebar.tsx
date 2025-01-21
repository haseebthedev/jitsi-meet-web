import React from "react";
import { Editor, TLRecord } from "tldraw";
import { WhiteboardEditor } from "./whiteboard/WhiteboardEditor";

interface SidebarI {
    iamModerator: boolean | null;
    occupants: Array<any>;
    onPreviewClick: Function;
    classId: string;
    editorsRef: React.MutableRefObject<Map<string, Editor>>;
}

// @ts-ignore
const isInstanceRecord = (record: TLRecord): record is { currentPageId: string } => "currentPageId" in record;

const Sidebar = ({ iamModerator, occupants, onPreviewClick, editorsRef, classId }: SidebarI) => {
    const items = iamModerator
        ? occupants.filter((el) => el.role === "participant") // Show students for moderators
        : occupants.filter((el) => el.role === "moderator"); // Show tutor for students

    const handleEditorMount = (editor: Editor) => {
        const handleChangeEvent = (change: any) => {
            const { added, updated, removed } = change.changes;

            added && console.log("Added:", added);
            updated && console.log("Updated:", updated);
            removed && console.log("Removed:", removed);

            // Process updated changes
            Object.values(updated).forEach(([from, to]: any) => {
                if (isInstanceRecord(from) && isInstanceRecord(to) && from.currentPageId !== to.currentPageId) {
                    // @ts-ignore
                    editor.setCurrentPage(to.currentPageId);
                }

                const currentPageId = editor.getCurrentPageId();
                if (currentPageId.includes("page:IA")) {
                    editor.zoomToFit({ force: true, immediate: true });
                }
            });
        };

        const cleanupFunction = editor.store.listen(handleChangeEvent, {
            scope: "all",
            source: "all",
        });

        return () => {
            cleanupFunction();
        };
    };

    return (
        <div className="sidebar">
            {items?.length > 0 ? (
                <div className="sidebar__content">
                    {items.map((occupant, index) => (
                        <div key={index} className="sidebar__item">
                            <div className="sidebar__item__header">
                                <h4>{iamModerator ? occupant.name : "Tutor's Board"}</h4>
                                <button
                                    className="primary-button"
                                    style={{ padding: "6px 14px", fontSize: 12 }}
                                    onClick={() => onPreviewClick(String(occupant.name).toLowerCase())}
                                >
                                    Preview
                                </button>
                            </div>

                            <div className="sidebar__item__content">
                                <div className="overlay" />
                                <WhiteboardEditor
                                    key={String(occupant?.name).toLowerCase()}
                                    classId={classId}
                                    occupantId={String(occupant?.name).toLowerCase()}
                                    className="whiteboard-editor"
                                    autoFocus={false}
                                    isInSidebar={true}
                                    hideUi={true}
                                    onMount={(editor) => {
                                        editorsRef?.current.set(String(occupant?.name).toLowerCase(), editor);
                                        handleEditorMount(editor);

                                        editor.zoomToFit({ force: true });
                                    }}
                                    previewMode={true}
                                    cameraOptions={{
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
                                            behavior: { x: "contain", y: "contain" },
                                            padding: { x: 0, y: 0 },
                                            origin: { x: 0, y: 0 },
                                        },
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="centered-content" style={{ fontSize: 14, color: "#329732" }}>
                    No active participants.
                </div>
            )}
        </div>
    );
};

export { Sidebar };
