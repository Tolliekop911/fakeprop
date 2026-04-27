import { useEffect, useRef, useCallback } from "react";

function playNotifSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = "sine";
    o.frequency.setValueAtTime(880, ctx.currentTime);
    o.frequency.setValueAtTime(1100, ctx.currentTime + 0.08);
    o.frequency.setValueAtTime(1320, ctx.currentTime + 0.16);
    g.gain.setValueAtTime(0.12, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    o.start(ctx.currentTime);
    o.stop(ctx.currentTime + 0.4);
  } catch {}
}

function playBankSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = "sine";
    o.frequency.setValueAtTime(660, ctx.currentTime);
    o.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
    o.frequency.setValueAtTime(1100, ctx.currentTime + 0.2);
    o.frequency.setValueAtTime(1320, ctx.currentTime + 0.3);
    g.gain.setValueAtTime(0.1, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    o.start(ctx.currentTime);
    o.stop(ctx.currentTime + 0.5);
  } catch {}
}

const PhoneMockup = () => {
  const notif1Ref = useRef<HTMLDivElement>(null);
  const notif2Ref = useRef<HTMLDivElement>(null);

  const runCycle = useCallback(() => {
    const n1 = notif1Ref.current;
    const n2 = notif2Ref.current;
    if (!n1 || !n2) return;

    // Reset both
    n1.classList.remove("animate-slide-down");
    n1.classList.add("opacity-0");
    n2.classList.remove("animate-slide-down");
    n2.classList.add("opacity-0");

    // Notification 1 after 2s
    const t1 = setTimeout(() => {
      n1.classList.add("animate-slide-down");
      n1.classList.remove("opacity-0");
      playNotifSound();
    }, 2000);

    // Notification 2 after 3.6s
    const t2 = setTimeout(() => {
      n2.classList.add("animate-slide-down");
      n2.classList.remove("opacity-0");
      playBankSound();
    }, 3600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    // Run first cycle immediately
    let cleanup = runCycle();

    // Repeat every 5s (full cycle: 2s wait + notifs, then reset)
    const interval = setInterval(() => {
      cleanup?.();
      cleanup = runCycle();
    }, 5000);

    return () => {
      cleanup?.();
      clearInterval(interval);
    };
  }, [runCycle]);

  return (
    <div className="relative w-[280px] md:w-[320px] mx-auto overflow-hidden">
      {/* Phone body */}
      <div className="w-full aspect-[320/680] rounded-[44px] bg-gradient-to-b from-[#2A2A2A] to-[#1A1A1A] border-[1.5px] border-[#444] relative overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.05)_inset]">
        {/* Notch */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[70px] h-6 bg-[#111] rounded-xl z-50">
          <div className="w-2.5 h-2.5 rounded-full bg-[#1A1A1A] border border-[#222] absolute top-[7px] left-1/2 -translate-x-1/2" />
        </div>

        {/* Screen */}
        <div className="absolute top-[38px] left-[18px] right-[18px] bottom-[18px] rounded-md bg-gradient-to-b from-[#141414] to-[#0D0D0D] overflow-hidden">
          {/* Status bar */}
          <div className="h-9 flex items-center justify-between px-5">
            <span className="font-sans text-[11px] text-[#999] font-medium">9:41</span>
            <div className="flex items-center gap-1">
              <div className="w-[18px] h-[10px] rounded-[2.5px] border border-[#999] relative">
                <div className="absolute top-[2px] left-[2px] w-3 h-1.5 rounded-[1.5px] bg-green-500" />
              </div>
            </div>
          </div>

          {/* Header */}
          <div className="h-11 bg-[#1A1A1A] flex items-center justify-between px-5">
            <div>
              <span className="font-sans text-[13px] text-white font-bold tracking-wide">KUBERA </span>
              <span className="font-sans text-[13px] text-primary font-bold tracking-wide">MARKETS</span>
            </div>
            <div className="w-6 h-6 rounded-full bg-[#222] border border-[#333] flex items-center justify-center font-sans text-[11px] text-primary font-semibold">DS</div>
          </div>

          {/* Account badge */}
          <div className="mx-3 mt-2.5 p-3 bg-[#1E1E1E] border border-[#2A2A2A] rounded-[10px] flex justify-between items-center">
            <div>
              <div className="font-sans text-[9px] text-[#666] font-semibold tracking-[1px] mb-1">FUNDED ACCOUNT</div>
              <div className="font-sans text-xl text-white font-extrabold tracking-tight">$50,000</div>
            </div>
            <div className="bg-green-500/10 border border-green-500/25 rounded-xl px-3.5 py-1 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="font-sans text-[9.5px] text-green-500 font-bold">QUALIFIED</span>
            </div>
          </div>

          {/* P&L + Equity */}
          <div className="flex gap-2 mx-3 mt-2.5">
            <div className="flex-1 p-3 bg-[#1E1E1E] border border-[#2A2A2A] rounded-[10px]">
              <div className="font-sans text-[9px] text-[#666] font-semibold tracking-wide mb-2">PROFIT</div>
              <div className="font-sans text-[19px] text-green-500 font-extrabold">+$3,847</div>
              <div className="font-sans text-[9px] text-green-500 font-semibold mt-1">↑ 7.69%</div>
            </div>
            <div className="flex-1 p-3 bg-[#1E1E1E] border border-[#2A2A2A] rounded-[10px]">
              <div className="font-sans text-[9px] text-[#666] font-semibold tracking-wide mb-2">EQUITY</div>
              <div className="font-sans text-[19px] text-white font-extrabold">$52,347</div>
              <div className="font-sans text-[9px] text-[#999] font-medium mt-1">after withdrawal</div>
            </div>
          </div>

          {/* Equity curve */}
          <div className="mx-3 mt-2.5 p-3 bg-[#1E1E1E] border border-[#2A2A2A] rounded-[10px]">
            <div className="flex justify-between mb-2.5">
              <span className="font-sans text-[9px] text-[#666] font-semibold tracking-wide">EQUITY CURVE</span>
              <span className="font-sans text-[9px] text-green-500 font-semibold">+7.69%</span>
            </div>
            <svg width="100%" viewBox="0 0 236 50" className="block">
              <line x1="0" y1="12" x2="236" y2="12" stroke="#2A2A2A" strokeWidth="0.3"/>
              <line x1="0" y1="24" x2="236" y2="24" stroke="#2A2A2A" strokeWidth="0.3"/>
              <line x1="0" y1="36" x2="236" y2="36" stroke="#2A2A2A" strokeWidth="0.3"/>
              <defs>
                <linearGradient id="cl" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#E8554E"/><stop offset="30%" stopColor="#E8554E"/>
                  <stop offset="55%" stopColor="#22C55E"/><stop offset="100%" stopColor="#22C55E"/>
                </linearGradient>
                <linearGradient id="cf" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22C55E" stopOpacity="0.15"/>
                  <stop offset="100%" stopColor="#22C55E" stopOpacity="0"/>
                </linearGradient>
              </defs>
              <path d="M0,44 L26,42 L52,38 L78,36 L100,40 L118,30 L140,22 L165,14 L190,10 L215,7 L236,2 L236,48 L0,48 Z" fill="url(#cf)" opacity="0.8"/>
              <polyline points="0,44 26,42 52,38 78,36 100,40 118,30 140,22 165,14 190,10 215,7 236,2" fill="none" stroke="url(#cl)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="236" cy="2" r="3" fill="#22C55E" stroke="#1E1E1E" strokeWidth="2"/>
            </svg>
          </div>

          {/* Open positions */}
          <div className="mx-3 mt-2.5 p-3 bg-[#1E1E1E] border border-[#2A2A2A] rounded-[10px]">
            <div className="font-sans text-[9px] text-[#666] font-semibold tracking-wide mb-2.5">OPEN POSITIONS</div>
            <div className="flex flex-col gap-2">
              {[
                { sym: "EURUSD", dir: "BUY", lot: "1.50", pnl: "+$1,240", green: true },
                { sym: "XAUUSD", dir: "BUY", lot: "0.80", pnl: "+$890", green: true },
                { sym: "GBPUSD", dir: "SELL", lot: "2.00", pnl: "-$183", green: false },
                { sym: "NAS100", dir: "BUY", lot: "1.25", pnl: "+$1,900", green: true },
              ].map((t) => (
                <div key={t.sym} className="flex items-center gap-1.5">
                  <span className="font-sans text-[11px] text-white font-bold w-[58px]">{t.sym}</span>
                  <span className={`rounded px-1.5 py-0.5 font-sans text-[8px] font-bold border ${t.green ? "bg-green-500/10 border-green-500/25 text-green-500" : "bg-red-500/10 border-red-500/25 text-red-500"}`}>{t.dir}</span>
                  <span className="font-sans text-[10px] text-[#999] flex-1">{t.lot}</span>
                  <span className={`font-sans text-[11px] font-bold ${t.green ? "text-green-500" : "text-red-500"}`}>{t.pnl}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Notification 1 */}
          <div ref={notif1Ref} className="opacity-0 absolute top-[38px] left-1.5 right-1.5 z-[60] p-3 bg-[rgb(28,28,30)] border border-[#333] rounded-[14px] transition-all">
            <div className="flex items-start gap-2.5">
              <div className="relative flex-shrink-0 mt-0.5">
                <svg width="24" height="20" viewBox="0 0 24 20"><rect x="0" y="2" width="24" height="16" rx="3" fill="none" stroke="#E8554E" strokeWidth="1.3"/><polyline points="0,2 12,12 24,2" fill="none" stroke="#E8554E" strokeWidth="1.3" strokeLinejoin="round"/></svg>
                <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-primary flex items-center justify-center font-sans text-[8px] text-white font-bold">1</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="font-sans text-[10px] text-primary font-bold">Kubera Markets</span>
                  <span className="font-sans text-[9px] text-[#555] font-medium">5m ago</span>
                </div>
                <div className="font-sans text-xs text-white font-bold mb-0.5">Withdrawal Processed</div>
                <div className="font-sans text-[10px] text-[#999] leading-snug">Your withdrawal of $1,500.00 has been sent to your bank account.</div>
              </div>
            </div>
          </div>

          {/* Notification 2 */}
          <div ref={notif2Ref} className="opacity-0 absolute top-[112px] left-1.5 right-1.5 z-[59] p-3 bg-[rgb(28,28,30)] border border-green-500/20 rounded-[14px] transition-all">
            <div className="flex items-start gap-2.5">
              <div className="relative flex-shrink-0 mt-0.5">
                <svg width="24" height="22" viewBox="0 0 24 22"><polyline points="2,8 12,2 22,8" fill="none" stroke="#22C55E" strokeWidth="1.3" strokeLinejoin="round"/><rect x="4" y="8" width="16" height="12" rx="1" fill="none" stroke="#22C55E" strokeWidth="1.3"/><line x1="8" y1="12" x2="8" y2="17" stroke="#22C55E" strokeWidth="1"/><line x1="12" y1="12" x2="12" y2="17" stroke="#22C55E" strokeWidth="1"/><line x1="16" y1="12" x2="16" y2="17" stroke="#22C55E" strokeWidth="1"/></svg>
                <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-green-500 flex items-center justify-center font-sans text-[8px] text-black font-extrabold">$</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="font-sans text-[10px] text-green-500 font-bold">Your Bank</span>
                  <span className="font-sans text-[9px] text-green-500 font-semibold">now</span>
                </div>
                <div className="font-sans text-xs text-white font-bold mb-0.5">Deposit Received</div>
                <div className="font-sans text-[10px] text-[#999] leading-snug">You received $1,500.00 from KUBERA GLOBAL MARKETS</div>
              </div>
            </div>
          </div>
        </div>

        {/* Side buttons */}
        <div className="absolute -left-1 top-[140px] w-1 h-10 rounded-sm bg-[#333]" />
        <div className="absolute -left-1 top-[200px] w-1 h-[60px] rounded-sm bg-[#333]" />
        <div className="absolute -right-1 top-[170px] w-1 h-[50px] rounded-sm bg-[#333]" />
      </div>
    </div>
  );
};

export default PhoneMockup;
