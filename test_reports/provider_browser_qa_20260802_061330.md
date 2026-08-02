# Provider browser QA — 20260802_061330 UTC

- FE: `http://localhost:3000`
- API: `http://localhost:8000/api`
- Shots: `/Users/ravatrajsinhchauhan/Documents/Programs/Zorvia-main/test_reports/provider_browser_shots`
- **52 PASS / 1 FAIL / 1 SKIP** (of 54)

| Status | Check | Detail |
|--------|-------|--------|
| PASS | `preflight_fe` | status=200 attempt=1 |
| PASS | `preflight_api` | login_probe=422 attempt=1 |
| PASS | `api_login` | token_ok |
| PASS | `picked_customer` | 388cffb3-572a-45ca-92c7-8cdcadcf4b62 |
| PASS | `browser_login` | http://localhost:3000/provider |
| PASS | `route_no_crash_dashboard` | http://localhost:3000/provider |
| PASS | `smoke_dashboard` | url=http://localhost:3000/provider copy-signup-code=1,text:Dashboard=y,go-deliveries=1 |
| PASS | `route_no_crash_customers` | http://localhost:3000/provider/customers |
| PASS | `smoke_customers` | url=http://localhost:3000/provider/customers customers-search=1,add-customer-btn=1 |
| PASS | `route_no_crash_deliveries` | http://localhost:3000/provider/deliveries |
| PASS | `smoke_deliveries` | url=http://localhost:3000/provider/deliveries date-picker=1,delivery-search=1 |
| PASS | `route_no_crash_kitchen` | http://localhost:3000/provider/kitchen |
| PASS | `smoke_kitchen` | url=http://localhost:3000/provider/kitchen kitchen-summary=1,kitchen-date=1 |
| PASS | `route_no_crash_payments` | http://localhost:3000/provider/payments |
| PASS | `smoke_payments` | url=http://localhost:3000/provider/payments record-payment=1,payment-search=1 |
| PASS | `route_no_crash_monthly_dues` | http://localhost:3000/provider/monthly-dues |
| PASS | `smoke_monthly_dues` | url=http://localhost:3000/provider/monthly-dues monthly-dues-page=1,monthly-dues-unavailable=0,text:Customer subscriptions=y |
| PASS | `route_no_crash_reports` | http://localhost:3000/provider/reports |
| PASS | `smoke_reports` | url=http://localhost:3000/provider/reports text:Reports=y,text:Outstanding=y |
| PASS | `route_no_crash_analysis` | http://localhost:3000/provider/analysis |
| PASS | `smoke_analysis` | url=http://localhost:3000/provider/analysis text:Analysis=y,analysis-open-reports=1 |
| PASS | `route_no_crash_settings` | http://localhost:3000/provider/settings |
| PASS | `smoke_settings` | url=http://localhost:3000/provider/settings text:Settings=y |
| PASS | `route_no_crash_menu` | http://localhost:3000/provider/menu |
| PASS | `smoke_menu` | url=http://localhost:3000/provider/menu text:Menu=y |
| PASS | `route_no_crash_route_planning` | http://localhost:3000/provider/route-planning |
| PASS | `smoke_route_planning` | url=http://localhost:3000/provider/route-planning text:Route=y,text:route=y |
| PASS | `route_no_crash_subscription` | http://localhost:3000/provider/subscription |
| PASS | `smoke_subscription` | url=http://localhost:3000/provider/subscription customer-usage=1,text:subscription=y |
| PASS | `route_no_crash_more` | http://localhost:3000/provider/more |
| PASS | `smoke_more` | url=http://localhost:3000/provider/more more-settings=1,more-reports=1,activity-section=1 |
| PASS | `route_no_crash_whatsapp_credit` | http://localhost:3000/provider/menu |
| PASS | `smoke_whatsapp_credit` | feature_gated_redirect=http://localhost:3000/provider/menu |
| PASS | `route_no_crash_customer_detail` | http://localhost:3000/provider/customers/388cffb3-572a-45ca-92c7-8cdcadcf4b62 |
| FAIL | `smoke_customer_detail` | url=http://localhost:3000/provider/customers/388cffb3-572a-45ca-92c7-8cdcadcf4b62 customer-detail-name=0,customer-back=0 |
| PASS | `route_no_crash_customer_edit` | http://localhost:3000/provider/customers/388cffb3-572a-45ca-92c7-8cdcadcf4b62/edit |
| PASS | `smoke_customer_edit` | url=http://localhost:3000/provider/customers/388cffb3-572a-45ca-92c7-8cdcadcf4b62/edit cf-save=0,cf-back-btn=1,text:Review=y,text:Contact=y |
| PASS | `nav_side-nav-customers` | http://localhost:3000/provider/customers |
| PASS | `nav_side-nav-deliveries` | http://localhost:3000/provider/deliveries |
| PASS | `nav_side-nav-payments` | http://localhost:3000/provider/payments |
| PASS | `density_no_review_banner` | banners_absent |
| PASS | `review_has_contact_card` | edit_btns=0 save=0 |
| PASS | `deliveries_filters` |  |
| PASS | `payments_record_btn` | count=1 |
| PASS | `payments_sheet_open` |  |
| PASS | `dues_page_or_unavailable` | page=True unavailable=False |
| PASS | `dues_quick_renew_btn` | cid=9f98f88c-989c-477c-bcf0-2c87b386baa7 count=1 |
| SKIP | `dues_settlement_radios` | fee~charge fee=220.0 charge=220.0 (choice not required) |
| PASS | `settings_billing_section` |  |
| PASS | `mobile_login` | http://localhost:3000/provider |
| PASS | `mobile_dashboard` | visible=True blowout=False sw=390 cw=390 nav=2 |
| PASS | `mobile_customers` | visible=True blowout=False sw=390 cw=390 nav=2 |
| PASS | `mobile_deliveries` | visible=True blowout=False sw=390 cw=390 nav=2 |
| PASS | `mobile_payments` | visible=True blowout=False sw=390 cw=390 nav=2 |
