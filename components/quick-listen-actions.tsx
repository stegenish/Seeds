import { AudioLines, BookOpenText, ChevronDown, Play, Shuffle } from "lucide-react";
import type { RecordingKindFilter, Talk } from "@/lib/domain/talk";

const OPTIONS: Array<{
  kind: RecordingKindFilter;
  label: string;
  icon: typeof BookOpenText;
}> = [
  { kind: "talk", label: "Play a Dhamma talk", icon: BookOpenText },
  { kind: "guided-meditation", label: "Play a guided meditation", icon: AudioLines },
  { kind: "all", label: "Play anything", icon: Shuffle },
];

export function QuickListenActions({
  counts,
  activeKind,
  isPreparing,
  lastTalk,
  lastTeacherNames,
  onListen,
  onChooseTeacher,
  onContinue,
}: {
  counts: Record<RecordingKindFilter, number>;
  activeKind: RecordingKindFilter | null;
  isPreparing: boolean;
  lastTalk: Talk | null;
  lastTeacherNames: string;
  onListen: (kind: RecordingKindFilter) => void;
  onChooseTeacher: (kind: RecordingKindFilter) => void;
  onContinue: () => void;
}) {
  return (
    <section className="quick-listen" aria-label="Start listening">
      {lastTalk ? (
        <button className="continue-button" type="button" onClick={onContinue}>
          <span className="quick-icon" aria-hidden="true">
            <Play size={19} fill="currentColor" />
          </span>
          <span>
            <strong>Continue listening</strong>
            <small>
              {lastTalk.title} · {lastTeacherNames}
            </small>
          </span>
        </button>
      ) : null}

      <div className="quick-listen-grid">
        {OPTIONS.map(({ kind, label, icon: Icon }) => (
          <div
            className="quick-listen-control"
            key={kind}
            data-active={activeKind === kind || undefined}
          >
            <button
              className="quick-listen-button"
              type="button"
              onClick={() => onListen(kind)}
              disabled={counts[kind] === 0}
            >
              <span className="quick-icon" aria-hidden="true">
                <Icon size={20} />
              </span>
              <span>
                <strong>{label}</strong>
                <small>
                  {counts[kind] > 0
                    ? `${counts[kind].toLocaleString()} available`
                    : isPreparing
                      ? "Preparing…"
                      : "No matches"}
                </small>
              </span>
            </button>
            <button
              className="quick-teacher-button"
              type="button"
              onClick={() => onChooseTeacher(kind)}
              disabled={isPreparing}
              aria-label={`Choose a favorite teacher for ${label.toLowerCase()}`}
            >
              <ChevronDown size={21} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
