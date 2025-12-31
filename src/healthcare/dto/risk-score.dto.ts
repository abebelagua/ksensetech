export interface RiskScore {
  patient_id: string;
  bpScore: number;
  tempScore: number;
  ageScore: number;
  totalScore: number;
  hasDataQualityIssue: boolean;
  hasFever: boolean;
}
