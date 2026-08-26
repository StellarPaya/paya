import { Controller, Get, Post, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { UnifiedSettlementService } from './unified-settlement.service';

@Controller('cross-chain-bridge/settlement')
export class UnifiedSettlementController {
  constructor(private readonly settlementService: UnifiedSettlementService) {}

  @Post('aggregate')
  async aggregatePayments(@Body() body: { startDate: Date; endDate: Date }) {
    return this.settlementService.aggregatePayments(body);
  }

  @Post('netting/:batchId')
  async applyNetting(@Param('batchId') batchId: string) {
    return this.settlementService.applyNetting(batchId);
  }

  @Post('submit-approval/:batchId')
  async submitSettlementForApproval(@Param('batchId') batchId: string) {
    return this.settlementService.submitSettlementForApproval(batchId);
  }

  @Post('approve/:batchId')
  async approveSettlement(
    @Param('batchId') batchId: string,
    @Body() body: { approver: string },
  ) {
    return this.settlementService.approveSettlement(batchId, body.approver);
  }

  @Get('batch/:batchId')
  async getSettlementBatch(@Param('batchId') batchId: string) {
    return this.settlementService.getSettlementBatch(batchId);
  }

  @Get('batches')
  async getAllSettlementBatches() {
    return this.settlementService.getAllSettlementBatches();
  }

  @Post('dispute/:batchId')
  async handleDispute(
    @Param('batchId') batchId: string,
    @Body() body: { disputeReason: string; disputer: string },
  ) {
    await this.settlementService.handleDispute(batchId, body.disputeReason, body.disputer);
    return { message: 'Dispute recorded successfully' };
  }

  @Get('statistics')
  async getSettlementStatistics(@Query() query: { startDate: Date; endDate: Date }) {
    return this.settlementService.getSettlementStatistics(query);
  }

  @Get('audit-trail/:batchId')
  async createAuditTrail(@Param('batchId') batchId: string) {
    return this.settlementService.createAuditTrail(batchId);
  }

  @Get('compliance/:batchId')
  async checkRegulatoryCompliance(@Param('batchId') batchId: string) {
    return this.settlementService.checkRegulatoryCompliance(batchId);
  }
}