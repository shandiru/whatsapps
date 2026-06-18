import { useState } from 'react';

const pad = (n) => String(n).padStart(2, '0');

// Format a Date into the local-time string <input type="datetime-local"> expects.
// Browsers treat this string as LOCAL time, so we don't shift to UTC here.
const toLocalInput = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

// Return a Date set to today (or tomorrow) at HH:MM local time.
const atTime = (hour, minute, { tomorrow = false } = {}) => {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  if (tomorrow) d.setDate(d.getDate() + 1);
  return d;
};

// Pick a sensible default: today's 23:30 if it's still in the future,
// otherwise tomorrow's 23:30 so the user doesn't accidentally schedule
// something that fires immediately.
const defaultScheduledTime = () => {
  const today = atTime(23, 30);
  return new Date() < today ? today : atTime(23, 30, { tomorrow: true });
};

const QUICK_PRESETS = [
  { label: 'In 1 min',   get: () => new Date(Date.now() + 1 * 60 * 1000) },
  { label: 'In 5 min',  get: () => new Date(Date.now() + 5 * 60 * 1000) },
  { label: 'In 1 hour', get: () => new Date(Date.now() + 60 * 60 * 1000) },
  { label: 'Tonight 11:30 PM', get: () => atTime(23, 30) },
  { label: 'Tomorrow 11:30 PM', get: () => atTime(23, 30, { tomorrow: true }) },
];

export default function ScheduleForm({ apiUrl, onScheduled }) {
  const [message, setMessage] = useState('');
  const [scheduledTime, setScheduledTime] = useState(toLocalInput(defaultScheduledTime()));
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const applyPreset = (preset) => {
    setScheduledTime(toLocalInput(preset.get()));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      // Guard: if user manually picked a past time, warn but allow if confirmed
      const when = new Date(scheduledTime);
      if (when.getTime() <= Date.now()) {
        const ok = window.confirm(
          'The selected time is in the past. The message will send on the next scheduler tick. Continue?'
        );
        if (!ok) {
          setSubmitting(false);
          return;
        }
      }

      const r = await fetch(`${apiUrl}/api/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          scheduledTime: when.toISOString(),
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Failed to schedule');
      setFeedback({ type: 'success', text: '✅ Message scheduled!' });
      setMessage('');
      // After scheduling, reset picker to the next sensible default
      setScheduledTime(toLocalInput(defaultScheduledTime()));
      onScheduled?.(data.data);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const localTime = new Date(scheduledTime);
  const tzOffsetMin = -localTime.getTimezoneOffset();
  const tzLabel =
    tzOffsetMin === 0
      ? 'UTC'
      : (() => {
          const sign = tzOffsetMin >= 0 ? '+' : '-';
          const abs = Math.abs(tzOffsetMin);
          return `UTC${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
        })();
  const isPast = localTime.getTime() <= Date.now();

  return (
    <form
      onSubmit={submit}
      className="bg-slate-800/60 border border-slate-700 rounded-xl p-6 space-y-4"
    >
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">
          Work Update Message
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          required
          placeholder="Day 42: shipped the dashboard, fixed 3 bugs, in review for tomorrow's release."
          className="w-full rounded-md bg-slate-900 border border-slate-600 px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">
          Scheduled Time
        </label>
        <input
          type="datetime-local"
          value={scheduledTime}
          onChange={(e) => setScheduledTime(e.target.value)}
          required
          className="w-full rounded-md bg-slate-900 border border-slate-600 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <div className="flex justify-between mt-1 text-xs">
          <span className="text-slate-500">
            Will send at <span className="text-slate-300">{localTime.toLocaleString()}</span> ({tzLabel})
          </span>
          {isPast && (
            <span className="text-amber-400">⚠ Past time — fires on next tick</span>
          )}
        </div>
      </div>

      {/* Quick presets */}
      <div>
        <p className="text-xs font-medium text-slate-400 mb-2">Quick pick:</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset)}
              className="text-xs px-3 py-1.5 rounded-full bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 transition"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-md transition"
      >
        {submitting ? 'Scheduling…' : 'Schedule Message'}
      </button>

      {feedback && (
        <p
          className={`text-sm text-center ${
            feedback.type === 'success' ? 'text-emerald-400' : 'text-rose-400'
          }`}
        >
          {feedback.text}
        </p>
      )}
    </form>
  );
}