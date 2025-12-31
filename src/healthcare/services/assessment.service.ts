import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { HealthcareApiService } from './healthcare-api.service';
import { RiskScoringService } from './risk-scoring.service';
import { Patient, AssessmentSubmission, AssessmentResponse } from '../dto/patient.dto';

@Injectable()
export class AssessmentService {
  private readonly logger = new Logger(AssessmentService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly healthcareApiService: HealthcareApiService,
    private readonly riskScoringService: RiskScoringService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('api.baseUrl');
    this.apiKey = this.configService.get<string>('api.key');
  }

  /**
   * Process all patients and generate alert lists
   */
  async processPatients(): Promise<AssessmentSubmission> {
    this.logger.log('Processing patients...');

    // Fetch all patients
    const patients = await this.healthcareApiService.fetchAllPatients();

    // Calculate risk scores for all patients
    const highRiskPatients: string[] = [];
    const feverPatients: string[] = [];
    const dataQualityIssues: string[] = [];

    for (const patient of patients) {
      const riskScore = this.riskScoringService.calculateRiskScore(patient);

      // High-risk patients (total risk score ≥ 4)
      if (riskScore.totalScore >= 4) {
        highRiskPatients.push(patient.patient_id);
      }

      // Fever patients (temperature ≥ 99.6°F)
      if (riskScore.hasFever) {
        feverPatients.push(patient.patient_id);
      }

      // Data quality issues
      if (riskScore.hasDataQualityIssue) {
        dataQualityIssues.push(patient.patient_id);
      }
    }

    // Sort arrays for consistency
    highRiskPatients.sort();
    feverPatients.sort();
    dataQualityIssues.sort();

    this.logger.log(`Found ${highRiskPatients.length} high-risk patients`);
    this.logger.log(`Found ${feverPatients.length} fever patients`);
    this.logger.log(`Found ${dataQualityIssues.length} data quality issues`);

    return {
      high_risk_patients: highRiskPatients,
      fever_patients: feverPatients,
      data_quality_issues: dataQualityIssues,
    };
  }

  /**
   * Submit assessment results to the API
   */
  async submitAssessment(submission: AssessmentSubmission): Promise<AssessmentResponse> {
    try {
      this.logger.log('Submitting assessment...');
      this.logger.log(`High-risk: ${submission.high_risk_patients.length}`);
      this.logger.log(`Fever: ${submission.fever_patients.length}`);
      this.logger.log(`Data quality: ${submission.data_quality_issues.length}`);

      const response = await firstValueFrom(
        this.httpService.post<AssessmentResponse>(`${this.baseUrl}/submit-assessment`, submission, {
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
        }),
      );

      this.logger.log(`Assessment submitted successfully. Score: ${response.data.results.score}`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to submit assessment: ${error.message}`);
      if (error.response) {
        this.logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  /**
   * Process and submit in one go
   */
  async processAndSubmit(): Promise<AssessmentResponse> {
    const submission = await this.processPatients();
    return this.submitAssessment(submission);
  }
}
