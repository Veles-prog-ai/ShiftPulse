import { RS_COUNTRY_PACK } from "./rs.js";
import { HR_COUNTRY_PACK } from "./hr.js";
import { SI_COUNTRY_PACK } from "./si.js";
import { ME_COUNTRY_PACK } from "./me.js";
import { DE_COUNTRY_PACK } from "./de.js";

export const COUNTRY_PACK_DEFINITIONS = {
  RS: RS_COUNTRY_PACK,
  HR: HR_COUNTRY_PACK,
  SI: SI_COUNTRY_PACK,
  ME: ME_COUNTRY_PACK,
  DE: DE_COUNTRY_PACK,
};

export const SUPPORTED_COUNTRY_CODES = Object.keys(COUNTRY_PACK_DEFINITIONS);

export function getCountryPackDefinition(countryCode = "RS") {
  const code = String(countryCode || "RS").trim().toUpperCase();
  return COUNTRY_PACK_DEFINITIONS[code] || RS_COUNTRY_PACK;
}

export function cloneCountryPacksMap() {
  return JSON.parse(JSON.stringify(COUNTRY_PACK_DEFINITIONS));
}
