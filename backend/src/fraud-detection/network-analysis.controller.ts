import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { NetworkAnalysisService } from './network-analysis.service';
import { TimeRangeDto, CalculateSimilarityDto } from './dto/network-analysis.dto';

@Controller('fraud-detection/network-analysis')
export class NetworkAnalysisController {
  constructor(private readonly networkAnalysisService: NetworkAnalysisService) {}

  @Post('build-graph')
  async buildTransactionGraph(@Body() timeWindow: TimeRangeDto) {
    return this.networkAnalysisService.buildTransactionGraph(timeWindow);
  }

  @Post('detect-fraud-rings')
  async detectFraudRings(@Body() graph: any) {
    return this.networkAnalysisService.detectFraudRings(graph);
  }

  @Get('similarity')
  async calculateSimilarity(@Query() dto: CalculateSimilarityDto) {
    return this.networkAnalysisService.calculateSimilarity(dto.entity1, dto.entity2);
  }

  @Post('detect-money-laundering')
  async detectMoneyLaundering(@Body() graph: any) {
    return this.networkAnalysisService.detectMoneyLaundering(graph);
  }
}