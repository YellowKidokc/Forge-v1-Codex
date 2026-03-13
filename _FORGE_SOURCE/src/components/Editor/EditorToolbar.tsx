import React from 'react';
import { Editor } from '@tiptap/react';
import {
  Bold, Italic, Code, Heading1, Heading2, Heading3,
  List, Quote, Zap, Undo2, Redo2,
  Underline as UnderlineIcon, Strikethrough, CheckSquare, Table as TableIcon,
  Trash2, Columns, Rows
} from 'lucide-react';
import { generateBlockId } from '../../lib/markdown';

interface EditorToolbarProps {
  editor: Editor | null;
}

const ToolbarButton: React.FC<{
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}> = ({ onClick, active, disabled, title, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`toolbar-btn ${active ? 'toolbar-btn-active' : ''} cursor-pointer`}
  >
    {children}
  </button>
);

const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor }) => {
  if (!editor) return null;

  const promoteBlock = () => {
    if (editor.isActive('promotedBlock')) {
      editor.commands.unsetPromotedBlock();
    } else {
      editor.commands.setPromotedBlock({
        blockId: generateBlockId(),
        blockType: 'claim',
      });
    }
  };

  const addTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  return (
    <div className="editor-toolbar overflow-x-auto no-scrollbar bg-[#1a1a1a] border-b border-[#222] p-1 flex items-center gap-1">
      <div className="flex items-center gap-px">
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo"><Undo2 size={14} /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo"><Redo2 size={14} /></ToolbarButton>
      </div>
      <div className="w-px h-4 bg-gray-800 mx-1" />
      <div className="flex items-center gap-px">
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="H1"><Heading1 size={14} /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="H2"><Heading2 size={14} /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="H3"><Heading3 size={14} /></ToolbarButton>
      </div>
      <div className="w-px h-4 bg-gray-800 mx-1" />
      <div className="flex items-center gap-px">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold"><Bold size={14} /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic"><Italic size={14} /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline"><UnderlineIcon size={14} /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strike"><Strikethrough size={14} /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Code"><Code size={14} /></ToolbarButton>
      </div>
      <div className="w-px h-4 bg-gray-800 mx-1" />
      <div className="flex items-center gap-px">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="List"><List size={14} /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} title="Tasks"><CheckSquare size={14} /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Quote"><Quote size={14} /></ToolbarButton>
      </div>
      <div className="w-px h-4 bg-gray-800 mx-1" />
      <div className="flex items-center gap-px">
        <ToolbarButton onClick={addTable} active={editor.isActive('table')} title="Table"><TableIcon size={14} /></ToolbarButton>
        {editor.isActive('table') && (
          <>
            <ToolbarButton onClick={() => editor.chain().focus().addColumnAfter().run()} title="Add Column"><Columns size={12} className="rotate-90" /></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().addRowAfter().run()} title="Add Row"><Rows size={12} /></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().deleteTable().run()} title="Delete Table"><Trash2 size={12} className="text-red-500" /></ToolbarButton>
          </>
        )}
      </div>
      <div className="flex-1" />
      <ToolbarButton onClick={promoteBlock} active={editor.isActive('promotedBlock')} title="Promote"><Zap size={14} /><span className="text-[10px] font-bold ml-1">PROMOTE</span></ToolbarButton>
    </div>
  );
};

export default EditorToolbar;
