// src/pages/AddVehicle.tsx
import { useState } from 'react';
import Tesseract from 'tesseract.js';
import { useAppKitAccount, useAppKit, useAppKitProvider } from '@reown/appkit/react';
import { ethers } from 'ethers';
import { vehicleRegistryABI } from '../lib/contractABI'; // Ensure this file exists

const CONTRACT_ADDRESS = '0x257674cC71476003D94F70795Db06feBdFA07C1d' as `0x${string}`;

function isEip1193Provider(provider: any): provider is ethers.Eip1193Provider {
  return (
    provider &&
    typeof provider === 'object' &&
    typeof provider.request === 'function'
  );
}

export default function AddVehicle() {
  const { address, isConnected } = useAppKitAccount();
  const { open } = useAppKit();

  // Top-level hook call — this is the correct place (fixes invalid hook call error)
  const { walletProvider } = useAppKitProvider('eip155');

  const [vin, setVin] = useState('');
  const [year, setYear] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [status, setStatus] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [destroyConfirmed, setDestroyConfirmed] = useState(false);
  const [isMinting, setIsMinting] = useState(false);

  // Handle photo upload + OCR
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);

    setOcrLoading(true);
    setStatus('Scanning title...');

    try {
      const { data: { text } } = await Tesseract.recognize(file, 'eng', {
        logger: (m) => console.log(m),
      });

      const vinMatch = text.match(/[A-HJ-NPR-Z0-9]{17}/i);
      if (vinMatch) {
        setVin(vinMatch[0].toUpperCase());
        setStatus('VIN extracted! Click Validate & Auto-Fill.');
      } else {
        setStatus('No valid 17-char VIN found. Enter manually.');
      }
    } catch (err) {
      console.error('OCR error:', err);
      setStatus('OCR failed. Enter VIN manually.');
    } finally {
      setOcrLoading(false);
    }
  };

  // Validate VIN via NHTSA API
  const validateVin = async () => {
    if (!vin.trim()) {
      setStatus('Enter or scan a VIN first');
      return;
    }

    setStatus('Validating...');

    try {
      const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin.trim()}?format=json`);
      const data = await res.json();
      const result = data.Results?.[0];

      if (result?.ErrorCode === '0') {
        setYear(result.ModelYear || '');
        setMake(result.Make || '');
        setModel(result.Model || '');
        setStatus(`Valid VIN! ${result?.recalls?.length || 0} open recall${result?.recalls?.length !== 1 ? 's' : ''} found.`);
      } else {
        setStatus(result?.ErrorText || 'Invalid VIN');
      }
    } catch (err) {
      console.error('Validation error:', err);
      setStatus('Validation service error');
    }
  };

  // Mint digital title
  const mint = async () => {
    if (!isConnected || !address) {
      setStatus('Connect wallet first');
      return;
    }
    if (!destroyConfirmed) {
      setStatus('Confirm destruction of paper title');
      return;
    }
    if (!vin.trim() || !year || !make || !model) {
      setStatus('Validate VIN and fill all fields');
      return;
    }

    setIsMinting(true);
    setStatus('Minting...');

    try {
      // Use the already-fetched provider (no hook call inside async)
      if (!walletProvider) {
        throw new Error('Wallet provider not available. Ensure wallet is connected.');
      }

      if (!isEip1193Provider(walletProvider)) {
        throw new Error('Invalid wallet provider interface.');
      }

      const ethersProvider = new ethers.BrowserProvider(walletProvider);
      const signer = await ethersProvider.getSigner();

      const contract = new ethers.Contract(CONTRACT_ADDRESS, vehicleRegistryABI, signer);

      const tx = await contract.mintVehicle(
        address,
        vin.trim(),
        make.trim(),
        model.trim(),
        parseInt(year || '0'),
        '' // qrCodeData (optional)
      );

      setStatus(`Transaction sent: ${tx.hash.slice(0, 10)}...`);
      await tx.wait();
      setStatus('Success! Digital title minted. Check Routescan.');
    } catch (err: any) {
      console.error('Mint failed:', err);
      setStatus(`Mint failed: ${err.shortMessage || err.message || 'Unknown error'}`);
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Vehicle Title Registry</h1>

      {!isConnected ? (
        <button onClick={() => open()}>Connect Wallet</button>
      ) : (
        <p>Connected: {address?.slice(0, 6)}...{address?.slice(-4)}</p>
      )}

      <div style={{ marginTop: '2rem' }}>
        <input type="file" accept="image/*" onChange={handleImageUpload} />
        {imagePreview && <img src={imagePreview} alt="Preview" style={{ maxWidth: '100%', marginTop: '1rem' }} />}
      </div>

      <input
        type="text"
        value={vin}
        onChange={(e) => setVin(e.target.value.toUpperCase())}
        placeholder="VIN (17 chars)"
        maxLength={17}
        style={{ width: '100%', marginTop: '1rem', padding: '0.5rem' }}
      />

      <button onClick={validateVin} disabled={ocrLoading} style={{ marginTop: '1rem', padding: '0.75rem 1.5rem' }}>
        {ocrLoading ? 'Scanning...' : 'Validate & Auto-Fill'}
      </button>

      <div style={{ marginTop: '1rem' }}>
        <p>Year: {year}</p>
        <p>Make: {make}</p>
        <p>Model: {model}</p>
      </div>

      <label style={{ display: 'block', marginTop: '1rem' }}>
        <input
          type="checkbox"
          checked={destroyConfirmed}
          onChange={(e) => setDestroyConfirmed(e.target.checked)}
        />
        I confirm I will destroy the paper title after digitization.
      </label>

      <button
        onClick={mint}
        disabled={isMinting || !isConnected || !destroyConfirmed || !vin.trim() || !year || !make || !model}
        style={{ marginTop: '2rem', padding: '1rem 2rem' }}
      >
        {isMinting ? 'Minting...' : 'Mint Digital Title'}
      </button>

      <p style={{ marginTop: '1rem', color: status.includes('Minted') || status.includes('success') ? 'green' : status.includes('failed') ? 'red' : 'black' }}>
        {status}
      </p>
    </div>
  );
}