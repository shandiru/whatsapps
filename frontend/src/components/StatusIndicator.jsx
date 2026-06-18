export default function StatusIndicator({ status }) {
  const { connected, hasQR } = status;
  let style, dot, label;
  if (connected) {
    style = 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200';
    dot   = 'bg-emerald-400';
    label = 'WhatsApp Connected';
  } else if (hasQR) {
    style = 'bg-amber-500/15 border-amber-500/40 text-amber-200';
    dot   = 'bg-amber-400 animate-pulse';
    label = 'Waiting for QR Scan — see below or check server terminal';
  } else {
    style = 'bg-rose-500/15 border-rose-500/40 text-rose-200';
    dot   = 'bg-rose-400';
    label = 'WhatsApp Disconnected';
  }
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${style} mb-4`}>
      <span className={`h-3 w-3 rounded-full ${dot}`} />
      <span className="font-medium">{label}</span>
    </div>
  );
}