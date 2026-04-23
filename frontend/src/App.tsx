import React, { useState } from 'react';
import { DamlLedger, useParty, useLedger, useStreamQueries } from '@c7/react';
import { DatasetListing, LicenseAgreement } from '@daml.js/canton-data-marketplace-0.1.0/lib/Marketplace/Data';
import { DatasetCard } from './DatasetCard';
import { purchaseLicense } from './marketplaceService';
import './App.css';

// =================================================================================================
// Authentication Constants
// In a production app, these would be managed by a login flow using a discovery component
// (e.g., @daml-finance/discovery-component) to connect to a user's CIP-0103 wallet.
// For development, you can get a token from a running `dpm sandbox`.
//
// 1. Start sandbox: `dpm sandbox`
// 2. The sandbox will output party details with tokens, e.g., for 'Consumer'.
// 3. Copy the party ID and token below.
// =================================================================================================
const MOCK_AUTH = {
  party: 'Consumer::1220478....', // <-- REPLACE with your Consumer party ID
  // This is a sample JWT. Replace with the one from your sandbox.
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwczovL2RhbWwuY29tL2xlZGdlci1hcGkiOnsibGVkZ2VySWQiOiJteS1zYW5kYm94IiwiYXBwbGljYXRpb25JZCI6ImRhdGEtbWFya2V0cGxhY2UiLCJwYXJ0eSI6IkNvbnN1bWVyIn19.some-secret-part',
};

const LEDGER_URL = 'http://localhost:7575';


/**
 * Main application view, rendered after a user is authenticated.
 * It contains the marketplace and user dashboard views.
 */
const MainView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'marketplace' | 'dashboard'>('marketplace');
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null); // Store contractId being purchased
  const party = useParty();
  const ledger = useLedger();

  // Stream all available dataset listings from the ledger.
  // This is a live query; the UI will update automatically as new listings are created.
  const { contracts: listings, loading: listingsLoading } = useStreamQueries(DatasetListing);

  // Stream all license agreements where the current party is the consumer.
  const { contracts: licenses, loading: licensesLoading } = useStreamQueries(LicenseAgreement, () => ([{ consumer: party }]));

  const handlePurchase = async (listing: DatasetListing.CreateEvent) => {
    setIsPurchasing(listing.contractId);
    try {
      await purchaseLicense(ledger, listing.contractId);
      alert(`Successfully purchased license for "${listing.payload.details.name}"`);
    } catch (error) {
      console.error("Failed to purchase license:", error);
      alert(`Error purchasing license: ${error instanceof Error ? error.message : "An unknown error occurred"}`);
    } finally {
      setIsPurchasing(null);
    }
  };

  const renderMarketplace = () => {
    if (listingsLoading) return <div className="loading-state">Loading datasets...</div>;
    if (listings.length === 0) return <div className="empty-state">No datasets are currently available in the marketplace.</div>;

    return (
      <div className="card-grid">
        {listings.map(listing => (
          <DatasetCard
            key={listing.contractId}
            listing={listing}
            onPurchase={() => handlePurchase(listing)}
            isPurchasing={isPurchasing === listing.contractId}
          />
        ))}
      </div>
    );
  };

  const renderDashboard = () => {
    if (licensesLoading) return <div className="loading-state">Loading your licenses...</div>;
    if (licenses.length === 0) return <div className="empty-state">You have not purchased any data licenses yet.</div>;

    return (
      <div className="dashboard-list">
        <h2>Your Licensed Datasets</h2>
        {licenses.map(license => (
          <div key={license.contractId} className="dashboard-item">
            <h3>{license.payload.dataset.name}</h3>
            <p><strong>Provider:</strong> <span className="party-id">{license.payload.provider}</span></p>
            <p><strong>Licensed On:</strong> {new Date(license.payload.licenseDate).toLocaleDateString()}</p>
            <p><strong>Access Token (Encrypted):</strong> <code className="token-code">{license.payload.encryptedAccessToken}</code></p>
            <p className="explanation">
              <em>In a real application, you would use your private key to decrypt this access token and use it to authenticate with the off-chain data source.</em>
            </p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="main-container">
      <header className="app-header">
        <h1>Canton Data Marketplace</h1>
        <div className="user-info">
          <span>Logged in as:</span>
          <strong className="party-id">{party}</strong>
        </div>
      </header>
      <nav className="app-nav">
        <button
          className={activeTab === 'marketplace' ? 'active' : ''}
          onClick={() => setActiveTab('marketplace')}
        >
          Marketplace
        </button>
        <button
          className={activeTab === 'dashboard' ? 'active' : ''}
          onClick={() => setActiveTab('dashboard')}
        >
          My Dashboard
        </button>
      </nav>
      <main className="app-content">
        {activeTab === 'marketplace' ? renderMarketplace() : renderDashboard()}
      </main>
    </div>
  );
};

/**
 * Root component that wraps the application with the DamlLedger context.
 * In a real-world scenario, this would handle the full user authentication flow.
 */
const App: React.FC = () => {
  // Simple auth state for the example. A production app would have a more robust system.
  const [auth] = useState<{party: string, token: string} | null>(MOCK_AUTH);

  if (!auth) {
    return (
      <div className="login-container">
        <h1>Login to Canton Data Marketplace</h1>
        <p>Authentication credentials not found. Please configure MOCK_AUTH in App.tsx.</p>
      </div>
    );
  }

  // The DamlLedger component provides the ledger context to all descendant components.
  // Any component within this provider can use hooks like `useLedger`, `useParty`, etc.
  return (
    <DamlLedger party={auth.party} token={auth.token} httpBaseUrl={LEDGER_URL}>
      <MainView />
    </DamlLedger>
  );
};

export default App;