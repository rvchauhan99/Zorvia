# Consumer account & sign-in

**Who this is for:** Kitchen owners (providers) and business analysts.  
**What it covers:** How a meal customer creates a MealHQ login and signs in.  
**Brand:** MealHQ

---

## How it works (in one minute)

1. The **kitchen** adds the customer in Customer Master (name, phone, address, meal plan — as usual).
2. The kitchen shares its **kitchen code** with the customer.
3. The customer creates a login with **kitchen code + phone number + password**.
4. Later they sign in with **phone number + password**.

There is **no email** required for the customer login.  
There is **no SMS or WhatsApp code** to verify the phone.  
Trust comes from: that phone number must already exist on that kitchen’s Customer Master.

Address, delivery days, and meal planning stay with the kitchen. Customers do not enter those at signup.

---

## Before a customer can create an account

The kitchen must:

1. Create (or update) the customer in **Customer Master**.
2. Save the **correct mobile number** (the number the customer will use to sign up).
3. Give the customer the kitchen’s **kitchen code** (from Settings / dashboard).

If the phone number is missing or wrong in Customer Master, signup will fail.

**Tip:** Country code does not matter for matching.  
`416-555-0101`, `+1 416-555-0101`, and `1 416 555 0101` are treated as the same number.

---

## Create an account (customer steps)

1. Open MealHQ consumer signup: `/consumer-signup` (or the link the kitchen shared).
2. Enter:
   - **Kitchen code**
   - **Phone number** (same mobile as on Customer Master)
   - **Password**
   - **Verify password**
3. Submit.

If everything matches, the account is created right away and the customer can use the meal app.  
No email verification step. No Google sign-up for customers.

---

## When signup fails

| Situation | What the customer sees / what to do |
|-----------|-------------------------------------|
| Phone not on this kitchen’s Customer Master | Ask the kitchen to add or correct the mobile number, then try again. |
| Wrong kitchen code | Ask the kitchen for the correct kitchen code. |
| Account already exists for that phone at this kitchen | Sign in instead. If they forgot the password, ask the kitchen to reset it. |

---

## Sign in (customer steps)

1. Open MealHQ login and choose **I order meals**.
2. Enter **phone number** and **password**.
3. Sign in.

**Special case — same phone at more than one kitchen:**  
MealHQ will ask for the **kitchen code** as well, so the correct kitchen account is opened.

Customers do **not** use Google to sign in.

---

## Forgot password

Customers **cannot** reset the password by themselves (no email or SMS reset).

### What the kitchen does

1. Open the customer in **Customer Master** (customer detail).
2. Use **Reset login password** and set a temporary password.
3. Tell the customer that temporary password (by phone, WhatsApp, etc.).

### What the customer does next

1. Sign in with phone + temporary password.
2. MealHQ asks them to **choose a new password** before they can use the app.
3. After that, they use the new password for future sign-ins.

If the customer has **never** created a login yet, there is nothing to reset. They should sign up first with kitchen code + phone.

---

## Quick checklist for kitchens

- [ ] Customer exists in Customer Master with the right **phone number**
- [ ] Customer has your **kitchen code**
- [ ] Customer signed up with that code + phone + password
- [ ] If they forget the password → reset it from Customer Master → they change it on next login

---

## What kitchens should tell customers

> “We already have you on our list. Sign up on MealHQ with our kitchen code and the same mobile number we have for you. Use a password you can remember. If you forget it, message us — we’ll reset it for you.”
