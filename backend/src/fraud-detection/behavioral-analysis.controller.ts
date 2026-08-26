import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { BehavioralAnalysisService } from './behavioral-analysis.service';
import { TrackBehaviorDto, BehaviorEventDto } from './dto/behavioral-analysis.dto';

@Controller('fraud-detection/behavioral-analysis')
export class BehavioralAnalysisController {
  constructor(private readonly behavioralAnalysisService: BehavioralAnalysisService) {}

  @Post('track')
  async trackBehavior(@Body() dto: TrackBehaviorDto) {
    await this.behavioralAnalysisService.trackBehavior(dto.userId, dto.behaviorEvent);
    return { message: 'Behavior tracked successfully' };
  }

  @Get('profile/:userId')
  async buildProfile(@Param('userId') userId: string) {
    return this.behavioralAnalysisService.buildProfile(userId);
  }

  @Post('detect-anomalies/:userId')
  async detectAnomalies(@Param('userId') userId: string, @Body() behaviorEvent: BehaviorEventDto) {
    return this.behavioralAnalysisService.detectAnomalies(userId, behaviorEvent);
  }

  @Post('compare-baseline/:userId')
  async compareWithBaseline(@Param('userId') userId: string, @Body() behaviorEvent: BehaviorEventDto) {
    return this.behavioralAnalysisService.compareWithBaseline(userId, behaviorEvent);
  }
}