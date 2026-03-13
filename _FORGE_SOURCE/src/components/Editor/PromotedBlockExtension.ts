import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { PromotedBlockView } from './PromotedBlockView';
import { generateBlockId } from '../../lib/markdown';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    promotedBlock: {
      /**
       * Wrap the current selection in a promoted block
       */
      setPromotedBlock: (attrs?: { blockId?: string; blockType?: string }) => ReturnType;
      /**
       * Unwrap (demote) a promoted block back to normal content
       */
      unsetPromotedBlock: () => ReturnType;
    };
  }
}

export const PromotedBlock = Node.create({
  name: 'promotedBlock',

  group: 'block',

  content: 'block+',

  defining: true,

  isolating: false,

  addAttributes() {
    return {
      blockId: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-block-id'),
        renderHTML: (attributes: Record<string, any>) => {
          if (!attributes.blockId) return {};
          return { 'data-block-id': attributes.blockId };
        },
      },
      blockType: {
        default: 'claim',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-block-type') || 'claim',
        renderHTML: (attributes: Record<string, any>) => {
          return { 'data-block-type': attributes.blockType };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="promoted-block"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'promoted-block',
        class: 'promoted-block',
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PromotedBlockView);
  },

  addCommands() {
    return {
      setPromotedBlock:
        (attrs) =>
        ({ commands }) => {
          return commands.wrapIn(this.name, attrs);
        },
      unsetPromotedBlock:
        () =>
        ({ commands }) => {
          return commands.lift(this.name);
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-p': () => {
        // Toggle promoted block
        // If inside a promoted block, lift out. Otherwise, wrap.
        if (this.editor.isActive('promotedBlock')) {
          return this.editor.commands.unsetPromotedBlock();
        }
        return this.editor.commands.setPromotedBlock({
          blockId: generateBlockId(),
          blockType: 'claim',
        });
      },
    };
  },
});
