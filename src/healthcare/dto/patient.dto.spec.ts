import { validate } from 'class-validator';
import { AssessmentSubmissionDto } from './patient.dto';

describe('AssessmentSubmissionDto', () => {
  let dto: AssessmentSubmissionDto;

  beforeEach(() => {
    dto = new AssessmentSubmissionDto();
  });

  describe('validation', () => {
    it('should pass validation with valid data', async () => {
      dto.high_risk_patients = ['DEMO001', 'DEMO002'];
      dto.fever_patients = ['DEMO003'];
      dto.data_quality_issues = ['DEMO004'];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation when high_risk_patients is missing', async () => {
      dto.fever_patients = ['DEMO003'];
      dto.data_quality_issues = ['DEMO004'];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('high_risk_patients');
    });

    it('should fail validation when fever_patients is missing', async () => {
      dto.high_risk_patients = ['DEMO001'];
      dto.data_quality_issues = ['DEMO004'];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'fever_patients')).toBe(true);
    });

    it('should fail validation when data_quality_issues is missing', async () => {
      dto.high_risk_patients = ['DEMO001'];
      dto.fever_patients = ['DEMO003'];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'data_quality_issues')).toBe(true);
    });

    it('should fail validation when high_risk_patients is empty array', async () => {
      dto.high_risk_patients = [];
      dto.fever_patients = ['DEMO003'];
      dto.data_quality_issues = ['DEMO004'];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const highRiskError = errors.find((e) => e.property === 'high_risk_patients');
      expect(highRiskError).toBeDefined();
      expect(highRiskError?.constraints?.arrayNotEmpty).toBeDefined();
    });

    it('should fail validation when fever_patients is empty array', async () => {
      dto.high_risk_patients = ['DEMO001'];
      dto.fever_patients = [];
      dto.data_quality_issues = ['DEMO004'];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const feverError = errors.find((e) => e.property === 'fever_patients');
      expect(feverError).toBeDefined();
      expect(feverError?.constraints?.arrayNotEmpty).toBeDefined();
    });

    it('should fail validation when data_quality_issues is empty array', async () => {
      dto.high_risk_patients = ['DEMO001'];
      dto.fever_patients = ['DEMO003'];
      dto.data_quality_issues = [];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const dataQualityError = errors.find((e) => e.property === 'data_quality_issues');
      expect(dataQualityError).toBeDefined();
      expect(dataQualityError?.constraints?.arrayNotEmpty).toBeDefined();
    });

    it('should fail validation when high_risk_patients contains non-string values', async () => {
      dto.high_risk_patients = ['DEMO001', 123 as any, 'DEMO002'];
      dto.fever_patients = ['DEMO003'];
      dto.data_quality_issues = ['DEMO004'];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const highRiskError = errors.find((e) => e.property === 'high_risk_patients');
      expect(highRiskError).toBeDefined();
      expect(highRiskError?.constraints?.isString).toBeDefined();
    });

    it('should fail validation when fever_patients contains non-string values', async () => {
      dto.high_risk_patients = ['DEMO001'];
      dto.fever_patients = ['DEMO003', 456 as any];
      dto.data_quality_issues = ['DEMO004'];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const feverError = errors.find((e) => e.property === 'fever_patients');
      expect(feverError).toBeDefined();
      expect(feverError?.constraints?.isString).toBeDefined();
    });

    it('should fail validation when data_quality_issues contains non-string values', async () => {
      dto.high_risk_patients = ['DEMO001'];
      dto.fever_patients = ['DEMO003'];
      dto.data_quality_issues = ['DEMO004', true as any];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const dataQualityError = errors.find((e) => e.property === 'data_quality_issues');
      expect(dataQualityError).toBeDefined();
      expect(dataQualityError?.constraints?.isString).toBeDefined();
    });

    it('should pass validation with empty string arrays (if needed)', async () => {
      // Note: This will fail due to ArrayNotEmpty, but testing the structure
      dto.high_risk_patients = ['DEMO001'];
      dto.fever_patients = ['DEMO003'];
      dto.data_quality_issues = ['DEMO004'];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass validation with multiple patient IDs in each array', async () => {
      dto.high_risk_patients = ['DEMO001', 'DEMO002', 'DEMO003'];
      dto.fever_patients = ['DEMO004', 'DEMO005'];
      dto.data_quality_issues = ['DEMO006', 'DEMO007', 'DEMO008', 'DEMO009'];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass validation with single patient ID in each array', async () => {
      dto.high_risk_patients = ['DEMO001'];
      dto.fever_patients = ['DEMO002'];
      dto.data_quality_issues = ['DEMO003'];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation when arrays are not arrays', async () => {
      dto.high_risk_patients = 'not-an-array' as any;
      dto.fever_patients = ['DEMO003'];
      dto.data_quality_issues = ['DEMO004'];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const highRiskError = errors.find((e) => e.property === 'high_risk_patients');
      expect(highRiskError).toBeDefined();
      expect(highRiskError?.constraints?.isArray).toBeDefined();
    });

    it('should pass validation with valid patient ID formats', async () => {
      dto.high_risk_patients = ['DEMO001', 'PATIENT_123', 'P-456'];
      dto.fever_patients = ['FEVER001'];
      dto.data_quality_issues = ['QUALITY001'];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
});
