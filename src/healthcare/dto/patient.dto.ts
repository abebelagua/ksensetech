export interface Patient {
  patient_id: string;
  name: string;
  age: number | string;
  gender: string;
  blood_pressure: string;
  temperature: number | string;
  visit_date: string;
  diagnosis: string;
  medications: string;
}

export interface PatientsResponse {
  data: Patient[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  metadata: {
    timestamp: string;
    version: string;
    requestId: string;
  };
}

import { IsArray, IsString, ArrayNotEmpty, ArrayMinSize } from 'class-validator';

export class AssessmentSubmissionDto {
  @IsArray()
  @ArrayNotEmpty({ message: 'high_risk_patients must not be empty' })
  @IsString({ each: true, message: 'Each high_risk_patients item must be a string' })
  high_risk_patients: string[];

  @IsArray()
  @ArrayNotEmpty({ message: 'fever_patients must not be empty' })
  @IsString({ each: true, message: 'Each fever_patients item must be a string' })
  fever_patients: string[];

  @IsArray()
  @ArrayNotEmpty({ message: 'data_quality_issues must not be empty' })
  @IsString({ each: true, message: 'Each data_quality_issues item must be a string' })
  data_quality_issues: string[];
}

// Keep interface for backward compatibility
export interface AssessmentSubmission {
  high_risk_patients: string[];
  fever_patients: string[];
  data_quality_issues: string[];
}

export interface AssessmentResponse {
  success: boolean;
  message: string;
  results: {
    score: number;
    percentage: number;
    status: string;
    breakdown: {
      high_risk: {
        score: number;
        max: number;
        correct: number;
        submitted: number;
        matches: number;
      };
      fever: {
        score: number;
        max: number;
        correct: number;
        submitted: number;
        matches: number;
      };
      data_quality: {
        score: number;
        max: number;
        correct: number;
        submitted: number;
        matches: number;
      };
    };
    feedback: {
      strengths: string[];
      issues: string[];
    };
    attempt_number: number;
    remaining_attempts: number;
    is_personal_best: boolean;
    can_resubmit: boolean;
  };
}
