# Mixed-policy QA report

- Generated: 2026-08-02T05:10:28.672595+00:00
- API: `http://localhost:8000/api`
- Result: **PASS** (60/60)

## Checks

- PASS `login` — status=200
- PASS `load_provider` — id=87a3ef50-7c44-4e1d-8348-0d9fcd8fe949
- PASS `kitchen_settings` — tax=0 default=per_meal
- PASS `kitchen_default_per_meal` — enabled=False tax=0.0
- PASS `seed_window` — join=2026-07-01 days=23 today=2026-08-02
- PASS `create_QA_Mix_Inherit` — b4017e37-8743-4dcd-a02e-40b75b7ffa21
- PASS `create_QA_Mix_PerMeal` — eb34fc92-f399-4704-8791-5720173a280e
- PASS `create_QA_Mix_Adj_Full` — bfd0c3e6-3388-4863-a13d-fc66f418f3e9
- PASS `create_QA_Mix_Adj_Skip` — 9f98f88c-989c-477c-bcf0-2c87b386baa7
- PASS `create_QA_Mix_Fixed` — 388cffb3-572a-45ca-92c7-8cdcadcf4b62
- PASS `create_QA_Mix_Fixed_Credit` — 5dc03c88-49df-4dc1-a995-197886e74991
- PASS `seed_all_six` — created=6
- PASS `generate_deliveries` — requested=23 weekdays
- PASS `dels_QA_Mix_Inherit` — count=23
- PASS `dels_QA_Mix_PerMeal` — count=23
- PASS `dels_QA_Mix_Adj_Full` — count=23
- PASS `dels_QA_Mix_Adj_Skip` — count=23
- PASS `dels_QA_Mix_Fixed` — count=23
- PASS `dels_QA_Mix_Fixed_Credit` — count=23
- PASS `deliver_QA_Mix_Inherit` — marked=23
- PASS `deliver_QA_Mix_PerMeal` — marked=23
- PASS `ops_Adj_Full` — cancels_left=0
- PASS `ops_Adj_Skip` — prev_c=2 cur_c=0 recalc_extra=3
- PASS `ops_QA_Mix_Fixed` — cancelled=2
- PASS `ops_QA_Mix_Fixed_Credit` — cancelled=2
- PASS `pause_Inherit` — 
- PASS `pay_Inherit` — amount=138.0
- PASS `pay_Adj_Full` — amount=220.0
- PASS `pay_Adj_Skip_prev_month` — amount=216.0 tier=recalc_daily
- PASS `pay_Fixed_Credit_triple` — amount=660.0
- PASS `verify_settle_adjustable` — status=200 amt=198.0
- PASS `outstanding_QA_Mix_Inherit` — expected=138.0 actual=138.0
- PASS `billing_mode_QA_Mix_Inherit` — mode=per_meal source=inherit stored=inherit
- PASS `outstanding_QA_Mix_PerMeal` — expected=301.0 actual=301.0
- PASS `billing_mode_QA_Mix_PerMeal` — mode=per_meal source=override stored=per_meal
- PASS `outstanding_QA_Mix_Adj_Full` — expected=11.0 actual=11.0
- PASS `billing_mode_QA_Mix_Adj_Full` — mode=monthly_flat variant=monthly_adjustable source=override
- PASS `policy_override_QA_Mix_Adj_Full` — source=override
- PASS `outstanding_QA_Mix_Adj_Skip` — expected=220.0 actual=220.0
- PASS `billing_mode_QA_Mix_Adj_Skip` — mode=monthly_flat variant=monthly_adjustable source=override
- PASS `policy_override_QA_Mix_Adj_Skip` — source=override
- PASS `outstanding_QA_Mix_Fixed` — expected=440.0 actual=440.0
- PASS `billing_mode_QA_Mix_Fixed` — mode=monthly_flat variant=monthly_fixed source=override
- PASS `policy_override_QA_Mix_Fixed` — source=override
- PASS `outstanding_QA_Mix_Fixed_Credit` — expected=-220.0 actual=-220.0
- PASS `billing_mode_QA_Mix_Fixed_Credit` — mode=monthly_flat variant=monthly_fixed source=override
- PASS `policy_override_QA_Mix_Fixed_Credit` — source=override
- PASS `inherit_policy_source` — source=inherit effective=per_meal
- PASS `outstanding_report_200` — mode=mixed
- PASS `outstanding_mode_mixed_or_per_meal` — mode=mixed
- PASS `fixed_outstanding_overdue_filter` — in_rows=True expect_overdue=True today=2026-08-02
- PASS `monthly_dues_200` — 
- PASS `dues_excludes_per_meal` — row_count=4
- PASS `dues_includes_monthly` — ids=4
- PASS `payment_due_200` — 
- PASS `statement_200` — 
- PASS `statement_billing_mode` — mode=mixed
- PASS `dashboard_summary_200` — 
- PASS `credit_report_200` — 
- PASS `credit_lists_Fixed_Credit` — credit_expected=-220.0

## Notes

All golden asserts passed within $0.01.

