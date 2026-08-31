import requests
import json
import uuid

# create a case first
print("Creating mock case...")
# The backend store is cleared on reload, so we need to inject a case via HTTP if possible, or we can just run the test directly via pytest.

