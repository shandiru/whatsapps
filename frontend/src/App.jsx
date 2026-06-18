import { useEffect, useState } from 'react';
import ScheduleForm from './components/ScheduleForm';
import StatusIndicator from './components/StatusIndicator';
import QrDisplay from './components/QrDisplay';
import API_URL from './config';

export default function App() {
  const [status, setStatus] = useState({ connected: false, hasQR: false, qrImage: null });
  const [messages, setMessages] = useState([]);

  const fetchStatus = async () => {
    try {
      const r = await fetch(`${API_URL}/api/status`);
      const d = await r.json();
      setStatus(d.whatsapp);
    } catch (e) { /* ignore network blips */ }
  };

  const fetchMessages = async () => {
    try {
      const r = await fetch(`${API_URL}/api/schedule`);
      const d = await r.json();
      if (d.success) setMessages(d.data);
    } catch (e) { /* ignore */ }
  };

  useEffect(() => {
    fetchStatus();
    fetchMessages();
    const s = setInterval(fetchStatus, 8000);
    const m = setInterval(fetchMessages, 30000);
    return () => { clearInterval(s); clearInterval(m); };
  }, []);

  const handleScheduled = (newDoc) => setMessages((p) => [newDoc, ...p]);
  const handleDeleted   = (id)      => setMessages((p) => p.filter((x) => x._id !== id));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100 p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            💬 WhatsApp Work Update Scheduler
          </h1>
          <p className="text-slate-400 mt-2">Schedule your end-of-day update and sleep early.</p>
        </header>

        <StatusIndicator status={status} />
        <QrDisplay status={status} />

        <ScheduleForm apiUrl={API_URL} onScheduled={handleScheduled} />

        <section className="mt-10">
          <h2 className="text-xl font-semibold mb-4">Scheduled Messages</h2>
          {messages.length === 0 ? (
            <p className="text-slate-400 italic">No messages scheduled yet.</p>
          ) : (
            <ul className="space-y-3">
              {messages.map((m) => (
                <li
                  key={m._id}
                  className="bg-slate-800/60 border border-slate-700 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start gap-4">
                    <p className="whitespace-pre-wrap text-slate-200 flex-1">{m.message}</p>
                    <button
                      onClick={async () => {
                        await fetch(`${API_URL}/api/schedule/${m._id}`, { method: 'DELETE' });
                        handleDeleted(m._id);
                      }}
                      className="text-xs text-rose-300 hover:text-rose-200 border border-rose-400/40 rounded px-2 py-1"
                    >
                      Delete
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-400">
                    <span>🕒 {new Date(m.scheduledTime).toLocaleString()}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        m.isSent
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {m.isSent ? `✓ Sent${m.sentAt ? ' at ' + new Date(m.sentAt).toLocaleTimeString() : ''}` : '⏳ Pending'}
                    </span>
                    {m.error && <span className="text-rose-300">⚠ {m.error}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="mt-12 text-center text-xs text-slate-500">
          Backend: {API_URL}
        </footer>
      </div>
    </div>
  );
}