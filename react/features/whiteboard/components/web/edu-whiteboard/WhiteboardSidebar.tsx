import React from "react";
import { Editor } from "tldraw";
import { WhiteboardEditor } from "./whiteboard/WhiteboardEditor";

interface SidebarI {
    iamModerator: boolean | null;
    occupants: Array<any>;
    onPreviewClick: Function;
    classId: string;
    editorsRef: React.MutableRefObject<Map<string, Editor>>;
}

const Sidebar = ({ iamModerator, occupants, onPreviewClick, editorsRef, classId }: SidebarI) => {
    const items = iamModerator
        ? occupants.filter((el) => el.role === "participant") // Show students for moderators
        : occupants.filter((el) => el.role === "moderator"); // Show tutor for students

    const handleEditorMount = (editor: Editor) => {
        const handleContentChange = () => {
            editor.zoomToFit();
            console.log("applyingToZoomToFit...");
        };

        // Subscribe to the editor's content changes
        editor.on("change", handleContentChange);

        // Clean up subscription on unmount
        return () => {
            editor.off("change", handleContentChange);
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

                            <div className="sidebar__item__content" style={{ zoom: 1.48 }}>
                                <div className="overlay" />
                                <WhiteboardEditor
                                    classId={classId}
                                    occupantId={String(occupant?.name).toLowerCase()}
                                    className="whiteboard-editor"
                                    autoFocus={false}
                                    isInSidebar={true}
                                    hideUi={true}
                                    onMount={(editor) => {
                                        editorsRef?.current.set(String(occupant?.name).toLowerCase(), editor);
                                        handleEditorMount(editor);
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
