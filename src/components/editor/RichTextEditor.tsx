'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Color } from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import Highlight from '@tiptap/extension-highlight'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import { useEffect, useState } from 'react'

const COLOR_SWATCHES = [
  '#e8f4f8', '#2dd4bf', '#67e8f9', '#f59e0b',
  '#ef4444', '#22c55e', '#6366f1', '#ec4899',
]

interface ToolbarButtonProps {
  active?: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
  disabled?: boolean
}

function ToolbarButton({ active, onClick, title, children, disabled }: ToolbarButtonProps) {
  return (
    <button
      onMouseDown={e => { e.preventDefault(); onClick() }}
      title={title}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        minWidth: 28, height: 28, borderRadius: 5, border: 'none',
        background: active ? 'rgba(45,212,191,0.18)' : 'transparent',
        color: active ? '#2dd4bf' : '#a8ccd8',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 12, fontWeight: 700, opacity: disabled ? 0.35 : 1,
        padding: '0 5px', transition: 'all 0.1s',
      }}
      onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = active ? 'rgba(45,212,191,0.25)' : 'rgba(45,212,191,0.08)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = active ? 'rgba(45,212,191,0.18)' : 'transparent' }}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <span style={{ width: 1, height: 18, background: 'rgba(45,212,191,0.15)', margin: '0 3px', display: 'inline-block', flexShrink: 0 }} />
}

interface RichTextEditorProps {
  content: string
  onChange?: (html: string) => void
  editable?: boolean
  minHeight?: number
  placeholder?: string
}

export default function RichTextEditor({ content, onChange, editable = true, minHeight = 120, placeholder = 'Add a description…' }: RichTextEditorProps) {
  const [colorPickerOpen, setColorPickerOpen] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: { HTMLAttributes: { style: 'background:#061c2e;font-family:var(--font-mono,monospace);border-radius:6px;padding:12px;font-size:12px;color:#a8ccd8;overflow-x:auto;' } },
      }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Underline,
      Link.configure({ openOnClick: !editable, HTMLAttributes: { style: 'color:#2dd4bf;text-decoration:underline;cursor:pointer;' } }),
      Placeholder.configure({ placeholder }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor }) => { onChange?.(editor.getHTML()) },
  })

  useEffect(() => {
    if (!editor) return
    if (editor.isEditable !== editable) editor.setEditable(editable)
  }, [editor, editable])

  useEffect(() => {
    if (!editor) return
    if (content !== editor.getHTML()) {
      editor.commands.setContent(content || '', { emitUpdate: false })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content])

  if (!editor) return null

  return (
    <div style={{ border: '1px solid rgba(45,212,191,0.18)', borderRadius: 8, overflow: 'hidden', background: '#040e17' }}>
      {/* Toolbar — only shown in edit mode */}
      {editable && (
        <div style={{ background: '#061c2e', borderBottom: '1px solid rgba(45,212,191,0.12)', padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', position: 'relative' }}>
          {/* Text style */}
          <ToolbarButton active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold (Ctrl+B)"><strong>B</strong></ToolbarButton>
          <ToolbarButton active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic (Ctrl+I)"><em>I</em></ToolbarButton>
          <ToolbarButton active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline"><span style={{ textDecoration: 'underline' }}>U</span></ToolbarButton>
          <ToolbarButton active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough"><span style={{ textDecoration: 'line-through' }}>S</span></ToolbarButton>

          <Divider />

          {/* Headings */}
          <ToolbarButton active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">H1</ToolbarButton>
          <ToolbarButton active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">H2</ToolbarButton>
          <ToolbarButton active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">H3</ToolbarButton>

          <Divider />

          {/* Lists */}
          <ToolbarButton active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List">≡</ToolbarButton>
          <ToolbarButton active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Ordered List">1.</ToolbarButton>

          <Divider />

          {/* Code */}
          <ToolbarButton active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()} title="Inline Code">{`<>`}</ToolbarButton>
          <ToolbarButton active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code Block">
            <span style={{ fontFamily: 'monospace', fontSize: 10 }}>```</span>
          </ToolbarButton>

          <Divider />

          {/* Link */}
          <ToolbarButton
            active={editor.isActive('link')}
            onClick={() => {
              if (editor.isActive('link')) { editor.chain().focus().unsetLink().run(); return }
              const url = window.prompt('URL:')
              if (url) editor.chain().focus().setLink({ href: url }).run()
            }}
            title="Link"
          >🔗</ToolbarButton>

          <Divider />

          {/* Align */}
          <ToolbarButton active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Align Left">⬅</ToolbarButton>
          <ToolbarButton active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Center">↔</ToolbarButton>
          <ToolbarButton active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Align Right">➡</ToolbarButton>

          <Divider />

          {/* Color picker */}
          <div style={{ position: 'relative' }}>
            <ToolbarButton active={colorPickerOpen} onClick={() => setColorPickerOpen(o => !o)} title="Text Color">
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                <span style={{ fontSize: 11, fontWeight: 700 }}>A</span>
                <span style={{ width: 14, height: 3, borderRadius: 2, background: (editor.getAttributes('textStyle').color as string) ?? '#2dd4bf' }} />
              </span>
            </ToolbarButton>
            {colorPickerOpen && (
              <div
                style={{ position: 'absolute', top: 34, left: 0, background: '#0a2236', border: '1px solid rgba(45,212,191,0.25)', borderRadius: 8, padding: 8, zIndex: 100, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}
                onMouseDown={e => e.preventDefault()}
              >
                {COLOR_SWATCHES.map(c => (
                  <button
                    key={c}
                    onMouseDown={e => { e.preventDefault(); editor.chain().focus().setColor(c).run(); setColorPickerOpen(false) }}
                    title={c}
                    style={{ width: 22, height: 22, borderRadius: 5, background: c, border: `2px solid ${editor.getAttributes('textStyle').color === c ? '#e8f4f8' : 'transparent'}`, cursor: 'pointer', padding: 0, transition: 'border-color 0.1s' }}
                  />
                ))}
                <button
                  onMouseDown={e => { e.preventDefault(); editor.chain().focus().unsetColor().run(); setColorPickerOpen(false) }}
                  style={{ gridColumn: '1/-1', padding: '4px 0', borderRadius: 5, background: 'rgba(107,143,168,0.1)', border: '1px solid rgba(107,143,168,0.2)', color: '#6b8fa8', fontSize: 10, cursor: 'pointer' }}
                >Reset</button>
              </div>
            )}
          </div>

          {/* Highlight */}
          <ToolbarButton
            active={editor.isActive('highlight')}
            onClick={() => editor.chain().focus().toggleHighlight({ color: '#2dd4bf33' }).run()}
            title="Highlight"
          >
            <span style={{ background: '#2dd4bf33', padding: '1px 4px', borderRadius: 3, fontSize: 11 }}>H</span>
          </ToolbarButton>
        </div>
      )}

      {/* Editor content area */}
      <div
        style={{ padding: editable ? '12px 14px' : '0', minHeight: editable ? minHeight : 0 }}
        onClick={() => setColorPickerOpen(false)}
      >
        <style>{`
          .tiptap-editor .ProseMirror {
            outline: none;
            min-height: ${minHeight}px;
            color: #e8f4f8;
            font-size: 14px;
            line-height: 1.65;
            font-family: var(--font-inter, sans-serif);
          }
          .tiptap-editor .ProseMirror p { margin: 0 0 8px 0; }
          .tiptap-editor .ProseMirror p:last-child { margin-bottom: 0; }
          .tiptap-editor .ProseMirror h1 { font-size: 20px; font-weight: 800; color: #e8f4f8; margin: 12px 0 8px; }
          .tiptap-editor .ProseMirror h2 { font-size: 16px; font-weight: 700; color: #e8f4f8; margin: 10px 0 6px; }
          .tiptap-editor .ProseMirror h3 { font-size: 14px; font-weight: 700; color: #a8ccd8; margin: 8px 0 4px; }
          .tiptap-editor .ProseMirror ul, .tiptap-editor .ProseMirror ol { padding-left: 20px; margin: 4px 0 8px; }
          .tiptap-editor .ProseMirror li { margin: 2px 0; color: #e8f4f8; }
          .tiptap-editor .ProseMirror code { background: rgba(45,212,191,0.12); color: #2dd4bf; padding: 2px 6px; border-radius: 4px; font-family: var(--font-mono, monospace); font-size: 13px; }
          .tiptap-editor .ProseMirror a { color: #2dd4bf; text-decoration: underline; }
          .tiptap-editor .ProseMirror blockquote { border-left: 3px solid rgba(45,212,191,0.4); padding-left: 12px; margin: 8px 0; color: #a8ccd8; }
          .tiptap-editor .ProseMirror hr { border: none; border-top: 1px solid rgba(45,212,191,0.15); margin: 12px 0; }
          .tiptap-editor .ProseMirror mark { border-radius: 3px; padding: 1px 2px; }
          .tiptap-editor .ProseMirror p.is-editor-empty:first-child::before { content: attr(data-placeholder); float: left; color: #3a5a6e; pointer-events: none; height: 0; font-style: italic; }
        `}</style>
        <div className="tiptap-editor">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  )
}
