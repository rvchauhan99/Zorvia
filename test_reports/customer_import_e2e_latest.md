# Customer import E2E (20260802_143428)

- API: `http://127.0.0.1:8000/api`
- Email: `ravatrajsinh@gmail.com`
- Driver: `DRIVER 1`
- Happy job: `2d3370e6-bc09-40b3-ac6f-5adf8ae0ccc7`
- Neg job: `fd1e6dd0-c8ed-4887-aa16-2730d580328b`

## Checks
- [PASS] login: ravatrajsinh@gmail.com
- [PASS] driver_present: drivers=['DRIVER 1']
- [PASS] kitchen_address: city=Toronto postal=M5H 2N2
- [PASS] import_http_200: {"job_id":"2d3370e6-bc09-40b3-ac6f-5adf8ae0ccc7","total":10,"billing_policy":"monthly_adjustable"}
- [PASS] job_id_returned: dict_keys(['job_id', 'total', 'billing_policy'])
- [PASS] total_10: total=10
- [PASS] job_completed: completed
- [PASS] created_10: created=10
- [PASS] geocoded_10: geocoded=10
- [PASS] route_placed_positive: route_placed=14
- [PASS] no_errors: errors=[]
- [PASS] spot_geocode_ok: ok
- [PASS] spot_has_coords: lat=43.663176
- [PASS] spot_driver_assigned: sa_keys=['dinner']
- [PASS] spot_sequence_set: seq=None sa={'dinner': {'delivery_sequence': 4, 'driver_id': '7e777670-6b78-46c8-ab59-7db46abb05dd', 'driver_name': 'DRIVER 1'}}
- [PASS] neg_http_200: {"job_id":"fd1e6dd0-c8ed-4887-aa16-2730d580328b","total":3,"billing_policy":"monthly_adjustable"}
- [PASS] neg_created_1: created=1
- [PASS] neg_errors_2: errors=[{'index': 1, 'error': "Unknown driver 'NO SUCH DRIVER XYZ'"}, {'index': 2, 'error': 'monthly_plan is required for monthly import (e.g. Mon-Fri or Mon-Sat). Delivery days come from that plan — do not use delivery_days.'}]
- [PASS] neg_driver_or_plan_msgs: Unknown driver 'NO SUCH DRIVER XYZ' monthly_plan is required for monthly import (e.g. Mon-Fri or Mon-Sat). Delivery days come from that plan — do not use delivery_days.

**Overall: PASS**
