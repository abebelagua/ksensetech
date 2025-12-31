# Healthcare API Assessment

A NestJS application that integrates with the DemoMed Healthcare API to fetch patient data, calculate risk scores, and submit assessment results.

## Features

- Fetches patient data from external API with pagination support
- Implements retry logic for handling intermittent failures (500/503 errors)
- Handles rate limiting (429 errors)
- Calculates patient risk scores based on:
  - Blood Pressure (BP)
  - Temperature
  - Age
- Generates alert lists:
  - High-risk patients (total risk score ≥ 4)
  - Fever patients (temperature ≥ 99.6°F)
  - Data quality issues (invalid/missing data)
- Submits assessment results to the API

## Installation

```bash
npm install
```

## Configuration

The application uses `@nestjs/config` for environment variable management. Create a `.env` file in the root directory:

```env
API_KEY=ak_161dca1691557227a6dfedef3f27e18ff7d907644b9e3620
API_BASE_URL=https://assessment.ksensetech.com/api
MAX_RETRIES=5
RETRY_DELAY=1000
```

### Environment Variables

- `API_KEY` (required): API key for authentication with the external healthcare API
- `API_BASE_URL` (optional): Base URL for the external API. Defaults to `https://assessment.ksensetech.com/api`
- `MAX_RETRIES` (optional): Maximum number of retry attempts for failed requests. Defaults to `5`
- `RETRY_DELAY` (optional): Base delay in milliseconds for retry attempts. Defaults to `1000`

**Note:** If environment variables are not set, the application will use default values defined in `src/config/configuration.ts`.

## Running the application

```bash
# development
npm run start:dev

# production mode
npm run start:prod
```

## Running tests

```bash
# run all tests
npm test

# run tests in watch mode
npm run test:watch

# run tests with coverage
npm run test:cov
```

## Validation

The API uses class-validator for request validation. The `POST /healthcare/submit` endpoint validates:

- `high_risk_patients`: Required array of strings, must not be empty
- `fever_patients`: Required array of strings, must not be empty
- `data_quality_issues`: Required array of strings, must not be empty

All arrays must contain only string values. Invalid requests will return a 400 Bad Request response with validation error details.

## API Endpoints

- `GET /healthcare/patients` - Fetch all patients from external API
- `POST /healthcare/process` - Process patients and calculate risk scores (returns alert lists)
- `POST /healthcare/submit` - Submit assessment results (requires body with alert lists)
- `POST /healthcare/process-and-submit` - Process patients and submit results in one call (recommended)

### Example Usage

#### Process and Submit (Recommended)

```bash
curl -X POST http://localhost:3000/healthcare/process-and-submit
```

#### Step by Step

```bash
# 1. Process patients
curl -X POST http://localhost:3000/healthcare/process

# 2. Submit results (use the response from step 1)
curl -X POST http://localhost:3000/healthcare/submit \
  -H "Content-Type: application/json" \
  -d '{
    "high_risk_patients": ["DEMO002", "DEMO031"],
    "fever_patients": ["DEMO005", "DEMO021"],
    "data_quality_issues": ["DEMO004", "DEMO007"]
  }'
```

## Risk Scoring

### Blood Pressure Risk

- Normal (<120/<80): 0 point
- Elevated (120-129/<80): 1 points
- Stage 1 (130-139 OR 80-89): 2 points
- Stage 2 (≥140 OR ≥90): 3 points

### Temperature Risk

- Normal (≤99.5°F): 0 points
- Low Fever (99.6-100.9°F): 1 point
- High Fever (≥101°F): 2 points

### Age Risk

- Under 40: 0 point
- 40-65: 1 point
- Over 65: 2 points
