import { Controller, Get, Post, Body, Param, Delete, UseGuards } from '@nestjs/common';
import { ConversionService } from './modules/conversion.service';
import { MonitoringService } from './modules/monitoring.service';
import { CreateConversionDto } from './dto/create-conversion.dto';
import { ConversionResponseDto } from './dto/conversion-response.dto';
import { PriceQuoteDto, PriceQuoteResponseDto } from './dto/price-quote.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('conversion-engine')
@UseGuards(JwtAuthGuard)
export class ConversionEngineController {
  constructor(
    private conversionService: ConversionService,
    private monitoringService: MonitoringService,
  ) {}

  @Post('conversions')
  async createConversion(@Body() dto: CreateConversionDto): Promise<ConversionResponseDto> {
    return this.conversionService.createConversion(dto);
  }

  @Post('conversions/:id/execute')
  async executeConversion(@Param('id') id: string): Promise<ConversionResponseDto> {
    return this.conversionService.executeConversion(id);
  }

  @Get('conversions/:id')
  async getConversion(@Param('id') id: string): Promise<ConversionResponseDto> {
    return this.conversionService.getConversion(id);
  }

  @Get('conversions/merchant/:merchantId')
  async getConversionsByMerchant(@Param('merchantId') merchantId: string): Promise<ConversionResponseDto[]> {
    return this.conversionService.getConversionsByMerchant(merchantId);
  }

  @Delete('conversions/:id')
  async cancelConversion(@Param('id') id: string): Promise<ConversionResponseDto> {
    return this.conversionService.cancelConversion(id);
  }

  @Post('conversions/:id/retry')
  async retryConversion(@Param('id') id: string): Promise<ConversionResponseDto> {
    return this.conversionService.retryConversion(id);
  }

  @Post('price-quote')
  async getPriceQuote(@Body() dto: PriceQuoteDto): Promise<PriceQuoteResponseDto> {
    // This would call the price discovery service
    return {} as PriceQuoteResponseDto;
  }

  @Get('metrics')
  async getMetrics() {
    return this.monitoringService.getMetrics();
  }

  @Get('alerts')
  async getAlerts() {
    return this.monitoringService.getAlerts();
  }

  @Get('health')
  async getHealth() {
    return this.monitoringService.getHealthStatus();
  }

  @Get('stats/conversion/:id')
  async getConversionStats(@Param('id') id: string) {
    return this.monitoringService.getConversionStats(id);
  }

  @Get('stats/merchant/:merchantId')
  async getMerchantStats(@Param('merchantId') merchantId: string) {
    return this.monitoringService.getMerchantStats(merchantId);
  }
}
