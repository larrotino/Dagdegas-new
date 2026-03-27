export type RateUnit = 'hour' | 'day';
export type ServiceType = 'free-floating' | 'station-based';

export interface CarSharingTariff {
  id: string;
  providerName: string;
  tariffName: string;
  unitType: RateUnit;
  unitValue: number;
  unitCost: number;
  extraMinutePrice: number;
  kmIncluded: number;
  pricePerExtraKm: number;
  unlockFee: number;
  color: string;
  type: ServiceType;
}

export interface CalculationInput {
  days: number;
  hours: number;
  estimatedKm: number;
}

export interface CalculationResult {
  tariffId: string;
  providerName: string;
  tariffName: string;
  totalCost: number;
  type: ServiceType;
  breakdown: {
    timeCost: number;
    kmCost: number;
    unlockFee: number;
  };
  color: string;
}
