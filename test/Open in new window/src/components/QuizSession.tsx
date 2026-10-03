import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowIcon, CheckIcon, CloseIcon, CrossIcon, RestartIcon } from "./Icons";
import {
  focusGrade,
  formatClock,
  optionLetters,
  type Level,
  type LevelResult,
} from "../data/quiz";
import { useFocusInterruptions } from "../hooks/useFocusInterruptions";

type Props = {
  level: Level;
  mode: "popup" | "overlay";
  focusWindow: Window | null;
  isLastLevel: boolean;
  hasNextLevel: boolean;
  onClose: () => void;
  onNextLevel: () => void;
  onComplete: (result: LevelResult) => void;
};

export default function QuizSession({
  level,
  mode,
  focusWindow,
  isLastLevel,
  hasNextLevel,
  onClose,
  onNextLevel,
  onComplete,
}: Props) {
  const total = level.questions.length;
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<number | null>>(() => Array.from({ length: total }, () => null));
  const [checked, setChecked] = useState<boolean[]>(() => Array.from({ length: total }, () => false));
  const [phase, setPhase] = useState<"quiz" | "results">("quiz");
  const [reviewOpen, setReviewOpen] = useState(false);

  const startedAtRef = useRef(Date.now());
  const reportedRef = useRef(false);

  const { count, interrupted, awayMs } = useFocusInterruptions(focusWindow, true);
  const [elapsed, setElapsed] = useState(0);

  const question = level.questions[index];
  const selected = answers[index];
  const isChecked = checked[index];
  const isCorrect = selected === question.answer;
  const progress = ((index + 1) / total) * 100;

  const score = useMemo(
    () => level.questions.reduce((sum, item, i) => sum + (checked[i] && answers[i] === item.answer ? 1 : 0), 0),
    [answers, checked, level.questions],
  );
  const answeredCount = checked.filter(Boolean).length;
  const passed = score / total >= level.passRate;

  useEffect(() => {
    if (phase !== "quiz") return;
    const id = window.setInterval(() => {
      setElapsed(Date.now() - startedAtRef.current);
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  // Report the attempt as soon as the results screen is reached, so the result
  // still counts if the quiz window is closed right afterwards.
  useEffect(() => {
    if (phase !== "results" || reportedRef.current) return;
    reportedRef.current = true;
    const elapsedMs = Date.now() - startedAtRef.current;
    setElapsed(elapsedMs);
    onComplete({
      levelId: level.id,
      score,
      total,
      passed,
      interruptions: count,
      awayMs,
      elapsedMs,
      finishedAt: Date.now(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Discourage accidental closes while an attempt is running. The guard is set
  // directly on the window so the opener can clear it before closing.
  useEffect(() => {
    if (!focusWindow || phase !== "quiz") return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    focusWindow.onbeforeunload = handler;
    return () => {
      if (focusWindow.onbeforeunload === handler) focusWindow.onbeforeunload = null;
    };
  }, [focusWindow, phase]);

  const choose = (optionIndex: number) => {
    if (isChecked) return;
    setAnswers((previous) => {
      const next = [...previous];
      next[index] = optionIndex;
      return next;
    });
  };

  const checkAnswer = () => {
    if (selected === null || isChecked) return;
    setChecked((previous) => {
      const next = [...previous];
      next[index] = true;
      return next;
    });
  };

  const advance = () => {
    if (index === total - 1) {
      setPhase("results");
      return;
    }
    setIndex((value) => Math.min(value + 1, total - 1));
  };

  const retake = () => {
    reportedRef.current = false;
    startedAtRef.current = Date.now();
    setIndex(0);
    setAnswers(Array.from({ length: total }, () => null));
    setChecked(Array.from({ length: total }, () => false));
    setPhase("quiz");
    setReviewOpen(false);
    setElapsed(0);
  };

  const missed = level.questions
    .map((item, i) => ({ item, i }))
    .filter(({ item, i }) => !checked[i] || answers[i] !== item.answer);

  const headline = passed
    ? score === total
      ? "Flawless run."
      : "Level cleared."
    : "Not quite there yet.";

  return (
    <div className="exam-shell">
      <header className="exam-header">
        <div
          className={`focus-monitor${interrupted ? " is-interrupted" : ""}`}
          aria-live="polite"
          aria-label={`${count} focus interruptions in this window`}
        >
          <span className="focus-led" aria-hidden="true" />
          <div className="focus-copy">
            <span className="focus-label">FOCUS INTERRUPTIONS</span>
            <span className="focus-readout">
              <span className="focus-number" key={count}>
                {String(count).padStart(2, "0")}
              </span>
              <span className="focus-state">{interrupted ? "FOCUS LOST" : "WINDOW FOCUSED"}</span>
            </span>
          </div>
        </div>

        <div className="exam-identity">
          <span className="exam-level-tag">{level.tag}</span>
          <span className="exam-level-title">{level.title}</span>
        </div>

        <div className="exam-tools">
          <div className="exam-clock" aria-label={`Elapsed time ${formatClock(elapsed)}`}>
            <span className="clock-label">TIME</span>
            <span className="clock-value">{formatClock(elapsed)}</span>
          </div>
          <div className="exam-clock" aria-label={`Time away ${formatClock(awayMs)}`}>
            <span className="clock-label">AWAY</span>
            <span className="clock-value">{formatClock(awayMs)}</span>
          </div>
          <button className="exam-close" type="button" onClick={onClose} title="Close quiz window">
            <CloseIcon />
            <span>Close</span>
          </button>
        </div>
      </header>

      <div className="exam-status-line">
        <span className={`mode-pill mode-${mode}`}>
          {mode === "popup" ? "SEPARATE QUIZ WINDOW" : "FOCUSED OVERLAY · POP-UP BLOCKED"}
        </span>
        <span className="status-note">
          Every time this window loses tab focus, the counter in the top-left corner increments.
        </span>
      </div>

      {phase === "quiz" ? (
        <main className="exam-main">
          <div className="quiz-overview">
            <span className="question-counter">
              QUESTION {String(index + 1).padStart(2, "0")} OF {String(total).padStart(2, "0")}
            </span>
            <span className="overview-progress">
              <span className="overview-count">{String(index + 1).padStart(2, "0")}</span>
              <span className="overview-total">/ {String(total).padStart(2, "0")}</span>
              <span className="overview-percent">{String(Math.round(progress)).padStart(2, "0")}%</span>
            </span>
          </div>

          <div
            className="progress-track"
            role="progressbar"
            aria-label="Level progress"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={index + 1}
          >
            <span className="progress-fill" style={{ width: `${progress}%` }} />
          </div>

          <div className="question-grid" key={`${level.id}-${index}`}>
            <aside className="question-marker" aria-hidden="true">
              <span className="marker-label">QUESTION</span>
              <span className="marker-number">{String(index + 1).padStart(2, "0")}</span>
              <span className="marker-total">OUT OF {String(total).padStart(2, "0")}</span>
              <span className="marker-rule" />
            </aside>

            <section className="question-content" aria-labelledby="question-title">
              <h1 className="question-title" id="question-title">
                {question.prompt}
              </h1>
              <p className="answer-hint" id="answer-hint">
                Choose the best answer
              </p>

              <div className="answer-list" role="group" aria-labelledby="question-title" aria-describedby="answer-hint">
                {question.options.map((option, optionIndex) => {
                  const isSelected = selected === optionIndex;
                  const isAnswer = isChecked && optionIndex === question.answer;
                  const isWrong = isChecked && isSelected && !isCorrect;
                  const className = [
                    "answer-option",
                    isSelected ? "is-selected" : "",
                    isAnswer ? "is-correct" : "",
                    isWrong ? "is-incorrect" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <button
                      key={option}
                      type="button"
                      className={className}
                      onClick={() => choose(optionIndex)}
                      aria-pressed={isSelected}
                      disabled={isChecked}
                    >
                      <span className="answer-letter">
                        {optionLetters[optionIndex]}
                        <span className="letter-period">.</span>
                      </span>
                      <span className="answer-text">{option}</span>
                      <span className="answer-indicator" aria-hidden="true">
                        {isAnswer ? <CheckIcon /> : isWrong ? <CrossIcon /> : <span className="answer-ring" />}
                      </span>
                    </button>
                  );
                })}
              </div>

              {isChecked && (
                <div className={`answer-feedback ${isCorrect ? "is-right" : "is-wrong"}`} role="status">
                  <span className="feedback-mark" aria-hidden="true">
                    {isCorrect ? <CheckIcon /> : <CrossIcon />}
                  </span>
                  <p>
                    {isCorrect ? (
                      "Correct. Well reasoned."
                    ) : (
                      <>
                        Not quite. The correct answer is{" "}
                        <strong>
                          {optionLetters[question.answer]}. {question.options[question.answer]}
                        </strong>
                        .
                      </>
                    )}
                  </p>
                </div>
              )}

              <div className="question-actions">
                <div className="secondary-actions">
                  <button
                    className="text-action"
                    type="button"
                    onClick={() => setIndex((value) => Math.max(value - 1, 0))}
                    disabled={index === 0}
                  >
                    <ArrowIcon direction="left" />
                    Previous
                  </button>
                  <button className="text-action" type="button" onClick={advance}>
                    {index === total - 1 ? "Finish level" : "Skip"}
                  </button>
                </div>

                <button
                  className="primary-action"
                  type="button"
                  onClick={isChecked ? advance : checkAnswer}
                  disabled={!isChecked && selected === null}
                >
                  <span>
                    {isChecked ? (index === total - 1 ? "View results" : "Next question") : "Check answer"}
                  </span>
                  <ArrowIcon />
                </button>
              </div>
            </section>
          </div>
        </main>
      ) : (
        <main className="exam-main">
          <section className="results-hero">
            <div className="score-display" aria-label={`${score} correct out of ${total}`}>
              <span className="score-number">{String(score).padStart(2, "0")}</span>
              <span className="score-total">/ {String(total).padStart(2, "0")}</span>
            </div>

            <div className="results-copy">
              <p className="results-eyebrow">
                {passed ? "LEVEL CLEARED" : "BELOW PASS MARK"} · {Math.round(level.passRate * 100)}% NEEDED
              </p>
              <h1>{headline}</h1>
              <p className="results-description">
                You answered {answeredCount} of {total} questions and scored {score} correct.
                {isLastLevel ? " That was the final level." : hasNextLevel ? " The next level is unlocked." : ""}
              </p>

              <div className="focus-report">
                <div className="report-cell">
                  <span className="report-value">{String(count).padStart(2, "0")}</span>
                  <span className="report-label">INTERRUPTIONS</span>
                </div>
                <div className="report-cell">
                  <span className="report-value">{formatClock(awayMs)}</span>
                  <span className="report-label">TIME AWAY</span>
                </div>
                <div className="report-cell">
                  <span className="report-value">{formatClock(elapsed)}</span>
                  <span className="report-label">TOTAL TIME</span>
                </div>
                <div className="report-cell is-wide">
                  <span className="report-value">{focusGrade(count)}</span>
                  <span className="report-label">FOCUS REPORT</span>
                </div>
              </div>

              <div className="results-actions">
                {passed && hasNextLevel && (
                  <button className="primary-action" type="button" onClick={onNextLevel}>
                    <span>Next level</span>
                    <ArrowIcon />
                  </button>
                )}
                <button
                  className={passed && hasNextLevel ? "text-action" : "primary-action restart-action"}
                  type="button"
                  onClick={retake}
                >
                  {passed && hasNextLevel ? (
                    "Retake level"
                  ) : (
                    <>
                      <span>Try again</span>
                      <RestartIcon />
                    </>
                  )}
                </button>
                <button className="text-action" type="button" onClick={onClose}>
                  Close window
                </button>
              </div>
            </div>
          </section>

          <section className="review-section">
            <div className="review-heading">
              <p className="results-eyebrow">ANSWER REVIEW</p>
              <h2>{missed.length === 0 ? "Nothing to revisit" : "Questions to revisit"}</h2>
              <button
                className="text-action review-toggle"
                type="button"
                onClick={() => setReviewOpen((open) => !open)}
                aria-expanded={reviewOpen}
              >
                {reviewOpen ? "Hide" : "Show"}
              </button>
            </div>

            {reviewOpen && (
              <>
                {missed.length === 0 ? (
                  <p className="perfect-note">Every question in this level was answered correctly.</p>
                ) : (
                  <ol className="review-list">
                    {missed.map(({ item, i }) => {
                      const chosen = checked[i] ? answers[i] : null;
                      return (
                        <li className="review-item" key={item.prompt}>
                          <span className="review-number">{String(i + 1).padStart(2, "0")}</span>
                          <div className="review-detail">
                            <h3>{item.prompt}</h3>
                            <p>
                              <span className="review-label">YOUR ANSWER</span>
                              {chosen === null ? "Not answered" : `${optionLetters[chosen]}. ${item.options[chosen]}`}
                            </p>
                            <p>
                              <span className="review-label">CORRECT ANSWER</span>
                              {optionLetters[item.answer]}. {item.options[item.answer]}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </>
            )}
          </section>
        </main>
      )}
    </div>
  );
}
