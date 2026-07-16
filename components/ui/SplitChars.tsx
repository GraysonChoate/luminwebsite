/**
 * Splits text lines into per-character spans for char-level animation.
 * Chars are grouped inside non-breaking word spans so line wrapping only
 * happens at word boundaries. Renders server-safe.
 */
export default function SplitChars({
  lines,
  className,
  charClassName = "split-char",
}: {
  lines: string[];
  className?: string;
  charClassName?: string;
}) {
  return (
    <span className={className} aria-label={lines.join(" ")}>
      {lines.map((line, li) => (
        <span key={li} className="block" aria-hidden="true">
          {line.split(" ").map((word, wi, arr) => (
            <span key={wi} className="inline-block whitespace-nowrap">
              {Array.from(word).map((ch, ci) => (
                <span key={ci} className={charClassName}>
                  {ch}
                </span>
              ))}
              {wi < arr.length - 1 ? <span className={charClassName}>{" "}</span> : null}
            </span>
          ))}
        </span>
      ))}
    </span>
  );
}
