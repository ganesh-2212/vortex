import requests
import json

res = requests.get("http://127.0.0.1:8000/api/v1/recovery-cases")
cases = res.json()
case_id = None
for c in cases:
    if str(c['amount_at_risk']) in ['55500.00', '50000.00', '55500.0', '50000.0']:
        case_id = c['id']
        print(f"Found case {case_id} with amount {c['amount_at_risk']}")
        break

if not case_id:
    print("No case found")
    exit(1)

print(f"Creating payment order for case {case_id}")
res = requests.post(f"http://127.0.0.1:8000/api/v1/recovery-cases/{case_id}/payment-order")
print("Status Code:", res.status_code)
print("Response:", res.text)
