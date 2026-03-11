# VTitle Registry App

A React + TypeScript + MUI application for interacting with the **VehicleTitleRegistry** contract on **Avalanche Fuji**.

This app is built for the deployed Fuji contract and provides a professional interface for:

- dashboard and registry overview
- VIN lookup
- title record viewing
- legacy title digitisation
- new vehicle title minting
- holder title transfers
- dealer-assisted transfers
- regulator and registrar record controls
- admin role management


[user setup here](https://github.com/CheyneWeb3/Vroom-Vroom-26/blob/main/UserGuide.md)
---

## Network

- **Chain:** Avalanche Fuji
- **Chain ID:** `43113`

## Deployed Contract

- **VehicleTitleRegistry:** `0x9b4FAc0127C85d7EA6158c6C1747F2E37430312C`

Explorer:

- `https://testnet.routescan.io/address/0x9b4FAc0127C85d7EA6158c6C1747F2E37430312C`

---

## Stack

- React
- TypeScript
- Vite
- React Router DOM
- ethers v6
- MUI
- Reown AppKit
- Multicall3 for batched reads

---

## Features

### General

- Dashboard
- VIN lookup
- Title details
- Recent registry activity

### Holder workflows

- View titles owned by the connected wallet
- Transfer title as the current holder
- Update mileage
- View notes and history

### Registrar workflows

- Digitise legacy paper-title vehicles into the registry
- Add official notes
- Update token URI metadata

### Manufacturer workflows

- Mint title records for newly originated vehicles

### Dealer workflows

- Dealer-assisted title transfer
- Add official dealer notes

### Regulator workflows

- Update title brand
- Update record state
- Reassign title
- Update QR/reference data
- Update token URI

### Admin workflows

- Grant roles
- Revoke roles
- Inspect role status for addresses

---

## Environment Variables

Create a `.env` file in the project root:

```bash
VITE_REOWN_PROJECT_ID=
VITE_CONTRACT_DEPLOY_BLOCK=52595336
VITE_MULTICALL3_ADDRESS=0xcA11bde05977b3631167028862bE2a173976CA11
````

### Notes

* `VITE_REOWN_PROJECT_ID` is your Reown / WalletConnect project ID.
* `VITE_CONTRACT_DEPLOY_BLOCK` is used to avoid scanning from genesis for events.
* `VITE_MULTICALL3_ADDRESS` is used for batched read calls on Fuji.

---

## Install

### With Yarn

```bash
yarn
```

### With npm

```bash
npm install
```

---

## Run Locally

### With Yarn

```bash
yarn dev
```

### With npm

```bash
npm run dev
```

---

## Production Build

### With Yarn

```bash
yarn build
```

### With npm

```bash
npm run build
```

---

## Preview Production Build

### With Yarn

```bash
yarn preview
```

### With npm

```bash
npm run preview
```

---

## Project Structure

```text
src/
  abi/
    VehicleTitleRegistryAbi.json
  components/
  hooks/
  lib/
  pages/
  types/
  utils/
  App.tsx
  appkit.ts
  config.ts
  main.tsx
```

---

## Contract Interaction Notes

The contract uses role-based access control. Depending on the connected wallet, the app will show or hide workflows based on roles read from the contract.

Expected roles include:

* `DEFAULT_ADMIN_ROLE`
* `REGISTRAR_ROLE`
* `MANUFACTURER_ROLE`
* `DEALER_ROLE`
* `REGULATOR_ROLE`

---

## Ownership Discovery

The contract is not enumerable, so the app discovers owned token IDs using event history and then batches record reads using Multicall3.

---

## Metadata

Critical title data is read directly from on-chain record storage.

Non-critical metadata is read from `tokenURI`, which can be used for:

* media
* images
* UI metadata
* additional descriptive data

---

## Remix Deployment Steps

Use this flow for deploying the contract from Remix to Fuji.

### 1. Open Remix

Open Remix IDE and make sure the following plugins are available:

* Solidity Compiler
* Deploy & Run Transactions

### 2. Add the contract

Paste your final `VehicleTitleRegistry` Solidity contract into Remix.

### 3. Compiler settings

In **Solidity Compiler** use:

* **Compiler version:** `0.8.30`
* **EVM version:** `Cancun`
* **Optimization:** enabled
* **Runs:** `200`

### 4. Compile

Compile the contract and make sure there are no errors.

### 5. Connect wallet to Fuji

In your browser wallet:

* switch to **Avalanche Fuji**
* make sure the deployer wallet has enough Fuji AVAX for gas

### 6. Deploy from Remix

In **Deploy & Run Transactions** use:

* **Environment:** `Injected Provider`
* confirm the connected account is the correct Fuji deployer wallet
* select the `VehicleTitleRegistry` contract
* enter the constructor argument as the chosen admin address

Example constructor input:

```text
0xYourAdminWalletHere
```

Then click **Deploy** and confirm the wallet transaction.

### 7. Save the deployed address

After deployment, copy the contract address.

For this app, the current Fuji deployment is:

```text
0x9b4FAc0127C85d7EA6158c6C1747F2E37430312C
```

### 8. Verify / inspect on explorer

Use the Fuji explorer entry for the deployed address:

* `https://testnet.routescan.io/address/0x9b4FAc0127C85d7EA6158c6C1747F2E37430312C`

### 9. Update frontend config

Set the deploy block in `.env`:

```bash
VITE_CONTRACT_DEPLOY_BLOCK=52595336
```

And keep the app pointed at the deployed contract address in `src/config.ts`.

### 10. Add ABI to frontend

Place the ABI JSON at:

```text
src/abi/VehicleTitleRegistryAbi.json
```

### 11. Install and run the app

With Yarn:

```bash
yarn
yarn dev
```

With npm:

```bash
npm install
npm run dev
```

---

## Suggested Post-Deploy Checks

After deployment, test these in order:

1. admin role reads correctly
2. registrar can digitise a legacy title
3. manufacturer can mint a new vehicle title
4. VIN lookup returns the expected token
5. holder transfer works
6. dealer transfer works
7. regulator record controls work
8. tokenURI updates and displays correctly

---

## Troubleshooting

### App says wrong network

Switch your wallet to **Avalanche Fuji**.

### Dashboard reads are slow or fail

Check:

* `VITE_CONTRACT_DEPLOY_BLOCK`
* Fuji RPC availability
* wallet network
* Multicall3 address

### Transactions fail

Common causes:

* missing required role
* invalid VIN
* VIN already registered
* not current holder
* record not active
* invalid token ID
* missing token approval for ERC20 payment transfer
