import { useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface CertificateRendererProps {
  type: "completion" | "payout";
  fullName: string;
  date: string;
  amount?: number;
  account?: string;
}

const CertificateRenderer = ({ type, fullName, date, amount, account }: CertificateRendererProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawCertificate = useCallback(
    (canvas: HTMLCanvasElement) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src =
        type === "payout"
          ? "/images/cert-payout-bg.png"
          : "/images/cert-completion-bg.png";

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        if (type === "payout") {
          // Payout amount next to "$"
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 44px Arial, sans-serif";
          ctx.fillText(
            `${(amount ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
            90,
            150
          );

          // Name on "Awarded to:" line
          ctx.font = "bold 32px Arial, sans-serif";
          ctx.fillText(fullName, 160, canvas.height - 55);
        } else {
          // Completion certificate
          // Date on the first line (above "proudly presented to")
          ctx.fillStyle = "#cccccc";
          ctx.font = "italic 20px Arial, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          const dateLineCenterX = 500;
          const centerX = 370 + (canvas.width - 370) / 2;
          ctx.fillText(date, dateLineCenterX, 210);
          ctx.textBaseline = "alphabetic";

          // Name on the line below "proudly presented to"
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 36px Arial, sans-serif";
          ctx.fillText(fullName, centerX, 340);
          ctx.textAlign = "start";
        }
      };
    },
    [type, fullName, date, amount]
  );

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type === "payout" ? "Payout" : "Completion"}-Certificate-${fullName.replace(/\s+/g, "_")}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg overflow-hidden border border-border">
        <canvas
          ref={(el) => {
            if (el) {
              (canvasRef as React.MutableRefObject<HTMLCanvasElement>).current = el;
              drawCertificate(el);
            }
          }}
          className="w-full h-auto"
        />
      </div>
      <Button onClick={handleDownload} size="sm" className="w-full">
        <Download className="w-4 h-4 mr-2" />
        Download Certificate
      </Button>
    </div>
  );
};

export default CertificateRenderer;
