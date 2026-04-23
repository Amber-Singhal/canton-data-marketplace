import React, { useState } from 'react';

/**
 * Type definition for a Dataset contract queried from the Canton ledger.
 * This would typically be generated from the Daml model using `dpm codegen-js`.
 */
export interface Dataset {
  contractId: string;
  payload: {
    provider: string;
    name: string;
    description: string;
    price: string; // Daml Decimal represented as a string
    currency: string;
    schema: {
      fieldName: string;
      fieldType: string;
    }[];
    averageRating: string; // Daml Decimal represented as a string
    ratingCount: number;
  };
}

interface DatasetCardProps {
  dataset: Dataset;
  onLicense: (dataset: Dataset) => Promise<void>;
  isProcessing?: boolean; // Optional prop to indicate a global processing state
}

const renderStars = (rating: number): JSX.Element[] => {
  const roundedRating = Math.round(rating * 2) / 2; // Round to nearest 0.5
  const stars = [];

  for (let i = 1; i <= 5; i++) {
    if (i <= roundedRating) {
      stars.push(<span key={`full-${i}`} style={styles.star}>★</span>);
    } else if (i - 0.5 === roundedRating) {
      // This case is covered by the full star logic for simplicity,
      // a real app might use a proper half-star icon.
      stars.push(<span key={`half-${i}`} style={styles.star}>★</span>);
    } else {
      stars.push(<span key={`empty-${i}`} style={styles.starEmpty}>☆</span>);
    }
  }
  return stars;
};

const formatProvider = (partyId: string): string => {
  // In a production app, this could resolve to a display name from a profile service.
  const parts = partyId.split('::');
  return parts[0] || 'Unknown Provider';
};

export const DatasetCard: React.FC<DatasetCardProps> = ({ dataset, onLicense, isProcessing = false }) => {
  const { name, description, price, currency, schema, provider, averageRating, ratingCount } = dataset.payload;
  const numericRating = parseFloat(averageRating);
  const [isLicensing, setIsLicensing] = useState(false);

  const handleLicenseClick = async () => {
    setIsLicensing(true);
    try {
      await onLicense(dataset);
    } catch (error) {
      console.error("Failed to license dataset:", error);
      // Here you might show an error toast to the user
    } finally {
      setIsLicensing(false);
    }
  };

  const isDisabled = isLicensing || isProcessing;

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h3 style={styles.title}>{name}</h3>
        <span style={styles.provider}>by {formatProvider(provider)}</span>
      </div>

      <p style={styles.description}>{description}</p>

      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>Data Schema</h4>
        <div style={styles.schemaContainer}>
          {schema.length > 0 ? (
            schema.map((field, index) => (
              <div key={index} style={styles.schemaRow}>
                <span style={styles.schemaFieldName}>{field.fieldName}</span>
                <span style={styles.schemaFieldType}>{field.fieldType}</span>
              </div>
            ))
          ) : (
            <div style={styles.schemaEmpty}>No schema provided.</div>
          )}
        </div>
      </div>

      <div style={styles.footer}>
        <div style={styles.ratingContainer}>
          {renderStars(numericRating)}
          <span style={styles.ratingText}>{numericRating.toFixed(1)} ({ratingCount})</span>
        </div>
        <div style={styles.priceContainer}>
          <span style={styles.price}>{parseFloat(price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span style={styles.currency}>{currency}</span>
        </div>
      </div>

      <button
        style={isDisabled ? { ...styles.button, ...styles.buttonDisabled } : styles.button}
        onClick={handleLicenseClick}
        disabled={isDisabled}
      >
        {isLicensing ? 'Processing...' : 'License Dataset'}
      </button>
    </div>
  );
};


// Note: For a production application, using a dedicated styling solution
// (like CSS Modules, Emotion, or Tailwind CSS) is recommended to handle
// pseudo-classes (e.g., :hover), media queries, and theming more effectively.
const styles: { [key: string]: React.CSSProperties } = {
  card: {
    border: '1px solid #e0e0e0',
    borderRadius: '12px',
    padding: '24px',
    backgroundColor: '#ffffff',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    width: '360px',
    boxSizing: 'border-box',
    transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
  },
  header: {
    borderBottom: '1px solid #f0f0f0',
    paddingBottom: '12px',
    marginBottom: '12px',
  },
  title: {
    fontSize: '22px',
    fontWeight: 600,
    color: '#1a1a1a',
    margin: '0 0 4px 0',
  },
  provider: {
    fontSize: '14px',
    color: '#595959',
  },
  description: {
    fontSize: '14px',
    color: '#595959',
    lineHeight: 1.5,
    flexGrow: 1,
    margin: '0 0 16px 0',
    maxHeight: '63px', // Approx 3 lines
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  section: {
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1a1a1a',
    marginBottom: '8px',
  },
  schemaContainer: {
    maxHeight: '110px',
    overflowY: 'auto',
    backgroundColor: '#f7f7f7',
    borderRadius: '6px',
    padding: '8px 12px',
    border: '1px solid #e8e8e8',
  },
  schemaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13px',
    padding: '6px 0',
  },
  schemaFieldName: {
    color: '#262626',
    fontFamily: '"SF Mono", "Consolas", "Menlo", monospace',
  },
  schemaFieldType: {
    color: '#595959',
    backgroundColor: '#e8e8e8',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 500,
  },
  schemaEmpty: {
    fontSize: '13px',
    color: '#8c8c8c',
    padding: '6px 0',
    fontStyle: 'italic',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 'auto',
    paddingTop: '16px',
    borderTop: '1px solid #f0f0f0',
  },
  ratingContainer: {
    display: 'flex',
    alignItems: 'center',
  },
  star: {
    color: '#ffc107',
    fontSize: '20px',
    marginRight: '1px',
  },
  starEmpty: {
    color: '#d9d9d9',
    fontSize: '20px',
    marginRight: '1px',
  },
  ratingText: {
    marginLeft: '8px',
    fontSize: '14px',
    color: '#595959',
    fontWeight: 500,
  },
  priceContainer: {
    textAlign: 'right',
  },
  price: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#096dd9',
  },
  currency: {
    fontSize: '14px',
    color: '#096dd9',
    marginLeft: '4px',
    fontWeight: 500,
  },
  button: {
    marginTop: '20px',
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    fontWeight: 600,
    color: '#fff',
    backgroundColor: '#096dd9',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease, opacity 0.2s ease',
  },
  buttonDisabled: {
    backgroundColor: '#a0c7e4',
    cursor: 'not-allowed',
    opacity: 0.7,
  },
};