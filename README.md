# Smart Picker - Warehouse Accuracy Platform for QuickBooks

![Smart Picker Logo](https://smartpicker.au/favicon.ico)

**Smart Picker is a warehouse accuracy and workflow platform that bridges the operational gap between creating a sales quote in QuickBooks and physically preparing the order for shipment.**

It replaces manual, paper-based picking lists with a secure, guided, and barcode-validated digital workflow, ensuring 100% accuracy before an order is finalized in your accounting system.

---

## The Problem It Solves

For many small to medium-sized businesses using QuickBooks, a major operational bottleneck exists between sales and the warehouse. The process of getting an order from a quote to a packed box is often manual, inefficient, and prone to costly errors.

Smart Picker directly addresses these pain points:

* **Eliminates Picking Errors:** By forcing barcode validation for every item, it's nearly impossible for a picker to pack the wrong product or incorrect quantity.
* **Removes Manual Data Entry:** Replaces printed quote sheets and manual checklists, reducing paper waste and the risk of working from an outdated document.
* **Enhances Security:** Allows warehouse staff to process orders without giving them full, unrestricted access to your company's sensitive financial data in QuickBooks.
* **Creates a Verifiable Workflow:** Provides a digital audit trail with a mandatory admin approval step before any data is sent back to QuickBooks, ensuring quality control.

---

## Core Features

* ✅ **Direct QuickBooks Integration:** Securely connects to your QuickBooks account using OAuth 2.0 to pull open quotes and push back finalized estimates.
* 📱 **Barcode-Validated Picking:** The core of the system. Pickers use a mobile device to scan each item's barcode, ensuring accuracy with instant feedback.
* 🔒 **Admin Approval Workflow:** Pickers submit completed orders for admin review. Admins have the final say and can make adjustments before the order is sent back to QuickBooks.
* 👥 **User Role Management:** An "Admin" role for managing the system and a "Picker" role with limited access to perform their specific tasks.
* 📦 **Real-Time Exception Handling:** Pickers can adjust quantities, add new products, or mark items as "Unavailable" or "Backorder" directly from the picking interface, with notes for the admin.
* 🚀 **Automated Product Enrichment:** An automated background process uses AWS Lambda to enrich product data from an uploaded Excel file with live information from QuickBooks like price and quantity on hand.
* 🚚 **Delivery Run Management (In Progress):** A planned feature to allow admins to create prioritized work queues ("Runs") for pickers, streamlining daily operations.

---

## How It Works: The Workflow

The application is built around a clear, multi-stage workflow from initial setup to finalization.

**1. Setup & Data Enrichment**
An admin connects QuickBooks and uploads a master product Excel file (Name, SKU, Barcode). This file is sent to AWS S3, triggering a Lambda function that processes the sheet and enriches it with live data from QuickBooks.

> <img width="2544" height="1260" alt="image" src="https://github.com/user-attachments/assets/0ad76608-abbf-455a-b4db-ad42c5171cdc" />

**2. The Picking Process**
A picker selects an open quote and begins scanning items. The interface provides real-time validation for every scan.

> <img width="2537" height="1261" alt="image" src="https://github.com/user-attachments/assets/c25423ef-2684-4b53-96e2-9f037887c354" />

**3. Admin Review & Approval**
The picker submits the completed order. It appears in the admin's queue for a final quality assurance check. The admin can see all changes and notes before approving.

> <img width="2536" height="1259" alt="image" src="https://github.com/user-attachments/assets/1789bb2b-5b60-41c0-8b29-9ecfea11136b" />

**4. Finalization**
Upon approval, a new, updated **Estimate** is created in QuickBooks, reflecting exactly what was physically picked. This provides a clean, accurate record ready for invoicing.

---

## Architecture & Technology Stack

Smart Picker is built with a modern, scalable architecture that separates concerns between the frontend, backend, and background processing jobs.

> **➡️ You should create and insert a simple architectural diagram here.**
> *The diagram should show boxes for: Frontend (React) -> Backend (Node.js) -> Database (Postgres). And a separate flow for: File Upload -> S3 -> Lambda -> QuickBooks API & Database.*

* **Frontend:** React
* **Backend:** Node.js, Express
* **Database:** PostgreSQL
* **Hosting & CI/CD:** Railway (hosting all three core services)
* **Cloud Services (AWS):**
    * **AWS S3:** For temporary storage of uploaded product files.
    * **AWS Lambda:** For serverless background processing of product files.
* **DNS & Security:** Cloudflare

---

## Getting Started (Development)

To run this project locally, you will need to have the following prerequisites installed.

### Prerequisites

* Node.js (v18.x or later)
* A local or cloud-hosted PostgreSQL instance
* An AWS Account (for S3 and Lambda)
* A QuickBooks Developer Account

### Environment Variables

Clone the repository and create a `.env` file in the `./backend` directory. Populate it with the following variables:

```env
# Server Configuration
NODE_ENV=development
BACKEND_PORT=5033

# Database
DATABASE_URL=...

# Session & CSRF
SESSION_SECRET=your-long-random-secret-string
INTERNAL_API_KEY=another-long-random-secret-string

# QuickBooks API Keys (Development)
CLIENT_ID_DEV=...
CLIENT_SECRET_DEV=...
REDIRECT_URI_DEV=http://localhost:5033/auth/callback

# AWS Configuration
AWS_REGION=...
AWS_BUCKET_NAME=...
# (Ensure your local environment or server has AWS credentials configured)

# Encryption Key for Tokens
AES_SECRET_KEY=a-32-byte-long-secret-key-for-aes-256
```

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/alann-h/picking-software.git
    cd smart-picker
    ```
2.  **Install backend dependencies:**
    ```bash
    cd backend
    npm install
    ```
3.  **Install frontend dependencies:**
    ```bash
    cd ../frontend
    npm install
    ```

### Running the Application

1.  **Start the backend server:**
    ```bash
    # from the /backend directory
    npm run dev
    ```
2.  **Start the frontend development server:**
    ```bash
    # from the /frontend directory
    npm run dev
    ```

The frontend will be available at `http://localhost:3000` and the backend at `http://localhost:5033`.

---

## API Documentation

API endpoints are documented using Swagger. Once the backend server is running, the documentation is available at `http://localhost:5033/docs`.
```
</markdown>
```
