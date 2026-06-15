import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link as LinkIcon,
  Unlink,
  Quote,
  Code,
  Code2,
  Image as ImageIcon,
} from "lucide-react";
import { useEffect } from "react";

interface Props {
  value: string;
  onChange: (html: string) => void;
  minHeight?: string;
}

export function RichTextEditor({ value, onChange, minHeight = "min-h-[60vh]" }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } }),
      Image.configure({ HTMLAttributes: { class: "rounded-md" } }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: `prose prose-neutral max-w-none ${minHeight} rounded-b-md border border-t-0 border-input bg-background px-4 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring`,
      },
    },
  });

  // Sync external value changes (e.g. opening editor for a different row)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!editor) return null;

  function setLink() {
    const prev = editor!.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor!.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor!.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  function insertImage() {
    const url = window.prompt("Image URL", "https://");
    if (!url) return;
    editor!.chain().focus().setImage({ src: url }).run();
  }

  const TbBtn = ({
    onClick,
    active,
    label,
    children,
  }: {
    onClick: () => void;
    active?: boolean;
    label: string;
    children: React.ReactNode;
  }) => (
    <Button
      type="button"
      size="sm"
      variant={active ? "secondary" : "ghost"}
      onClick={onClick}
      aria-label={label}
      title={label}
      className="h-8 w-8 p-0"
    >
      {children}
    </Button>
  );

  const Sep = () => <div className="mx-1 h-5 w-px bg-border" />;

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 rounded-t-md border border-input bg-muted/40 p-1 backdrop-blur">
        <TbBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} label="Heading 1"><Heading1 className="size-4" /></TbBtn>
        <TbBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} label="Heading 2"><Heading2 className="size-4" /></TbBtn>
        <TbBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} label="Heading 3"><Heading3 className="size-4" /></TbBtn>
        <Sep />
        <TbBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} label="Bold"><Bold className="size-4" /></TbBtn>
        <TbBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} label="Italic"><Italic className="size-4" /></TbBtn>
        <TbBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} label="Inline code"><Code className="size-4" /></TbBtn>
        <Sep />
        <TbBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} label="Bullet list"><List className="size-4" /></TbBtn>
        <TbBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} label="Ordered list"><ListOrdered className="size-4" /></TbBtn>
        <TbBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} label="Blockquote"><Quote className="size-4" /></TbBtn>
        <TbBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} label="Code block"><Code2 className="size-4" /></TbBtn>
        <Sep />
        <TbBtn onClick={insertImage} label="Insert image"><ImageIcon className="size-4" /></TbBtn>
        <TbBtn onClick={setLink} active={editor.isActive("link")} label="Link"><LinkIcon className="size-4" /></TbBtn>
        <TbBtn onClick={() => editor.chain().focus().unsetLink().run()} label="Remove link"><Unlink className="size-4" /></TbBtn>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
