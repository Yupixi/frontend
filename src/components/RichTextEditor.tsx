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
  Pilcrow,
} from 'lucide-react'

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
      style={{
        width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: 'none', borderRadius: 6, cursor: 'pointer',
        background: active ? 'rgba(254,0,0,0.1)' : 'transparent',
        color: active ? 'var(--primary)' : 'var(--fg-muted)',
        transition: 'all 0.1s',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--border-subtle)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      <Icon size={16} />
    </button>
  )
}

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
        style: `min-height: ${minHeight}px; padding: 0.75rem 1rem; outline: none; font-size: 0.925rem; line-height: 1.7;`,
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
    <div style={{ border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'var(--bg-card)' }}>
      <div style={{ display: 'flex', gap: 2, padding: '0.4rem 0.5rem', borderBottom: '1px solid var(--border)', background: 'var(--border-subtle)', flexWrap: 'wrap' }}>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} icon={Bold} label="Gras" />
        <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} icon={Italic} label="Italique" />
        <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} icon={UnderlineIcon} label="Souligné" />
        <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} icon={Strikethrough} label="Barré" />
        <div style={{ width: 1, background: 'var(--border)', margin: '4px 4px' }} />
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} icon={Heading1} label="Titre 1" />
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} icon={Heading2} label="Titre 2" />
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} icon={Heading3} label="Titre 3" />
        <div style={{ width: 1, background: 'var(--border)', margin: '4px 4px' }} />
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} icon={List} label="Liste à puces" />
        <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} icon={ListOrdered} label="Liste numérotée" />
        <div style={{ width: 1, background: 'var(--border)', margin: '4px 4px' }} />
        <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} icon={AlignLeft} label="Aligné à gauche" />
        <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} icon={AlignCenter} label="Centré" />
        <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} icon={AlignRight} label="Aligné à droite" />
        <div style={{ width: 1, background: 'var(--border)', margin: '4px 4px' }} />
        <ToolbarBtn onClick={addLink} active={editor.isActive('link')} icon={Link} label="Lien" />
        <div style={{ flex: 1 }} />
        <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} active={false} icon={Undo2} label="Annuler" />
        <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} active={false} icon={Redo2} label="Refaire" />
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
