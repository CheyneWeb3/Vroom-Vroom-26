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
const TX_BASE = 'https://testnet.routescan.io/tx/';

type RoleMap = {
  DEFAULT_ADMIN_ROLE: string;
  MANUFACTURER_ROLE: string;
  DEALER_ROLE: string;
  REGULATOR_ROLE: string;
  PRIVATE_OWNER_ROLE: string;
};

type RoleCheckResult = {
  DEFAULT_ADMIN_ROLE: boolean;
  MANUFACTURER_ROLE: boolean;
  DEALER_ROLE: boolean;
  REGULATOR_ROLE: boolean;
  PRIVATE_OWNER_ROLE: boolean;
};

type ContractMeta = {
  name: string;
  symbol: string;
  supportsAccessControl: boolean;
  supportsERC721: boolean;
  supportsERC721Metadata: boolean;
};

const ERC165_IDS = {
  IAccessControl: '0x7965db0b',
  IERC721: '0x80ac58cd',
  IERC721Metadata: '0x5b5e139f',
};

export default function VehicleAdmin() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider('eip155');
  const { disconnect } = useDisconnect();

  const [status, setStatus] = useState<string | React.ReactNode>('');
  const [busy, setBusy] = useState(false);

  const [contractMeta, setContractMeta] = useState<ContractMeta | null>(null);
  const [roles, setRoles] = useState<RoleMap | null>(null);
  const [myRoles, setMyRoles] = useState<RoleCheckResult | null>(null);

  const [lookupAddress, setLookupAddress] = useState('');
  const [lookupRoles, setLookupRoles] = useState<RoleCheckResult | null>(null);

  const [grantTarget, setGrantTarget] = useState('');
  const [grantRoleKey, setGrantRoleKey] = useState<keyof RoleMap>('MANUFACTURER_ROLE');

  const [revokeTarget, setRevokeTarget] = useState('');
  const [revokeRoleKey, setRevokeRoleKey] = useState<keyof RoleMap>('MANUFACTURER_ROLE');

  const [renounceRoleKey, setRenounceRoleKey] = useState<keyof RoleMap>('MANUFACTURER_ROLE');

  const shortAddress = useMemo(() => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, [address]);

  const validateAddress = (value: string) => {
    try {
      return ethers.getAddress(value.trim());
    } catch {
      throw new Error('Invalid address');
    }
  };

  const build = async () => {
    if (!walletProvider) {
      throw new Error('Wallet provider not available. Connect wallet first.');
    }

    const provider = walletProvider as any;
    if (typeof provider.request !== 'function') {
      throw new Error('Invalid wallet provider interface.');
    }

    const browserProvider = new ethers.BrowserProvider(provider);
    const network = await browserProvider.getNetwork();

    if (Number(network.chainId) !== TARGET_CHAIN_ID) {
      throw new Error(
        `Wrong network. Switch wallet to Avalanche Fuji (${TARGET_CHAIN_ID}). Current chain: ${network.chainId.toString()}`
      );
    }

    const code = await browserProvider.getCode(CONTRACT_ADDRESS);
    if (!code || code === '0x') {
      throw new Error(`No contract deployed at ${CONTRACT_ADDRESS} on Fuji.`);
    }

    const signer = await browserProvider.getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, vehicleRegistryABI, signer);

    return { browserProvider, signer, contract };
  };

  const parseError = async (err: any, contract?: ethers.Contract) => {
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
            return `Access denied. ${account} is missing role ${neededRole}`;
          }

          if (parsed.name === 'AccessControlBadConfirmation') {
            return 'Bad confirmation address for renounceRole.';
          }

          return `${parsed.name}${parsed.args?.length ? `: ${parsed.args.map((x: any) => String(x)).join(', ')}` : ''}`;
        }
      } catch {
        // ignore
      }
    }

    return (
      err?.shortMessage ||
      err?.reason ||
      err?.message ||
      'Unknown contract error'
    );
  };

  const loadRolesAndMeta = async () => {
    if (!isConnected || !address) {
      setStatus('Connect wallet first.');
      return;
    }

    setBusy(true);
    setStatus('Loading contract info...');

    try {
      const { contract } = await build();

      const [
        name,
        symbol,
        defaultAdminRole,
        manufacturerRole,
        dealerRole,
        regulatorRole,
        privateOwnerRole,
        supportsAccessControl,
        supportsERC721,
        supportsERC721Metadata,
      ] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.DEFAULT_ADMIN_ROLE(),
        contract.MANUFACTURER_ROLE(),
        contract.DEALER_ROLE(),
        contract.REGULATOR_ROLE(),
        contract.PRIVATE_OWNER_ROLE(),
        contract.supportsInterface(ERC165_IDS.IAccessControl),
        contract.supportsInterface(ERC165_IDS.IERC721),
        contract.supportsInterface(ERC165_IDS.IERC721Metadata),
      ]);

      const nextRoles: RoleMap = {
        DEFAULT_ADMIN_ROLE: defaultAdminRole,
        MANUFACTURER_ROLE: manufacturerRole,
        DEALER_ROLE: dealerRole,
        REGULATOR_ROLE: regulatorRole,
        PRIVATE_OWNER_ROLE: privateOwnerRole,
      };

      setRoles(nextRoles);
      setContractMeta({
        name,
        symbol,
        supportsAccessControl,
        supportsERC721,
        supportsERC721Metadata,
      });

      const checks = await Promise.all([
        contract.hasRole(nextRoles.DEFAULT_ADMIN_ROLE, address),
        contract.hasRole(nextRoles.MANUFACTURER_ROLE, address),
        contract.hasRole(nextRoles.DEALER_ROLE, address),
        contract.hasRole(nextRoles.REGULATOR_ROLE, address),
        contract.hasRole(nextRoles.PRIVATE_OWNER_ROLE, address),
      ]);

      setMyRoles({
        DEFAULT_ADMIN_ROLE: checks[0],
        MANUFACTURER_ROLE: checks[1],
        DEALER_ROLE: checks[2],
        REGULATOR_ROLE: checks[3],
        PRIVATE_OWNER_ROLE: checks[4],
      });

      setStatus('Contract info loaded.');
    } catch (err: any) {
      console.error(err);
      setStatus(`Load failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setBusy(false);
    }
  };

  const checkAddressRoles = async () => {
    if (!roles) {
      setStatus('Load contract info first.');
      return;
    }

    setBusy(true);
    setStatus('Checking address roles...');

    try {
      const target = validateAddress(lookupAddress);
      const { contract } = await build();

      const checks = await Promise.all([
        contract.hasRole(roles.DEFAULT_ADMIN_ROLE, target),
        contract.hasRole(roles.MANUFACTURER_ROLE, target),
        contract.hasRole(roles.DEALER_ROLE, target),
        contract.hasRole(roles.REGULATOR_ROLE, target),
        contract.hasRole(roles.PRIVATE_OWNER_ROLE, target),
      ]);

      setLookupRoles({
        DEFAULT_ADMIN_ROLE: checks[0],
        MANUFACTURER_ROLE: checks[1],
        DEALER_ROLE: checks[2],
        REGULATOR_ROLE: checks[3],
        PRIVATE_OWNER_ROLE: checks[4],
      });

      setStatus(`Role check complete for ${target}`);
    } catch (err: any) {
      console.error(err);
      setStatus(`Role check failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setBusy(false);
    }
  };

  const grantRole = async () => {
    if (!roles) {
      setStatus('Load contract info first.');
      return;
    }

    setBusy(true);
    setStatus('Granting role...');

    try {
      const target = validateAddress(grantTarget);
      const { contract } = await build();
      const roleValue = roles[grantRoleKey];

      try {
        await contract.grantRole.staticCall(roleValue, target);
      } catch (err: any) {
        const msg = await parseError(err, contract);
        setStatus(`Simulation failed: ${msg}`);
        setBusy(false);
        return;
      }

      const tx = await contract.grantRole(roleValue, target);
      setStatus(`Grant tx sent: ${tx.hash}`);

      await tx.wait();

      setStatus(
        <span>
          Granted {grantRoleKey} to {target}.{' '}
          <a
            href={`${TX_BASE}${tx.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#4ea1ff', textDecoration: 'underline' }}
          >
            View tx
          </a>
        </span>
      );

      if (target.toLowerCase() === address?.toLowerCase()) {
        await loadRolesAndMeta();
      }
    } catch (err: any) {
      console.error(err);
      try {
        const { contract } = await build();
        const msg = await parseError(err, contract);
        setStatus(`Grant failed: ${msg}`);
      } catch {
        setStatus(`Grant failed: ${err?.message || 'Unknown error'}`);
      }
    } finally {
      setBusy(false);
    }
  };

  const revokeRole = async () => {
    if (!roles) {
      setStatus('Load contract info first.');
      return;
    }

    setBusy(true);
    setStatus('Revoking role...');

    try {
      const target = validateAddress(revokeTarget);
      const { contract } = await build();
      const roleValue = roles[revokeRoleKey];

      try {
        await contract.revokeRole.staticCall(roleValue, target);
      } catch (err: any) {
        const msg = await parseError(err, contract);
        setStatus(`Simulation failed: ${msg}`);
        setBusy(false);
        return;
      }

      const tx = await contract.revokeRole(roleValue, target);
      setStatus(`Revoke tx sent: ${tx.hash}`);

      await tx.wait();

      setStatus(
        <span>
          Revoked {revokeRoleKey} from {target}.{' '}
          <a
            href={`${TX_BASE}${tx.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#4ea1ff', textDecoration: 'underline' }}
          >
            View tx
          </a>
        </span>
      );

      if (target.toLowerCase() === address?.toLowerCase()) {
        await loadRolesAndMeta();
      }
    } catch (err: any) {
      console.error(err);
      try {
        const { contract } = await build();
        const msg = await parseError(err, contract);
        setStatus(`Revoke failed: ${msg}`);
      } catch {
        setStatus(`Revoke failed: ${err?.message || 'Unknown error'}`);
      }
    } finally {
      setBusy(false);
    }
  };

  const renounceRole = async () => {
    if (!roles || !address) {
      setStatus('Connect wallet and load contract info first.');
      return;
    }

    setBusy(true);
    setStatus('Renouncing role...');

    try {
      const { contract } = await build();
      const roleValue = roles[renounceRoleKey];

      try {
        await contract.renounceRole.staticCall(roleValue, address);
      } catch (err: any) {
        const msg = await parseError(err, contract);
        setStatus(`Simulation failed: ${msg}`);
        setBusy(false);
        return;
      }

      const tx = await contract.renounceRole(roleValue, address);
      setStatus(`Renounce tx sent: ${tx.hash}`);

      await tx.wait();

      setStatus(
        <span>
          Renounced {renounceRoleKey}.{' '}
          <a
            href={`${TX_BASE}${tx.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#4ea1ff', textDecoration: 'underline' }}
          >
            View tx
          </a>
        </span>
      );

      await loadRolesAndMeta();
    } catch (err: any) {
      console.error(err);
      try {
        const { contract } = await build();
        const msg = await parseError(err, contract);
        setStatus(`Renounce failed: ${msg}`);
      } catch {
        setStatus(`Renounce failed: ${err?.message || 'Unknown error'}`);
      }
    } finally {
      setBusy(false);
    }
  };

  const selfGrantPrivateOwnerRole = async () => {
    setBusy(true);
    setStatus('Calling grantPrivateOwnerRole()...');

    try {
      const { contract } = await build();

      try {
        await contract.grantPrivateOwnerRole.staticCall();
      } catch (err: any) {
        const msg = await parseError(err, contract);
        setStatus(`Simulation failed: ${msg}`);
        setBusy(false);
        return;
      }

      const tx = await contract.grantPrivateOwnerRole();
      setStatus(`Self-grant tx sent: ${tx.hash}`);

      await tx.wait();

      setStatus(
        <span>
          PRIVATE_OWNER_ROLE granted to connected wallet.{' '}
          <a
            href={`${TX_BASE}${tx.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#4ea1ff', textDecoration: 'underline' }}
          >
            View tx
          </a>
        </span>
      );

      await loadRolesAndMeta();
    } catch (err: any) {
      console.error(err);
      try {
        const { contract } = await build();
        const msg = await parseError(err, contract);
        setStatus(`Self-grant failed: ${msg}`);
      } catch {
        setStatus(`Self-grant failed: ${err?.message || 'Unknown error'}`);
      }
    } finally {
      setBusy(false);
    }
  };

  const renderRoleChecks = (data: RoleCheckResult | null) => {
    if (!data) return null;

    const entries = Object.entries(data) as Array<[keyof RoleCheckResult, boolean]>;

    return (
      <div style={{ display: 'grid', gap: '0.5rem' }}>
        {entries.map(([key, value]) => (
          <div
            key={key}
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.04)',
              display: 'flex',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            <span>{key}</span>
            <strong style={{ color: value ? '#4ade80' : '#f87171' }}>
              {value ? 'YES' : 'NO'}
            </strong>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '980px', margin: '0 auto', color: 'white' }}>
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

      <h1 style={{ marginBottom: '1rem' }}>Vehicle Registry Admin</h1>

      {!isConnected ? (
        <button
          onClick={() => open()}
          style={{
            padding: '0.8rem 1.2rem',
            borderRadius: '10px',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Connect Wallet
        </button>
      ) : (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '1rem',
            alignItems: 'center',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ fontWeight: 700 }}>Connected: {shortAddress}</div>
            <div style={{ opacity: 0.8, fontSize: '0.95rem' }}>{address}</div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={loadRolesAndMeta}
              disabled={busy}
              style={{
                padding: '0.7rem 1rem',
                borderRadius: '10px',
                border: 'none',
                cursor: busy ? 'not-allowed' : 'pointer',
              }}
            >
              Load Contract Info
            </button>

            <button
              onClick={() => disconnect()}
              style={{
                padding: '0.7rem 1rem',
                borderRadius: '10px',
                border: 'none',
                background: '#dc3545',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              Disconnect
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          borderRadius: '12px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          wordBreak: 'break-word',
        }}
      >
        <div><strong>Contract:</strong> {CONTRACT_ADDRESS}</div>
        <div><strong>Chain:</strong> Avalanche Fuji ({TARGET_CHAIN_ID})</div>
      </div>

      {contractMeta && (
        <div
          style={{
            marginBottom: '1.5rem',
            padding: '1rem',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <h2 style={{ marginTop: 0 }}>Contract Metadata</h2>
          <div><strong>Name:</strong> {contractMeta.name}</div>
          <div><strong>Symbol:</strong> {contractMeta.symbol}</div>
          <div><strong>Supports AccessControl:</strong> {String(contractMeta.supportsAccessControl)}</div>
          <div><strong>Supports ERC721:</strong> {String(contractMeta.supportsERC721)}</div>
          <div><strong>Supports ERC721Metadata:</strong> {String(contractMeta.supportsERC721Metadata)}</div>
        </div>
      )}

      {roles && (
        <div
          style={{
            marginBottom: '1.5rem',
            padding: '1rem',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            wordBreak: 'break-all',
          }}
        >
          <h2 style={{ marginTop: 0 }}>Role Constants</h2>
          <div><strong>DEFAULT_ADMIN_ROLE:</strong> {roles.DEFAULT_ADMIN_ROLE}</div>
          <div><strong>MANUFACTURER_ROLE:</strong> {roles.MANUFACTURER_ROLE}</div>
          <div><strong>DEALER_ROLE:</strong> {roles.DEALER_ROLE}</div>
          <div><strong>REGULATOR_ROLE:</strong> {roles.REGULATOR_ROLE}</div>
          <div><strong>PRIVATE_OWNER_ROLE:</strong> {roles.PRIVATE_OWNER_ROLE}</div>
        </div>
      )}

      <div
        style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          borderRadius: '12px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <h2 style={{ marginTop: 0 }}>Connected Wallet Roles</h2>
        {renderRoleChecks(myRoles)}
      </div>

      <div
        style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          borderRadius: '12px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <h2 style={{ marginTop: 0 }}>Check Any Address</h2>

        <input
          type="text"
          placeholder="0x..."
          value={lookupAddress}
          onChange={(e) => setLookupAddress(e.target.value)}
          style={{
            width: '100%',
            padding: '0.8rem',
            marginBottom: '1rem',
            borderRadius: '10px',
          }}
        />

        <button
          onClick={checkAddressRoles}
          disabled={busy || !roles}
          style={{
            width: '100%',
            padding: '0.8rem',
            borderRadius: '10px',
            border: 'none',
            cursor: busy ? 'not-allowed' : 'pointer',
            marginBottom: '1rem',
          }}
        >
          Check Address Roles
        </button>

        {renderRoleChecks(lookupRoles)}
      </div>

      <div
        style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          borderRadius: '12px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <h2 style={{ marginTop: 0 }}>Grant Role</h2>

        <select
          value={grantRoleKey}
          onChange={(e) => setGrantRoleKey(e.target.value as keyof RoleMap)}
          style={{
            width: '100%',
            padding: '0.8rem',
            marginBottom: '1rem',
            borderRadius: '10px',
          }}
        >
          <option value="DEFAULT_ADMIN_ROLE">DEFAULT_ADMIN_ROLE</option>
          <option value="MANUFACTURER_ROLE">MANUFACTURER_ROLE</option>
          <option value="DEALER_ROLE">DEALER_ROLE</option>
          <option value="REGULATOR_ROLE">REGULATOR_ROLE</option>
          <option value="PRIVATE_OWNER_ROLE">PRIVATE_OWNER_ROLE</option>
        </select>

        <input
          type="text"
          placeholder="Address to grant role to"
          value={grantTarget}
          onChange={(e) => setGrantTarget(e.target.value)}
          style={{
            width: '100%',
            padding: '0.8rem',
            marginBottom: '1rem',
            borderRadius: '10px',
          }}
        />

        <button
          onClick={grantRole}
          disabled={busy || !roles}
          style={{
            width: '100%',
            padding: '0.8rem',
            borderRadius: '10px',
            border: 'none',
            cursor: busy ? 'not-allowed' : 'pointer',
          }}
        >
          Grant Role
        </button>
      </div>

      <div
        style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          borderRadius: '12px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <h2 style={{ marginTop: 0 }}>Revoke Role</h2>

        <select
          value={revokeRoleKey}
          onChange={(e) => setRevokeRoleKey(e.target.value as keyof RoleMap)}
          style={{
            width: '100%',
            padding: '0.8rem',
            marginBottom: '1rem',
            borderRadius: '10px',
          }}
        >
          <option value="DEFAULT_ADMIN_ROLE">DEFAULT_ADMIN_ROLE</option>
          <option value="MANUFACTURER_ROLE">MANUFACTURER_ROLE</option>
          <option value="DEALER_ROLE">DEALER_ROLE</option>
          <option value="REGULATOR_ROLE">REGULATOR_ROLE</option>
          <option value="PRIVATE_OWNER_ROLE">PRIVATE_OWNER_ROLE</option>
        </select>

        <input
          type="text"
          placeholder="Address to revoke role from"
          value={revokeTarget}
          onChange={(e) => setRevokeTarget(e.target.value)}
          style={{
            width: '100%',
            padding: '0.8rem',
            marginBottom: '1rem',
            borderRadius: '10px',
          }}
        />

        <button
          onClick={revokeRole}
          disabled={busy || !roles}
          style={{
            width: '100%',
            padding: '0.8rem',
            borderRadius: '10px',
            border: 'none',
            cursor: busy ? 'not-allowed' : 'pointer',
          }}
        >
          Revoke Role
        </button>
      </div>

      <div
        style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          borderRadius: '12px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <h2 style={{ marginTop: 0 }}>Renounce My Role</h2>

        <select
          value={renounceRoleKey}
          onChange={(e) => setRenounceRoleKey(e.target.value as keyof RoleMap)}
          style={{
            width: '100%',
            padding: '0.8rem',
            marginBottom: '1rem',
            borderRadius: '10px',
          }}
        >
          <option value="DEFAULT_ADMIN_ROLE">DEFAULT_ADMIN_ROLE</option>
          <option value="MANUFACTURER_ROLE">MANUFACTURER_ROLE</option>
          <option value="DEALER_ROLE">DEALER_ROLE</option>
          <option value="REGULATOR_ROLE">REGULATOR_ROLE</option>
          <option value="PRIVATE_OWNER_ROLE">PRIVATE_OWNER_ROLE</option>
        </select>

        <button
          onClick={renounceRole}
          disabled={busy || !roles}
          style={{
            width: '100%',
            padding: '0.8rem',
            borderRadius: '10px',
            border: 'none',
            cursor: busy ? 'not-allowed' : 'pointer',
            background: '#b45309',
            color: 'white',
          }}
        >
          Renounce Selected Role
        </button>
      </div>

      <div
        style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          borderRadius: '12px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <h2 style={{ marginTop: 0 }}>Self-Service</h2>

        <div style={{ marginBottom: '1rem', opacity: 0.9 }}>
          This contract lets any wallet call <code>grantPrivateOwnerRole()</code> for itself.
        </div>

        <button
          onClick={selfGrantPrivateOwnerRole}
          disabled={busy}
          style={{
            width: '100%',
            padding: '0.8rem',
            borderRadius: '10px',
            border: 'none',
            cursor: busy ? 'not-allowed' : 'pointer',
            background: '#2563eb',
            color: 'white',
          }}
        >
          Grant PRIVATE_OWNER_ROLE To Me
        </button>
      </div>

      {status && (
        <div
          style={{
            marginTop: '1rem',
            padding: '1rem',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
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
