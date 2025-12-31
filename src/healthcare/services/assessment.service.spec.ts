import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { of } from 'rxjs';
import { AssessmentService } from './assessment.service';
import { HealthcareApiService } from './healthcare-api.service';
import { RiskScoringService } from './risk-scoring.service';
import { Patient, AssessmentSubmission } from '../dto/patient.dto';

describe('AssessmentService', () => {
  let service: AssessmentService;
  let healthcareApiService: jest.Mocked<HealthcareApiService>;
  let riskScoringService: jest.Mocked<RiskScoringService>;
  let httpService: jest.Mocked<HttpService>;
  let configService: jest.Mocked<ConfigService>;

  // Mock Logger to suppress logs during tests
  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  const mockPatients: Patient[] = [
    {
      patient_id: 'DEMO001',
      name: 'Patient 1',
      age: 45,
      gender: 'M',
      blood_pressure: '120/80',
      temperature: 98.6,
      visit_date: '2024-01-15',
      diagnosis: 'Normal',
      medications: 'None',
    },
    {
      patient_id: 'DEMO002',
      name: 'Patient 2',
      age: 70,
      gender: 'F',
      blood_pressure: '150/95',
      temperature: 101.5,
      visit_date: '2024-01-16',
      diagnosis: 'Hypertension',
      medications: 'Med1',
    },
    {
      patient_id: 'DEMO003',
      name: 'Patient 3',
      age: 30,
      gender: 'M',
      blood_pressure: 'N/A',
      temperature: 99.8,
      visit_date: '2024-01-17',
      diagnosis: 'Fever',
      medications: 'Med2',
    },
    {
      patient_id: 'DEMO004',
      name: 'Patient 4',
      age: 50,
      gender: 'F',
      blood_pressure: '130/85',
      temperature: 98.0,
      visit_date: '2024-01-18',
      diagnosis: 'Normal',
      medications: 'None',
    },
  ];

  beforeEach(async () => {
    const mockHealthcareApiService = {
      fetchAllPatients: jest.fn(),
    };

    const mockRiskScoringService = {
      calculateRiskScore: jest.fn(),
    };

    const mockHttpService = {
      post: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, any> = {
          'api.baseUrl': 'https://test-api.com/api',
          'api.key': 'test-api-key',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssessmentService,
        {
          provide: HealthcareApiService,
          useValue: mockHealthcareApiService,
        },
        {
          provide: RiskScoringService,
          useValue: mockRiskScoringService,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AssessmentService>(AssessmentService);
    healthcareApiService = module.get(HealthcareApiService);
    riskScoringService = module.get(RiskScoringService);
    httpService = module.get(HttpService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processPatients', () => {
    it('should process patients and identify high-risk patients', async () => {
      healthcareApiService.fetchAllPatients.mockResolvedValue(mockPatients);

      // Mock risk scores
      riskScoringService.calculateRiskScore
        .mockReturnValueOnce({
          patient_id: 'DEMO001',
          bpScore: 1,
          tempScore: 0,
          ageScore: 1,
          totalScore: 2,
          hasDataQualityIssue: false,
          hasFever: false,
        })
        .mockReturnValueOnce({
          patient_id: 'DEMO002',
          bpScore: 4,
          tempScore: 2,
          ageScore: 2,
          totalScore: 8,
          hasDataQualityIssue: false,
          hasFever: true,
        })
        .mockReturnValueOnce({
          patient_id: 'DEMO003',
          bpScore: 0,
          tempScore: 1,
          ageScore: 0,
          totalScore: 1,
          hasDataQualityIssue: true,
          hasFever: true,
        })
        .mockReturnValueOnce({
          patient_id: 'DEMO004',
          bpScore: 3,
          tempScore: 0,
          ageScore: 1,
          totalScore: 4,
          hasDataQualityIssue: false,
          hasFever: false,
        });

      const result = await service.processPatients();

      expect(result.high_risk_patients).toEqual(['DEMO002', 'DEMO004']);
      expect(result.fever_patients).toEqual(['DEMO002', 'DEMO003']);
      expect(result.data_quality_issues).toEqual(['DEMO003']);
    });

    it('should return empty arrays when no patients match criteria', async () => {
      const lowRiskPatient: Patient = {
        patient_id: 'DEMO001',
        name: 'Patient 1',
        age: 30,
        gender: 'M',
        blood_pressure: '110/70',
        temperature: 98.0,
        visit_date: '2024-01-15',
        diagnosis: 'Normal',
        medications: 'None',
      };

      healthcareApiService.fetchAllPatients.mockResolvedValue([lowRiskPatient]);

      riskScoringService.calculateRiskScore.mockReturnValue({
        patient_id: 'DEMO001',
        bpScore: 1,
        tempScore: 0,
        ageScore: 0,
        totalScore: 1,
        hasDataQualityIssue: false,
        hasFever: false,
      });

      const result = await service.processPatients();

      expect(result.high_risk_patients).toEqual([]);
      expect(result.fever_patients).toEqual([]);
      expect(result.data_quality_issues).toEqual([]);
    });

    it('should sort patient IDs in result arrays', async () => {
      healthcareApiService.fetchAllPatients.mockResolvedValue(mockPatients);

      riskScoringService.calculateRiskScore
        .mockReturnValueOnce({
          patient_id: 'DEMO001',
          bpScore: 4,
          tempScore: 0,
          ageScore: 1,
          totalScore: 5,
          hasDataQualityIssue: false,
          hasFever: false,
        })
        .mockReturnValueOnce({
          patient_id: 'DEMO002',
          bpScore: 4,
          tempScore: 0,
          ageScore: 1,
          totalScore: 5,
          hasDataQualityIssue: false,
          hasFever: false,
        })
        .mockReturnValueOnce({
          patient_id: 'DEMO003',
          bpScore: 1,
          tempScore: 0,
          ageScore: 1,
          totalScore: 2,
          hasDataQualityIssue: false,
          hasFever: false,
        })
        .mockReturnValueOnce({
          patient_id: 'DEMO004',
          bpScore: 4,
          tempScore: 0,
          ageScore: 1,
          totalScore: 5,
          hasDataQualityIssue: false,
          hasFever: false,
        });

      const result = await service.processPatients();

      expect(result.high_risk_patients).toEqual(['DEMO001', 'DEMO002', 'DEMO004']);
    });

    it('should handle empty patient list', async () => {
      healthcareApiService.fetchAllPatients.mockResolvedValue([]);

      const result = await service.processPatients();

      expect(result.high_risk_patients).toEqual([]);
      expect(result.fever_patients).toEqual([]);
      expect(result.data_quality_issues).toEqual([]);
    });

    it('should call fetchAllPatients once', async () => {
      healthcareApiService.fetchAllPatients.mockResolvedValue(mockPatients);
      riskScoringService.calculateRiskScore.mockReturnValue({
        patient_id: 'DEMO001',
        bpScore: 1,
        tempScore: 0,
        ageScore: 1,
        totalScore: 2,
        hasDataQualityIssue: false,
        hasFever: false,
      });

      await service.processPatients();

      expect(healthcareApiService.fetchAllPatients).toHaveBeenCalledTimes(1);
    });

    it('should calculate risk score for each patient', async () => {
      healthcareApiService.fetchAllPatients.mockResolvedValue(mockPatients);
      riskScoringService.calculateRiskScore.mockReturnValue({
        patient_id: 'DEMO001',
        bpScore: 1,
        tempScore: 0,
        ageScore: 1,
        totalScore: 2,
        hasDataQualityIssue: false,
        hasFever: false,
      });

      await service.processPatients();

      expect(riskScoringService.calculateRiskScore).toHaveBeenCalledTimes(mockPatients.length);
      expect(riskScoringService.calculateRiskScore).toHaveBeenCalledWith(mockPatients[0]);
      expect(riskScoringService.calculateRiskScore).toHaveBeenCalledWith(mockPatients[1]);
      expect(riskScoringService.calculateRiskScore).toHaveBeenCalledWith(mockPatients[2]);
      expect(riskScoringService.calculateRiskScore).toHaveBeenCalledWith(mockPatients[3]);
    });

    it('should use hasFever from risk score for each patient', async () => {
      healthcareApiService.fetchAllPatients.mockResolvedValue(mockPatients);
      riskScoringService.calculateRiskScore
        .mockReturnValueOnce({
          patient_id: 'DEMO001',
          bpScore: 1,
          tempScore: 0,
          ageScore: 1,
          totalScore: 2,
          hasDataQualityIssue: false,
          hasFever: false,
        })
        .mockReturnValueOnce({
          patient_id: 'DEMO002',
          bpScore: 1,
          tempScore: 0,
          ageScore: 1,
          totalScore: 2,
          hasDataQualityIssue: false,
          hasFever: true,
        })
        .mockReturnValueOnce({
          patient_id: 'DEMO003',
          bpScore: 1,
          tempScore: 0,
          ageScore: 1,
          totalScore: 2,
          hasDataQualityIssue: false,
          hasFever: false,
        })
        .mockReturnValueOnce({
          patient_id: 'DEMO004',
          bpScore: 1,
          tempScore: 0,
          ageScore: 1,
          totalScore: 2,
          hasDataQualityIssue: false,
          hasFever: true,
        });

      const result = await service.processPatients();

      expect(result.fever_patients).toEqual(['DEMO002', 'DEMO004']);
    });
  });

  describe('submitAssessment', () => {
    it('should submit assessment successfully', async () => {
      const submission: AssessmentSubmission = {
        high_risk_patients: ['DEMO001', 'DEMO002'],
        fever_patients: ['DEMO003'],
        data_quality_issues: ['DEMO004'],
      };

      const mockResponse = {
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
          feedback: { strengths: [], issues: [] },
          attempt_number: 1,
          remaining_attempts: 2,
          is_personal_best: true,
          can_resubmit: true,
        },
      };

      httpService.post.mockReturnValue(of({ data: mockResponse } as any));

      const result = await service.submitAssessment(submission);

      expect(result).toEqual(mockResponse);
      expect(httpService.post).toHaveBeenCalledWith(
        expect.stringContaining('/submit-assessment'),
        submission,
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-api-key': expect.any(String),
            'Content-Type': 'application/json',
          }),
        }),
      );
    });
  });

  describe('processAndSubmit', () => {
    it('should process patients and submit in one call', async () => {
      healthcareApiService.fetchAllPatients.mockResolvedValue(mockPatients);
      riskScoringService.calculateRiskScore.mockReturnValue({
        patient_id: 'DEMO001',
        bpScore: 4,
        tempScore: 0,
        ageScore: 1,
        totalScore: 5,
        hasDataQualityIssue: false,
        hasFever: false,
      });

      const mockResponse = {
        success: true,
        message: 'Assessment submitted successfully',
        results: {
          score: 100,
          percentage: 100,
          status: 'PASS',
          breakdown: {
            high_risk: { score: 50, max: 50, correct: 1, submitted: 1, matches: 1 },
            fever: { score: 0, max: 25, correct: 0, submitted: 0, matches: 0 },
            data_quality: { score: 0, max: 25, correct: 0, submitted: 0, matches: 0 },
          },
          feedback: { strengths: [], issues: [] },
          attempt_number: 1,
          remaining_attempts: 2,
          is_personal_best: true,
          can_resubmit: true,
        },
      };

      httpService.post.mockReturnValue(of({ data: mockResponse } as any));

      const result = await service.processAndSubmit();

      expect(result).toEqual(mockResponse);
      expect(healthcareApiService.fetchAllPatients).toHaveBeenCalled();
      expect(httpService.post).toHaveBeenCalled();
    });
  });
});
