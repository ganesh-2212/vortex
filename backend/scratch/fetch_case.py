import requests

res = requests.post("http://127.0.0.1:8000/api/v1/simulations/f18-killer-scenario/execute")

res = requests.get("http://127.0.0.1:8000/api/v1/recovery-cases")
cases = res.json()
case_id = None
for c in cases:
    if c['amount_at_risk'] == '50000.00':
        case_id = c['id']

if not case_id:
    print("No cases found")
    exit(1)

res = requests.get(f"http://127.0.0.1:8000/api/v1/recovery-cases/{case_id}/decision-explanation")
import json
print(json.dumps(res.json(), indent=2))
