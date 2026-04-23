# Canton Data Marketplace

[![CI](https://github.com/digital-asset/canton-data-marketplace/actions/workflows/ci.yml/badge.svg)](https://github.com/digital-asset/canton-data-marketplace/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

A privacy-preserving data licensing marketplace built on the [Canton Network](https://www.canton.io/). This project demonstrates how to build sophisticated, multi-party applications where sensitive data and commercial terms remain confidential, while still enabling atomic, on-ledger settlement and verifiable audit trails.

Data Providers can list datasets for licensing, and Data Consumers can request access. The platform manages the entire lifecycle of a data license—from proposal and negotiation to usage rights and revenue sharing—without ever exposing the underlying data on-chain.

## Core Concepts

The marketplace is built around two primary roles:

*   **Data Providers**: Entities that own valuable datasets and wish to monetize them. They define the licensing terms, including price, usage duration, and any restrictions.
*   **Data Consumers**: Entities that need access to specific datasets for their business operations, such as analytics, machine learning, or research. They browse the marketplace, request licenses, and pay for access.

The core workflow is as follows:
1.  **Listing**: A Data Provider publishes a `DatasetDetails` contract, which contains public metadata about a dataset (name, description, category) but no sensitive information.
2.  **Licensing Proposal**: A Data Consumer requests a license for a specific dataset by creating a `LicenseRequest` contract, viewable only by the Provider.
3.  **Agreement**: The Provider accepts the request, which atomically creates a `LicenseAgreement` contract. This contract represents the legally binding agreement and is shared only between the Provider and the Consumer. It specifies the terms and contains a secure, off-chain access token or key.
4.  **Revenue Sharing**: If the license involves a fee, the agreement can trigger an on-chain settlement process using a Canton-native token, ensuring atomic delivery-versus-payment (DvP).

## Features

*   **Privacy by Design**: Canton's privacy protocol ensures that license agreements and commercial terms are only visible to the involved parties (Provider and Consumer). Competitors cannot see each other's deals.
*   **On-Chain Licensing & Rights Management**: Data access rights are represented as Daml smart contracts (UTXOs), providing a single source of truth for who can access what, and under which conditions.
*   **Atomic Settlement**: License issuance and payment are settled atomically in a single transaction, eliminating counterparty risk.
*   **Verifiable Audit Trail**: Every state change on the ledger is cryptographically signed, creating an immutable and auditable history of all licensing activities for regulators or auditors.
*   **Off-Chain Data, On-Chain Control**: The actual datasets remain off-chain in the Provider's secure infrastructure. Only the *rights* to access that data are tokenized and managed on the ledger.

## Technology Stack

*   **Smart Contracts**: [Daml](https://www.daml.com/)
*   **Ledger**: [Canton Network](https://www.canton.io/) (via `dpm sandbox` for local development)
*   **Build/Test Toolchain**: [DPM (Digital Asset Package Manager)](https://docs.daml.com/dpm/index.html)
*   **Frontend**: TypeScript, React, Vite
*   **UI Components**: Material UI
*   **Ledger Integration**: `@c7/react` for real-time ledger state synchronization.

## Prerequisites

Before you begin, ensure you have the following installed:

1.  **DPM (v3.4.0 or later)**: The official package manager for the Daml ecosystem.
    ```bash
    curl https://get.digitalasset.com/install/install.sh | sh
    ```
2.  **Node.js (v18.x or later)** and **npm**:
    ```bash
    # Check your version
    node -v
    npm -v
    ```

## Getting Started

Follow these steps to run the application locally.

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/digital-asset/canton-data-marketplace.git
    cd canton-data-marketplace
    ```

2.  **Build the Daml Contracts**
    This command compiles your Daml code into a `.dar` (Daml Archive) file.
    ```bash
    dpm build
    ```

3.  **Start the Local Canton Ledger**
    This command starts a local Canton network (a "sandbox") and deploys your `.dar` file to it. The JSON API will be available on port `7575`.
    ```bash
    dpm sandbox
    ```
    Keep this process running in a separate terminal window.

4.  **Install Frontend Dependencies**
    Navigate to the `frontend` directory and install the required npm packages.
    ```bash
    cd frontend
    npm install
    ```

5.  **Run the Frontend Application**
    This starts the React development server.
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:5173`.

## Onboarding Guide

To interact with the marketplace, you first need to create parties representing the Data Provider and Data Consumer. We use Daml Script to set up the initial contracts on the ledger.

### For Data Providers

To onboard as a new Data Provider and list your first dataset, run the following script. This will:
1.  Allocate a new party for the Provider (e.g., "MegaCorp Analytics").
2.  Create a `DataProviderRole` contract, establishing their identity on the marketplace.
3.  Publish a `DatasetDetails` contract for a sample dataset.

**Command:**
```bash
# Make sure the sandbox is running
dpm script \
  --dar .daml/dist/canton-data-marketplace-0.1.0.dar \
  --script-name Marketplace.Onboarding:onboardProvider \
  --input-file daml/Script/providers.json \
  --ledger-host localhost \
  --ledger-port 6866
```

The `daml/Script/providers.json` file should contain the arguments for the script:
```json
{
  "providerName": "MegaCorp Analytics",
  "datasetId": "MCORP-001",
  "datasetName": "Global Retail Transactions Q1 2024",
  "datasetDescription": "Anonymized point-of-sale data from 50,000 retail locations worldwide.",
  "datasetCategory": "Retail",
  "price": "5000.0"
}
```

### For Data Consumers

To onboard as a new Data Consumer, run the following script. This will:
1.  Allocate a new party for the Consumer (e.g., "Quantum Insights").
2.  Create a `DataConsumerRole` contract.

**Command:**
```bash
dpm script \
  --dar .daml/dist/canton-data-marketplace-0.1.0.dar \
  --script-name Marketplace.Onboarding:onboardConsumer \
  --input-file daml/Script/consumers.json \
  --ledger-host localhost \
  --ledger-port 6866
```

The `daml/Script/consumers.json` file should contain:
```json
{
  "consumerName": "Quantum Insights"
}
```

After running these scripts, you can log into the UI with the newly created party names to see the state on the ledger.

## Project Structure

```
.
├── .github/workflows/ci.yml # GitHub Actions CI configuration
├── daml/                      # Daml smart contracts
│   ├── Marketplace/           # Core modules for the marketplace
│   │   ├── Model.daml
│   │   └── Role.daml
│   └── Script/                # Onboarding and setup scripts
│       ├── Onboarding.daml
│       └── Test.daml
├── docs/                      # Project documentation
│   └── PRIVACY_MODEL.md
├── frontend/                  # React/TypeScript frontend application
│   ├── src/
│   └── package.json
├── .gitignore
├── daml.yaml                  # Daml project configuration
└── README.md                  # This file
```

## Running Tests

To run the Daml Script tests defined in the `daml/Script` directory, use the `dpm test` command.
```bash
dpm test
```

## Privacy Model

For a detailed explanation of how Canton's architecture provides confidentiality and privacy for marketplace participants, please see [docs/PRIVACY_MODEL.md](docs/PRIVACY_MODEL.md).

## Contributing

Contributions are welcome! Please feel free to open an issue or submit a pull request.

1.  Fork the repository.
2.  Create a new feature branch (`git checkout -b feature/my-new-feature`).
3.  Commit your changes (`git commit -am 'Add some feature'`).
4.  Push to the branch (`git push origin feature/my-new-feature`).
5.  Create a new Pull Request.

## License

This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.