import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import QuizSession from "./components/QuizSession";
import { ArrowIcon, LockIcon } from "./components/Icons";
import {
  isLevelUnlocked,
  levels,
  totalQuestions,
  type LevelResult,
  type ProgressMap,
} from "./data/quiz";
import { useFocusInterruptions } from "./hooks/useFocusInterruptions";
import { closeQuizWindow, focusQuizWindow, EXAM_ROOT_ID, openQuizWindow } from "./utils/examWindow";

const STORAGE_KEY = "mindwork.level.progress.v1";

type Session = {
  levelId: number;
  mode: "popup" | "overlay";
  win: Window | null;
  container: HTMLElement | null;
  nonce: number;
};

function loadProgress(): ProgressMap {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ProgressMap;
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

export default function App() {
  const [progress, setProgress] = useState<ProgressMap>(() => loadProgress());
  const [session, setSession] = useState<Session | null>(null);
  const [attempts, setAttempts] = useState(0);

  // The landing tab keeps its own top-left monitor, but it pauses while a quiz
  // window is open, because losing focus to that window is expected.
  const landingFocus = useFocusInterruptions(window, session === null);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Storage may be unavailable; progress simply stays in memory.
    }
  }, [progress]);

  // Detect the quiz window being closed by the browser chrome.
  useEffect(() => {
    if (!session?.win) return;
    const win = session.win;
    const id = window.setInterval(() => {
      if (win.closed) {
        setSession((current) => (current?.win === win ? null : current));
      }
    }, 400);
    return () => window.clearInterval(id);
  }, [session?.win]);

  const activeLevel = useMemo(
    () => levels.find((level) => level.id === session?.levelId) ?? null,
    [session?.levelId],
  );

  const startLevel = useCallback((levelId: number) => {
    const level = levels.find((item) => item.id === levelId);
    if (!level) return;

    const win = openQuizWindow(`Mindwork · Level ${String(level.id).padStart(2, "0")} — ${level.title}`);
    const container = win ? win.document.getElementById(EXAM_ROOT_ID) : null;
    setAttempts((value) => value + 1);

    if (win && container) {
      setSession({ levelId, mode: "popup", win, container, nonce: Date.now() });
    } else {
      closeQuizWindow(win);
      setSession({ levelId, mode: "overlay", win: null, container: null, nonce: Date.now() });
    }
  }, []);

  const endSession = useCallback(() => {
    setSession((current) => {
      closeQuizWindow(current?.win ?? null);
      return null;
    });
  }, []);

  const handleComplete = useCallback((result: LevelResult) => {
    setProgress((current) => {
      const previous = current[result.levelId];
      const next: ProgressMap = {
        ...current,
        [result.levelId]: {
          completed: previous?.completed || result.passed,
          bestScore: Math.max(previous?.bestScore ?? 0, result.score),
          bestInterruptions: Math.min(
            previous?.bestInterruptions ?? Number.POSITIVE_INFINITY,
            result.interruptions,
          ),
        },
      };
      return next;
    });
  }, []);

  const goToNextLevel = useCallback(() => {
    setSession((current) => {
      if (!current) return current;
      const next = levels.find((level) => level.id === current.levelId + 1);
      if (!next) return current;
      return { ...current, levelId: next.id, nonce: Date.now() };
    });
  }, []);

  const resetProgress = useCallback(() => {
    setProgress({});
    setAttempts(0);
  }, []);

  const currentLevelId = useMemo(() => {
    const target = levels.find(
      (level) => isLevelUnlocked(level.id, progress) && !progress[level.id]?.completed,
    );
    return (target ?? levels[0]).id;
  }, [progress]);

  const completedLevels = levels.filter((level) => progress[level.id]?.completed).length;
  const correctAnswers = levels.reduce((sum, level) => sum + (progress[level.id]?.bestScore ?? 0), 0);
  const sessionsFinished = levels.filter((level) => progress[level.id]).length;
  const bestInterruptions = levels.reduce((sum, level) => {
    const value = progress[level.id]?.bestInterruptions;
    return Number.isFinite(value) ? sum + (value ?? 0) : sum;
  }, 0);

  return (
    <div className="app-shell">
      <header className="site-header">
        <div
          className={`focus-monitor${landingFocus.interrupted ? " is-interrupted" : ""}${
            session ? " is-paused" : ""
          }`}
          aria-live="polite"
          aria-label={`${landingFocus.count} tab focus interruptions`}
        >
          <span className="focus-led" aria-hidden="true" />
          <div className="focus-copy">
            <span className="focus-label">TAB FOCUS INTERRUPTIONS</span>
            <span className="focus-readout">
              <span className="focus-number" key={landingFocus.count}>
                {String(landingFocus.count).padStart(2, "0")}
              </span>
              <span className="focus-state">
                {session
                  ? "PAUSED · QUIZ WINDOW"
                  : landingFocus.interrupted
                    ? "TAB BLURRED"
                    : "TRACKING THIS TAB"}
              </span>
            </span>
          </div>
        </div>

        <div className="wordmark" aria-label="Mindwork">
          <span className="brand-glyph" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="brand-name">
            MINDWORK<span className="brand-period">.</span>
          </span>
        </div>

        <div className="header-context">
          <span className="header-context-top">LEARNING SERIES / 001</span>
          <span className="header-context-bottom">ARTIFICIAL INTELLIGENCE</span>
        </div>
      </header>

      <main className="landing">
        <section className="landing-hero">
          <p className="hero-kicker">
            <span className="hero-marker" aria-hidden="true" />
            THREE LEVELS · TWENTY QUESTIONS
          </p>
          <h1 className="hero-title">
            Pick a level, open a focused window,
            <br />
            and keep your tab where it belongs.
          </h1>
          <p className="hero-lede">
            Every level launches in its own quiz window. The moment that window loses focus — a new
            tab, another app, a stray click — the monitor in its top-left corner records the
            interruption and the time you spent away.
          </p>

          <div className="hero-cta">
            <button
              className="hero-start"
              type="button"
              onClick={() => startLevel(currentLevelId)}
              disabled={Boolean(session)}
            >
              <span>Start Quiz — Level {String(currentLevelId).padStart(2, "0")}</span>
              <ArrowIcon />
            </button>
            <span className="hero-cta-note">
              Opens a separate window · its focus monitor starts immediately
            </span>
          </div>

          <div className="hero-stats">
            <div className="hero-stat">
              <span className="stat-value">
                {String(completedLevels).padStart(2, "0")}
                <span className="stat-total">/ {String(levels.length).padStart(2, "0")}</span>
              </span>
              <span className="stat-label">LEVELS CLEARED</span>
            </div>
            <div className="hero-stat">
              <span className="stat-value">
                {String(correctAnswers).padStart(2, "0")}
                <span className="stat-total">/ {String(totalQuestions).padStart(2, "0")}</span>
              </span>
              <span className="stat-label">BEST ANSWERS</span>
            </div>
            <div className="hero-stat">
              <span className="stat-value">{String(bestInterruptions).padStart(2, "0")}</span>
              <span className="stat-label">FEWEST INTERRUPTIONS</span>
            </div>
            <div className="hero-stat">
              <span className="stat-value">{String(Math.max(attempts, sessionsFinished)).padStart(2, "0")}</span>
              <span className="stat-label">WINDOWS OPENED</span>
            </div>
          </div>
        </section>

        <section className="level-grid" aria-label="Quiz levels">
          {levels.map((level) => {
            const unlocked = isLevelUnlocked(level.id, progress);
            const record = progress[level.id];
            const isRunning = session?.levelId === level.id;

            return (
              <article
                key={level.id}
                className={`level-card accent-${level.accent}${unlocked ? "" : " is-locked"}${
                  isRunning ? " is-running" : ""
                }`}
              >
                <header className="level-card-head">
                  <span className="level-index">{String(level.id).padStart(2, "0")}</span>
                  <div className="level-head-copy">
                    <p className="level-tag">{level.tag}</p>
                    <h2 className="level-title">{level.title}</h2>
                  </div>
                  <span className="difficulty" aria-label={`Difficulty ${level.difficulty} of 3`}>
                    {[1, 2, 3].map((step) => (
                      <i key={step} className={step <= level.difficulty ? "is-on" : ""} />
                    ))}
                  </span>
                </header>

                <p className="level-description">{level.description}</p>

                <ul className="level-meta">
                  <li>{String(level.questions.length).padStart(2, "0")} QUESTIONS</li>
                  <li>{Math.round(level.passRate * 100)}% TO PASS</li>
                  <li>{record?.completed ? "CLEARED" : unlocked ? "OPEN" : "LOCKED"}</li>
                </ul>

                <footer className="level-card-foot">
                  <div className="level-record">
                    {record ? (
                      <>
                        <span className="record-score">
                          BEST {String(record.bestScore).padStart(2, "0")}/
                          {String(level.questions.length).padStart(2, "0")}
                        </span>
                        <span className="record-focus">
                          {Number.isFinite(record.bestInterruptions)
                            ? `${record.bestInterruptions} INTERRUPTIONS`
                            : "NO FOCUS RECORD"}
                        </span>
                      </>
                    ) : (
                      <span className="record-empty">
                        {unlocked ? "NO ATTEMPT RECORDED" : "CLEAR THE PREVIOUS LEVEL TO UNLOCK"}
                      </span>
                    )}
                  </div>

                  <button
                    className={`level-start${isRunning ? " is-running" : ""}`}
                    type="button"
                    onClick={() => (unlocked ? startLevel(level.id) : undefined)}
                    disabled={!unlocked}
                  >
                    {unlocked ? (
                      <>
                        <span>{isRunning ? "Quiz window open" : "Start Quiz"}</span>
                        <ArrowIcon />
                      </>
                    ) : (
                      <>
                        <LockIcon />
                        <span>Locked</span>
                      </>
                    )}
                  </button>
                </footer>
              </article>
            );
          })}
        </section>

        <section className="landing-foot">
          <p className="foot-note">
            Focus tracking runs on <code>window.blur</code> and{" "}
            <code>document.visibilitychange</code>. A single switch away from the quiz window counts
            as exactly one interruption.
          </p>
          <button className="text-action" type="button" onClick={resetProgress}>
            Reset level progress
          </button>
        </section>
      </main>

      {session && activeLevel && session.mode === "popup" && session.container && (
        <LandingDimmer onFocusWindow={() => focusQuizWindow(session.win)} onEnd={endSession} />
      )}

      {session && activeLevel && session.mode === "popup" && session.container
        ? createPortal(
            <QuizSession
              key={`${session.levelId}-${session.nonce}`}
              level={activeLevel}
              mode="popup"
              focusWindow={session.win}
              isLastLevel={activeLevel.id === levels[levels.length - 1].id}
              hasNextLevel={Boolean(levels.find((level) => level.id === activeLevel.id + 1))}
              onClose={endSession}
              onNextLevel={goToNextLevel}
              onComplete={handleComplete}
            />,
            session.container,
          )
        : null}

      {session && activeLevel && session.mode === "overlay" && (
        <div className="exam-overlay" role="dialog" aria-modal="true" aria-label={`${activeLevel.title} quiz`}>
          <div className="exam-overlay-frame">
            <QuizSession
              key={`${session.levelId}-${session.nonce}`}
              level={activeLevel}
              mode="overlay"
              focusWindow={window}
              isLastLevel={activeLevel.id === levels[levels.length - 1].id}
              hasNextLevel={Boolean(levels.find((level) => level.id === activeLevel.id + 1))}
              onClose={endSession}
              onNextLevel={goToNextLevel}
              onComplete={handleComplete}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function LandingDimmer({
  onFocusWindow,
  onEnd,
}: {
  onFocusWindow: () => void;
  onEnd: () => void;
}) {
  return (
    <div className="landing-dimmer">
      <div className="dimmer-card">
        <span className="dimmer-pulse" aria-hidden="true" />
        <p className="dimmer-title">QUIZ WINDOW ACTIVE</p>
        <p className="dimmer-copy">
          The level is running in its own window with its own focus monitor. This tab paused its own
          counter, so switching between the two is not counted against you.
        </p>
        <div className="dimmer-actions">
          <button className="primary-action dimmer-focus" type="button" onClick={onFocusWindow}>
            <span>Focus quiz window</span>
            <ArrowIcon />
          </button>
          <button className="text-action" type="button" onClick={onEnd}>
            End session
          </button>
        </div>
      </div>
    </div>
  );
}
