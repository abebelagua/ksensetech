import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Patient, PatientsResponse } from '../dto/patient.dto';

@Injectable()
export class HealthcareApiService {
  private readonly logger = new Logger(HealthcareApiService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly maxRetries: number;
  private readonly retryDelay: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('api.baseUrl');
    this.apiKey = this.configService.get<string>('api.key');
    this.maxRetries = this.configService.get<number>('retry.maxRetries');
    this.retryDelay = this.configService.get<number>('retry.retryDelay');
  }

  /**
   * Fetch patients from a specific page with retry logic
   */
  private async fetchPatientsPage(page: number, limit: number = 5, retryCount: number = 0): Promise<PatientsResponse> {
    try {
      const url = `${this.baseUrl}/patients`;
      const response = await firstValueFrom(
        this.httpService.get<PatientsResponse>(url, {
          params: { page, limit },
          headers: {
            'x-api-key': this.apiKey,
          },
        }),
      );

      return response.data;
    } catch (error: any) {
      const status = error.response?.status;
      // Retry on rate limiting (429), server errors (500, 502, 503, 504)
      const isRetryable = status === 429 || status === 500 || status === 502 || status === 503 || status === 504;

      if (isRetryable && retryCount < this.maxRetries) {
        // Exponential backoff with jitter
        const delay = this.retryDelay * Math.pow(2, retryCount) + Math.random() * 1000;
        this.logger.warn(
          `Request failed with status ${status}, retrying in ${Math.round(delay)}ms (attempt ${retryCount + 1}/${this.maxRetries})`,
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.fetchPatientsPage(page, limit, retryCount + 1);
      }

      this.logger.error(`Failed to fetch patients page ${page} after ${retryCount} retries: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetch all patients by paginating through all pages
   */
  async fetchAllPatients(): Promise<Patient[]> {
    const allPatients: Patient[] = [];
    let currentPage = 1;
    let hasNext = true;

    this.logger.log('Starting to fetch all patients...');

    while (hasNext) {
      try {
        const response = await this.fetchPatientsPage(currentPage, 20); // Use max limit to reduce requests
        allPatients.push(...response.data);

        hasNext = response.pagination.hasNext;
        currentPage++;

        this.logger.log(
          `Fetched page ${currentPage - 1}/${response.pagination.totalPages} (${allPatients.length} patients so far)`,
        );

        // Small delay to avoid rate limiting
        if (hasNext) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      } catch (error) {
        this.logger.error(`Error fetching page ${currentPage}: ${error}`);
        throw error;
      }
    }

    this.logger.log(`Finished fetching all patients. Total: ${allPatients.length}`);
    return allPatients;
  }
}
