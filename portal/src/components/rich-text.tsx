/**
 * Question, passage, option and solution text with images. Images are stored in the text as
 * [[img:/media/<id>]] (from Word uploads) or [[img:https://…]], so a graph can sit anywhere in a
 * passage or question.
 */
const TOKEN = /\[\[img:((?:\/media\/[0-9a-f-]{36})|(?:https:\/\/[^\s\]]+))\]\]/gi;

export function RichText({ text, className, style }: { text: string | null | undefined; className?: string; style?: React.CSSProperties }) {
  if (!text) return null;
  const parts = text.split(TOKEN);
  if (parts.length === 1) return <div className={className} style={style}>{text}</div>;
  return (
    <div className={className} style={style}>
      {parts.map((p, i) => (i % 2 === 1
        ? <img key={i} src={p} alt="Figure" loading="lazy" style={{ display: 'block', maxWidth: '100%', height: 'auto', margin: '8px 0', borderRadius: 8, border: '1px solid var(--line)', background: '#fff' }} />
        : p.trim() ? <span key={i}>{p.replace(/^\n+|\n+$/g, '')}</span> : null))}
    </div>
  );
}

/** Plain text without image markers (for short previews and the AI). */
export const stripImages = (text: string) => text.replace(TOKEN, '').replace(/\n{3,}/g, '\n\n').trim();
