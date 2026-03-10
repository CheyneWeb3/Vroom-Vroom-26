import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useAppKit,
  useAppKitAccount,
  useAppKitProvider,
  useDisconnect,
} from '@reown/appkit/react';
import { ethers } from 'ethers';
import { vehicleRegistryABI } from '../lib/contractABI';

const CONTRACT_ADDRESS = '0x257674cC71476003D94F70795Db06feBdFA07C1d' as const;
const TARGET_CHAIN_ID = 43113;
const ROUTESCAN_TX_BASE = 'https://testnet.routescan.io/tx/';

type RoleSnapshot = {
  admin: boolean;
  manufacturer: boolean;
  dealer: boolean;
  regulator: boolean;
  privateOwner: boolean;
};

export default function HomePage() {
  const { address, isConnected } = useAppKitAccount();
  const { open } = useAppKit();
  const { walletProvider } = useAppKitProvider('eip155');
  const { disconnect } = useDisconnect();

  const [vin, setVin] = useState('');
  const [year, setYear] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [status, setStatus] = useState<string | React.ReactNode>('');
  const [destroyConfirmed, setDestroyConfirmed] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [roleSnapshot, setRoleSnapshot] = useState<RoleSnapshot | null>(null);

  const normalizedVin = useMemo(() => vin.trim().toUpperCase(), [vin]);
  const yearNumber = useMemo(() => Number.parseInt(year, 10), [year]);

  const buildContract = async () => {
    if (!walletProvider) {
      throw new Error('Wallet provider not available. Connect wallet first.');
    }

    const provider = walletProvider as any;
    if (typeof provider.request !== 'function') {
      throw new Error('Invalid wallet provider interface.');
    }

    const ethersProvider = new ethers.BrowserProvider(provider);
    const network = await ethersProvider.getNetwork();

    if (Number(network.chainId) !== TARGET_CHAIN_ID) {
      throw new Error(
        `Wrong network. Please switch to Avalanche Fuji (${TARGET_CHAIN_ID}). Current chain: ${network.chainId.toString()}`
      );
    }

    const code = await ethersProvider.getCode(CONTRACT_ADDRESS);
    if (!code || code === '0x') {
      throw new Error(`No contract found at ${CONTRACT_ADDRESS} on Fuji.`);
    }

    const signer = await ethersProvider.getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, vehicleRegistryABI, signer);

    return { ethersProvider, signer, contract };
  };

  const parseContractError = async (err: any, contract?: ethers.Contract) => {
    const rawData =
      err?.data ??
      err?.info?.error?.data ??
      err?.error?.data ??
      null;

    if (contract && rawData) {
      try {
        const parsed = contract.interface.parseError(rawData);
        if (parsed) {
          if (parsed.name === 'AccessControlUnauthorizedAccount') {
            const account = String(parsed.args?.[0] ?? '');
            const neededRole = String(parsed.args?.[1] ?? '');
            return `Access denied. ${account} is missing required role ${neededRole}`;
          }

          if (parsed.args?.length) {
            return `${parsed.name}: ${parsed.args.map((x: any) => String(x)).join(', ')}`;
          }

          return parsed.name;
        }
      } catch {
        // ignore parse failure
      }
    }

    return err?.shortMessage || err?.reason || err?.message || 'Unknown contract error';
  };

  const refreshRoles = async () => {
    if (!isConnected || !address) {
      setStatus('Connect wallet first.');
      return;
    }

    try {
      setStatus('Checking wallet roles...');
      const { contract } = await buildContract();

      const [
        adminRole,
        manufacturerRole,
        dealerRole,
        regulatorRole,
        privateOwnerRole,
      ] = await Promise.all([
        contract.DEFAULT_ADMIN_ROLE(),
        contract.MANUFACTURER_ROLE(),
        contract.DEALER_ROLE(),
        contract.REGULATOR_ROLE(),
        contract.PRIVATE_OWNER_ROLE(),
      ]);

      const [admin, manufacturer, dealer, regulator, privateOwner] = await Promise.all([
        contract.hasRole(adminRole, address),
        contract.hasRole(manufacturerRole, address),
        contract.hasRole(dealerRole, address),
        contract.hasRole(regulatorRole, address),
        contract.hasRole(privateOwnerRole, address),
      ]);

      setRoleSnapshot({
        admin,
        manufacturer,
        dealer,
        regulator,
        privateOwner,
      });

      setStatus('Role check complete.');
    } catch (err: any) {
      console.error('Role check failed:', err);
      setStatus(err?.message || 'Failed to check roles.');
    }
  };

  const validateVin = async () => {
    if (!normalizedVin) {
      setStatus('Enter a VIN first.');
      return;
    }

    if (normalizedVin.length !== 17) {
      setStatus('VIN must be exactly 17 characters.');
      return;
    }

    setStatus('Validating VIN...');

    try {
      const res = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${normalizedVin}?format=json`
      );

      if (!res.ok) {
        throw new Error(`VIN service returned ${res.status}`);
      }

      const data = await res.json();
      const result = data?.Results?.[0];

      if (result?.ErrorCode === '0') {
        setYear(result.ModelYear || '');
        setMake(result.Make || '');
        setModel(result.Model || '');
        setStatus('VIN valid. Auto-filled year, make, and model.');
      } else {
        setStatus(result?.ErrorText || 'Invalid VIN.');
      }
    } catch (err) {
      console.error('Validation error:', err);
      setStatus('Validation service error.');
    }
  };

  const mint = async () => {
    if (!isConnected || !address) {
      setStatus('Connect wallet first.');
      return;
    }

    if (!destroyConfirmed) {
      setStatus('Confirm destruction of paper title.');
      return;
    }

    if (!normalizedVin || normalizedVin.length !== 17) {
      setStatus('VIN must be exactly 17 characters.');
      return;
    }

    if (!make.trim() || !model.trim()) {
      setStatus('Make and model are required.');
      return;
    }

    if (!Number.isInteger(yearNumber) || yearNumber < 1886 || yearNumber > 2100) {
      setStatus('Enter a valid vehicle year.');
      return;
    }

    setIsMinting(true);
    setStatus('Checking permissions...');

    try {
      const { contract } = await buildContract();

      try {
        await contract.mintVehicle.staticCall(
          address,
          normalizedVin,
          make.trim(),
          model.trim(),
          yearNumber,
          ''
        );
      } catch (err: any) {
        const msg = await parseContractError(err, contract);
        setStatus(`Simulation failed: ${msg}`);
        setIsMinting(false);
        return;
      }

      setStatus('Sending transaction...');

      const tx = await contract.mintVehicle(
        address,
        normalizedVin,
        make.trim(),
        model.trim(),
        yearNumber,
        ''
      );

      setStatus(`Transaction sent: ${tx.hash.slice(0, 10)}...`);

      await tx.wait();

      setStatus(
        <span>
          Success. Vehicle title minted.{' '}
          <a
            href={`${ROUTESCAN_TX_BASE}${tx.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#4ea1ff', textDecoration: 'underline' }}
          >
            View on Routescan
          </a>
        </span>
      );
    } catch (err: any) {
      console.error('Mint failed:', err);

      try {
        const { contract } = await buildContract();
        const msg = await parseContractError(err, contract);
        setStatus(`Mint failed: ${msg}`);
      } catch {
        setStatus(err?.message || 'Mint failed.');
      }
    } finally {
      setIsMinting(false);
    }
  };

  const roleText = roleSnapshot
    ? [
        roleSnapshot.admin ? 'ADMIN' : null,
        roleSnapshot.manufacturer ? 'MANUFACTURER' : null,
        roleSnapshot.dealer ? 'DEALER' : null,
        roleSnapshot.regulator ? 'REGULATOR' : null,
        roleSnapshot.privateOwner ? 'PRIVATE_OWNER' : null,
      ]
        .filter(Boolean)
        .join(', ') || 'No roles detected'
    : 'Not checked yet';

  return (
    <div style={{ padding: '2rem', maxWidth: '760px', margin: '0 auto', color: 'white' }}>
      <nav
        style={{
          display: 'flex',
          gap: '0.75rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
        }}
      >
        <Link
          to="/"
          style={{
            padding: '0.7rem 1rem',
            borderRadius: '10px',
            background: '#2563eb',
            color: 'white',
            textDecoration: 'none',
            fontWeight: 700,
          }}
        >
          Home
        </Link>

        <Link
          to="/admin"
          style={{
            padding: '0.7rem 1rem',
            borderRadius: '10px',
            background: '#374151',
            color: 'white',
            textDecoration: 'none',
            fontWeight: 700,
          }}
        >
          Admin
        </Link>
      </nav>

      <h1>Vehicle Title Registry</h1>

      {!isConnected ? (
        <button onClick={() => open()}>Connect Wallet</button>
      ) : (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
          }}
        >
          <p style={{ fontWeight: 'bold', margin: 0 }}>
            Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={refreshRoles}
              style={{
                padding: '0.5rem 1rem',
                background: '#444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              Check Roles
            </button>

            <button
              onClick={() => disconnect()}
              style={{
                padding: '0.5rem 1rem',
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              Disconnect
            </button>
          </div>
        </div>
      )}

      <div style={{ marginBottom: '0.75rem' }}>
        <strong>Contract:</strong> {CONTRACT_ADDRESS}
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <strong>Detected roles:</strong> {roleText}
      </div>

      <input
        type="text"
        placeholder="VIN"
        value={vin}
        onChange={(e) => setVin(e.target.value.toUpperCase())}
        style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem' }}
      />

      <button
        onClick={validateVin}
        style={{ marginBottom: '1rem', width: '100%', padding: '0.75rem' }}
      >
        Validate & Auto-Fill
      </button>

      <input
        type="number"
        placeholder="Year"
        value={year}
        onChange={(e) => setYear(e.target.value)}
        style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem' }}
      />

      <input
        type="text"
        placeholder="Make"
        value={make}
        onChange={(e) => setMake(e.target.value)}
        style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem' }}
      />

      <input
        type="text"
        placeholder="Model"
        value={model}
        onChange={(e) => setModel(e.target.value)}
        style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem' }}
      />

      <label style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', gap: '0.5rem' }}>
        <input
          type="checkbox"
          checked={destroyConfirmed}
          onChange={(e) => setDestroyConfirmed(e.target.checked)}
        />
        <span>I confirm destruction of the paper title.</span>
      </label>

      <button
        onClick={mint}
        disabled={isMinting}
        style={{
          width: '100%',
          padding: '0.9rem',
          background: isMinting ? '#777' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: isMinting ? 'not-allowed' : 'pointer',
          fontWeight: 700,
        }}
      >
        {isMinting ? 'Minting...' : 'Mint Digital Title'}
      </button>

      {status && (
        <div
          style={{
            marginTop: '1rem',
            fontWeight: 600,
            lineHeight: 1.5,
            wordBreak: 'break-word',
          }}
        >
          {status}
        </div>
      )}
    </div>
  );
}
