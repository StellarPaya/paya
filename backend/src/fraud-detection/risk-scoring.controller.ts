import { Controller, Post, Get, Put, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { RiskScoringService } from './risk-scoring.service';
import { CalculateRiskScoreDto, UpdateThresholdsDto, DateRange } from './dto/risk-score.dto';

@Controller('fraud-detection/risk-scoring')
export class RiskScoringController {
  constructor(private readonly riskScoringService: RiskScoringService) {}

  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  async calculateRiskScore(@Body() dto: CalculateRiskScoreDto) {
    return this.riskScoringService.calculateRiskScore(dto);
  }

  @Get('factors/:paymentId')
  async getRiskFactors(@Param('paymentId') paymentId: string) {
    return this.riskScoringService.getRiskFactors(paymentId);
  }

  @Put('thresholds/:merchantId')
  async updateThresholds(@Param('merchantId') merchantId: string, @Body() dto: UpdateThresholdsDto) {
    await this.riskScoringService.updateThresholds(merchantId, dto);
    return { message: 'Thresholds updated successfully' };
  }

  @Get('statistics')
  async getFraudStatistics(@Query() period: DateRange) {
    return this.riskScoringService.getFraudStatistics(period);
  }
}