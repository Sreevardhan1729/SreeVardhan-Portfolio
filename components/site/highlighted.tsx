// Renders text where **double asterisks** mark the highlighted parts.
export function Highlighted({ text }: { text: string }) {
  // Splitting on a capture group puts the highlighted parts at odd indexes.
  return text.split(/\*\*(.+?)\*\*/g).map((part, index) =>
    index % 2 === 1 ? (
      <strong key={index} className="font-medium text-foreground">
        {part}
      </strong>
    ) : (
      part
    ),
  )
}
