export default function QrDisplay({ status }) {
  if (status.connected || !status.qrImage) return null;
  return (
    <div className="bg-white rounded-lg p-4 mb-6 text-center">
      <p className="text-slate-800 font-semibold mb-2">Scan with WhatsApp → Linked Devices</p>
      <img src={status.qrImage} alt="WhatsApp QR" className="mx-auto max-w-xs" />
    </div>
  );
}