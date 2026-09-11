import {
  Controller,
  Get,
  HttpStatus,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { HealthService } from './health.service';

@Controller()
export class RootController {
  @Get()
  info() {
    return {
      name: 'Vitarantracker API',
      status: 'ok',
      health: '/api/health',
      login: '/api/auth/login',
    };
  }
}

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async check(@Res() res: Response) {
    const result = await this.healthService.check();
    return res
      .status(result.healthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)
      .json(result.body);
  }
}
