import React, { createContext, useCallback, useState } from "react";
import { Editor } from "tldraw";

interface FocusedEditorContextProps {
  focusedEditor: Editor | null;
  setFocusedEditor: (editor: Editor | null) => void;
}

export const focusedEditorContext = createContext<FocusedEditorContextProps>({
  focusedEditor: null,
  setFocusedEditor: () => {},
});

export const FocusedEditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [focusedEditor, _setFocusedEditor] = useState<Editor | null>(null);

  const setFocusedEditor = useCallback(
    (editor: Editor | null) => {
      if (focusedEditor !== editor) {
        if (focusedEditor) focusedEditor.blur();
        if (editor) editor.focus();
        _setFocusedEditor(editor);
      }
    },
    [focusedEditor]
  );

  return <focusedEditorContext.Provider value={{ focusedEditor, setFocusedEditor }}>{children}</focusedEditorContext.Provider>;
};
