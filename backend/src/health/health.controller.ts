import { Controller, Get } from '@nestjs/common';

interface HealthResponse {
  status: string;
  service: string;
  timestamp: string;
}

/**
 * Health check endpoint for the Paya backend.
 *
 * Returns a lightweight "is it up" signal for local dev,
 * Docker Compose, and e2e test readiness checks.
 */
@Controller('health')
export class HealthController {
  @Get()
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: 'payment_service',
      timestamp: new Date().toISOString(),
    };
  }
}
