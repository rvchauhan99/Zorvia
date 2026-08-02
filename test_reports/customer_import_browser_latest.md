# Customer import browser smoke

- UTC: 2026-08-02T14:36:06.376804+00:00
- FE: `http://localhost:3000`
- email: `ravatrajsinh@gmail.com`
- exit: 0

| check | ok | detail |
| --- | --- | --- |
| browser_login | PASS | http://localhost:3000/provider |
| import_open_btn | PASS | count=1 |
| import_sheet_open | PASS | visible |
| policy_adjustable | PASS | default=Adjustable Monthly |
| no_missing_job_id_toast | PASS | toasts=['Imported 3 customer(s)'] |
| post_returns_job_id | PASS | bodies=[{'job_id': 'a050b985-571b-49dd-a47e-40935ca7cdc2', 'total': 3, 'billing_policy': 'monthly_adjustable'}] |
| progress_visible | PASS | Import complete 3 / 3 3 created 0 errors RECENT SUCCESSES Import Browser QA 01 Import Browser QA 02 Import Browser QA 03 |
| import_finished | PASS | counts='3 / 3' body=Import complete 3 / 3 3 created 0 errors RECENT SUCCESSES Import Browser QA 01 Import Browser QA 02 Import Browser QA 03 |
| not_stuck_0_of_0 | PASS | counts='3 / 3' |
| still_no_missing_job_id | PASS | toasts=['Imported 3 customer(s)', 'Imported 3 customer(s)'] |
