import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Check, ChevronDown,
  CircleHelp, Flag, Hourglass, Info, ListChecks, RotateCcw, ShieldCheck,
  Sparkles, Target, X,
} from 'lucide-react';
import { questions } from './data/questions';
import { useQuizSession, type FocusInterruption, type QuizSession } from './hooks/useQuizSession';

type Screen = 'start' | 'quiz' | 'results' | 'review';
type Modal = 'help' | 'focus' | 'submit' | 'restart' | null;
const letters = ['A', 'B', 'C', 'D'];
const pad = (value: number) => String(value).padStart(2, '0');

function preferredScrollBehavior(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

function BrandMark({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="34" height="34" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path d="M20 4C24.6 4 27 9.7 24.9 15.1C30.3 13 36 15.4 36 20C36 24.6 30.3 27 24.9 24.9C27 30.3 24.6 36 20 36C15.4 36 13 30.3 15.1 24.9C9.7 27 4 24.6 4 20C4 15.4 9.7 13 15.1 15.1C13 9.7 15.4 4 20 4Z" fill="currentColor" />
      <circle cx="20" cy="20" r="3.6" fill="var(--paper)" />
    </svg>
  );
}

function FocusFlower() {
  return (
    <svg className="focus-flower" viewBox="0 0 156 132" fill="none" aria-hidden="true">
      <circle cx="83" cy="66" r="51" fill="#EBEEDD" />
      <g stroke="#39745D" strokeWidth="1.15">
        <ellipse cx="79" cy="64" rx="21" ry="50" transform="rotate(-45 79 64)" />
        <ellipse cx="79" cy="64" rx="21" ry="50" transform="rotate(45 79 64)" />
        <ellipse cx="79" cy="64" rx="21" ry="50" />
        <ellipse cx="79" cy="64" rx="21" ry="50" transform="rotate(90 79 64)" />
      </g>
      <circle cx="79" cy="64" r="8" fill="#276C53" />
      <path d="M135 17V27M130 22H140M21 100V106M18 103H24" stroke="#72937B" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="24" cy="27" r="2" fill="#A4B297" />
      <circle cx="129" cy="110" r="2.5" fill="#A4B297" />
    </svg>
  );
}

function Dialog({ title, onClose, children, className = '' }: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (!dialog.open) dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = oldOverflow;
    };
  }, []);
  return (
    <dialog ref={ref} className={`dialog ${className}`} aria-labelledby="dialog-title"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="dialog-content">
        <button className="icon-button dialog-close" onClick={onClose} aria-label="Close dialog"><X size={19} /></button>
        <BrandMark className="dialog-brand" />
        <h2 id="dialog-title">{title}</h2>
        {children}
      </div>
    </dialog>
  );
}

function getAwayDuration(event: FocusInterruption) {
  if (event.returnedAt === null) return 'Away now';
  const seconds = Math.max(1, Math.round((event.returnedAt - event.leftAt) / 1000));
  if (seconds < 60) return `${seconds}s away`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s away`;
}

function ResultsPanel({ session, onReview, onRestart }: {
  session: QuizSession;
  onReview: () => void;
  onRestart: () => void;
}) {
  const score = questions.filter((question, index) => session.answers[index] === question.correctAnswer).length;
  const unanswered = session.answers.filter((answer) => answer === null).length;
  const percentage = Math.round(score / questions.length * 100);
  const circumference = 2 * Math.PI * 70;
  return (
    <section className="results-panel" aria-labelledby="results-heading">
      <div className="results-topline"><Check size={15} /><span>ASSESSMENT COMPLETE</span></div>
      <div className="results-intro">
        <div className="score-ring">
          <svg viewBox="0 0 168 168" aria-hidden="true">
            <circle cx="84" cy="84" r="70" fill="none" stroke="#EAF0E8" strokeWidth="8" />
            <circle className="score-ring-line" cx="84" cy="84" r="70" fill="none" stroke="var(--green)" strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - percentage / 100)} transform="rotate(-90 84 84)" />
          </svg>
          <div className="score-ring-label"><strong>{percentage}<span>%</span></strong><span>your score</span></div>
        </div>
        <div>
          <span className="eyebrow">A LITTLE FURTHER THAN BEFORE</span>
          <h2 id="results-heading" tabIndex={-1}>{percentage >= 80 ? "You've got a solid foundation." : percentage >= 50 ? 'Good progress. Keep exploring.' : 'Curiosity is a great starting point.'}</h2>
          <p>{percentage === 100 ? 'Every answer, right on the mark. That is some clear thinking.' : 'Every question adds a little clarity. Revisit your answers and turn the tricky ones into something you know.'}</p>
        </div>
      </div>
      <dl className="results-details">
        <div><dt><span className="detail-dot correct" />Correct answers</dt><dd>{score}<span> / {questions.length}</span></dd></div>
        <div><dt><span className="detail-dot incorrect" />Incorrect answers</dt><dd>{questions.length - score - unanswered}</dd></div>
        <div><dt><span className="detail-dot" />Unanswered questions</dt><dd>{unanswered}</dd></div>
        <div><dt><Target size={14} />Focus interruptions</dt><dd>{session.interruptions.length}</dd></div>
      </dl>
      <div className="results-actions">
        <button className="button button-primary" onClick={onReview}>Review your answers<ArrowRight size={17} /></button>
        <button className="button button-secondary" onClick={onRestart}><RotateCcw size={15} />Try again</button>
      </div>
      <p className="results-footnote"><Info size={14} />Your focus count is for awareness. It never changes your score.</p>
    </section>
  );
}

export default function App() {
  const { session, isFocused, storageAvailable, selectAnswer, goToQuestion, toggleFlag, completeQuiz, resetQuiz, startQuiz } = useQuizSession();
  const [screen, setScreen] = useState<Screen>(() => {
    if (session.startedAt === null) return 'start';
    return session.completedAt === null ? 'quiz' : 'results';
  });
  const [modal, setModal] = useState<Modal>(null);
  const [mobileMapOpen, setMobileMapOpen] = useState(false);
  const questionHeading = useRef<HTMLHeadingElement>(null);
  const focusRequested = useRef(false);
  const complete = session.completedAt !== null;
  const started = session.startedAt !== null;
  const tracking = started && !complete;
  const isReview = screen === 'review';
  const currentIndex = session.currentQuestion;
  const currentQuestion = questions[currentIndex];
  const selectedAnswer = session.answers[currentIndex];
  const answeredCount = session.answers.filter((answer) => answer !== null).length;
  const flaggedCount = session.flagged.filter(Boolean).length;
  const interruptionCount = session.interruptions.length;
  const unansweredCount = questions.length - answeredCount;
  const isLastQuestion = currentIndex === questions.length - 1;

  const showResults = () => {
    setScreen('results');
    setMobileMapOpen(false);
    window.scrollTo({ top: 0, behavior: preferredScrollBehavior() });
  };
  const beginQuiz = () => {
    startQuiz();
    focusRequested.current = true;
    goToQuestion(0);
    setScreen('quiz');
    setMobileMapOpen(false);
    window.scrollTo({ top: 0, behavior: preferredScrollBehavior() });
    // Bring the quiz window forward and activate focus tracking from this moment.
    window.focus();
  };
  const navigateTo = (index: number) => {
    if (!started) return;
    focusRequested.current = true;
    goToQuestion(index);
    setScreen(complete ? 'review' : 'quiz');
    setMobileMapOpen(false);
  };
  const nextQuestion = () => {
    if (isLastQuestion) {
      if (isReview) showResults();
      else setModal('submit');
    } else navigateTo(currentIndex + 1);
  };

  useEffect(() => {
    if (screen === 'results') {
      document.getElementById('results-heading')?.focus({ preventScroll: true });
    }
    if (focusRequested.current && questionHeading.current) {
      questionHeading.current.focus({ preventScroll: true });
      if (window.matchMedia('(max-width: 760px)').matches) {
        questionHeading.current.closest('.quiz-panel')?.scrollIntoView({ block: 'start', behavior: preferredScrollBehavior() });
      }
      focusRequested.current = false;
    }
  }, [currentIndex, screen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (modal || screen !== 'quiz' || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest('textarea, select, input:not([type="radio"]), [contenteditable="true"]')) return;
      if (/^[1-4]$/.test(event.key)) {
        event.preventDefault();
        selectAnswer(currentIndex, Number(event.key) - 1);
      } else if (event.key === 'Enter' && selectedAnswer !== null && !target?.closest('button, a')) {
        event.preventDefault();
        if (currentIndex === questions.length - 1) setModal('submit');
        else {
          focusRequested.current = true;
          goToQuestion(currentIndex + 1);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [modal, screen, currentIndex, selectedAnswer, selectAnswer, goToQuestion]);

  const finishAssessment = () => {
    completeQuiz();
    setModal(null);
    setScreen('results');
    setMobileMapOpen(false);
    window.scrollTo({ top: 0, behavior: preferredScrollBehavior() });
  };
  const restartAssessment = () => {
    resetQuiz();
    setModal(null);
    setScreen('start');
    setMobileMapOpen(false);
    window.scrollTo({ top: 0, behavior: preferredScrollBehavior() });
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to assessment</a>
      <aside className="sidebar" aria-label="Assessment sidebar">
        <button className="brand" aria-label="Focal assessment home" onClick={() => !started ? setScreen('start') : complete ? showResults() : navigateTo(0)}>
          <BrandMark /><span>focal<span className="brand-period">.</span></span>
        </button>
        <button className="mobile-map-toggle" onClick={() => setMobileMapOpen(!mobileMapOpen)} aria-expanded={mobileMapOpen} aria-controls="question-navigation">
          Questions<ChevronDown size={15} className={mobileMapOpen ? 'rotated' : ''} />
        </button>
        <div className="focus-section">
          <button className={`focus-monitor ${tracking && !isFocused ? 'is-away' : ''}`} onClick={() => setModal('focus')} aria-label={`${interruptionCount} focus interruptions. ${!started ? 'Focus tracking begins when you start the quiz. ' : ''}View focus activity.`}>
            <div className="focus-heading"><span>FOCUS MONITOR</span><Target size={16} strokeWidth={1.6} /></div>
            <div className="focus-count"><strong key={interruptionCount}>{pad(interruptionCount)}</strong><span>tab interruptions</span></div>
            <div className="focus-status"><span><i className={`status-dot ${complete || !started ? 'is-complete' : ''}`} />{complete ? 'Session complete' : !started ? 'Waiting to begin' : isFocused ? "You're in focus" : 'Focus interrupted'}</span><ArrowUpRight size={14} /></div>
          </button>
          <p className="focus-caption">{started ? 'A gentle nudge to stay in the moment.' : 'It wakes up when you press start.'}</p>
          <p className="sr-only" role="status">{interruptionCount} focus interruptions. {!started ? 'Focus tracking begins when you start.' : complete ? 'Focus tracking has ended.' : isFocused ? 'The quiz is in focus.' : 'The quiz is out of focus.'}</p>
        </div>
        <nav id="question-navigation" className={`question-navigation ${mobileMapOpen ? 'is-open' : ''}`} aria-label="Question navigation">
          <div className="map-heading"><h2>YOUR QUESTIONS</h2><span>{pad(answeredCount)}<span> / {questions.length}</span></span></div>
          <div className="question-map">
            {questions.map((question, index) => {
              const answered = session.answers[index] !== null;
              const active = (screen === 'quiz' || screen === 'review') && index === currentIndex;
              const incorrect = complete && answered && session.answers[index] !== question.correctAnswer;
              const state = complete ? answered ? incorrect ? 'incorrect' : 'correct' : 'unanswered' : answered ? 'answered' : 'unanswered';
              return (
                <button key={index} className={`map-cell ${answered ? 'is-answered' : ''} ${active ? 'is-current' : ''} ${incorrect ? 'is-incorrect' : ''}`}
                  aria-label={`Question ${index + 1}, ${state}${session.flagged[index] ? ', marked for review' : ''}${!started ? '. Available once you start' : ''}`}
                  aria-current={active ? 'step' : undefined} disabled={!started} onClick={() => navigateTo(index)}>
                  {pad(index + 1)}
                  {session.flagged[index] && <span className="map-flag" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
          <div className="map-legend">
            <span><i className="legend-square" />{complete ? 'Correct' : 'Answered'}</span>
            <span>{complete ? <i className="legend-square incorrect" /> : <Flag size={12} />} {complete ? 'Incorrect' : 'For review'}</span>
          </div>
          {started && (
            <button className="finish-link" onClick={() => complete ? showResults() : setModal('submit')}>
              {complete ? 'Back to results' : 'Finish assessment'}<ArrowRight size={15} />
            </button>
          )}
          {started && (
            <button className="mobile-restart-link" onClick={() => setModal('restart')}><RotateCcw size={13} />{complete ? 'Take it again' : 'Start fresh'}</button>
          )}
        </nav>
        <div className="sidebar-bottom">
          <Sparkles size={23} strokeWidth={1.15} />
          <p>Stay curious.<br />Stay in focus.</p>
          <div className="sidebar-bottom-line" />
          {started && (
            <button className="restart-link" onClick={() => setModal('restart')}><RotateCcw size={13} />{complete ? 'Take it again' : 'Start fresh'}</button>
          )}
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <span className="topbar-message"><span className="tiny-spark">+</span>A little focus goes a long way.</span>
          <button className="help-button" onClick={() => setModal('help')}><CircleHelp size={17} strokeWidth={1.5} />How it works</button>
        </header>
        <main id="main-content" className="workspace" tabIndex={-1}>
          <section className="assessment-intro" aria-labelledby="assessment-title">
            <div>
              <div className="eyebrow intro-eyebrow"><span />{screen === 'start' ? 'BEFORE WE BEGIN' : complete ? 'A MOMENT TO REFLECT' : 'THE KNOWLEDGE CHECK'}</div>
              <h1 id="assessment-title">AI &amp; Machine Learning</h1>
              <p>{screen === 'start' ? 'Settle in for a moment. Then, whenever you are ready, begin.' : screen === 'results' ? "New knowledge looks good on you. Here's your recap." : isReview ? 'A second look. A little more understanding.' : '20 questions. No time limit. Just you and what you know.'}</p>
            </div>
            <FocusFlower />
          </section>
          {screen === 'start' ? (
            <section className="start-panel" aria-labelledby="start-heading">
              <div className="results-topline"><Sparkles size={15} /><span>YOUR FIRST STEP</span></div>
              <h2 id="start-heading">A fresh page, a quiet mind.</h2>
              <p className="start-copy">Twenty questions on artificial intelligence and machine learning — no timer, no pressure. The moment you press start, this window becomes your little workspace, and a gentle monitor quietly counts each time your attention leaves it.</p>
              <ul className="start-facts">
                <li><span className="fact-icon"><ListChecks size={17} strokeWidth={1.5} /></span><div><strong>20 questions</strong><span>Four choices, one thoughtful answer each.</span></div></li>
                <li><span className="fact-icon"><Hourglass size={17} strokeWidth={1.5} /></span><div><strong>No time limit</strong><span>Take exactly the time you need.</span></div></li>
                <li><span className="fact-icon"><Target size={17} strokeWidth={1.5} /></span><div><strong>Focus monitor</strong><span>Active only while you quiz — leaving this window is counted, softly.</span></div></li>
              </ul>
              <div className="start-actions">
                <button className="button button-primary start-button" onClick={beginQuiz}>Start the quiz<ArrowRight size={16} /></button>
                <button className="button button-secondary" onClick={() => setModal('help')}><CircleHelp size={15} />How it works</button>
              </div>
              <p className="start-footnote"><ShieldCheck size={14} />The focus counter in the top-left switches on when you start and off when you finish. Your progress is saved quietly along the way.</p>
            </section>
          ) : screen === 'results' ? (
            <ResultsPanel session={session} onReview={() => navigateTo(0)} onRestart={() => setModal('restart')} />
          ) : (
            <>
              <section className="progress-section" aria-label="Assessment progress">
                <div className="progress-label"><span>{isReview ? 'Your answer review' : 'Your progress'}</span><span><strong>{answeredCount}</strong> of {questions.length} answered</span></div>
                <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={answeredCount} aria-label="Questions answered"><div style={{ width: `${answeredCount / questions.length * 100}%` }} /></div>
              </section>
              <section className="quiz-panel" aria-labelledby="question-title">
                <div className="question-topline">
                  <div className="question-number">QUESTION {pad(currentIndex + 1)}<span> / {questions.length}</span></div>
                  {isReview ? (
                    <span className={`answer-status ${selectedAnswer === currentQuestion.correctAnswer ? 'correct' : 'incorrect'}`}>
                      {selectedAnswer === currentQuestion.correctAnswer ? <Check size={14} /> : <X size={14} />}
                      {selectedAnswer === null ? 'Not answered' : selectedAnswer === currentQuestion.correctAnswer ? 'Correct answer' : 'Room to learn'}
                    </span>
                  ) : (
                    <button className={`flag-button ${session.flagged[currentIndex] ? 'is-flagged' : ''}`} aria-pressed={session.flagged[currentIndex]} onClick={() => toggleFlag(currentIndex)}>
                      <Flag size={14} strokeWidth={1.6} fill={session.flagged[currentIndex] ? 'currentColor' : 'none'} />
                      <span>{session.flagged[currentIndex] ? 'Marked for review' : 'Mark for review'}</span>
                    </button>
                  )}
                </div>
                <div className="question-content" key={`${currentIndex}-${isReview}`}>
                  <h2 id="question-title" ref={questionHeading} tabIndex={-1}>{currentQuestion.text}</h2>
                  <p className="question-helper">{isReview ? 'A closer look at your answer.' : 'Select the answer you think is right.'}</p>
                  <fieldset className={`answer-options ${isReview ? 'is-review' : ''}`}>
                    <legend className="sr-only">{isReview ? 'Answer review' : 'Choose one answer'}</legend>
                    {currentQuestion.options.map((option, index) => {
                      const selected = selectedAnswer === index;
                      const correct = isReview && index === currentQuestion.correctAnswer;
                      const incorrect = isReview && selected && !correct;
                      return (
                        <label className={`answer-option ${selected && !isReview ? 'is-selected' : ''} ${correct ? 'is-correct' : ''} ${incorrect ? 'is-incorrect' : ''}`} key={index}>
                          <input type="radio" name={`question-${currentIndex}`} value={index} checked={selected} disabled={isReview}
                            aria-label={`${letters[index]}. ${option}${isReview && selected ? '. Your answer.' : ''}${correct ? ' Correct answer.' : incorrect ? ' Incorrect answer.' : ''}`}
                            onChange={() => selectAnswer(currentIndex, index)} />
                          <span className="option-letter">{letters[index]}</span>
                          <span className="option-text">{option}</span>
                          <span className="option-end">
                            {isReview && (correct || selected) && <span className="option-feedback">{correct ? selected ? 'Your answer, correct' : 'Correct answer' : 'Your answer'}</span>}
                            <span className="option-circle">{correct || (selected && !isReview) ? <Check size={12} strokeWidth={2.5} /> : incorrect ? <X size={12} strokeWidth={2.5} /> : null}</span>
                          </span>
                        </label>
                      );
                    })}
                  </fieldset>
                  {isReview && <div className="answer-explanation"><BookOpen size={18} /><p><strong>A little more insight</strong>{currentQuestion.explanation}</p></div>}
                </div>
                <div className="quiz-footer">
                  <button className="button button-previous" disabled={currentIndex === 0} onClick={() => navigateTo(currentIndex - 1)}><ArrowLeft size={16} />Previous</button>
                  <span className="footer-reassurance">{isReview ? 'Understanding is the real win.' : 'One thoughtful answer at a time.'}</span>
                  <button className="button button-primary" onClick={nextQuestion}>{isLastQuestion ? isReview ? 'Back to results' : 'Finish assessment' : 'Next question'}<ArrowRight size={16} /></button>
                </div>
              </section>
              <div className="workspace-footer">
                <span><ShieldCheck size={14} strokeWidth={1.5} />{complete ? 'Your attempt is complete. Keep the curiosity.' : storageAvailable ? 'Your progress, quietly saved.' : 'Progress is available for this visit only.'}</span>
                {!isReview && <span className="keyboard-hint"><kbd>1</kbd><span>-</span><kbd>4</kbd><span>to choose</span><span className="shortcut-divider" /><kbd>Enter</kbd><span>to continue</span></span>}
              </div>
            </>
          )}
          {(screen === 'results' || screen === 'start') && <p className="page-signoff">{screen === 'start' ? 'Breathe in. Begin.' : 'Small steps. A little more clarity.'}</p>}
        </main>
        <footer className="bottom-wordmark"><BrandMark />A QUIETER WAY TO LEARN</footer>
      </div>

      {modal === 'help' && (
        <Dialog title="A little space to think." onClose={() => setModal(null)}>
          <p className="dialog-description">No countdown. No pressure. Just 20 questions and a curious mind.</p>
          <ol className="help-steps">
            <li><span>01</span><div><h3>Find your answer</h3><p>Choose one option for each question. Press 1-4 to select an answer, then Enter to continue.</p></div></li>
            <li><span>02</span><div><h3>Move at your own pace</h3><p>Use the question map to jump around. Mark a question for review if you want to come back to it.</p></div></li>
            <li><span>03</span><div><h3>Keep a little focus</h3><p>Once you press start, leaving this tab or window records one interruption. Staying away won't add extra counts.</p></div></li>
            <li><span>04</span><div><h3>Turn answers into understanding</h3><p>Finish to see your score, the correct answers, and an explanation for every question. Focus interruptions never affect your score.</p></div></li>
          </ol>
          <p className="privacy-note"><ShieldCheck size={15} />Progress is saved in this browser. Focus tracking runs only between start and finish.</p>
          <button className="button button-primary dialog-full-button" onClick={() => setModal(null)}>{!started ? 'Back to the beginning' : complete ? 'Back to your assessment' : 'Back to the quiz'}<ArrowRight size={16} /></button>
        </Dialog>
      )}
      {modal === 'focus' && (
        <Dialog title="Your focus, at a glance." onClose={() => setModal(null)}>
          <p className="dialog-description">A little awareness, not a judgment.</p>
          <div className="focus-summary"><div><strong>{pad(interruptionCount)}</strong><span>focus {interruptionCount === 1 ? 'interruption' : 'interruptions'}</span></div><span className="focus-summary-status"><i className={`status-dot ${complete || !started ? 'is-complete' : ''}`} />{complete ? 'Tracking complete' : !started ? 'Not started' : isFocused ? 'In focus' : 'Away'}</span></div>
          {interruptionCount === 0 ? (
            <div className="focus-empty"><Target size={32} strokeWidth={1.2} /><h3>Nice and steady.</h3><p>No interruptions recorded for this attempt.</p></div>
          ) : (
            <ol className="focus-event-list" aria-label="Focus interruptions, newest first">
              {[...session.interruptions].reverse().map((event, index) => (
                <li key={`${event.leftAt}-${index}`}><span className="event-number">{pad(interruptionCount - index)}</span><div><strong>{event.kind === 'tab' ? 'Tab left the foreground' : 'Window lost focus'}</strong><span>{new Date(event.leftAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span></div><span className="event-duration">{getAwayDuration(event)}</span></li>
              ))}
            </ol>
          )}
          <p className="focus-explanation">Switching tabs, windows, or focusing browser controls counts once each time you leave — but only while a quiz is active. Staying away doesn't add extra interruptions. {complete ? 'Tracking stopped when you finished.' : started ? 'Tracking stops when you finish.' : 'Tracking begins when you press start.'}</p>
          <p className="privacy-note"><ShieldCheck size={15} />Only focus changes are saved locally. We can't see which sites or apps you open. This is a browser-based awareness tool, not secure proctoring.</p>
          <button className="button button-primary dialog-full-button" onClick={() => setModal(null)}>{!started ? 'Back to the beginning' : `Back to ${complete ? 'your assessment' : 'the moment'}`}<ArrowRight size={16} /></button>
        </Dialog>
      )}
      {modal === 'submit' && (
        <Dialog title="Ready for the bigger picture?" onClose={() => setModal(null)}>
          <p className="dialog-description">You've answered <strong>{answeredCount} of {questions.length}</strong> questions. Finish your assessment to see your score and explore the answers.</p>
          {unansweredCount > 0 && <div className="dialog-notice"><Info size={18} /><p>You still have <strong>{unansweredCount} unanswered {unansweredCount === 1 ? 'question' : 'questions'}</strong>. Unanswered questions will count as incorrect in your score.</p></div>}
          {flaggedCount > 0 && <p className="flagged-notice"><Flag size={14} />{flaggedCount} {flaggedCount === 1 ? 'question is' : 'questions are'} marked for review.</p>}
          <p className="dialog-small-note">Your answers are final once you finish. You can always start a fresh attempt.</p>
          <div className="dialog-actions"><button className="button button-secondary" onClick={() => setModal(null)}>Keep thinking</button><button className="button button-primary" onClick={finishAssessment}>Finish assessment<ArrowRight size={16} /></button></div>
          {unansweredCount > 0 && <button className="dialog-text-button" onClick={() => { setModal(null); navigateTo(session.answers.findIndex((answer) => answer === null)); }}>Go to the first unanswered question<ArrowUpRight size={13} /></button>}
        </Dialog>
      )}
      {modal === 'restart' && (
        <Dialog title="Make room for a fresh start." onClose={() => setModal(null)}>
          <p className="dialog-description">Start a new attempt with all 20 questions. Your current answers, review marks, {complete ? 'results, ' : ''}and focus interruptions will be cleared, and you will begin again from the start screen.</p>
          <p className="dialog-small-note">A fresh page. The same curious you.</p>
          <div className="dialog-actions"><button className="button button-secondary" onClick={() => setModal(null)}>Keep this attempt</button><button className="button button-primary" onClick={restartAssessment}>Start fresh<RotateCcw size={15} /></button></div>
        </Dialog>
      )}
    </div>
  );
}
