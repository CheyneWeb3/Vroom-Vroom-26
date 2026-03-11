# VTitle Registry App User Guide

This guide explains how to use the VTitle Registry app, what each role can do, and how an administrator can grant, revoke, and check roles.

---

## Overview

The VTitle Registry app is a role-based interface for managing digital vehicle title records on Avalanche Fuji.

The app is used for:

- VIN lookup
- viewing vehicle title records
- digitising legacy paper-title vehicles
- minting new manufacturer-issued vehicles
- transferring ownership
- dealer-assisted transfers
- regulator record actions
- admin role management

The contract is role-controlled, so different users will see different capabilities depending on the wallet they connect with.

---

## Network

- **Network:** Avalanche Fuji
- **Chain ID:** `43113`

Make sure the connected wallet is on Fuji before using the app.

---

## Main Pages

### Dashboard
The dashboard is the landing page for the system.

It shows:

- current connected role access
- VIN lookup
- QR scan entry for VIN lookup

It does **not** show sensitive title listings on the dashboard.

### VIN Lookup
Used to search for a vehicle by VIN.

You can:

- type the VIN manually
- scan the VIN QR code
- open the matching record if the VIN exists on-chain

### Title Details
Used to view the full vehicle title record.

It shows:

- VIN
- current holder
- make, model, year
- mileage
- title brand
- record state
- QR/reference data
- note history
- VIN QR
- printable digital certificate

### Digitise Legacy Title
Used by a registrar to digitise an existing paper-title vehicle.

This page supports:

- manual entry
- OCR-assisted VIN/title capture
- uploaded or camera-captured certificate review
- clerk confirmation before submit

### Mint New Vehicle Title
Used by a manufacturer to mint a newly originated vehicle directly into the system.

### Transfer Title
Used for standard holder-driven title transfer.

The current holder:

- looks up the vehicle by VIN
- reviews the current record
- enters the next holder wallet
- submits the ownership transfer

### Dealer Transfer
Used for dealer-assisted title transfer workflows.

### Record Controls
Used by regulator or registrar-level workflows depending on the function.

### Role Management
Used by the contract admin to:

- inspect roles for an address
- grant roles
- revoke roles

---

## Roles

The app uses the following role model.

### `DEFAULT_ADMIN_ROLE`
This is the top-level admin role.

An admin can:

- grant registrar role
- grant manufacturer role
- grant dealer role
- grant regulator role
- revoke registrar role
- revoke manufacturer role
- revoke dealer role
- revoke regulator role
- inspect role status for a wallet

This role should be tightly controlled.

---

### `REGISTRAR_ROLE`
Registrar is for bringing existing paper-title vehicles into the digital registry.

A registrar can:

- digitise legacy title vehicles
- use OCR-assisted title intake
- set the initial vehicle data during legacy record creation
- update token URI where registrar authorization is allowed
- add official notes

Use this role for trusted clerks or onboarding staff handling legacy record entry.

---

### `MANUFACTURER_ROLE`
Manufacturer is for newly originated vehicles entering the system directly.

A manufacturer can:

- mint new vehicle title records
- create the first title record for newly issued vehicles

Use this role only for approved manufacturer-side issuance flows.

---

### `DEALER_ROLE`
Dealer is for assisted transfer workflows and official dealer record participation.

A dealer can:

- perform dealer-assisted title transfer
- add official dealer notes

Use this role for trusted dealership participants.

---

### `REGULATOR_ROLE`
Regulator is for official registry actions and record corrections.

A regulator can:

- reassign title by regulator workflow
- update title brand
- update record state
- mark a vehicle destroyed/scrapped
- update QR/reference data
- update token URI where regulator authorization is allowed
- add official notes

Use this role for official oversight, correction, exception handling, and regulatory control.

---

## Who Can Do What

### Standard user / holder
A normal holder can:

- view title records
- lookup VINs
- transfer ownership if they are the current holder
- update mileage where allowed
- add holder notes where allowed

A normal holder does **not** need a special admin role just to hold a title.

---

### Registrar
A registrar can:

- digitise legacy records
- add official notes
- assist with intake and onboarding of older paper-title vehicles

---

### Manufacturer
A manufacturer can:

- mint new vehicle records for newly created vehicles

---

### Dealer
A dealer can:

- transfer titles through the dealer-assisted workflow
- add official dealer notes

---

### Regulator
A regulator can:

- update title brand
- update record state
- mark vehicle as destroyed/scrapped
- reassign title in official cases
- update official metadata fields
- add official notes

---

### Admin
An admin can:

- grant roles
- revoke roles
- inspect roles for any wallet address

---

## How to Check Your Current Role

1. Connect your wallet.
2. Open the **Dashboard**.
3. Look at the **Current Access** section.

The app will display your current role badges for the connected wallet.

You can also inspect another wallet from the **Role Management** page.

---

## How to Check Roles for Another Wallet

1. Open **Role Management**.
2. Enter the target wallet address.
3. Click **Check Roles**.

The page will show the role status for that wallet.

This lets an admin confirm whether a user already has:

- registrar
- manufacturer
- dealer
- regulator

---

## How to Add a User to a Role

Only a wallet with `DEFAULT_ADMIN_ROLE` can do this.

1. Connect the admin wallet.
2. Open **Role Management**.
3. Enter the target wallet address.
4. Choose the role:
   - registrar
   - manufacturer
   - dealer
   - regulator
5. Click **Grant Role**.
6. Confirm the transaction in the wallet.
7. Wait for the transaction to complete.
8. Use **Check Roles** to confirm the role was granted.

---

## How to Remove a User from a Role

Only a wallet with `DEFAULT_ADMIN_ROLE` can do this.

1. Connect the admin wallet.
2. Open **Role Management**.
3. Enter the target wallet address.
4. Choose the role:
   - registrar
   - manufacturer
   - dealer
   - regulator
5. Click **Revoke Role**.
6. Confirm the transaction in the wallet.
7. Wait for the transaction to complete.
8. Use **Check Roles** to confirm the role was removed.

---

## Recommended Role Assignment Model

### Admin
Keep this role very limited.

Recommended use:
- one primary admin wallet
- possibly one backup admin wallet

### Registrar
Use for trusted data-entry or legacy conversion staff.

### Manufacturer
Use only for approved manufacturer minting wallets.

### Dealer
Use only for approved dealer-side wallets.

### Regulator
Use only for official registry or correction authority.

---

## Typical Workflows

## 1. VIN Lookup
1. Open **VIN Lookup** or use the lookup box on the dashboard.
2. Enter the VIN or scan the VIN QR.
3. If found, the title record page opens.

---

## 2. Digitise Legacy Vehicle
1. Open **Digitise Legacy Title**.
2. Upload or scan the title/certificate image.
3. Apply OCR-assisted fields if helpful.
4. Review the certificate preview.
5. Manually correct:
   - holder wallet
   - VIN
   - make
   - model
   - year
   - mileage
   - title brand
6. Keep QR/reference data as the VIN only.
7. Submit the digitisation transaction.

---

## 3. Mint New Vehicle
1. Open **Mint New Vehicle Title**.
2. Enter the new vehicle details.
3. Submit the mint transaction from a manufacturer wallet.

---

## 4. Standard Ownership Transfer
1. Open **Transfer Title**.
2. Search by VIN.
3. Review the current vehicle record.
4. Enter the new holder wallet.
5. Submit transfer.

This should be initiated by the current holder wallet.

---

## 5. Dealer-Assisted Transfer
1. Open **Dealer Transfer**.
2. Enter the relevant transfer details.
3. Submit from a dealer-authorized wallet.

---

## 6. Regulator Record Action
1. Open **Record Controls**.
2. Choose the relevant title.
3. Perform the needed official action:
   - update brand
   - update state
   - mark destroyed
   - update official metadata
   - reassign title where appropriate

---

## Important Notes

### Holder wallet is required
For legacy digitisation and mint flows, the holder wallet must be a valid wallet address.

If it is blank or invalid, the transaction will fail.

### QR/reference data
For the current workflow, QR/reference data should be:

- **VIN only**

### OCR is assistive only
OCR is there to help clerks move faster.

Always manually review:
- VIN
- make
- model
- year
- mileage

before submitting.

### Sensitive data
The dashboard avoids exposing sensitive title listings by default.

Use VIN lookup and direct title record pages for controlled access.

---

## Troubleshooting

### Wrong network
If the app says the network is wrong:

- switch wallet to **Avalanche Fuji**

### Role page says you cannot use it
Check that the connected wallet has the correct role.

Examples:
- Role Management requires admin
- Digitise Legacy requires registrar
- Mint New Vehicle requires manufacturer
- Dealer Transfer requires dealer
- Regulator actions require regulator

### Transaction fails on submit
Check:

- holder wallet address is present and valid
- VIN is present
- make, model, and year are filled
- connected wallet has the required role
- wallet is on Fuji

### OCR got something wrong
This is normal sometimes.

Use the OCR result as a starting point, then manually correct the fields before submission.

---

## Best Practices

- keep admin wallets limited and secure
- use separate wallets for each operational role where possible
- review OCR output manually
- confirm VIN carefully before digitising
- confirm the holder wallet carefully before submission
- use official notes for anything important that should remain in record history

---

## Quick Reference

### Admin can:
- grant roles
- revoke roles
- inspect roles

### Registrar can:
- digitise legacy titles
- add official notes
- update allowed metadata fields

### Manufacturer can:
- mint new titles

### Dealer can:
- perform dealer-assisted transfers
- add official dealer notes

### Regulator can:
- reassign title
- update title brand
- update record state
- mark destroyed/scrapped
- update official metadata fields
- add official notes

### Holder can:
- transfer owned title through holder workflow
- view records
- update mileage where allowed
- add holder notes where allowed
