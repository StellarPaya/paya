import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversion, ConversionStatus } from '../entities/conversion.entity';

interface MonitoringMetrics {
  totalConversions: number;
  successfulConversions: number;
  failedConversions: number;
  pendingConversions: number;
  averageSlippage: number;
  totalVolume: number;
  averageExecutionTime: number;
  dexUsage: Record<string, number>;
  bridgeUsage: Record<string, number>;
}

interface Alert {
  type: 'SLIPPAGE' | 'FAILURE' | 'DELAY' | 'LIQUIDITY' | 'VOLATILITY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  timestamp: Date;
  conversionId?: string;
}

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private alerts: Alert[] = [];
  private metricsCache: MonitoringMetrics | null = null;
  private lastMetricsUpdate: Date | null = null;

  constructor(
    @InjectRepository(Conversion)
    private conversionRepository: Repository<Conversion>,
  ) {}

  async getMetrics(): Promise<MonitoringMetrics> {
    const now = new Date();
    const cacheAge = this.lastMetricsUpdate ? now.getTime() - this.lastMetricsUpdate.getTime() : Infinity;

    // Cache metrics for 30 seconds
    if (this.metricsCache && cacheAge < 30000) {
      return this.metricsCache;
    }

    const conversions = await this.conversionRepository.find();

    const metrics: MonitoringMetrics = {
      totalConversions: conversions.length,
      successfulConversions: conversions.filter((c) => c.status === ConversionStatus.COMPLETED).length,
      failedConversions: conversions.filter((c) => c.status === ConversionStatus.FAILED).length,
      pendingConversions: conversions.filter((c) => 
        [ConversionStatus.PENDING, ConversionStatus.PRICE_DISCOVERY, ConversionStatus.EXECUTING, 
         ConversionStatus.BRIDGING, ConversionStatus.SETTLING].includes(c.status)
      ).length,
      averageSlippage: this.calculateAverageSlippage(conversions),
      totalVolume: this.calculateTotalVolume(conversions),
      averageExecutionTime: this.calculateAverageExecutionTime(conversions),
      dexUsage: this.calculateDexUsage(conversions),
      bridgeUsage: this.calculateBridgeUsage(conversions),
    };

    this.metricsCache = metrics;
    this.lastMetricsUpdate = now;

    return metrics;
  }

  async monitorConversions(): Promise<void> {
    this.logger.log('Running conversion monitoring');

    const pendingConversions = await this.conversionRepository.find({
      where: [
        { status: ConversionStatus.EXECUTING },
        { status: ConversionStatus.BRIDGING },
        { status: ConversionStatus.SETTLING },
      ],
    });

    for (const conversion of pendingConversions) {
      const age = Date.now() - conversion.updatedAt.getTime();
      const maxAge = 300000; // 5 minutes

      if (age > maxAge) {
        this.createAlert({
          type: 'DELAY',
          severity: 'MEDIUM',
          message: `Conversion ${conversion.id} has been in ${conversion.status} for ${Math.floor(age / 1000)}s`,
          timestamp: new Date(),
          conversionId: conversion.id,
        });
      }
    }

    // Check for high slippage
    const recentConversions = await this.conversionRepository.find({
      where: { status: ConversionStatus.COMPLETED },
      order: { completedAt: 'DESC' },
      take: 100,
    });

    for (const conversion of recentConversions) {
      if (conversion.actualSlippage > conversion.slippageTolerance * 1.5) {
        this.createAlert({
          type: 'SLIPPAGE',
          severity: 'HIGH',
          message: `Conversion ${conversion.id} experienced high slippage: ${conversion.actualSlippage.toFixed(2)}%`,
          timestamp: new Date(),
          conversionId: conversion.id,
        });
      }
    }

    // Check for failed conversions
    const failedConversions = await this.conversionRepository.find({
      where: { status: ConversionStatus.FAILED },
      order: { updatedAt: 'DESC' },
      take: 50,
    });

    for (const conversion of failedConversions) {
      this.createAlert({
        type: 'FAILURE',
        severity: 'HIGH',
        message: `Conversion ${conversion.id} failed: ${conversion.errorDetails?.message || 'Unknown error'}`,
        timestamp: new Date(),
        conversionId: conversion.id,
      });
    }
  }

  async getAlerts(severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): Promise<Alert[]> {
    if (severity) {
      return this.alerts.filter((a) => a.severity === severity);
    }
    return this.alerts;
  }

  async clearAlerts(olderThan: Date): Promise<number> {
    const before = this.alerts.length;
    this.alerts = this.alerts.filter((a) => a.timestamp > olderThan);
    return before - this.alerts.length;
  }

  async getConversionStats(conversionId: string): Promise<any> {
    const conversion = await this.conversionRepository.findOne({ where: { id: conversionId } });
    if (!conversion) {
      throw new Error('Conversion not found');
    }

    return {
      id: conversion.id,
      status: conversion.status,
      createdAt: conversion.createdAt,
      updatedAt: conversion.updatedAt,
      completedAt: conversion.completedAt,
      executionTime: conversion.completedAt 
        ? conversion.completedAt.getTime() - conversion.createdAt.getTime() 
        : Date.now() - conversion.createdAt.getTime(),
      slippage: conversion.actualSlippage,
      expectedSlippage: conversion.slippageTolerance,
      fees: conversion.feeAmount,
      gas: conversion.gasAmount,
      retryCount: conversion.retryCount,
    };
  }

  async getMerchantStats(merchantId: string): Promise<any> {
    const conversions = await this.conversionRepository.find({ where: { merchantId } });

    return {
      totalConversions: conversions.length,
      successfulConversions: conversions.filter((c) => c.status === ConversionStatus.COMPLETED).length,
      failedConversions: conversions.filter((c) => c.status === ConversionStatus.FAILED).length,
      totalVolume: conversions.reduce((sum, c) => sum + c.sourceAmount, 0),
      averageSlippage: this.calculateAverageSlippage(conversions),
      mostUsedDex: this.getMostUsed(conversions.map((c) => c.dexType).filter(Boolean)),
      mostUsedBridge: this.getMostUsed(conversions.map((c) => c.bridgeType).filter(Boolean)),
    };
  }

  private calculateAverageSlippage(conversions: Conversion[]): number {
    const completedConversions = conversions.filter((c) => c.status === ConversionStatus.COMPLETED);
    if (completedConversions.length === 0) return 0;
    const totalSlippage = completedConversions.reduce((sum, c) => sum + c.actualSlippage, 0);
    return totalSlippage / completedConversions.length;
  }

  private calculateTotalVolume(conversions: Conversion[]): number {
    return conversions.reduce((sum, c) => sum + c.sourceAmount, 0);
  }

  private calculateAverageExecutionTime(conversions: Conversion[]): number {
    const completedConversions = conversions.filter((c) => c.status === ConversionStatus.COMPLETED && c.completedAt);
    if (completedConversions.length === 0) return 0;
    const totalTime = completedConversions.reduce(
      (sum, c) => sum + (c.completedAt!.getTime() - c.createdAt.getTime()),
      0,
    );
    return totalTime / completedConversions.length;
  }

  private calculateDexUsage(conversions: Conversion[]): Record<string, number> {
    const usage: Record<string, number> = {};
    conversions.forEach((c) => {
      if (c.dexType) {
        usage[c.dexType] = (usage[c.dexType] || 0) + 1;
      }
    });
    return usage;
  }

  private calculateBridgeUsage(conversions: Conversion[]): Record<string, number> {
    const usage: Record<string, number> = {};
    conversions.forEach((c) => {
      if (c.bridgeType) {
        usage[c.bridgeType] = (usage[c.bridgeType] || 0) + 1;
      }
    });
    return usage;
  }

  private getMostUsed(items: string[]): string | null {
    if (items.length === 0) return null;
    const counts: Record<string, number> = {};
    items.forEach((item) => {
      counts[item] = (counts[item] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  }

  private createAlert(alert: Alert): void {
    this.alerts.push(alert);
    this.logger.warn(`Alert created: ${alert.type} - ${alert.message}`);

    // In production, this would send notifications via email, Slack, etc.
    if (alert.severity === 'CRITICAL' || alert.severity === 'HIGH') {
      this.sendCriticalAlert(alert);
    }
  }

  private sendCriticalAlert(alert: Alert): void {
    // In production, this would integrate with notification services
    this.logger.error(`CRITICAL ALERT: ${alert.message}`);
  }

  async getHealthStatus(): Promise<{ status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY'; details: any }> {
    const metrics = await this.getMetrics();
    const recentAlerts = await this.getAlerts('HIGH');

    const failureRate = metrics.totalConversions > 0 
      ? metrics.failedConversions / metrics.totalConversions 
      : 0;

    if (failureRate > 0.1 || recentAlerts.length > 10) {
      return {
        status: 'UNHEALTHY',
        details: {
          failureRate,
          recentAlerts: recentAlerts.length,
          metrics,
        },
      };
    }

    if (failureRate > 0.05 || recentAlerts.length > 5) {
      return {
        status: 'DEGRADED',
        details: {
          failureRate,
          recentAlerts: recentAlerts.length,
          metrics,
        },
      };
    }

    return {
      status: 'HEALTHY',
      details: { metrics },
    };
  }
}
