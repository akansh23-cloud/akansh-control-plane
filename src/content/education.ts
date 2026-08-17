/**
 * Education.
 *
 * This section was missing from the site, the résumé page and the generated
 * PDF. An ATS that cannot find a degree often discards the file, so it is
 * declared here once and consumed by every surface.
 *
 * Nothing in this module is inferred. It is the degree as awarded.
 */

export type Education = {
  id: string;
  institution: string;
  /** How the institution is commonly abbreviated. */
  short: string;
  location: string;
  degree: string;
  /** The named specialisation on the degree, if there is one. */
  field: string;
  start: string;
  end: string;
  period: string;
};

export const education: Education[] = [
  {
    id: 'upes',
    institution: 'University of Petroleum and Energy Studies (UPES)',
    short: 'UPES',
    location: 'Dehradun, India',
    degree: 'B.Tech, Computer Science',
    field: 'Cloud Computing & Virtualization Technology',
    start: '2019-07',
    end: '2023-05',
    period: 'July 2019 — May 2023',
  },
];

export const primaryEducation = education[0];
