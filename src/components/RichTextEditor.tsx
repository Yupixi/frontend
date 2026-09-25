import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import LinkExtension from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, Link, Undo2, Redo2,
} from './icons'

type RichTextEditorProps = {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
}

function ToolbarBtn({ onClick, active, icon: Icon, label }: { onClick: () => void, active: boolean, icon: typeof Bold, label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-none ${active ? 'bg-primary-fixed text-primary' : 'bg-transparent text-on-surface-variant hover:bg-surface-container'}`}
    >
      <Icon size={17} />
    </button>
  )
}

const Divider = () => <span className="mx-1 my-1 w-px self-stretch bg-outline-variant" aria-hidden />

export default function RichTextEditor({ content, onChange, placeholder, minHeight = 200 }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      LinkExtension.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: placeholder || 'Rédigez votre description ici...' }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        style: `min-height: ${minHeight}px; padding: 0.75rem 1rem; outline: none; font-size: 0.95rem; line-height: 1.7;`,
      },
    },
  })

  if (!editor) return null

  const addLink = () => {
    const url = window.prompt('Lien URL :')
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-transparent bg-surface-container-low focus-within:border-primary">
      <div className="flex flex-wrap items-center gap-0.5 border-0 border-b border-solid border-outline-variant bg-surface-lowest px-2 py-1.5">
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} icon={Bold} label="Gras" />
        <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} icon={Italic} label="Italique" />
        <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} icon={UnderlineIcon} label="Souligné" />
        <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} icon={Strikethrough} label="Barré" />
        <Divider />
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} icon={Heading1} label="Titre 1" />
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} icon={Heading2} label="Titre 2" />
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} icon={Heading3} label="Titre 3" />
        <Divider />
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} icon={List} label="Liste à puces" />
        <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} icon={ListOrdered} label="Liste numérotée" />
        <Divider />
        <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} icon={AlignLeft} label="Aligné à gauche" />
        <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} icon={AlignCenter} label="Centré" />
        <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} icon={AlignRight} label="Aligné à droite" />
        <Divider />
        <ToolbarBtn onClick={addLink} active={editor.isActive('link')} icon={Link} label="Lien" />
        <span className="flex-1" />
        <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} active={false} icon={Undo2} label="Annuler" />
        <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} active={false} icon={Redo2} label="Refaire" />
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
