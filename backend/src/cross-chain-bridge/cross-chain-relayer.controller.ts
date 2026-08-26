import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { CrossChainRelayerService } from './cross-chain-relayer.service';
import { RelayRequestDto } from './dto/cross-chain.dto';

@Controller('cross-chain-bridge/relayer')
export class CrossChainRelayerController {
  constructor(private readonly relayerService: CrossChainRelayerService) {}

  @Post('start-monitoring')
  @HttpCode(HttpStatus.OK)
  async startMonitoring() {
    await this.relayerService.monitorSwapInitiations();
    return { message: 'Swap monitoring started' };
  }

  @Post('stop-monitoring')
  @HttpCode(HttpStatus.OK)
  async stopMonitoring() {
    this.relayerService.stopMonitoring();
    return { message: 'Swap monitoring stopped' };
  }

  @Post('relay-completion')
  async relaySwapCompletion(@Body() dto: RelayRequestDto) {
    if (dto.transactionType !== 'complete') {
      throw new Error('Invalid transaction type for completion');
    }
    return this.relayerService.relaySwapCompletion(
      dto.swapId,
      dto.secret || '',
      dto.targetChain,
    );
  }

  @Post('relay-refund')
  async relaySwapRefund(@Body() dto: RelayRequestDto) {
    if (dto.transactionType !== 'refund') {
      throw new Error('Invalid transaction type for refund');
    }
    return this.relayerService.relaySwapRefund(dto.swapId, dto.targetChain);
  }

  @Post('verify-signature')
  async verifySignature(
    @Body() body: { message: string; signature: string; chain: string },
  ) {
    return this.relayerService.verifySignature(
      body.message,
      body.signature,
      body.chain as any,
    );
  }

  @Post('handle-failed-relay/:swapId')
  async handleFailedRelay(
    @Param('swapId') swapId: string,
    @Body() body: { targetChain: string; maxRetries?: number },
  ) {
    await this.relayerService.handleFailedRelay(
      swapId,
      body.targetChain as any,
      body.maxRetries,
    );
    return { message: 'Failed relay handling initiated' };
  }

  @Get('monitoring-status')
  async getMonitoringStatus() {
    return this.relayerService.getMonitoringStatus();
  }
}