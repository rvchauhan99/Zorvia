# Provider browser QA — 20260802_062156 UTC

- FE: `http://127.0.0.1:3000`
- API: `http://127.0.0.1:8000/api`
- Shots: `/Users/ravatrajsinhchauhan/Documents/Programs/Zorvia-main/test_reports/provider_browser_shots`
- **4 PASS / 1 FAIL / 0 SKIP** (of 5)

| Status | Check | Detail |
|--------|-------|--------|
| PASS | `preflight_fe` | status=200 attempt=1 |
| PASS | `preflight_api` | login_probe=422 attempt=1 |
| PASS | `api_login` | token_ok |
| PASS | `picked_customer` | 388cffb3-572a-45ca-92c7-8cdcadcf4b62 |
| FAIL | `browser_login` | Timeout 25000ms exceeded. =========================== logs =========================== waiting for navigation to "re.compile('.*/provider')" until 'load' ============================================================ |
