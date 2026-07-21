// Single source of truth for facts about the business that appear in more than one place, or
// that drift with the calendar.
//
// The site previously hardcoded its own age in prose and got it wrong twice: the home page
// claimed "23 years of experience" in one section and "21 years" in another, and both were stale
// against the actual founding year. Anything derived from the current date is computed at build
// time here instead, so a rebuild is all it takes to stay correct.

/** Year the practice was established. Confirmed by the client, and stated on the About page. */
export const FOUNDED_YEAR = 1999;

/** Full years the practice has been operating, as of the build. */
export function getYearsInBusiness(): number {
  return new Date().getFullYear() - FOUNDED_YEAR;
}

/** Current year, for the footer copyright line. */
export function getCurrentYear(): number {
  return new Date().getFullYear();
}
