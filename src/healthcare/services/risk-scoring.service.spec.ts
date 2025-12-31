import { Test, TestingModule } from '@nestjs/testing';
import { RiskScoringService } from './risk-scoring.service';
import { Patient } from '../dto/patient.dto';

describe('RiskScoringService', () => {
  let service: RiskScoringService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RiskScoringService],
    }).compile();

    service = module.get<RiskScoringService>(RiskScoringService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateBPScore', () => {
    it('should return score 0 for normal BP (<120/<80)', () => {
      const result = service.calculateBPScore('110/70');
      expect(result.score).toBe(0);
      expect(result.isValid).toBe(true);
    });

    it('should return score 1 for elevated BP (120-129/<80)', () => {
      expect(service.calculateBPScore('120/75').score).toBe(1);
      expect(service.calculateBPScore('125/78').score).toBe(1);
      expect(service.calculateBPScore('129/79').score).toBe(1);
    });

    it('should return score 2 for stage 1 BP (130-139 OR 80-89)', () => {
      // Systolic in range
      expect(service.calculateBPScore('130/75').score).toBe(2);
      expect(service.calculateBPScore('135/78').score).toBe(2);
      expect(service.calculateBPScore('139/79').score).toBe(2);

      // Diastolic in range
      expect(service.calculateBPScore('120/80').score).toBe(2);
      expect(service.calculateBPScore('125/85').score).toBe(2);
      expect(service.calculateBPScore('110/89').score).toBe(2);
    });

    it('should return score 3 for stage 2 BP (≥140 OR ≥90)', () => {
      // High systolic
      expect(service.calculateBPScore('140/80').score).toBe(3);
      expect(service.calculateBPScore('150/85').score).toBe(3);

      // High diastolic
      expect(service.calculateBPScore('120/90').score).toBe(3);
      expect(service.calculateBPScore('130/95').score).toBe(3);

      // Both high
      expect(service.calculateBPScore('150/100').score).toBe(3);
    });

    it('should return score 0 for invalid/missing BP', () => {
      expect(service.calculateBPScore(null).isValid).toBe(false);
      expect(service.calculateBPScore(undefined).isValid).toBe(false);
      expect(service.calculateBPScore('').isValid).toBe(false);
      expect(service.calculateBPScore('N/A').isValid).toBe(false);
      expect(service.calculateBPScore('INVALID').isValid).toBe(false);
      expect(service.calculateBPScore('150/').isValid).toBe(false);
      expect(service.calculateBPScore('/90').isValid).toBe(false);
      expect(service.calculateBPScore('invalid/90').isValid).toBe(false);
      expect(service.calculateBPScore('150/invalid').isValid).toBe(false);
      expect(service.calculateBPScore('150').isValid).toBe(false);
    });
  });

  describe('calculateTempScore', () => {
    it('should return score 0 for normal temperature (≤99.5)', () => {
      expect(service.calculateTempScore(98.6).score).toBe(0);
      expect(service.calculateTempScore(99.5).score).toBe(0);
      expect(service.calculateTempScore('99.5').score).toBe(0);
    });

    it('should return score 1 for low fever (99.6-100.9)', () => {
      expect(service.calculateTempScore(99.6).score).toBe(1);
      expect(service.calculateTempScore(100.0).score).toBe(1);
      expect(service.calculateTempScore(100.9).score).toBe(1);
      expect(service.calculateTempScore('99.6').score).toBe(1);
      expect(service.calculateTempScore('100.9').score).toBe(1);
    });

    it('should return score 2 for high fever (≥101)', () => {
      expect(service.calculateTempScore(101).score).toBe(2);
      expect(service.calculateTempScore(102.5).score).toBe(2);
      expect(service.calculateTempScore('101').score).toBe(2);
    });

    it('should correctly identify fever (≥99.6)', () => {
      expect(service.calculateTempScore(99.5).hasFever).toBe(false);
      expect(service.calculateTempScore(99.6).hasFever).toBe(true);
      expect(service.calculateTempScore(100.0).hasFever).toBe(true);
      expect(service.calculateTempScore(101).hasFever).toBe(true);
    });

    it('should return score 0 for invalid/missing temperature', () => {
      expect(service.calculateTempScore(null).isValid).toBe(false);
      expect(service.calculateTempScore(undefined).isValid).toBe(false);
      expect(service.calculateTempScore('').isValid).toBe(false);
      expect(service.calculateTempScore('N/A').isValid).toBe(false);
      expect(service.calculateTempScore('INVALID').isValid).toBe(false);
      expect(service.calculateTempScore('TEMP_ERROR').isValid).toBe(false);
      expect(service.calculateTempScore('invalid').isValid).toBe(false);
    });
  });

  describe('calculateAgeScore', () => {
    it('should return score 0 for age under 40', () => {
      expect(service.calculateAgeScore(25).score).toBe(0);
      expect(service.calculateAgeScore(39).score).toBe(0);
      expect(service.calculateAgeScore('25').score).toBe(0);
    });

    it('should return score 1 for age 40-65', () => {
      expect(service.calculateAgeScore(40).score).toBe(1);
      expect(service.calculateAgeScore(50).score).toBe(1);
      expect(service.calculateAgeScore(65).score).toBe(1);
      expect(service.calculateAgeScore('40').score).toBe(1);
    });

    it('should return score 2 for age over 65', () => {
      expect(service.calculateAgeScore(66).score).toBe(2);
      expect(service.calculateAgeScore(80).score).toBe(2);
      expect(service.calculateAgeScore('70').score).toBe(2);
    });

    it('should return score 0 for invalid/missing age', () => {
      expect(service.calculateAgeScore(null).isValid).toBe(false);
      expect(service.calculateAgeScore(undefined).isValid).toBe(false);
      expect(service.calculateAgeScore('').isValid).toBe(false);
      expect(service.calculateAgeScore('n/a').isValid).toBe(false);
      expect(service.calculateAgeScore('unknown').isValid).toBe(false);
      expect(service.calculateAgeScore('invalid').isValid).toBe(false);
      expect(service.calculateAgeScore(-5).isValid).toBe(false);
    });
  });

  describe('calculateRiskScore', () => {
    it('should calculate total risk score correctly', () => {
      const patient: Patient = {
        patient_id: 'TEST001',
        name: 'Test Patient',
        age: 45,
        gender: 'M',
        blood_pressure: '140/90',
        temperature: 101,
        visit_date: '2024-01-15',
        diagnosis: 'Test',
        medications: 'Test',
      };

      const result = service.calculateRiskScore(patient);
      expect(result.bpScore).toBe(3);
      expect(result.tempScore).toBe(2);
      expect(result.ageScore).toBe(1);
      expect(result.totalScore).toBe(6);
      expect(result.hasDataQualityIssue).toBe(false);
    });

    it('should identify data quality issues', () => {
      const patient: Patient = {
        patient_id: 'TEST002',
        name: 'Test Patient',
        age: null as any,
        gender: 'M',
        blood_pressure: '140/90',
        temperature: 98.6,
        visit_date: '2024-01-15',
        diagnosis: 'Test',
        medications: 'Test',
      };

      const result = service.calculateRiskScore(patient);
      expect(result.hasDataQualityIssue).toBe(true);
    });

    it('should handle patient with all invalid data', () => {
      const patient: Patient = {
        patient_id: 'TEST003',
        name: 'Test Patient',
        age: 'invalid',
        gender: 'M',
        blood_pressure: 'N/A',
        temperature: 'TEMP_ERROR',
        visit_date: '2024-01-15',
        diagnosis: 'Test',
        medications: 'Test',
      };

      const result = service.calculateRiskScore(patient);
      expect(result.totalScore).toBe(0);
      expect(result.hasDataQualityIssue).toBe(true);
    });
  });

  describe('hasFever', () => {
    it('should return true for temperature ≥ 99.6', () => {
      const patient1: Patient = {
        patient_id: 'TEST001',
        name: 'Test',
        age: 30,
        gender: 'M',
        blood_pressure: '120/80',
        temperature: 99.6,
        visit_date: '2024-01-15',
        diagnosis: 'Test',
        medications: 'Test',
      };

      const patient2: Patient = {
        ...patient1,
        temperature: 101,
      };

      expect(service.hasFever(patient1)).toBe(true);
      expect(service.hasFever(patient2)).toBe(true);
    });

    it('should return false for temperature < 99.6', () => {
      const patient: Patient = {
        patient_id: 'TEST001',
        name: 'Test',
        age: 30,
        gender: 'M',
        blood_pressure: '120/80',
        temperature: 99.5,
        visit_date: '2024-01-15',
        diagnosis: 'Test',
        medications: 'Test',
      };

      expect(service.hasFever(patient)).toBe(false);
    });
  });
});
