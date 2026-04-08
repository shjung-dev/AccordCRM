[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/ojTTbieH)


# AccordCRM — Scrooge Global Bank

> A cloud-native, modular Customer Relationship Management (CRM) platform built for **Scrooge Global Bank** as part of **CS301 – Enterprise Solution Development (AY2025/26 T2, Group G2-T2)**.

AccordCRM manages bank agents, client profiles, accounts, transactions, audit logs, and an AI-assisted copilot — built with a microservices backend (Spring Boot), a Next.js frontend, and a fully codified AWS infrastructure deployed via Terraform.

**Live application:** https://d2rovljjp79ivt.cloudfront.net

---

## Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [Architecture](#architecture)
4. [Tech Stack](#tech-stack)
5. [Repository Structure](#repository-structure)
6. [Getting Started](#getting-started)
7. [Local Development](#local-development)
8. [Environment Variables](#environment-variables)
9. [Testing](#testing)
10. [Infrastructure (Terraform)](#infrastructure-terraform)
11. [Deployment](#deployment)
12. [CI/CD](#cicd)
13. [Performance Testing](#performance-testing)
14. [Proposed Budget](#revised-estimated-budget-cost-breakdown-on-demand-usage)
16. [Documentation](#documentation)
17. [Team](#team)

---

## Overview

AccordCRM is a CRM system designed for a retail bank's front-office agents and administrators. It enables:

- **Agents** to onboard and manage their own clients, open/close bank accounts, and view transactions ingested from the mainframe core banking system.
- **Admins** to oversee agent activity, view audit logs, and manage user accounts.
- **Root Admins** to perform privileged operations (create/delete admins, reassign clients across agents) with a full birds-eye view of all activities.

The system is designed to meet the non-functional requirements outlined in the CS301 project rubric — **scalability, availability, maintainability, security (Zero Trust), observability, and data segregation** — while delivering the five functional features: User Management, Client Profile Management, Interaction Logging, Bank Account Transactions (via SFTP ingestion from mainframe), and an AI **X-Factor** copilot.

---

## Key Features

| # | Feature | Description |
|---|---------|-------------|
| 1 | **User Management** | OAuth 2.0 authentication via AWS Cognito, MFA-ready, role-based access control (Root Admin / Admin / Agent). |
| 2 | **Client Profile Management** | Full CRUD on clients and accounts with field-level validation, country-aware ID checks, and audit trails. |
| 3 | **Activity & Interaction Logging** | Every action (CREATE / UPDATE / DELETE / LOGIN / etc.) is published to SQS and persisted with before/after attribute snapshots. |
| 4 | **Transactions (SFTP Ingestion)** | Transaction files pulled from a mock SFTP mainframe via Lambda, normalised, and loaded into PostgreSQL. |
| 5 | **X-Factor — AI Copilot** | Natural-language assistant powered by AWS Bedrock for querying clients, drafting emails, and summarising activity. |

See [`documents/features.md`](documents/features.md) for the full feature inventory and [`documents/rbac.md`](documents/rbac.md) for the access-control matrix.

---

## Architecture

AccordCRM follows a **microservices + BFF (Backend-for-Frontend)** pattern, deployed on AWS across multiple availability zones.

```
                           ┌──────────────────────────┐
   Browser  ──────────▶   │  CloudFront + WAF + S3   │  (static Next.js export)
                           └────────────┬─────────────┘
                                        │
                                        ▼
                           ┌──────────────────────────┐
                           │   Next.js BFF on ECS     │  (API proxy, auth cookies)
                           └────────────┬─────────────┘
                                        │ (private ALB)
             ┌──────────────────────────┼──────────────────────────┐
             ▼                          ▼                          ▼
      ┌─────────────┐          ┌─────────────┐            ┌──────────────┐
      │ user-service│          │client-service│           │account-service│
      │ :8081       │          │ :8082        │           │ :8083         │
      └──────┬──────┘          └──────┬───────┘           └───────┬───────┘
             │                        │                           │
             ▼                        ▼                           ▼
        RDS (users)             RDS (clients)               RDS (accounts +
                                                              transactions)
             │                        │                           │
             └───────────┬────────────┴──────────┬────────────────┘
                         ▼                       ▼
                  ┌─────────────┐        ┌──────────────────┐
                  │  SQS: logs  │───────▶│ Lambda log proc. │──▶ DynamoDB
                  └─────────────┘        └──────────────────┘
                  ┌─────────────┐        ┌──────────────────┐
                  │ SQS: emails │───────▶│ Lambda email     │──▶ SES
                  └─────────────┘        └──────────────────┘

     Mock SFTP Server ──▶ Lambda (sftp_initiator → sftp_processor) ──▶ RDS
     AWS Cognito (OAuth2 / JWT)          AWS Bedrock (Copilot)
```

**Key architectural decisions:**

- **Database-per-service** — each service owns its own RDS PostgreSQL instance (user_db, client_db, account_transaction_db).
- **Event-driven logging** — services publish audit events to SQS asynchronously to avoid blocking the request path.
- **Zero Trust** — every internal call validates a Cognito JWT and an `INTERNAL_SERVICE_KEY` header.
- **Encryption** — TLS everywhere (RDS `sslmode=require`, HTTPS at CloudFront), KMS at rest.

---

## Tech Stack

### Frontend
- **Next.js 16.1.6** (App Router), **React 19.2.3**, **TypeScript 5**
- **Tailwind CSS v4**, Radix UI primitives, Lucide icons, Sonner toasts
- **React Hook Form** + `validator.js` for client-side validation
- **Jest** for unit tests

### Backend (per service)
- **Spring Boot 4.0.2** on **Java 21** (Maven)
- **Spring Security** (OAuth2 Resource Server — JWT)
- **Spring Data JPA** + **PostgreSQL**
- **AWS SDK v2** (Cognito, SQS, S3)

### Serverless (Python 3.12)
- `lambda/sftp_initiator` — polls the mock SFTP server on an EventBridge schedule
- `lambda/sftp_processor` — parses transaction files and writes to RDS
- `lambda/sqs_log_processor` — consumes the log queue and persists to DynamoDB
- `lambda/sqs_email_sender` — consumes the email queue and sends via SES

### Infrastructure (AWS, via Terraform)
VPC, public/private subnets, NAT, VPC endpoints, Security Groups, ALB, ECS Fargate, ECR, RDS (Multi-AZ), DynamoDB, ElastiCache Redis, SQS, DLQs, EventBridge, Lambda, Cognito, IAM, ACM, CloudFront, S3, WAF, Route 53.

### DevOps
- **Docker** / **Docker Compose** for local multi-service dev
- **GitHub Actions** for per-service CI/CD
- **k6** + **Prometheus** for load testing

---

## Repository Structure

```
project-2025-26-t2-project-2025-26t2-g2-t2/
├── backend/
│   ├── user-service/          # Spring Boot — auth, users, Cognito integration
│   ├── client-service/        # Spring Boot — client profiles
│   ├── account-service/       # Spring Boot — accounts & transactions
│   └── copilot-service/       # Spring Boot — AI copilot (Bedrock)
├── frontend/                  # Next.js 16 App Router (BFF + UI)
├── infra/
│   ├── bootstrap/             # Terraform state bucket bootstrap
│   ├── environment/           # dev / prod root Terraform stacks
│   ├── modules/               # Reusable TF modules (compute, data, edge, ...)
│   └── scripts/               # bootstrap-tf-state.sh, build-static.sh, seed-mock-data.sh
├── lambda/                    # Python Lambdas (SFTP, SQS consumers)
├── performance_test/          # k6 load tests + Prometheus config
├── documents/                 # Project requirements, RBAC, stakeholder docs, deployment guides
├── .github/workflows/         # CI/CD pipelines per service
├── docker-compose.yml         # Local dev stack
└── .env.example               # Environment variable template
```

---

## Getting Started

### Prerequisites

| Tool | Version |
|------|---------|
| Docker Desktop | 4.30+ (Docker Engine 24+) |
| Node.js | 20.x LTS |
| npm | 10+ |
| Java (JDK) | 21 |
| Maven | 3.9+ (or use the included `mvnw` wrapper) |
| Terraform | 1.6+ |
| AWS CLI | 2.x (configured with credentials) |
| Python | 3.12 (only for Lambda development) |

### 1. Clone the repository

```bash
git clone https://github.com/smu-cs301-2025-26/project-2025-26-t2-project-2025-26t2-g2-t2.git
cd project-2025-26-t2-project-2025-26t2-g2-t2
```

### 2. Configure environment variables

```bash
cp .env.example .env
# edit .env and fill in the AWS/DB/Cognito values — see "Environment Variables" below
```

---

## Local Development

The fastest way to run the entire stack locally is **Docker Compose**:

```bash
# Build images and start all services (frontend + 3 backend services)
docker compose up --build

# Or run the dev frontend with hot reload instead of the prod build
docker compose up --build client-service user-service account-service frontend-dev
```

| Service          | URL                        |
|------------------|----------------------------|
| Frontend         | http://localhost:3000      |
| user-service     | http://localhost:8081      |
| client-service   | http://localhost:8082      |
| account-service  | http://localhost:8083      |

### Running services individually

**Frontend:**
```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
```

**A backend service (example — user-service):**
```bash
cd backend/user-service
./mvnw spring-boot:run
```

> The backend services connect to **AWS RDS** by default (not a local database). Ensure your `.env` has the RDS endpoints, or spin up a local PostgreSQL and point the `*_DB_URL` variables at it.

---

## Environment Variables

All variables are documented in [`.env.example`](.env.example). Key groups:

| Variable | Purpose |
|----------|---------|
| `USER_DB_URL`, `USER_DB_USERNAME`, `USER_DB_PASSWORD` | User-service RDS connection |
| `CLIENT_DB_URL`, `CLIENT_DB_USERNAME`, `CLIENT_DB_PASSWORD` | Client-service RDS connection |
| `ACCOUNT_DB_URL`, `ACCOUNT_DB_USERNAME`, `ACCOUNT_DB_PASSWORD` | Account-service RDS connection |
| `LOG_QUEUE_URL` | SQS URL for the audit-log queue |
| `NEXT_PUBLIC_COGNITO_USER_POOL_ID`, `COGNITO_REGION` | Cognito user pool for OAuth2 |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN` | AWS credentials (use short-lived SSO tokens in dev) |
| `AWS_BEARER_TOKEN_BEDROCK` | Bedrock token for the AI copilot |
| `AUTH_COOKIE_SECRET` | HMAC secret for signing frontend session cookies |
| `INTERNAL_SERVICE_KEY` | Shared secret for service-to-service auth (Zero Trust) |
| `CORS_ALLOWED_ORIGIN` | Override CORS origin (default `http://localhost:3000`) |

> **Never commit `.env`.** It is already gitignored. Rotate any secret that has been exposed.

---

## Testing

### Frontend

```bash
cd frontend
npm test                 # Jest unit tests
npm run lint             # ESLint
```

### Backend (per service)

```bash
cd backend/user-service
./mvnw test              # JUnit + Spring Boot tests
```

### Lambdas

```bash
cd lambda
pytest                   # Uses pytest.ini at lambda/ root
```

---

## Infrastructure (Terraform)

The entire AWS infrastructure is defined in Terraform with **no manual resource creation required for the core stack**. Code lives in [`infra/`](infra/) and is split into a **bootstrap** stack (remote state scaffolding) and a **main environment** stack (the application infrastructure itself).

### State Management Bootstrap

Before the main environment can be provisioned, a **one-time bootstrap** must be run:

```bash
cd infra/bootstrap
terraform init
terraform apply
```

This creates:

- An **S3 bucket** (`accordcrm-terraform-state-bucket`) for remote state storage
- A **KMS key** for state-file encryption
- A **DynamoDB table** (`accordcrm-terraform-state-dynamo-lock`) for state locking

The main environment backend is then configured in [`infra/environment/backend.tf`](infra/environment/backend.tf) pointing to these resources.

### Main Environment Provisioning

```bash
cd infra/environment
terraform init
terraform plan  -var-file="dev/dev.tfvars"
terraform apply -var-file="dev/dev.tfvars"
```

### Modules Provisioned (in dependency order)

| Module | What it creates |
|--------|-----------------|
| `vpc`, `subnets`, `internet_gateway`, `route_table` | VPC, public/private/data subnets across `ap-southeast-1a` and `ap-southeast-1b`, routing |
| `security_group` | SGs per service (ALB, ECS, RDS, Redis, Lambda, SFTP) |
| `vpc_endpoints` | 10 interface/gateway endpoints (SQS, Bedrock, ECR, CloudWatch, SSM, KMS, Cognito, STS, DynamoDB, S3) |
| `kms` (via bootstrap) | Customer-managed KMS key with auto-rotation |
| `acm` | ACM SSL certificate for the domain |
| `waf` | WAFv2 Web ACL with managed rule groups |
| `s3_frontend` | Private S3 bucket for static assets |
| `cloudfront` | CloudFront distribution (S3 + ALB origins, OAC, SPA rewrite function) |
| `dns` | Route 53 A records pointing to CloudFront |
| `cognito` | User pool, groups (`admin`, `agent`, `root_admin`), app client, root user seed |
| `ecr` | ECR repositories per microservice |
| `rds` | Three PostgreSQL instances (Multi-AZ, KMS encrypted) |
| `elasticache` | Three Redis replication groups (Multi-AZ, auto-failover) |
| `dynamodb` | Tables: `log`, `risk_score`, `ai_chatbot_audit` |
| `sqs` + `dlq` | Log queue + DLQ, email queue + DLQ |
| `ses` | SES email identity |
| `iam` | Per-service ECS task roles, Lambda roles, SFTP roles |
| `ecs` | ECS cluster, task definitions, services, auto-scaling, Cloud Map |
| `alb` | ALB, listener, path-based routing rules, target groups |
| `lambda` | `log`, `email`, `sftp_initiator`, `sftp_processor` functions |
| `eventbridge` | EventBridge rules and targets for scheduled Lambdas |
| `sftp_ingestion` | Transfer Family connector, SFTP staging S3 bucket |

### Manual Steps (what Terraform cannot automate)

| Step | Reason |
|------|--------|
| **Cognito root admin password reset** | Terraform seeds the root admin with a temporary password; the user must log in once to set a permanent password. |
| **ECR image push (first deploy)** | Terraform creates repositories but ECS cannot run tasks until Docker images are pushed; the CI/CD pipelines handle this. |
| **SSM parameter population** | Runtime secrets (session secret, internal service key, Cognito client ID, service URLs) must be written to SSM before ECS tasks start; the CI/CD workflows read these automatically. |
| **SFTP trusted host key** | `sftp_trusted_host_keys` must be obtained from the external SFTP server manually and supplied as a Terraform variable. |

---

## Deployment

Two environments are defined via tfvars:

- `infra/environment/dev/dev.tfvars`
- `infra/environment/prod/prod.tfvars`

### Build and upload the static frontend to S3/CloudFront

```bash
./infra/scripts/build-static.sh

BUCKET=$(cd infra/environment && terraform output -raw s3_bucket_name)
aws s3 sync frontend/out/ "s3://$BUCKET/" --delete \
  --cache-control "public, max-age=300"
aws s3 sync frontend/out/_next/ "s3://$BUCKET/_next/" \
  --cache-control "public, max-age=31536000, immutable"

# Invalidate the CloudFront cache
aws cloudfront create-invalidation --distribution-id <DIST_ID> --paths "/*"
```

### Seed mock data

```bash
./infra/scripts/seed-mock-data.sh
```

For the full walk-through (including Route 53 + ACM setup), see [`documents/deployment/frontend-deployment-guide.md`](documents/deployment/frontend-deployment-guide.md).

---

## CI/CD

GitHub Actions pipelines live in `.github/workflows/`:

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `frontend-ci-cd.yml` | push / PR to `DevOps-deployment` on `frontend/**` | Lint → Jest → Docker build → push to ECR → deploy to ECS → sync to S3 → invalidate CloudFront |
| `user-service-ci.yml` | push / PR on `backend/user-service/**` | Maven test → Docker build → push to ECR → deploy to ECS |
| `client-service-ci.yml` | push / PR on `backend/client-service/**` | Same pipeline as user-service |
| `account-service-ci.yml` | push / PR on `backend/account-service/**` | Same pipeline as user-service |

Authentication to AWS uses **OIDC** (`id-token: write`) — no long-lived access keys are stored in GitHub.

---

## Performance Testing

A k6 + Prometheus load-test harness is provided:

```bash
cd performance_test
docker compose up
```

The target of **100 concurrent agents with p95 latency < 5 s** (per the rubric) is exercised in `performance_test/k6.js`.

---




## Revised Estimated Budget Cost Breakdown (On-Demand Usage)

| AWS Service | Quantity | Cost Calculation Formula | Estimated Monthly Cost (USD) |
|------------|----------|--------------------------|------------------------------|
| ECS Fargate | 4 services × 2 tasks (Multi-AZ) | ~$0.038/hour × 120 hrs × 8 tasks | $36.48 |
| RDS (PostgreSQL Multi-AZ) | 3 instances (primary + standby) | ~$0.02/hour × 120 hrs × 6 instances | $43.20 |
| ElastiCache (Redis Multi-AZ) | 3 clusters (primary + replica) | ~$0.017/hour × 120 hrs × 6 nodes | $36.72 |
| Application Load Balancer | 1 | ~$0.025/hour × 730 hrs | $18.25 |
| CloudFront | 1 distribution | Data transfer + requests (low traffic) | $8.00 |
| S3 (2 buckets) | 2 | Storage + requests (~50GB total) | $5.00 |
| Lambda | 4 functions | Requests + compute (low usage) | $3.00 |
| DynamoDB | 3 tables | On-demand read/write (low traffic) | $6.00 |
| SQS + DLQ | 4 queues | Requests (~1M/month) | $4.00 |
| EventBridge | 1 rule | Scheduled trigger (~few runs/day) | $1.00 |
| SES | 1 | Emails (~low volume) | $1.00 |
| Transfer Family (SFTP) | 1 connector | ~$0.30/hour × ~40 hrs usage | $12.00 |
| VPC Endpoints | ~11 | ~$0.01/hour × 730 hrs | $8.00 |
| CloudWatch Logs | multiple | Log ingestion + storage | $6.00 |
| Route53 | hosted zone + queries | ~$0.50 + query cost | $2.00 |
| ECR | 4 repos | Storage (~few GB images) | $2.00 |
| SSM Parameter Store | ~33 params | Mostly free tier | $1.00 |
| IAM / KMS / Cognito / WAF | - | Mostly free / minimal usage | $2.00 |
| Buffer (traffic variability) | - | Safety margin | $25.00 |
| **TOTAL** | - | - | **≈ $220.65 (~$200–$230/month)** |

The **actual cost incurred** of **$200.17** aligns closely with this estimate, validating the cost projection.
---

## Documentation

Living documentation is kept in [`documents/`](documents/):

| File | Contents |
|------|----------|
| `project_requirements.md` | Working source-of-truth for features, attributes, and NFRs |
| `features.md` | Complete end-user feature inventory |
| `rbac.md` | Role matrix and access-control policy |
| `use-cases.md` | User journeys per role |
| `log_actions.md` | Audit-log action taxonomy |
| `cap_analysis.md` | CAP-theorem trade-offs per data store |
| `stakeholder-*.md` | Stakeholder-facing docs (agent, admin, client, devops, root-admin) |
| `deployment/frontend-deployment-guide.md` | Step-by-step AWS deploy guide |

---

## Team

**CS301 — AY2025/26 Term 2, Group G2-T2**, Singapore Management University.

Contributions are made via feature branches and pull requests into `main`. See `git log` for individual authorship.

---

## License

This project is coursework submitted for CS301 at SMU and is **not licensed for external use**.
