import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BehavioralProfileEntity } from './entities/behavioral-profile.entity';

interface BehaviorEvent {
  eventType: string;
  timestamp: Date;
  data: any;
}

interface BehavioralProfile {
  userId: string;
  transactionPatterns: any;
  navigationPatterns: any;
  timePatterns: any;
  devicePatterns: any;
  locationPatterns: any;
}

interface AnomalyScore {
  type: string;
  score: number;
  description: string;
  value: any;
}

interface DeviationScore {
  overallDeviation: number;
  deviations: AnomalyScore[];
}

@Injectable()
export class BehavioralAnalysisService {
  constructor(
    @InjectRepository(BehavioralProfileEntity)
    private behavioralProfileRepository: Repository<BehavioralProfileEntity>,
  ) {}

  async trackBehavior(userId: string, behaviorEvent: BehaviorEvent): Promise<void> {
    let profile = await this.behavioralProfileRepository.findOne({
      where: { user_id: userId },
    });

    if (!profile) {
      profile = this.behavioralProfileRepository.create({
        user_id: userId,
        profile_data: this.initializeProfile(),
        baseline_data: this.initializeBaseline(),
      });
    }

    // Update profile with new behavior
    this.updateProfileWithEvent(profile.profile_data, behaviorEvent);
    
    await this.behavioralProfileRepository.save(profile);
  }

  async buildProfile(userId: string): Promise<BehavioralProfile> {
    const profile = await this.behavioralProfileRepository.findOne({
      where: { user_id: userId },
    });

    if (!profile) {
      throw new Error(`Behavioral profile for user ${userId} not found`);
    }

    return profile.profile_data as BehavioralProfile;
  }

  async detectAnomalies(userId: string, currentBehavior: BehaviorEvent): Promise<AnomalyScore[]> {
    const profile = await this.behavioralProfileRepository.findOne({
      where: { user_id: userId },
    });

    if (!profile) {
      return []; // No baseline to compare against
    }

    const anomalies: AnomalyScore[] = [];
    const baseline = profile.baseline_data;

    // Check transaction amount anomaly
    if (currentBehavior.eventType === 'transaction') {
      const amountAnomaly = this.checkAmountAnomaly(currentBehavior.data.amount, baseline.transactionPatterns);
      if (amountAnomaly.score > 50) {
        anomalies.push(amountAnomaly);
      }
    }

    // Check time pattern anomaly
    const timeAnomaly = this.checkTimeAnomaly(currentBehavior.timestamp, baseline.timePatterns);
    if (timeAnomaly.score > 50) {
      anomalies.push(timeAnomaly);
    }

    // Check location anomaly
    if (currentBehavior.data.location) {
      const locationAnomaly = this.checkLocationAnomaly(currentBehavior.data.location, baseline.locationPatterns);
      if (locationAnomaly.score > 50) {
        anomalies.push(locationAnomaly);
      }
    }

    return anomalies;
  }

  async compareWithBaseline(userId: string, behavior: BehaviorEvent): Promise<DeviationScore> {
    const profile = await this.behavioralProfileRepository.findOne({
      where: { user_id: userId },
    });

    if (!profile) {
      return {
        overallDeviation: 100, // High deviation for new users
        deviations: [],
      };
    }

    const deviations = await this.detectAnomalies(userId, behavior);
    const overallDeviation = deviations.length > 0 
      ? deviations.reduce((sum, d) => sum + d.score, 0) / deviations.length 
      : 0;

    return {
      overallDeviation,
      deviations,
    };
  }

  private initializeProfile(): any {
    return {
      userId: '',
      transactionPatterns: {
        amounts: [],
        frequencies: [],
        merchants: [],
      },
      navigationPatterns: {
        pageVisits: [],
        clickPatterns: [],
        sessionDurations: [],
      },
      timePatterns: {
        hours: [],
        days: [],
        intervals: [],
      },
      devicePatterns: {
        devices: [],
        browsers: [],
        oss: [],
      },
      locationPatterns: {
        countries: [],
        regions: [],
        ips: [],
      },
    };
  }

  private initializeBaseline(): any {
    return {
      transactionPatterns: {
        averageAmount: 0,
        medianAmount: 0,
        amountStdDev: 0,
        typicalFrequency: 0,
      },
      timePatterns: {
        peakHours: [],
        typicalDays: [],
        averageInterval: 0,
      },
      locationPatterns: {
        typicalCountries: [],
        typicalRegions: [],
      },
      devicePatterns: {
        typicalDevices: [],
        typicalBrowsers: [],
      },
    };
  }

  private updateProfileWithEvent(profile: any, event: BehaviorEvent): void {
    if (event.eventType === 'transaction') {
      profile.transactionPatterns.amounts.push(event.data.amount);
      profile.transactionPatterns.merchants.push(event.data.merchantId);
      
      // Keep only last 100 transactions
      if (profile.transactionPatterns.amounts.length > 100) {
        profile.transactionPatterns.amounts.shift();
        profile.transactionPatterns.merchants.shift();
      }
    }

    // Update time patterns
    const hour = event.timestamp.getHours();
    const day = event.timestamp.getDay();
    profile.timePatterns.hours.push(hour);
    profile.timePatterns.days.push(day);

    // Update device patterns
    if (event.data.device) {
      profile.devicePatterns.devices.push(event.data.device);
      if (event.data.browser) {
        profile.devicePatterns.browsers.push(event.data.browser);
      }
    }

    // Update location patterns
    if (event.data.location) {
      profile.locationPatterns.countries.push(event.data.location.country);
      if (event.data.location.region) {
        profile.locationPatterns.regions.push(event.data.location.region);
      }
    }
  }

  private checkAmountAnomaly(amount: number, baseline: any): AnomalyScore {
    if (!baseline.averageAmount || baseline.amountStdDev === 0) {
      return {
        type: 'amount_anomaly',
        score: 30, // Moderate risk for new users
        description: 'Insufficient baseline data',
        value: { amount },
      };
    }

    const zScore = Math.abs((amount - baseline.averageAmount) / baseline.amountStdDev);
    
    if (zScore > 3) {
      return {
        type: 'amount_anomaly',
        score: 85,
        description: 'Transaction amount significantly deviates from historical average',
        value: { amount, zScore },
      };
    } else if (zScore > 2) {
      return {
        type: 'amount_anomaly',
        score: 60,
        description: 'Transaction amount moderately deviates from historical average',
        value: { amount, zScore },
      };
    }

    return {
      type: 'amount_anomaly',
      score: 15,
      description: 'Transaction amount within normal range',
      value: { amount, zScore },
    };
  }

  private checkTimeAnomaly(timestamp: Date, baseline: any): AnomalyScore {
    const hour = timestamp.getHours();
    const day = timestamp.getDay();

    if (!baseline.peakHours || baseline.peakHours.length === 0) {
      return {
        type: 'time_anomaly',
        score: 20,
        description: 'Insufficient baseline time data',
        value: { hour, day },
      };
    }

    const isPeakHour = baseline.peakHours.includes(hour);
    const isTypicalDay = baseline.typicalDays.includes(day);

    if (!isPeakHour && !isTypicalDay) {
      return {
        type: 'time_anomaly',
        score: 50,
        description: 'Transaction outside typical time patterns',
        value: { hour, day },
      };
    }

    return {
      type: 'time_anomaly',
      score: 10,
      description: 'Transaction within typical time patterns',
      value: { hour, day },
    };
  }

  private checkLocationAnomaly(location: any, baseline: any): AnomalyScore {
    if (!baseline.typicalCountries || baseline.typicalCountries.length === 0) {
      return {
        type: 'location_anomaly',
        score: 25,
        description: 'Insufficient baseline location data',
        value: location,
      };
    }

    const isTypicalCountry = baseline.typicalCountries.includes(location.country);
    
    if (!isTypicalCountry) {
      return {
        type: 'location_anomaly',
        score: 70,
        description: 'Transaction from unusual geographic location',
        value: location,
      };
    }

    return {
      type: 'location_anomaly',
      score: 15,
      description: 'Transaction from typical geographic location',
      value: location,
    };
  }
}