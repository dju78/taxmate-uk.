import { TaxRegion } from './types';

export function validatePayeProfile(profile: { taxRegion: TaxRegion }): void {
  if (profile.taxRegion === "scotland") {
    throw new Error("UNSUPPORTED_REGION: Scottish tax rules are not supported in this version.");
  }
}
