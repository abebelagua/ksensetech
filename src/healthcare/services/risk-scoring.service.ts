import { Injectable } from '@nestjs/common';
import { Patient } from '../dto/patient.dto';
import { RiskScore } from '../dto/risk-score.dto';

@Injectable()
export class RiskScoringService {
  /**
   * Calculate blood pressure risk score
   * Normal (<120/<80): 0 point
   * Elevated (120-129/<80): 1 point
   * Stage 1 (130-139 OR 80-89): 2 points
   * Stage 2 (≥140 OR ≥90): 3 points
   * Invalid/Missing: 0 points
   */
  calculateBPScore(bloodPressure: string | null | undefined): { score: number; isValid: boolean } {
    if (!bloodPressure || typeof bloodPressure !== 'string') {
      return { score: 0, isValid: false };
    }

    const trimmed = bloodPressure.trim();
    if (!trimmed || trimmed === 'N/A' || trimmed === 'INVALID') {
      return { score: 0, isValid: false };
    }

    // Parse "systolic/diastolic" format
    const parts = trimmed.split('/');
    if (parts.length !== 2) {
      return { score: 0, isValid: false };
    }

    const systolicStr = parts[0].trim();
    const diastolicStr = parts[1].trim();

    // Check for missing values (e.g., "150/" or "/90")
    if (!systolicStr || !diastolicStr) {
      return { score: 0, isValid: false };
    }

    const systolic = parseFloat(systolicStr);
    const diastolic = parseFloat(diastolicStr);

    // Check if parsing was successful
    if (isNaN(systolic) || isNaN(diastolic)) {
      return { score: 0, isValid: false };
    }

    // Determine risk stage - use the higher risk if they fall into different categories
    // Check Stage 2 first (highest risk): Systolic ≥140 OR Diastolic ≥90
    if (systolic >= 140 || diastolic >= 90) {
      return { score: 3, isValid: true };
    }

    // Check Stage 1: Systolic 130‑139 OR Diastolic 80‑89
    if ((systolic >= 130 && systolic <= 139) || (diastolic >= 80 && diastolic <= 89)) {
      return { score: 2, isValid: true };
    }

    // Check Elevated: Systolic 120‑129 AND Diastolic <80
    if (systolic >= 120 && systolic <= 129 && diastolic < 80) {
      return { score: 1, isValid: true };
    }

    // Normal: Systolic <120 AND Diastolic <80
    return { score: 0, isValid: true };
  }

  /**
   * Calculate temperature risk score
   * Normal (≤99.5°F): 0 points
   * Low Fever (99.6-100.9°F): 1 point
   * High Fever (≥101°F): 2 points
   * Invalid/Missing: 0 points
   */
  calculateTempScore(temperature: number | string | null | undefined): {
    score: number;
    isValid: boolean;
    hasFever: boolean;
  } {
    if (temperature === null || temperature === undefined || temperature === '') {
      return { score: 0, isValid: false, hasFever: false };
    }

    // Check for string invalid values
    if (typeof temperature === 'string') {
      const trimmed = temperature.trim().toUpperCase();
      if (trimmed === 'N/A' || trimmed === 'INVALID' || trimmed === 'TEMP_ERROR' || trimmed === '') {
        return { score: 0, isValid: false, hasFever: false };
      }
    }

    const temp = typeof temperature === 'string' ? parseFloat(temperature) : temperature;

    if (isNaN(temp) || typeof temp !== 'number') {
      return { score: 0, isValid: false, hasFever: false };
    }

    if (temp >= 101) {
      return { score: 2, isValid: true, hasFever: true };
    }
    if (temp >= 99.6 && temp <= 100.9) {
      return { score: 1, isValid: true, hasFever: true };
    }
    return { score: 0, isValid: true, hasFever: false };
  }

  /**
   * Calculate age risk score
   * Under 40 (<40): 0 points
   * 40-65 (inclusive): 1 point
   * Over 65 (>65): 2 points
   * Invalid/Missing: 0 points
   */
  calculateAgeScore(age: number | string | null | undefined): { score: number; isValid: boolean } {
    if (age === null || age === undefined || age === '') {
      return { score: 0, isValid: false };
    }

    // Check for string invalid values
    if (typeof age === 'string') {
      const trimmed = age.trim().toLowerCase();
      if (trimmed === 'n/a' || trimmed === 'unknown' || trimmed === 'invalid' || trimmed === '') {
        return { score: 0, isValid: false };
      }
    }

    const ageNum = typeof age === 'string' ? parseFloat(age) : age;

    if (isNaN(ageNum) || typeof ageNum !== 'number' || ageNum < 0) {
      return { score: 0, isValid: false };
    }

    if (ageNum > 65) {
      return { score: 2, isValid: true };
    }
    if (ageNum >= 40) {
      return { score: 1, isValid: true };
    }
    return { score: 0, isValid: true };
  }

  /**
   * Calculate total risk score for a patient
   */
  calculateRiskScore(patient: Patient): RiskScore {
    const bpResult = this.calculateBPScore(patient.blood_pressure);
    const tempResult = this.calculateTempScore(patient.temperature);
    const ageResult = this.calculateAgeScore(patient.age);

    const hasDataQualityIssue = !bpResult.isValid || !tempResult.isValid || !ageResult.isValid;

    const totalScore = bpResult.score + tempResult.score + ageResult.score;

    return {
      patient_id: patient.patient_id,
      bpScore: bpResult.score,
      tempScore: tempResult.score,
      ageScore: ageResult.score,
      totalScore,
      hasFever: tempResult.hasFever,
      hasDataQualityIssue,
    };
  }

  /**
   * Check if patient has fever (temperature ≥ 99.6°F)
   */
  hasFever(patient: Patient): boolean {
    const tempResult = this.calculateTempScore(patient.temperature);
    return tempResult.hasFever;
  }
}
