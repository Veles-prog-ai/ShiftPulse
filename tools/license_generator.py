# License Key Generator Utility for ShiftPulse Ledger (Two-Tier + Trial B2B Edition)
import argparse
import base64
from datetime import datetime, timedelta, timezone
import hashlib
import json
from typing import Optional


LICENSE_TYPES = (
    "TRIAL_14D",
    "MID_MARKET_ANNUAL",
    "ENTERPRISE_PERPETUAL_BYO_API",
)


def _iso_days_from_now(days: int) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).strftime("%Y-%m-%d")


def generate_license(
    company_pib: str,
    company_name: str,
    secret_key: str = "ShiftPulse2026Secret",
    license_type: str = "MID_MARKET_ANNUAL",
    max_client_companies: int = 25,
    max_operator_seats: int = 5,
    max_employees: int = 500,
    expires_at: Optional[str] = None,
    law_tracker_sla_expiry: Optional[str] = None,
    bound_fingerprint: Optional[str] = None,
    bound_host: Optional[str] = None,
) -> str:
    normalized_type = str(license_type or "MID_MARKET_ANNUAL").strip().upper()
    if normalized_type not in LICENSE_TYPES:
        raise ValueError(f"Unsupported license_type '{license_type}'. Expected one of {LICENSE_TYPES}.")

    if normalized_type == "TRIAL_14D":
        resolved_core_expiry = expires_at or _iso_days_from_now(14)
        resolved_sla_expiry = law_tracker_sla_expiry or resolved_core_expiry
        resolved_companies = int(max_client_companies or 3)
        resolved_seats = int(max_operator_seats or 2)
        resolved_employees = int(max_employees or 15)
        tier_label = "Trial 14D"
        byo_allowed = False
    elif normalized_type == "ENTERPRISE_PERPETUAL_BYO_API":
        resolved_core_expiry = None
        resolved_sla_expiry = law_tracker_sla_expiry or _iso_days_from_now(365)
        resolved_companies = int(max_client_companies or 9999)
        resolved_seats = int(max_operator_seats or 999)
        resolved_employees = int(max_employees or 99999)
        tier_label = "Enterprise Perpetual BYO-API"
        byo_allowed = True
    else:
        resolved_core_expiry = expires_at or _iso_days_from_now(365)
        resolved_sla_expiry = law_tracker_sla_expiry or resolved_core_expiry
        resolved_companies = int(max_client_companies or 25)
        resolved_seats = int(max_operator_seats or 5)
        resolved_employees = int(max_employees or 500)
        tier_label = "Mid-Market Annual"
        byo_allowed = False

    payload = {
        "pib": str(company_pib).strip(),
        "pibAgencije": str(company_pib).strip(),
        "name": str(company_name).strip(),
        "nazivAgencije": str(company_name).strip(),
        "licenseType": normalized_type,
        "tier": tier_label,
        "valid": True,
        "issuedAt": datetime.now(timezone.utc).isoformat(),
        "core_expiry": resolved_core_expiry,
        "datumIsteka": resolved_core_expiry,
        "law_tracker_sla_expiry": resolved_sla_expiry,
        "max_client_companies": resolved_companies,
        "max_operator_seats": resolved_seats,
        "maksimalnoRadnika": resolved_employees,
        "byo_api_allowed": byo_allowed,
        "boundFingerprint": bound_fingerprint,
        "boundHost": bound_host,
    }

    payload_json = json.dumps(payload, separators=(",", ":"), sort_keys=True)
    raw_data = f"{payload_json}:{secret_key}"
    signature = hashlib.sha256(raw_data.encode("utf-8")).hexdigest()[:24]
    token_str = f"{payload_json}::{signature}"
    return base64.b64encode(token_str.encode("utf-8")).decode("utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ShiftPulse Ledger B2B License Key Generator")
    parser.add_argument("--pib", default="109876543", help="Company Tax ID (PIB)")
    parser.add_argument("--name", default="Accounting Agency Ltd.", help="Client Company Name")
    parser.add_argument("--type", dest="license_type", choices=LICENSE_TYPES, default="MID_MARKET_ANNUAL")
    parser.add_argument("--max-companies", type=int, default=25)
    parser.add_argument("--max-seats", type=int, default=5)
    parser.add_argument("--max-employees", type=int, default=500)
    parser.add_argument("--expires", dest="expires_at", default=None)
    parser.add_argument("--sla-expires", dest="law_tracker_sla_expiry", default=None)
    parser.add_argument("--secret", default="ShiftPulse2026Secret")
    args = parser.parse_args()

    key = generate_license(
        company_pib=args.pib,
        company_name=args.name,
        secret_key=args.secret,
        license_type=args.license_type,
        max_client_companies=args.max_companies,
        max_operator_seats=args.max_seats,
        max_employees=args.max_employees,
        expires_at=args.expires_at,
        law_tracker_sla_expiry=args.law_tracker_sla_expiry,
    )
    print(f"Generated {args.license_type} License Key for {args.name} (PIB: {args.pib}):\n{key}")
