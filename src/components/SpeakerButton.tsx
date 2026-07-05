import { speak, speechAvailable } from "../lib/speech";

export default function SpeakerButton({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  if (!speechAvailable()) return null;
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        speak(text);
      }}
      aria-label={`唸出 ${text}`}
      className={`rounded-full p-1.5 text-xl leading-none active:bg-blue-100 ${className}`}
    >
      🔊
    </button>
  );
}
