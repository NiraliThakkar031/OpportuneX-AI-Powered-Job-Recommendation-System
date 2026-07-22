import { JobPosting, EmploymentType, WorkplaceType } from "../types";
import { normalizeJob } from "./normalize";

export const MULTI_FIELD_CATALOG = [
  // ==================== PSYCHOLOGY & MENTAL HEALTH ====================
  {
    id: "psych-nimhans-001",
    title: "Clinical Psychologist",
    company: "National Institute of Mental Health and Neurosciences (NIMHANS)",
    location: "Bangalore, Karnataka",
    description: "NIMHANS invites applications for Clinical Psychologists. Qualifications: M.Phil or M.Sc in Clinical Psychology from an RCI recognized institution. Responsibilities include psychological assessment, diagnostic testing, psychotherapeutic interventions, cognitive rehabilitation, and clinical research.",
    applyUrl: "https://nimhans.ac.in/careers/",
    postedDate: "2026-07-15",
    domain: "Psychology",
    requiredEducation: "M.Sc. Clinical Psychology",
    requiredSkills: ["psychology", "clinical assessment", "psychotherapy", "cbt", "diagnostic testing"],
    employmentType: "full-time" as EmploymentType,
    workplaceType: "on-site" as WorkplaceType,
    source: "gov_india"
  },
  {
    id: "psych-fortis-002",
    title: "Child & Adolescent Psychologist",
    company: "Fortis Healthcare Mental Health Department",
    location: "Delhi NCR",
    description: "Conduct psychological evaluations, behavioral counseling, and therapy sessions for children, adolescents, and families. Requires M.Sc / M.Phil in Psychology with experience in developmental disorders, ADHD, and adolescent mental health.",
    applyUrl: "https://www.fortishealthcare.com/careers",
    postedDate: "2026-07-18",
    domain: "Psychology",
    requiredEducation: "M.Sc Psychology",
    requiredSkills: ["child psychology", "counseling", "behavioral therapy", "mental health"],
    employmentType: "full-time" as EmploymentType,
    workplaceType: "on-site" as WorkplaceType,
    source: "direct_healthcare"
  },
  {
    id: "psych-wellnest-003",
    title: "Behavioral Therapist & Counselor",
    company: "Wellnest Cognitive Solutions",
    location: "Hyderabad, Telangana",
    description: "Provide evidence-based behavioral interventions, cognitive behavioral therapy (CBT), and family counseling for patients dealing with anxiety, depression, and stress management.",
    applyUrl: "https://wellnest.in/careers",
    postedDate: "2026-07-19",
    domain: "Psychology",
    requiredEducation: "M.Sc. Clinical Psychology",
    requiredSkills: ["cbt", "counseling", "behavioral therapy", "psychology"],
    employmentType: "full-time" as EmploymentType,
    workplaceType: "hybrid" as WorkplaceType,
    source: "direct_healthcare"
  },

  // ==================== EDUCATION & TEACHING ====================
  {
    id: "edu-cu-001",
    title: "Assistant Professor - Clinical Psychology",
    company: "Chandigarh University",
    location: "Chandigarh / Mohali",
    description: "Chandigarh University invites applications for Assistant Professor in Psychology. Candidates should possess M.Sc / M.Phil / PhD in Psychology with strong academic credentials. Responsibilities: Lecturing, curriculum design, supervising clinical lab practicals.",
    applyUrl: "https://www.cuchd.in/careers/",
    postedDate: "2026-07-14",
    domain: "Education",
    requiredEducation: "M.Sc Psychology",
    requiredSkills: ["teaching", "psychology", "curriculum design", "academic research"],
    employmentType: "full-time" as EmploymentType,
    workplaceType: "on-site" as WorkplaceType,
    source: "direct_education"
  },
  {
    id: "edu-cs-002",
    title: "Psychology Teacher & Student Counselor",
    company: "CS Academy & International Schools",
    location: "Coimbatore / Chennai, Tamil Nadu",
    description: "Teach Psychology for Higher Secondary (CBSE/IGCSE) students and provide guidance & emotional counseling to high school adolescents.",
    applyUrl: "https://csacademy.in/careers",
    postedDate: "2026-07-17",
    domain: "Education",
    requiredEducation: "M.Sc Psychology",
    requiredSkills: ["teaching", "counseling", "psychology", "student guidance"],
    employmentType: "full-time" as EmploymentType,
    workplaceType: "on-site" as WorkplaceType,
    source: "direct_education"
  },

  // ==================== HEALTHCARE & NURSING ====================
  {
    id: "health-aiims-001",
    title: "Nursing Officer (Staff Nurse)",
    company: "All India Institute of Medical Sciences (AIIMS)",
    location: "New Delhi, Delhi",
    description: "AIIMS recruitment for Nursing Officers. Qualification: B.Sc Nursing or General Nursing Midwifery (GNM). Responsibilities include patient care, ICU monitoring, and clinical coordination.",
    applyUrl: "https://www.aiimsexams.ac.in",
    postedDate: "2026-07-16",
    domain: "Healthcare",
    requiredEducation: "B.Sc Nursing",
    requiredSkills: ["nursing", "patient care", "clinical monitoring", "healthcare"],
    employmentType: "full-time" as EmploymentType,
    workplaceType: "on-site" as WorkplaceType,
    source: "gov_india"
  },
  {
    id: "health-icmr-002",
    title: "Scientist 'B' (Clinical Research / Medical)",
    company: "Indian Council of Medical Research (ICMR)",
    location: "Pune / Mumbai, Maharashtra",
    description: "ICMR invites applications for Scientist 'B'. Tasks involve epidemiological studies, clinical trials supervision, and biomedical research data collection.",
    applyUrl: "https://main.icmr.nic.in/career-opportunity",
    postedDate: "2026-07-15",
    domain: "Healthcare",
    requiredEducation: "M.Sc Clinical Research / MBBS",
    requiredSkills: ["clinical research", "biomedical data", "healthcare", "trials"],
    employmentType: "full-time" as EmploymentType,
    workplaceType: "on-site" as WorkplaceType,
    source: "gov_india"
  },

  // ==================== FINANCE, COMMERCE & BANKING ====================
  {
    id: "fin-ey-001",
    title: "Financial Analyst & Risk Consultant",
    company: "EY (Ernst & Young) India",
    location: "Gurgaon / Bangalore",
    description: "Perform financial modeling, audit analysis, regulatory compliance reporting, and corporate valuation. Requirements: B.Com / M.Com / MBA Finance / CA Inter.",
    applyUrl: "https://www.ey.com/en_in/careers",
    postedDate: "2026-07-18",
    domain: "Finance",
    requiredEducation: "B.Com / MBA Finance",
    requiredSkills: ["finance", "financial modeling", "accounting", "excel", "audit"],
    employmentType: "full-time" as EmploymentType,
    workplaceType: "hybrid" as WorkplaceType,
    source: "direct_corporate"
  },
  {
    id: "fin-sbi-002",
    title: "Probationary Officer (Financial Management)",
    company: "State Bank of India (SBI)",
    location: "Mumbai, Maharashtra",
    description: "SBI recruitment for POs. Responsibilities include commercial loan processing, credit assessment, portfolio risk management, and branch banking operations.",
    applyUrl: "https://sbi.co.in/careers",
    postedDate: "2026-07-12",
    domain: "Finance",
    requiredEducation: "Bachelor's Degree",
    requiredSkills: ["banking", "finance", "credit evaluation", "accounting"],
    employmentType: "full-time" as EmploymentType,
    workplaceType: "on-site" as WorkplaceType,
    source: "gov_india"
  },

  // ==================== MECHANICAL, CIVIL & ELECTRICAL ENGINEERING ====================
  {
    id: "eng-lt-001",
    title: "Civil Structural Engineer",
    company: "Larsen & Toubro (L&T) Construction",
    location: "Mumbai / Chennai",
    description: "Design structural frameworks, concrete reinforcement, bridge infrastructure, and CAD blueprints. Requirements: B.E / B.Tech in Civil Engineering.",
    applyUrl: "https://www.larsentoubro.com/careers/",
    postedDate: "2026-07-16",
    domain: "Engineering",
    requiredEducation: "B.Tech Civil Engineering",
    requiredSkills: ["civil engineering", "autocad", "structural design", "construction"],
    employmentType: "full-time" as EmploymentType,
    workplaceType: "on-site" as WorkplaceType,
    source: "direct_corporate"
  },
  {
    id: "eng-isro-002",
    title: "Scientist / Engineer 'SC' (Mechanical)",
    company: "Indian Space Research Organisation (ISRO)",
    location: "Trivandrum, Kerala",
    description: "VSSC ISRO invites applications for Mechanical Engineers. Tasks include launch vehicle thermal analysis, rocket propulsion assembly, and CAD CAD/CAM simulation.",
    applyUrl: "https://www.isro.gov.in/Careers.html",
    postedDate: "2026-07-14",
    domain: "Engineering",
    requiredEducation: "B.Tech Mechanical Engineering",
    requiredSkills: ["mechanical engineering", "cad", "thermal analysis", "propulsion"],
    employmentType: "full-time" as EmploymentType,
    workplaceType: "on-site" as WorkplaceType,
    source: "gov_india"
  },

  // ==================== HR, MARKETING & BUSINESS ADMINISTRATION ====================
  {
    id: "hr-tatacomm-001",
    title: "HR Generalist & Talent Acquisition Specialist",
    company: "Tata Communications",
    location: "Pune / Mumbai",
    description: "Manage end-to-end recruitment pipelines, employee engagement, performance appraisals, and onboarding workflows. Requirements: BBA / MBA / M.A in HR or Psychology.",
    applyUrl: "https://www.tatacommunications.com/careers/",
    postedDate: "2026-07-17",
    domain: "HR",
    requiredEducation: "MBA / BBA / M.A Psychology",
    requiredSkills: ["human resources", "recruitment", "talent acquisition", "communication"],
    employmentType: "full-time" as EmploymentType,
    workplaceType: "hybrid" as WorkplaceType,
    source: "direct_corporate"
  },
  {
    id: "mkt-zomato-002",
    title: "Digital Marketing & Growth Manager",
    company: "Zomato India",
    location: "Gurgaon, Haryana",
    description: "Lead SEO/SEM marketing campaigns, social media strategy, content analytics, and user acquisition funnels.",
    applyUrl: "https://www.zomato.com/careers",
    postedDate: "2026-07-19",
    domain: "Marketing",
    requiredEducation: "Bachelor's Degree",
    requiredSkills: ["digital marketing", "seo", "sem", "content strategy", "analytics"],
    employmentType: "full-time" as EmploymentType,
    workplaceType: "hybrid" as WorkplaceType,
    source: "direct_corporate"
  },

  // ==================== COMPUTER SCIENCE & IT ====================
  {
    id: "tech-tcs-001",
    title: "Full Stack Software Developer",
    company: "Tata Consultancy Services (TCS)",
    location: "Bangalore / Hyderabad",
    description: "Develop enterprise web applications using Node.js, React, Java/Python, microservices architecture, and SQL databases. Requirements: B.Tech in CSE / IT / ECE or MCA.",
    applyUrl: "https://www.tcs.com/careers",
    postedDate: "2026-07-18",
    domain: "Technology",
    requiredEducation: "B.Tech Computer Science / MCA",
    requiredSkills: ["react", "node.js", "python", "java", "sql", "software engineering"],
    employmentType: "full-time" as EmploymentType,
    workplaceType: "hybrid" as WorkplaceType,
    source: "direct_corporate"
  },
  {
    id: "tech-drdo-002",
    title: "Scientist 'B' (Computer Science & Cyber Security)",
    company: "Defence Research and Development Organisation (DRDO)",
    location: "Hyderabad, Telangana",
    description: "DRDO RAC invites applications for Scientist 'B'. Tasks involve threat modeling, network security, software development, and encryption protocols.",
    applyUrl: "https://rac.gov.in",
    postedDate: "2026-07-15",
    domain: "Technology",
    requiredEducation: "B.Tech Computer Science",
    requiredSkills: ["cyber security", "python", "c++", "networking", "software development"],
    employmentType: "full-time" as EmploymentType,
    workplaceType: "on-site" as WorkplaceType,
    source: "gov_india"
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
    job.domain,
    job.description,
    job.requiredEducation,
    (job.requiredSkills || []).join(" ")
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

  if (jobLoc.includes(prefLoc)) return true;

  if (prefLoc === "india" || prefLoc === "in") {
    const indianLocs = ["india", "bangalore", "karnataka", "delhi", "mumbai", "maharashtra", "hyderabad", "telangana", "pune", "trivandrum", "kerala", "lucknow", "uttar pradesh", "chennai", "tamil nadu", "gurgaon", "noida", "chandigarh", "mohali", "coimbatore", "remote"];
    if (indianLocs.some(loc => jobLoc.includes(loc))) {
      return true;
    }
  }

  return false;
}

export async function fetchCatalogJobs(
  query: string,
  preferredLocation?: string
): Promise<JobPosting[]> {
  try {
    const matched = MULTI_FIELD_CATALOG.filter(
      job => matches(query, job) && matchesLocation(job.location, preferredLocation)
    );

    return matched.map(job =>
      normalizeJob({
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        description: job.description,
        applyUrl: job.applyUrl,
        source: job.source || "direct_catalog",
        postedDate: job.postedDate,
        domain: job.domain,
        requiredEducation: job.requiredEducation,
        requiredSkills: job.requiredSkills,
        employmentType: job.employmentType,
        workplaceType: job.workplaceType
      })
    );
  } catch {
    return [];
  }
}
