export type SourceRecord = {
  id: string;
  name: string;
  category: "api" | "official" | "employer" | "feed";
  country: string;
  officialUrl: string;
  enabled: boolean;
  notes: string;
};

export const SOURCE_REGISTRY: SourceRecord[] = [
  { id:"adzuna", name:"Adzuna", category:"api", country:"Global", officialUrl:"https://developer.adzuna.com/", enabled:true, notes:"API-based aggregator; credentials required." },
  { id:"jooble", name:"Jooble", category:"api", country:"Global", officialUrl:"https://jooble.org/api/about", enabled:true, notes:"API access depends on account/plan." },
  { id:"remotive", name:"Remotive", category:"api", country:"Global", officialUrl:"https://remotive.com/remote-jobs/api", enabled:true, notes:"Remote jobs; freshness/terms must be respected." },
  { id:"ncs", name:"National Career Service", category:"official", country:"India", officialUrl:"https://www.ncs.gov.in/", enabled:false, notes:"Official Indian government employment service; connector should use an authorized/public interface." },
  { id:"upsc", name:"UPSC", category:"official", country:"India", officialUrl:"https://upsc.gov.in/", enabled:false, notes:"Official recruitment source; ingest only through permitted/public interfaces." },
  { id:"ssc", name:"Staff Selection Commission", category:"official", country:"India", officialUrl:"https://ssc.gov.in/", enabled:false, notes:"Official recruitment source." },
  { id:"employment-news", name:"Employment News", category:"official", country:"India", officialUrl:"https://employmentnews.gov.in/", enabled:false, notes:"Government employment publication; use permitted feeds/data." },
  { id:"indian-railways", name:"Indian Railways", category:"official", country:"India", officialUrl:"https://indianrailways.gov.in/", enabled:false, notes:"Official railway recruitment ecosystem; regional RRB sources vary." },
  { id:"apprenticeship-india", name:"Apprenticeship India", category:"official", country:"India", officialUrl:"https://www.apprenticeshipindia.gov.in/", enabled:false, notes:"Official apprenticeship source." },
  { id:"upsc-online", name:"UPSC Online", category:"official", country:"India", officialUrl:"https://upsconline.nic.in/", enabled:false, notes:"Official application portal." },
  { id:"isro", name:"ISRO Careers", category:"official", country:"India", officialUrl:"https://www.isro.gov.in/Careers.html", enabled:false, notes:"Official employer careers source." },
  { id:"drdo", name:"DRDO Careers", category:"official", country:"India", officialUrl:"https://www.drdo.gov.in/careers", enabled:false, notes:"Official employer/recruitment source." },
  { id:"psu-careers", name:"Indian PSU career portals", category:"official", country:"India", officialUrl:"https://www.india.gov.in/", enabled:false, notes:"PSU recruitment should be connected per organization through permitted public sources." },
  { id:"greenhouse", name:"Greenhouse public boards", category:"employer", country:"Global", officialUrl:"https://developers.greenhouse.io/job-board.html", enabled:true, notes:"Employer boards require a known board token/company board." },
  { id:"lever", name:"Lever public postings", category:"employer", country:"Global", officialUrl:"https://hire.lever.co/developer/documentation", enabled:true, notes:"Employer postings API/feeds for configured companies." },
  { id:"workable", name:"Workable public jobs", category:"employer", country:"Global", officialUrl:"https://www.workable.com/", enabled:true, notes:"Employer-specific public job feeds." },
];
