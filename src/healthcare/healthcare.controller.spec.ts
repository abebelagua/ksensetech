import { Test, TestingModule } from '@nestjs/testing';
import { HealthcareController } from './healthcare.controller';
import { HealthcareApiService } from './services/healthcare-api.service';
import { AssessmentService } from './services/assessment.service';
import { Patient, AssessmentSubmission, AssessmentResponse } from './dto/patient.dto';

describe('HealthcareController', () => {
  let controller: HealthcareController;
  let healthcareApiService: jest.Mocked<HealthcareApiService>;
  let assessmentService: jest.Mocked<AssessmentService>;

  const mockPatient: Patient = {
    patient_id: 'DEMO001',
    name: 'Test Patient',
    age: 45,
    gender: 'M',
    blood_pressure: '120/80',
    temperature: 98.6,
    visit_date: '2024-01-15',
    diagnosis: 'Test',
    medications: 'Test',
  };

  const mockSubmission: AssessmentSubmission = {
    high_risk_patients: ['DEMO001', 'DEMO002'],
    fever_patients: ['DEMO003'],
    data_quality_issues: ['DEMO004'],
  };

  const mockAssessmentResponse: AssessmentResponse = {
    success: true,
    message: 'Assessment submitted successfully',
    results: {
      score: 100,
      percentage: 100,
      status: 'PASS',
      breakdown: {
        high_risk: { score: 50, max: 50, correct: 2, submitted: 2, matches: 2 },
        fever: { score: 25, max: 25, correct: 1, submitted: 1, matches: 1 },
        data_quality: { score: 25, max: 25, correct: 1, submitted: 1, matches: 1 },
      },
      feedback: {
        strengths: ['Perfect score'],
        issues: [],
      },
      attempt_number: 1,
      remaining_attempts: 2,
      is_personal_best: true,
      can_resubmit: true,
    },
  };

  beforeEach(async () => {
    const mockHealthcareApiService = {
      fetchAllPatients: jest.fn(),
    };

    const mockAssessmentService = {
      processPatients: jest.fn(),
      submitAssessment: jest.fn(),
      processAndSubmit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthcareController],
      providers: [
        {
          provide: HealthcareApiService,
          useValue: mockHealthcareApiService,
        },
        {
          provide: AssessmentService,
          useValue: mockAssessmentService,
        },
      ],
    }).compile();

    controller = module.get<HealthcareController>(HealthcareController);
    healthcareApiService = module.get(HealthcareApiService);
    assessmentService = module.get(AssessmentService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getPatients', () => {
    it('should return array of patients', async () => {
      const patients = [mockPatient];
      healthcareApiService.fetchAllPatients.mockResolvedValue(patients);

      const result = await controller.getPatients();

      expect(result).toEqual(patients);
      expect(healthcareApiService.fetchAllPatients).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no patients', async () => {
      healthcareApiService.fetchAllPatients.mockResolvedValue([]);

      const result = await controller.getPatients();

      expect(result).toEqual([]);
    });
  });

  describe('processPatients', () => {
    it('should process patients and return submission', async () => {
      assessmentService.processPatients.mockResolvedValue(mockSubmission);

      const result = await controller.processPatients();

      expect(result).toEqual(mockSubmission);
      expect(assessmentService.processPatients).toHaveBeenCalledTimes(1);
    });

    it('should return submission with sorted arrays', async () => {
      const submission: AssessmentSubmission = {
        high_risk_patients: ['DEMO002', 'DEMO001'],
        fever_patients: ['DEMO003'],
        data_quality_issues: ['DEMO004'],
      };

      assessmentService.processPatients.mockResolvedValue(submission);

      const result = await controller.processPatients();

      expect(result).toEqual(submission);
    });
  });

  describe('submitAssessment', () => {
    it('should submit assessment and return response', async () => {
      assessmentService.submitAssessment.mockResolvedValue(mockAssessmentResponse);

      const result = await controller.submitAssessment(mockSubmission);

      expect(result).toEqual(mockAssessmentResponse);
      expect(assessmentService.submitAssessment).toHaveBeenCalledWith(mockSubmission);
      expect(assessmentService.submitAssessment).toHaveBeenCalledTimes(1);
    });

    it('should handle submission errors', async () => {
      const error = new Error('Submission failed');
      assessmentService.submitAssessment.mockRejectedValue(error);

      await expect(controller.submitAssessment(mockSubmission)).rejects.toThrow('Submission failed');
    });
  });

  describe('processAndSubmit', () => {
    it('should process and submit in one call', async () => {
      assessmentService.processAndSubmit.mockResolvedValue(mockAssessmentResponse);

      const result = await controller.processAndSubmit();

      expect(result).toEqual(mockAssessmentResponse);
      expect(assessmentService.processAndSubmit).toHaveBeenCalledTimes(1);
    });

    it('should handle errors during process and submit', async () => {
      const error = new Error('Processing failed');
      assessmentService.processAndSubmit.mockRejectedValue(error);

      await expect(controller.processAndSubmit()).rejects.toThrow('Processing failed');
    });
  });
});

