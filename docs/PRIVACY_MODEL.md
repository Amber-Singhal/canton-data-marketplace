# Privacy Model for the Canton Data Marketplace

This document outlines the privacy and data management model for the Canton Data Marketplace. The core principle is to leverage Canton's privacy-by-design architecture to manage data licensing and settlement without ever bringing the raw, sensitive datasets onto the ledger.

## 1. Guiding Principles

1.  **Data Sovereignty**: The raw data being licensed **never** leaves the Data Provider's secure, off-chain infrastructure.
2.  **Need-to-Know Basis**: Canton ensures that only the parties directly involved in a transaction (e.g., a specific license agreement) can view its details. Other participants on the marketplace, including the Marketplace Operator, cannot see the private commercial terms between a provider and a consumer.
3.  **On-Chain Authorization, Off-Chain Access**: The Daml contracts on the Canton ledger represent legally and technically enforceable *rights* and *obligations*. The consummation of a `LicenseAgreement` contract serves as an authorization token that the consumer can use to gain access to the data through a secure, off-chain channel.

---

## 2. On-Chain vs. Off-Chain Data

The separation between on-chain and off-chain data is strict and fundamental to the marketplace's design.

### On-Chain Data (Stored on the Canton Ledger)

The following information is managed as Daml contracts on the Canton ledger. The visibility of each contract is strictly limited to its stakeholders.

| Contract / Data Element            | Description                                                                                             | Who Can See It?                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **`DatasetListing`**               | A public catalog entry describing a dataset: name, description, category, provider, and pricing model.  | Data Provider, Marketplace Operator, all potential Data Consumers.  |
| **`LicenseAgreement`**             | The private, bilateral agreement between a provider and a consumer. Contains specific terms like price, duration, and usage restrictions. | **Only** the specific Data Provider and Data Consumer involved.     |
| **`UsageRight`**                   | A token-like contract representing the consumer's active right to access the licensed data. This is the "proof of purchase". | **Only** the specific Data Provider and Data Consumer involved.     |
| **`RoyaltyPaymentObligation`**     | Financial obligations for royalty payments and marketplace fees resulting from a license sale.          | Data Provider, Data Consumer, Marketplace Operator.                 |
| **Data Integrity Hashes (Checksums)** | Hashes (e.g., SHA-256) of the off-chain dataset can be included in the `DatasetListing` to verify data integrity. | Publicly visible as part of the listing.                            |
| **Party Identities**               | The Canton `Party` identifiers for all participants. E.g., `Provider::1220...`, `Consumer::1220...`. | Varies by contract stakeholder set.                                 |

### Off-Chain Data (Never on the Canton Ledger)

The following data is kept entirely off-chain, managed by the participants in their own systems.

| Data Element                        | Description                                                                     | Storage Location                                       |
| ----------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------ |
| **The Raw Datasets**                | The actual data being licensed (e.g., CSV files, images, scientific data, etc.). | Data Provider's secure storage (e.g., S3, GCP, private server). |
| **Personally Identifiable Information (PII)** | Detailed information about users beyond their Canton Party ID (real names, emails, billing info). | Secure, off-chain user management systems.             |
| **Data Access Credentials**         | Short-lived API keys, signed URLs, or access tokens used to download the data.  | Generated on-demand by the provider's off-chain API gateway. |
| **Negotiations & Communication**    | Any pre-agreement chats or negotiations between parties.                        | Off-chain communication channels (email, messaging, etc.). |

---

## 3. The Data Access Workflow: A Privacy-Preserving Journey

This flow illustrates how privacy is maintained at each step.

1.  **Discovery**: A Data Consumer browses public `DatasetListing` contracts on the marketplace. This reveals no private information.
2.  **Proposal**: The Consumer initiates a transaction to create a `LicenseAgreement` proposal with the Data Provider.
3.  **Acceptance & Settlement**: The Provider accepts the proposal. This atomically creates a private `LicenseAgreement` contract. **Crucially, only the Provider and Consumer's Canton participant nodes process and store this contract.** The Marketplace Operator and other network participants are blind to its existence and terms.
4.  **On-Chain Proof**: The active `LicenseAgreement` or `UsageRight` contract on the ledger now serves as an immutable and verifiable proof-of-purchase for the Consumer.
5.  **Off-Chain Access**:
    *   The Consumer's application makes a request to the Data Provider's off-chain API Gateway.
    *   This request includes proof of their identity (`Party`) and a reference to the `UsageRight` contract ID on the ledger.
    *   The Provider's API Gateway verifies this information by querying its own Canton participant node. It confirms that the requesting party is a stakeholder on a valid, active `UsageRight` contract.
    *   Upon successful verification, the gateway generates and returns a short-lived, secure access token or signed URL (e.g., an S3 pre-signed URL) for the Consumer to download the data directly from the Provider's storage.

This mechanism ensures that access to the raw data is gated by the state of the on-chain contracts without ever exposing the data itself to the network.

## 4. Diagram: On-Chain vs. Off-Chain Boundary

```
+-------------------------------------------------+      +-----------------------------------------+
|                OFF-CHAIN WORLD                  |      |             ON-CHAIN WORLD              |
|          (Provider & Consumer Systems)          |      |         (Canton Network Ledger)         |
+-------------------------------------------------+      +-----------------------------------------+
|                                                 |      |                                         |
|  [Raw Datasets] <----------------------------+  |      |   +-----------------+                   |
|  (e.g., S3 Bucket, private server)           |  |      |   | DatasetListing  | (Public)          |
|                                              |  |      |   +-----------------+                   |
|  +--------------------------+                |  |      |                                         |
|  | Provider's API Gateway |<-- 5. Verify ---+  |      |   +--------------------+                  |
|  +--------------------------+                |  |      |   | LicenseAgreement   | (Private to P,C)|
|    ^          |                              |  |      |   +--------------------+<-- 3. Create   |
|    |          | 6. Grant Access              |  |      |   | UsageRight         | (Private to P,C)|
|    | 4. Request |                              |  |      |   +--------------------+                  |
|    |   Data    |                              |  |      |   | RoyaltyObligation  | (P,C,Operator) |
|    |          |                              |  |      |   +--------------------+                  |
|    +----------+                              |  |      |                                         |
|                                              |  |      |                                         |
|  +---------------------+                     |  |      +-----------------------------------------+
|  | Consumer's dApp   | --------------------------------> 1. Discover, 2. Propose
|  +---------------------+                     |
|                                                 |
|                                                 |
+-------------------------------------------------+

P = Provider, C = Consumer
```