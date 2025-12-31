import { Controller, Get, Post, Body } from '@nestjs/common';
import { HealthcareApiService } from './services/healthcare-api.service';
import { AssessmentService } from './services/assessment.service';
import { Patient, AssessmentSubmission, AssessmentResponse, AssessmentSubmissionDto } from './dto/patient.dto';

@Controller('healthcare')
export class HealthcareController {
  constructor(
    private readonly healthcareApiService: HealthcareApiService,
    private readonly assessmentService: AssessmentService,
  ) {}

  @Get('patients')
  async getPatients(): Promise<Patient[]> {
    return this.healthcareApiService.fetchAllPatients();
  }

  @Post('process')
  async processPatients(): Promise<AssessmentSubmission> {
    return this.assessmentService.processPatients();
  }

  @Post('submit')
  async submitAssessment(@Body() submission: AssessmentSubmissionDto): Promise<AssessmentResponse> {
    return this.assessmentService.submitAssessment(submission);
  }

  @Post('process-and-submit')
  async processAndSubmit(): Promise<AssessmentResponse> {
    return this.assessmentService.processAndSubmit();
  }
}

