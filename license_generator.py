# License Key Generator for ShiftPulse Ledger Pro
import hashlib
import json
import base64

def generate_license(company_pib: str, company_name: str, secret_key: str = "ShiftPulse2026Secret") -> str:
    payload = {
        "pib": company_pib,
        "name": company_name,
        "valid": True
    }
    raw_data = f"{company_pib}:{company_name}:{secret_key}"
    signature = hashlib.sha256(raw_data.encode()).hexdigest()[:16]
    
    token_str = json.dumps(payload) + f"::{signature}"
    return base64.b64encode(token_str.encode()).decode()

if __name__ == "__main__":
    pib = "109876543"
    company = "Knjigovodstvo D.O.O."
    key = generate_license(pib, company)
    print(f"Generated License Key for {company} (PIB: {pib}):\n{key}")
