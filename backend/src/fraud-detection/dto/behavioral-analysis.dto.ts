import { IsString, IsObject, IsDateString, IsOptional } from 'class-validator';

export class BehaviorEventDto {
  @IsString()
  eventType: string;

  @IsDateString()
  timestamp: Date;

  @IsObject()
  data: any;
}

export class TrackBehaviorDto {
  @IsString()
  userId: string;

  @IsObject()
  behaviorEvent: BehaviorEventDto;
}