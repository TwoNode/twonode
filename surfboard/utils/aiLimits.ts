/**
 * What one account may send to the language model (I-055). Both AI routes
 * call a paid API, so without these an account could run up the bill with one
 * long text or a loop. Generous for real use: the plan form's autofill is a
 * button a surveyor presses once per plan, and a survey plan's text is a few
 * thousand characters (the service itself keeps at most 25,000 of it).
 */
const HOUR_MS = 60 * 60 * 1000;

/** Longest `extractedText` the extract route accepts, in characters. */
export const AI_EXTRACT_MAX_CHARS = 100_000;
/** Longest `surveyTitle` the person-count route accepts, in characters. */
export const AI_SURVEY_TITLE_MAX_CHARS = 1_000;

/** Per account, per hour. */
export const AI_EXTRACT_LIMIT = { max: 60, windowMs: HOUR_MS };
export const AI_COUNT_LIMIT = { max: 120, windowMs: HOUR_MS };

export const AI_TOO_MANY_MESSAGE =
  "Too many AI requests. Please try again in a little while.";
