import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { PLATFORMS, SIM_TIMELINE as T, TRIGGERS, type Platform } from '../data/automation';
import { automationStore } from '../core/state';
import { useStore } from '../core/store';

const LATER_STEPS = ['Validate & parse', 'Route to workflow', 'Process', 'Reply via platform'];
/** Seconds into the run at which each step lights up, matching the GL packet. */
const STEP_AT = [0, T.inbound * 0.6, T.inbound, T.inbound + T.process * 0.4, T.inbound + T.process];

export function AutomationControls() {
  const { selected } = useStore(automationStore);
  const [trigger, setTrigger] = useState(0);
  const [step, setStep] = useState(-1);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const select = (id: Platform) => {
    automationStore.set({ ...automationStore.get(), selected: selected === id ? null : id });
  };

  const run = () => {
    timers.current.forEach(clearTimeout);
    automationStore.set({ ...automationStore.get(), simStart: performance.now() });
    timers.current = STEP_AT.map((at, i) => window.setTimeout(() => setStep(i), at * 1000));
    timers.current.push(window.setTimeout(() => setStep(STEP_AT.length), T.total * 1000));
  };

  const steps = [TRIGGERS[trigger].firstStep, ...LATER_STEPS];
  const channel = PLATFORMS.find((p) => p.id === (selected ?? 'whatsapp'))!;

  return (
    <div className="auto">
      <div className="auto__platforms" role="group" aria-label="Select a channel">
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={selected === p.id}
            style={{ '--c': p.color } as CSSProperties}
            onClick={() => select(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>
      <p className="auto__detail" aria-live="polite">
        {selected ? channel.detail : 'Select a channel to trace its link to the automation layer.'}
      </p>

      <div className="auto__sim">
        <label className="label" htmlFor="trigger">Simulate a trigger</label>
        <div className="auto__row">
          <select id="trigger" value={trigger} onChange={(e) => setTrigger(Number(e.target.value))}>
            {TRIGGERS.map((t, i) => <option key={t.label} value={i}>{t.label}</option>)}
          </select>
          <button type="button" className="btn btn--line" onClick={run}>
            Run on {channel.label}
          </button>
        </div>
        <ol className="auto__steps">
          {steps.map((s, i) => (
            <li key={i} className={i === step ? 'is-active' : i < step ? 'is-past' : ''}>
              {s}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
