import React from "react";
import { useSync } from "@tldraw/sync";
import { Tldraw, Editor, TldrawProps } from "tldraw";
import { multiplayerAssets, unfurlBookmarkUrl } from "./useSyncStore";
import "tldraw/tldraw.css";

interface WhiteboardEditorProps extends Omit<TldrawProps, "onMount"> {
    classId: string;
    occupantId: string;
    persistenceKey?: string;
    onMount?: (editor: Editor) => void;
}

const WORKER_URL = "https://jitsi.withturtled.com:5002";

export const WhiteboardEditor: React.FC<WhiteboardEditorProps> = ({ classId, occupantId, onMount, ...rest }) => {
    const roomId = `${classId}-${occupantId}`;

    const store = useSync({ uri: `${WORKER_URL}/connect/${roomId}`, assets: multiplayerAssets });

    return (
        <Tldraw
            store={store}
            autoFocus={false}
            onMount={(editor) => {
                editor.registerExternalAssetHandler("url", unfurlBookmarkUrl);
                if (onMount) onMount(editor);
            }}
            {...rest}
        />
    );
};
