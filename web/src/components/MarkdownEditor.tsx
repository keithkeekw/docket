import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import type { MarkdownStorage } from 'tiptap-markdown';
import { Markdown } from 'tiptap-markdown';
import { useEffect } from 'react';
import { cx } from '../lib/cx';
import { useT } from '../lib/i18n';
import { compactMarkdownClass } from '../lib/markdown';

function getMarkdown(editor: NonNullable<ReturnType<typeof useEditor>>): string {
  const storage = editor.storage as unknown as { markdown: MarkdownStorage };
  return storage.markdown.getMarkdown().trim();
}

/**
 * WYSIWYG Markdown editor: formatting is applied inside the editable area as
 * you type (**, #, -, >, etc.) instead of showing a separate preview.
 */
export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const t = useT();
  const placeholderText = placeholder ?? t('Add notes…');

  const editor = useEditor(
    {
      extensions: [
        StarterKit,
        Markdown.configure({
          html: false,
          breaks: true,
          tightLists: true,
          transformPastedText: true,
        }),
        Placeholder.configure({ placeholder: placeholderText }),
      ],
      content: value,
      editorProps: {
        attributes: {
          class: cx(
            'notes-editor min-h-[120px] px-3 py-2 text-sm leading-relaxed text-zinc-900 focus:outline-none',
            compactMarkdownClass,
          ),
          'aria-label': t('Notes'),
          'aria-multiline': 'true',
        },
      },
      onUpdate: ({ editor: current }) => {
        onChange(getMarkdown(current));
      },
    },
    [placeholderText],
  );

  // Re-seed when the task changes or a fresh copy arrives from the server.
  useEffect(() => {
    if (!editor) return;
    if (value !== getMarkdown(editor)) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  return (
    <div
      className={cx(
        'rounded-[10px] border border-zinc-200 bg-white focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2',
        className,
      )}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
