import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { HealthcareApiService } from './healthcare-api.service';
import { Patient, PatientsResponse } from '../dto/patient.dto';

describe('HealthcareApiService', () => {
  let service: HealthcareApiService;
  let httpService: jest.Mocked<HttpService>;
  let configService: jest.Mocked<ConfigService>;

  // Mock Logger to suppress error logs during tests
  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

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

  const createMockResponse = (patients: Patient[], page: number, totalPages: number): PatientsResponse => ({
    data: patients,
    pagination: {
      page,
      limit: 20,
      total: patients.length * totalPages,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
    metadata: {
      timestamp: new Date().toISOString(),
      version: 'v1.0',
      requestId: `req-${page}`,
    },
  });

  beforeEach(async () => {
    const mockHttpService = {
      get: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, any> = {
          'api.baseUrl': 'https://test-api.com/api',
          'api.key': 'test-api-key',
          'retry.maxRetries': 5,
          'retry.retryDelay': 1000,
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthcareApiService,
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

    service = module.get<HealthcareApiService>(HealthcareApiService);
    httpService = module.get(HttpService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('fetchAllPatients', () => {
    it('should fetch all patients from single page', async () => {
      const mockResponse = createMockResponse([mockPatient], 1, 1);
      httpService.get.mockReturnValue(of({ data: mockResponse } as any));

      const result = await service.fetchAllPatients();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockPatient);
      expect(httpService.get).toHaveBeenCalledTimes(1);
    });

    it('should fetch all patients from multiple pages', async () => {
      const patients1 = [mockPatient, { ...mockPatient, patient_id: 'DEMO002' }];
      const patients2 = [{ ...mockPatient, patient_id: 'DEMO003' }];

      httpService.get
        .mockReturnValueOnce(of({ data: createMockResponse(patients1, 1, 2) } as any))
        .mockReturnValueOnce(of({ data: createMockResponse(patients2, 2, 2) } as any));

      const result = await service.fetchAllPatients();

      expect(result).toHaveLength(3);
      expect(httpService.get).toHaveBeenCalledTimes(2);
    });

    it('should handle retry on 429 error', async () => {
      const mockResponse = createMockResponse([mockPatient], 1, 1);
      
      // First call fails with 429, second succeeds
      httpService.get
        .mockReturnValueOnce(
          throwError(() => ({
            response: { status: 429 },
            message: 'Rate limit exceeded',
          })),
        )
        .mockReturnValueOnce(of({ data: mockResponse } as any));

      jest.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
        fn();
        return null as any;
      });

      const result = await service.fetchAllPatients();

      expect(result).toHaveLength(1);
      expect(httpService.get).toHaveBeenCalledTimes(2);
    });

    it('should handle retry on 500 error', async () => {
      const mockResponse = createMockResponse([mockPatient], 1, 1);
      
      httpService.get
        .mockReturnValueOnce(
          throwError(() => ({
            response: { status: 500 },
            message: 'Internal server error',
          })),
        )
        .mockReturnValueOnce(of({ data: mockResponse } as any));

      jest.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
        fn();
        return null as any;
      });

      const result = await service.fetchAllPatients();

      expect(result).toHaveLength(1);
      expect(httpService.get).toHaveBeenCalledTimes(2);
    });

    it('should handle retry on 502 error', async () => {
      const mockResponse = createMockResponse([mockPatient], 1, 1);
      
      httpService.get
        .mockReturnValueOnce(
          throwError(() => ({
            response: { status: 502 },
            message: 'Bad Gateway',
          })),
        )
        .mockReturnValueOnce(of({ data: mockResponse } as any));

      jest.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
        fn();
        return null as any;
      });

      const result = await service.fetchAllPatients();

      expect(result).toHaveLength(1);
      expect(httpService.get).toHaveBeenCalledTimes(2);
    });

    it('should handle retry on 503 error', async () => {
      const mockResponse = createMockResponse([mockPatient], 1, 1);
      
      httpService.get
        .mockReturnValueOnce(
          throwError(() => ({
            response: { status: 503 },
            message: 'Service unavailable',
          })),
        )
        .mockReturnValueOnce(of({ data: mockResponse } as any));

      jest.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
        fn();
        return null as any;
      });

      const result = await service.fetchAllPatients();

      expect(result).toHaveLength(1);
      expect(httpService.get).toHaveBeenCalledTimes(2);
    });

    it('should handle retry on 504 error', async () => {
      const mockResponse = createMockResponse([mockPatient], 1, 1);
      
      httpService.get
        .mockReturnValueOnce(
          throwError(() => ({
            response: { status: 504 },
            message: 'Gateway Timeout',
          })),
        )
        .mockReturnValueOnce(of({ data: mockResponse } as any));

      jest.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
        fn();
        return null as any;
      });

      const result = await service.fetchAllPatients();

      expect(result).toHaveLength(1);
      expect(httpService.get).toHaveBeenCalledTimes(2);
    });

    it('should throw error after max retries', async () => {
      const error = {
        response: { status: 500 },
        message: 'Internal server error',
      };

      httpService.get.mockReturnValue(throwError(() => error));

      jest.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
        fn();
        return null as any;
      });

      await expect(service.fetchAllPatients()).rejects.toEqual(error);
      expect(httpService.get).toHaveBeenCalledTimes(6); // 1 initial + 5 retries
    });

    it('should throw error for non-retryable errors', async () => {
      const error = {
        response: { status: 404 },
        message: 'Not found',
      };

      httpService.get.mockReturnValue(throwError(() => error));

      await expect(service.fetchAllPatients()).rejects.toEqual(error);
      expect(httpService.get).toHaveBeenCalledTimes(1);
    });

    it('should use correct API key and URL', async () => {
      const mockResponse = createMockResponse([mockPatient], 1, 1);
      httpService.get.mockReturnValue(of({ data: mockResponse } as any));

      await service.fetchAllPatients();

      expect(httpService.get).toHaveBeenCalledWith(
        expect.stringContaining('/patients'),
        expect.objectContaining({
          params: { page: 1, limit: 20 },
          headers: expect.objectContaining({
            'x-api-key': expect.any(String),
          }),
        }),
      );
    });
  });
});

