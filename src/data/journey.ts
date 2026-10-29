/**
 * Academic journey, practical experience and achievements. Every value is
 * editable. Keep labels precise: a semester SGPA is not a cumulative CGPA, and
 * a final-year CGPA is not the overall diploma result.
 */
export interface Result {
  value: string;
  label: string;
}

export interface Milestone {
  id: string;
  period: string;
  /** True until the exact years are verified; shows a dev-only reminder. */
  periodProvisional?: boolean;
  title: string;
  institution: string;
  details: string[];
  status: 'completed' | 'pursuing';
  results: Result[];
  /** Cumulative CGPA for an ongoing degree. `null` until verified. */
  cumulative?: Result | null;
  body: string;
}

export const education: Milestone[] = [
  {
    id: 'school',
    period: '2022',
    title: 'School education',
    institution: 'St. John International School, Palghar',
    details: ['CBSE', 'Class 10'],
    status: 'completed',
    results: [{ value: '86.2%', label: 'Class 10' }],
    body: 'The foundation: structured learning, problem-solving, and where my technical curiosity started.',
  },
  {
    id: 'diploma',
    // TODO(owner): verify admission and completion years before publishing.
    period: '2022–2025',
    periodProvisional: true,
    title: 'Diploma in Computer Science',
    institution: 'St. John College of Engineering and Management, Palghar',
    details: ['MSBTE'],
    status: 'completed',
    results: [{ value: '9.6', label: 'Final-year CGPA' }],
    body: 'My formal start in programming, databases, web development and practical software engineering, and where I began building functional applications.',
  },
  {
    id: 'btech',
    period: '2025–2028',
    title: 'Bachelor of Technology',
    institution: 'St. John College of Engineering and Management, Palghar',
    details: ['Autonomous college', 'Third year', 'Expected 2028'],
    status: 'pursuing',
    results: [{ value: '9.86', label: 'Semester 4 SGPA' }],
    // TODO(owner): add once verified, e.g. { value: '9.xx', label: 'Cumulative CGPA' }.
    cumulative: null,
    body: 'Continuing alongside building full-stack products, AI integrations and automation systems through projects and experimentation.',
  },
];

export const internships = [
  {
    role: 'Web Development Intern',
    org: 'CSISM Technologies',
    location: 'Virar (West)',
    duration: '6 weeks',
    body: 'Practical exposure to web development, server-side programming, database integration and application development.',
    tech: ['HTML', 'CSS', 'JavaScript', 'PHP', 'MySQL', 'XAMPP'],
  },
];

/** Add certificates, hackathons and awards here. Don't add dates or ranks you can't verify. */
export const achievements: { title: string; kind: 'technical' | 'sport' | 'certificate' | 'hackathon' | 'award' }[] = [
  { title: 'Won a technical house event', kind: 'technical' },
  { title: 'Represented St. John College in football', kind: 'sport' },
];
