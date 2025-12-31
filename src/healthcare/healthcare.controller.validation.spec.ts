import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { HealthcareController } from './healthcare.controller';
import { HealthcareApiService } from './services/healthcare-api.service';
import { AssessmentService } from './services/assessment.service';
import { AssessmentResponse } from './dto/patient.dto';

describe('HealthcareController Validation (e2e)', () => {
  let app: INestApplication;
  let assessmentService: jest.Mocked<AssessmentService>;

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

    const moduleFixture: TestingModule = await Test.createTestingModule({
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

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    assessmentService = moduleFixture.get(AssessmentService);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /healthcare/submit', () => {
    it('should accept valid submission', async () => {
      assessmentService.submitAssessment.mockResolvedValue(mockAssessmentResponse);

      const validSubmission = {
        high_risk_patients: ['DEMO001', 'DEMO002'],
        fever_patients: ['DEMO003'],
        data_quality_issues: ['DEMO004'],
      };

      const response = await request(app.getHttpServer())
        .post('/healthcare/submit')
        .send(validSubmission)
        .expect(201);

      expect(response.body).toEqual(mockAssessmentResponse);
      expect(assessmentService.submitAssessment).toHaveBeenCalledWith(validSubmission);
    });

    it('should reject submission with missing high_risk_patients', async () => {
      const invalidSubmission = {
        fever_patients: ['DEMO003'],
        data_quality_issues: ['DEMO004'],
      };

      await request(app.getHttpServer())
        .post('/healthcare/submit')
        .send(invalidSubmission)
        .expect(400);
    });

    it('should reject submission with missing fever_patients', async () => {
      const invalidSubmission = {
        high_risk_patients: ['DEMO001'],
        data_quality_issues: ['DEMO004'],
      };

      await request(app.getHttpServer())
        .post('/healthcare/submit')
        .send(invalidSubmission)
        .expect(400);
    });

    it('should reject submission with missing data_quality_issues', async () => {
      const invalidSubmission = {
        high_risk_patients: ['DEMO001'],
        fever_patients: ['DEMO003'],
      };

      await request(app.getHttpServer())
        .post('/healthcare/submit')
        .send(invalidSubmission)
        .expect(400);
    });

    it('should reject submission with empty high_risk_patients array', async () => {
      const invalidSubmission = {
        high_risk_patients: [],
        fever_patients: ['DEMO003'],
        data_quality_issues: ['DEMO004'],
      };

      await request(app.getHttpServer())
        .post('/healthcare/submit')
        .send(invalidSubmission)
        .expect(400);
    });

    it('should reject submission with empty fever_patients array', async () => {
      const invalidSubmission = {
        high_risk_patients: ['DEMO001'],
        fever_patients: [],
        data_quality_issues: ['DEMO004'],
      };

      await request(app.getHttpServer())
        .post('/healthcare/submit')
        .send(invalidSubmission)
        .expect(400);
    });

    it('should reject submission with empty data_quality_issues array', async () => {
      const invalidSubmission = {
        high_risk_patients: ['DEMO001'],
        fever_patients: ['DEMO003'],
        data_quality_issues: [],
      };

      await request(app.getHttpServer())
        .post('/healthcare/submit')
        .send(invalidSubmission)
        .expect(400);
    });

    it('should reject submission with non-string values in high_risk_patients', async () => {
      const invalidSubmission = {
        high_risk_patients: ['DEMO001', 123, 'DEMO002'],
        fever_patients: ['DEMO003'],
        data_quality_issues: ['DEMO004'],
      };

      await request(app.getHttpServer())
        .post('/healthcare/submit')
        .send(invalidSubmission)
        .expect(400);
    });

    it('should reject submission with non-string values in fever_patients', async () => {
      const invalidSubmission = {
        high_risk_patients: ['DEMO001'],
        fever_patients: ['DEMO003', true],
        data_quality_issues: ['DEMO004'],
      };

      await request(app.getHttpServer())
        .post('/healthcare/submit')
        .send(invalidSubmission)
        .expect(400);
    });

    it('should reject submission with non-string values in data_quality_issues', async () => {
      const invalidSubmission = {
        high_risk_patients: ['DEMO001'],
        fever_patients: ['DEMO003'],
        data_quality_issues: ['DEMO004', { id: 'test' }],
      };

      await request(app.getHttpServer())
        .post('/healthcare/submit')
        .send(invalidSubmission)
        .expect(400);
    });

    it('should reject submission with non-array high_risk_patients', async () => {
      const invalidSubmission = {
        high_risk_patients: 'not-an-array',
        fever_patients: ['DEMO003'],
        data_quality_issues: ['DEMO004'],
      };

      await request(app.getHttpServer())
        .post('/healthcare/submit')
        .send(invalidSubmission)
        .expect(400);
    });

    it('should reject submission with extra properties', async () => {
      const invalidSubmission = {
        high_risk_patients: ['DEMO001'],
        fever_patients: ['DEMO003'],
        data_quality_issues: ['DEMO004'],
        extraProperty: 'should not be allowed',
      };

      await request(app.getHttpServer())
        .post('/healthcare/submit')
        .send(invalidSubmission)
        .expect(400);
    });

    it('should accept submission with single patient ID in each array', async () => {
      assessmentService.submitAssessment.mockResolvedValue(mockAssessmentResponse);

      const validSubmission = {
        high_risk_patients: ['DEMO001'],
        fever_patients: ['DEMO002'],
        data_quality_issues: ['DEMO003'],
      };

      await request(app.getHttpServer())
        .post('/healthcare/submit')
        .send(validSubmission)
        .expect(201);
    });

    it('should accept submission with multiple patient IDs', async () => {
      assessmentService.submitAssessment.mockResolvedValue(mockAssessmentResponse);

      const validSubmission = {
        high_risk_patients: ['DEMO001', 'DEMO002', 'DEMO003', 'DEMO004'],
        fever_patients: ['DEMO005', 'DEMO006'],
        data_quality_issues: ['DEMO007', 'DEMO008', 'DEMO009'],
      };

      await request(app.getHttpServer())
        .post('/healthcare/submit')
        .send(validSubmission)
        .expect(201);
    });
  });
});

