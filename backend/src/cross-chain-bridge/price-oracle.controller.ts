import { Controller, Get, Post, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { PriceOracleService } from './price-oracle.service';
import { GetPriceDto, GetTWAPDto, CheckPriceDeviationDto, GetHistoricalPricesDto } from './dto/price-oracle.dto';

@Controller('cross-chain-bridge/price-oracle')
export class PriceOracleController {
  constructor(private readonly priceOracleService: PriceOracleService) {}

  @Get('price')
  async getPrice(@Query() dto: GetPriceDto) {
    return this.priceOracleService.getPrice(dto.baseAsset, dto.quoteAsset, dto.chain);
  }

  @Get('twap')
  async getTWAP(@Query() dto: GetTWAPDto) {
    return this.priceOracleService.getTWAP(dto.baseAsset, dto.quoteAsset, dto.period);
  }

  @Get('check-deviation')
  async checkPriceDeviation(@Query() dto: CheckPriceDeviationDto) {
    const isDeviated = await this.priceOracleService.checkPriceDeviation(dto.asset, dto.threshold);
    return { isDeviated };
  }

  @Post('update-feeds')
  @HttpCode(HttpStatus.OK)
  async updatePriceFeeds() {
    await this.priceOracleService.updatePriceFeeds();
    return { message: 'Price feeds updated successfully' };
  }

  @Get('historical')
  async getHistoricalPrices(@Query() dto: GetHistoricalPricesDto) {
    return this.priceOracleService.getHistoricalPrices(dto.asset, dto.from, dto.to);
  }

  @Get('oracle-status')
  async getOracleSourcesStatus() {
    return this.priceOracleService.getOracleSourcesStatus();
  }

  @Post('toggle-oracle')
  @HttpCode(HttpStatus.OK)
  async toggleOracleSource(@Body() body: { sourceName: string; enabled: boolean }) {
    this.priceOracleService.setOracleSourceEnabled(body.sourceName, body.enabled);
    return { message: `Oracle source ${body.sourceName} ${body.enabled ? 'enabled' : 'disabled'}` };
  }
}