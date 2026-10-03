import { useCallback, useEffect, useRef, useState } from 'react';
import { questions } from '../data/questions';

export type FocusInterruption = {
  leftAt: number;
  returnedAt: number | null;
  kind: 'tab' | 'window';
};

export type QuizSession = {
  version: 1;
  answers: (number | null)[];
  flagged: boolean[];
  currentQuestion: number;
  interruptions: FocusInterruption[];
  /** Null until the user presses Start. Focus tracking only runs afterwards. */
  startedAt: number | null;
  completedAt: number | null;
};

const STORAGE_KEY = 'focal-ai-assessment-v1';

function createSession(): QuizSession {
  return {
    version: 1,
    answers: Array<number | null>(questions.length).fill(null),
    flagged: Array<boolean>(questions.length).fill(false),
    currentQuestion: 0,
    interruptions: [],
    startedAt: null,
    completedAt: null,
  };
}

function loadSession(): QuizSession {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSession();
    const saved: unknown = JSON.parse(raw);
    if (typeof saved !== 'object' || saved === null) return createSession();
    const value = saved as Record<string, unknown>;
    const valid = value.version === 1
      && Array.isArray(value.answers)
      && value.answers.length === questions.length
      && value.answers.every((answer: unknown) => answer === null || (typeof answer === 'number' && Number.isInteger(answer) && answer >= 0 && answer < 4))
      && Array.isArray(value.flagged)
      && value.flagged.length === questions.length
      && value.flagged.every((flag: unknown) => typeof flag === 'boolean')
      && typeof value.currentQuestion === 'number'
      && Number.isInteger(value.currentQuestion)
      && value.currentQuestion >= 0 && value.currentQuestion < questions.length
      && (value.startedAt === null || (typeof value.startedAt === 'number' && Number.isFinite(value.startedAt)))
      && (value.completedAt === null || (typeof value.completedAt === 'number' && Number.isFinite(value.completedAt)))
      && Array.isArray(value.interruptions)
      && value.interruptions.every((event: unknown) => {
        if (typeof event !== 'object' || event === null) return false;
        const item = event as Record<string, unknown>;
        return typeof item.leftAt === 'number' && Number.isFinite(item.leftAt)
          && (item.returnedAt === null || (typeof item.returnedAt === 'number' && Number.isFinite(item.returnedAt)))
          && (item.kind === 'tab' || item.kind === 'window');
      });
    if (!valid) return createSession();
    const session = value as unknown as QuizSession;
    return {
      ...session,
      // Resume the attempt and close any interruption left open before a reload.
      interruptions: session.interruptions.map((event) => ({
        ...event,
        returnedAt: event.returnedAt ?? Date.now(),
      })),
    };
  } catch {
    return createSession();
  }
}

export function useQuizSession() {
  const [session, setSession] = useState<QuizSession>(loadSession);
  const [isFocused, setIsFocused] = useState(() => document.visibilityState !== 'hidden');
  const [storageAvailable, setStorageAvailable] = useState(true);
  const isAway = useRef(document.visibilityState === 'hidden');
  const sessionRef = useRef(session);

  const persistSession = useCallback((value: QuizSession) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      setStorageAvailable(true);
    } catch {
      setStorageAvailable(false);
    }
  }, []);

  const updateSession = useCallback((update: (previous: QuizSession) => QuizSession) => {
    const next = update(sessionRef.current);
    if (next === sessionRef.current) return;
    sessionRef.current = next;
    setSession(next);
    // Save in the event handler, before a background tab can be suspended.
    persistSession(next);
  }, [persistSession]);

  useEffect(() => {
    persistSession(sessionRef.current);
    const onPageHide = () => persistSession(sessionRef.current);
    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, [persistSession]);

  useEffect(() => {
    const leave = (kind: FocusInterruption['kind']) => {
      setIsFocused(false);
      if (isAway.current) {
        // Browsers commonly emit both blur and visibilitychange for one switch.
        if (kind === 'tab') {
          updateSession((previous) => {
            const last = previous.interruptions[previous.interruptions.length - 1];
            if (previous.startedAt === null || previous.completedAt !== null || !last || last.returnedAt !== null || last.kind === 'tab') return previous;
            return {
              ...previous,
              interruptions: [...previous.interruptions.slice(0, -1), { ...last, kind: 'tab' }],
            };
          });
        }
        return;
      }
      isAway.current = true;
      const leftAt = Date.now();
      updateSession((previous) => previous.startedAt === null || previous.completedAt !== null ? previous : {
        ...previous,
        interruptions: [...previous.interruptions, { leftAt, returnedAt: null, kind }],
      });
    };

    const returnToQuiz = () => {
      if (document.visibilityState === 'hidden') return;
      isAway.current = false;
      setIsFocused(true);
      const returnedAt = Date.now();
      updateSession((previous) => {
        const last = previous.interruptions[previous.interruptions.length - 1];
        if (previous.startedAt === null || previous.completedAt !== null || !last || last.returnedAt !== null) return previous;
        return {
          ...previous,
          interruptions: [...previous.interruptions.slice(0, -1), { ...last, returnedAt }],
        };
      });
    };

    const handleBlur = () => leave('window');
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') leave('tab');
      else if (document.hasFocus()) returnToQuiz();
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', returnToQuiz);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', returnToQuiz);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [updateSession]);

  const selectAnswer = useCallback((questionIndex: number, answer: number) => {
    updateSession((previous) => {
      if (previous.completedAt !== null || !Number.isInteger(questionIndex) || questionIndex < 0 || questionIndex >= questions.length || !Number.isInteger(answer) || answer < 0 || answer > 3) return previous;
      const answers = [...previous.answers];
      answers[questionIndex] = answer;
      return { ...previous, answers };
    });
  }, [updateSession]);

  const goToQuestion = useCallback((index: number) => {
    if (!Number.isInteger(index) || index < 0 || index >= questions.length) return;
    updateSession((previous) => ({ ...previous, currentQuestion: index }));
  }, [updateSession]);

  const startQuiz = useCallback(() => {
    isAway.current = document.visibilityState === 'hidden';
    setIsFocused(!isAway.current);
    const startedAt = Date.now();
    updateSession((previous) => previous.startedAt !== null ? previous : { ...previous, startedAt });
  }, [updateSession]);

  const toggleFlag = useCallback((index: number) => {
    updateSession((previous) => {
      if (previous.completedAt !== null || !Number.isInteger(index) || index < 0 || index >= questions.length) return previous;
      const flagged = [...previous.flagged];
      flagged[index] = !flagged[index];
      return { ...previous, flagged };
    });
  }, [updateSession]);

  const completeQuiz = useCallback(() => {
    const completedAt = Date.now();
    updateSession((previous) => previous.completedAt !== null ? previous : {
      ...previous,
      completedAt,
      interruptions: previous.interruptions.map((event) => ({ ...event, returnedAt: event.returnedAt ?? completedAt })),
    });
  }, [updateSession]);

  const resetQuiz = useCallback(() => {
    isAway.current = document.visibilityState === 'hidden';
    setIsFocused(!isAway.current);
    updateSession(() => createSession());
  }, [updateSession]);

  return { session, isFocused, storageAvailable, selectAnswer, goToQuestion, toggleFlag, completeQuiz, resetQuiz, startQuiz };
}