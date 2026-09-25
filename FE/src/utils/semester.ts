/**
 * Semester.Code is stored in Vietnamese in the database ("Kỳ 1" … "Kỳ 9"), and the
 * student-import matches semesters on that exact string. So the formatted form is a
 * DISPLAY-ONLY translation — never write it back to the API or the database.
 *
 * `semesterLabel` lets a translated page pass t('lc.semester_word') so the label
 * follows the selected language. It defaults to English, so callers that have not
 * been translated yet keep their existing output unchanged.
 */
export function formatSemesterCode(code?: string | null, semesterLabel = 'Semester'): string {
  if (!code) return ''
  const match = /^k[yỳ]\s*(\d+)$/i.exec(code.trim())
  return match ? `${semesterLabel} ${match[1]}` : code
}
