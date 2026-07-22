import { JobPosting, EmploymentType, WorkplaceType } from "../types";
import { normalizeJob } from "./normalize";

// Comprehensive catalog of typical Indian Government recruitment notices
const GOV_JOB_CATALOG = [
  // IT / Software / Developer
  {
    id: "gov-isro-001",
    title: "Scientist 'B' (Computer Science)",
    company: "Indian Space Research Organisation (ISRO)",
    location: "Bangalore, Karnataka",
    description: "ISRO Central Recruitment Board (ICRB) invites applications for Scientist/Engineer 'SC' in Computer Science. Candidates must possess BE/B.Tech or equivalent degree in Computer Science with a minimum of 65% marks. Key tasks include developing satellite flight software, spacecraft control systems, and data processing systems. Pay scale: Level 10 of 7th CPC ($56,100 - $1,77,500).",
    applyUrl: "https://www.isro.gov.in/Careers.html",
    postedDate: "2026-07-10",
    employmentType: "full-time" as EmploymentType,
    workplaceType: "on-site" as WorkplaceType
  },
  {
    id: "gov-drdo-001",
    title: "Scientist 'B' (Cyber Security & Cryptography)",
    company: "Defence Research and Development Organisation (DRDO)",
    location: "Hyderabad, Telangana",
    description: "Recruitment and Assessment Centre (RAC) invites online applications for Scientist 'B' posts in Cyber Security at SAG/CAIR labs. Responsibilities include threat intelligence modeling, vulnerability assessment, secure coding, and cryptographic implementation. Requirements: B.Tech in CSE/IT/ECE + valid GATE score. Pay scale: Level 10 of 7th CPC.",
    applyUrl: "https://rac.gov.in",
    postedDate: "2026-07-08",
    employmentType: "full-time" as EmploymentType,
    workplaceType: "on-site" as WorkplaceType
  },
  {
    id: "gov-ssc-001",
    title: "Junior Engineer (Information Technology)",
    company: "Staff Selection Commission (SSC)",
    location: "New Delhi, Delhi",
    description: "SSC conducts open competitive examination for recruitment of Junior Engineers (IT) for Central Government Ministries and Departments. Work includes network troubleshooting, database management, portal maintenance, and government app integration. Qualification: Degree/Diploma in Computer Science/IT + 2 years experience.",
    applyUrl: "https://ssc.gov.in",
    postedDate: "2026-07-05",
    employmentType: "full-time" as EmploymentType,
    workplaceType: "on-site" as WorkplaceType
  },
  {
    id: "gov-upsc-001",
    title: "System Analyst & Developer",
    company: "Union Public Service Commission (UPSC)",
    location: "New Delhi, Delhi",
    description: "UPSC invites applications for direct recruitment of System Analysts. Candidates will supervise development of recruitment portals, online application systems (ORA), and examination processing engines. Requirements: BE/B.Tech in CSE/IT or MCA. Pay Scale Level 11.",
    applyUrl: "https://upsconline.nic.in",
    postedDate: "2026-07-11",
    employmentType: "full-time" as EmploymentType,
    workplaceType: "on-site" as WorkplaceType
  },
  {
    id: "gov-ncs-001",
    title: "IT Consultant & Coordinator (NCS Portal)",
    company: "National Career Service (NCS)",
    location: "Mumbai, Maharashtra",
    description: "National Career Service (Ministry of Labour & Employment) invites applications for IT Coordinators. Job involves maintaining regional job center portals, database synchronization, API coordination with private job boards, and conducting digital job fairs. Requirements: MCA/B.Tech (CS) + 1 year IT coordinator experience.",
    applyUrl: "https://www.ncs.gov.in",
    postedDate: "2026-07-12",
    employmentType: "full-time" as EmploymentType,
    workplaceType: "hybrid" as WorkplaceType
  },
  {
    id: "gov-ncs-002",
    title: "Software Engineer - National Job Portal",
    company: "National Career Service (NCS)",
    location: "Bangalore, Karnataka",
    description: "Design and implement API integrations, search indexing pipelines, and AI matching algorithms for the National Career Service (NCS) website. Candidates will collaborate with the NIC team. Requires experience with Node.js, Next.js, and SQL databases.",
    applyUrl: "https://www.ncs.gov.in",
    postedDate: "2026-07-13",
    employmentType: "full-time" as EmploymentType,
    workplaceType: "remote" as WorkplaceType
  },

  // Electronics / Scientific / Research
  {
    id: "gov-isro-002",
    title: "Scientific Assistant (Electronics & Communications)",
    company: "Indian Space Research Organisation (ISRO)",
    location: "Trivandrum, Kerala",
    description: "Vikram Sarabhai Space Centre (VSSC) invites applications for Scientific Assistant. Candidates will work on rocket telemetry systems, RF engineering, payload testing, and radar communications. Requirement: First-class Diploma in ECE.",
    applyUrl: "https://www.vssc.gov.in",
    postedDate: "2026-07-06",
    employmentType: "full-time" as EmploymentType,
    workplaceType: "on-site" as WorkplaceType
  },
  {
    id: "gov-drdo-002",
    title: "Research Associate (Mechanical/Materials Science)",
    company: "Defence Research and Development Organisation (DRDO)",
    location: "Pune, Maharashtra",
    description: "Armament Research and Development Establishment (ARDE) invites applications for Junior Research Fellows (JRF) and Research Associates. Duties involve composite materials testing, thermal analysis, and ballistic simulation using CAD tools. Requirement: PhD or M.Tech in Mechanical Engineering.",
    applyUrl: "https://drdo.gov.in",
    postedDate: "2026-07-07",
    employmentType: "contract" as EmploymentType,
    workplaceType: "on-site" as WorkplaceType
  },

  // Administrative / General
  {
    id: "gov-upsc-002",
    title: "Administrative & Public Relations Officer",
    company: "Union Public Service Commission (UPSC)",
    location: "New Delhi, Delhi",
    description: "UPSC recruitment notification for Administrative Officer. Position reports directly to Secretary. Duties: Manage logistics of civil services exams, press releases, grievance cells, and public communications. Requirement: Master's degree in any discipline + 3 years administrative experience.",
    applyUrl: "https://upsc.gov.in",
    postedDate: "2026-07-04",
    employmentType: "full-time" as EmploymentType,
    workplaceType: "on-site" as WorkplaceType
  },
  // Medical & Healthcare / ICMR / AIIMS / NIMHANS / NHM
  {
    id: "gov-aiims-001",
    title: "Nursing Officer (Staff Nurse Grade-II)",
    company: "All India Institute of Medical Sciences (AIIMS)",
    location: "New Delhi, Delhi",
    description: "AIIMS New Delhi invites applications for Nursing Officer Recruitment Common Eligibility Test (NORCET). Position requires a B.Sc (Hons.) in Nursing / B.Sc Nursing from an Indian Nursing Council recognized Institute, or Diploma in General Nursing Midwifery with 2 years experience in a minimum 50 bedded hospital. Responsibilities include patient care, clinical support, and operating room logistics.",
    applyUrl: "https://www.aiimsexams.ac.in",
    postedDate: "2026-07-11",
    employmentType: "full-time" as EmploymentType,
    workplaceType: "on-site" as WorkplaceType
  },
  {
    id: "gov-nimhans-001",
    title: "Clinical Psychologist",
    company: "National Institute of Mental Health and Neurosciences (NIMHANS)",
    location: "Bangalore, Karnataka",
    description: "NIMHANS invites applications for Clinical Psychologist positions on a regular basis. Qualifications: M.Phil in Clinical Psychology from an RCI-recognized institution. Key duties: Psychological assessment, diagnostic testing, psychotherapeutic interventions, and research in mental health and neurosciences.",
    applyUrl: "https://nimhans.ac.in/careers/",
    postedDate: "2026-07-09",
    employmentType: "full-time" as EmploymentType,
    workplaceType: "on-site" as WorkplaceType
  },
  {
    id: "gov-icmr-001",
    title: "Scientist 'B' (Medical / Bioinformatics)",
    company: "Indian Council of Medical Research (ICMR)",
    location: "Pune, Maharashtra",
    description: "National Institute of Virology (ICMR-NIV) invites applications for Scientist 'B' in Bioinformatics/Medical diagnostics. Duties involve analyzing genomic sequencing datasets, structural biology modeling, molecular docking, and vaccine development pipelines. Requirement: First-class Master's in Bioinformatics / computational biology or MBBS.",
    applyUrl: "https://main.icmr.nic.in/career-opportunity",
    postedDate: "2026-07-12",
    employmentType: "full-time" as EmploymentType,
    workplaceType: "on-site" as WorkplaceType
  },
  {
    id: "gov-nhm-001",
    title: "Community Health Officer (CHO)",
    company: "National Health Mission (NHM)",
    location: "Lucknow, Uttar Pradesh",
    description: "NHM invites online applications for Community Health Officers (CHO) to strengthen primary healthcare services. Qualification: B.Sc Nursing with integrated curriculum of Certificate in Community Health for Nurses (CCHN). Key responsibilities: Maternal and child health services, vaccination drives, and primary healthcare consulting at rural sub-centers.",
    applyUrl: "https://upnrhm.gov.in",
    postedDate: "2026-07-13",
    employmentType: "full-time" as EmploymentType,
    workplaceType: "on-site" as WorkplaceType
  }
];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter(Boolean);
}

function matches(query: string, job: any): boolean {
  const queryTokens = tokenize(query);

  const searchable = [
    job.title,
    job.company,
    job.description
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return queryTokens.some(token => searchable.includes(token));
}

function matchesLocation(jobLocation: string, preferredLocation?: string): boolean {
  if (!preferredLocation) return true;
  const jobLoc = jobLocation.toLowerCase();
  const prefLoc = preferredLocation.toLowerCase();

  if (prefLoc.includes("remote") || prefLoc.includes("worldwide") || prefLoc.includes("anywhere")) {
    return true;
  }

  if (jobLoc.includes(prefLoc)) {
    return true;
  }

  // Country level mapping for India
  if (prefLoc === "india" || prefLoc === "in") {
    const indianLocs = ["india", "bangalore", "karnataka", "delhi", "mumbai", "maharashtra", "hyderabad", "telangana", "pune", "trivandrum", "kerala", "lucknow", "uttar pradesh", "chennai", "tamil nadu", "sriharikota", "remote"];
    if (indianLocs.some(loc => jobLoc.includes(loc))) {
      return true;
    }
  }

  // Country level mapping for US
  if (prefLoc === "united states" || prefLoc === "usa" || prefLoc === "us" || prefLoc === "america") {
    const usLocs = ["us", "usa", "united states", "america", "palo alto", "san francisco", "california", "ca", "chicago", "new york", "seattle", "washington", "texas", "tx", "remote"];
    if (usLocs.some(loc => jobLoc.includes(loc))) {
      return true;
    }
  }

  if (jobLoc.includes("remote") || jobLoc.includes("worldwide") || jobLoc.includes("anywhere")) {
    const hasUSConstraint = jobLoc.includes("us") || jobLoc.includes("usa") || jobLoc.includes("united states") || jobLoc.includes("america");
    const hasUKConstraint = jobLoc.includes("uk") || jobLoc.includes("united kingdom") || jobLoc.includes("gb") || jobLoc.includes("london");
    const hasCAConstraint = jobLoc.includes("ca") || jobLoc.includes("canada");
    const hasDEConstraint = jobLoc.includes("de") || jobLoc.includes("germany") || jobLoc.includes("munich");
    const hasFRConstraint = jobLoc.includes("fr") || jobLoc.includes("france") || jobLoc.includes("paris");
    const hasINConstraint = jobLoc.includes("in") || jobLoc.includes("india") || jobLoc.includes("bangalore");

    const userInUS = prefLoc.includes("us") || prefLoc.includes("usa") || prefLoc.includes("united states") || prefLoc.includes("america");
    const userInUK = prefLoc.includes("uk") || prefLoc.includes("united kingdom") || prefLoc.includes("gb") || prefLoc.includes("london");
    const userInCA = prefLoc.includes("ca") || prefLoc.includes("canada");
    const userInDE = prefLoc.includes("de") || prefLoc.includes("germany") || prefLoc.includes("munich");
    const userInFR = prefLoc.includes("fr") || prefLoc.includes("france") || prefLoc.includes("paris");
    const userInIN = prefLoc.includes("in") || prefLoc.includes("india") || prefLoc.includes("bangalore");

    if (hasUSConstraint && !userInUS) return false;
    if (hasUKConstraint && !userInUK) return false;
    if (hasCAConstraint && !userInCA) return false;
    if (hasDEConstraint && !userInDE) return false;
    if (hasFRConstraint && !userInFR) return false;
    if (hasINConstraint && !userInIN) return false;

    return true;
  }

  return false;
}

export async function fetchGovJobs(
  query: string,
  preferredLocation?: string
): Promise<JobPosting[]> {
  try {
    // Simulating slight latency for network requests
    await new Promise(resolve => setTimeout(resolve, 50));

    const matchedJobs = GOV_JOB_CATALOG.filter(
      job =>
        matches(query, job) &&
        matchesLocation(job.location || "Remote", preferredLocation)
    );

    return matchedJobs.map(job =>
      normalizeJob({
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        description: job.description,
        applyUrl: job.applyUrl,
        source: "gov_india",
        postedDate: job.postedDate,
        employmentType: job.employmentType,
        workplaceType: job.workplaceType
      })
    );
  } catch {
    return [];
  }
}
