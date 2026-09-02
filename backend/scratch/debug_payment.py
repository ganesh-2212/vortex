import requests
import json

res = requests.post("http://127.0.0.1:8000/api/v1/simulations/f18-killer-scenario/execute")

res = requests.get("http://127.0.0.1:8000/api/v1/recovery-cases")
cases = res.json()
print("Cases:")
for c in cases:
    print(c['id'], c['amount_at_risk'])
