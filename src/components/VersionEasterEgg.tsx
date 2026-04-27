import { useEffect, useState, useCallback } from "react";

const APP_VERSION = "1.0.0";
const BUILD_NUMBER = 1;
const SECRET_SEQUENCE = ["k", "u", "b", "e", "r", "a"]; // Type "kubera"

const VersionEasterEgg = () => {
  const [show, setShow] = useState(false);
  const [buffer, setBuffer] = useState<string[]>([]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (show) {
        if (e.key === "Escape") setShow(false);
        return;
      }

      const next = [...buffer, (e.key ?? "").toLowerCase()];
      if (next.length > SECRET_SEQUENCE.length) next.shift();

      setBuffer(next);

      if (
        next.length === SECRET_SEQUENCE.length &&
        next.every((k, i) => k === SECRET_SEQUENCE[i])
      ) {
        setShow(true);
        setBuffer([]);
      }
    },
    [buffer, show]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={() => setShow(false)}
    >
      <div
        className="bg-card border border-border rounded-xl p-8 shadow-2xl text-center max-w-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
          Kubera Global Markets
        </p>
        <p className="text-3xl font-bold text-foreground tabular-nums">
          v{APP_VERSION}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Build #{BUILD_NUMBER}
        </p>
        <button
          className="mt-6 text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setShow(false)}
        >
          Press Esc to close
        </button>
      </div>
    </div>
  );
};

export default VersionEasterEgg;
