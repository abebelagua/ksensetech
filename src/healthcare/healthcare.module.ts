import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { HealthcareController } from './healthcare.controller';
import { HealthcareApiService } from './services/healthcare-api.service';
import { AssessmentService } from './services/assessment.service';
import { RiskScoringService } from './services/risk-scoring.service';

@Module({
  imports: [HttpModule],
  controllers: [HealthcareController],
  providers: [HealthcareApiService, AssessmentService, RiskScoringService],
})
export class HealthcareModule {}

