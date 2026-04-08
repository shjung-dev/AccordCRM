# Stakeholder: DevOps Engineer

## DevOps Engineer

The DevOps Engineer is the infrastructure and operations owner of AccordCRM. This role is responsible for provisioning, deploying, securing, monitoring, and maintaining the entire cloud environment that the application runs on. The DevOps Engineer does not interact with the CRM application itself (they do not manage clients, accounts, or users through the UI) but instead ensures that the platform is available, performant, secure, and continuously delivered. They are the bridge between the development team and the production environment, owning the full lifecycle from code commit to running container.

Their responsibilities are as follows:

### Infrastructure Provisioning
Provisions and manages all AWS infrastructure using Terraform (Infrastructure as Code) across 24+ modules, including:
- **Networking**: VPC, public and private subnets across 2 Availability Zones (ap-southeast-1a, ap-southeast-1b), internet gateway, route tables, security groups, and VPC endpoints for AWS service access.
- **Compute**: ECS Fargate cluster running 4 containerised services (user-service, client-service, account-transaction-service, frontend), with Application Load Balancer (ALB) providing path-based routing and health-check-driven traffic management. Each service has its own ECR repository for Docker images.
- **Data Layer**: 3 PostgreSQL RDS instances (user_db, client_db, account_transaction_db) with Multi-AZ deployment, KMS encryption at rest, and 7-day automated backup retention. 3 ElastiCache Redis clusters (client-cache, account-transaction-cache, ai-output-cache) with Multi-AZ failover. 3 DynamoDB tables (accord-crm-log, accord-crm-risk-score, accord-crm-ai-chatbot-audit) with pay-per-request billing and Global Secondary Indexes.
- **Messaging**: 2 SQS queues (log-queue, email-queue) with corresponding Dead Letter Queues for failed message handling.
- **Serverless**: 4 Lambda functions — log processor (SQS → DynamoDB), email sender (SQS → SES), SFTP initiator (EventBridge → Transfer Family), and SFTP processor (S3 → RDS) — each with dedicated IAM roles following least-privilege principles.
- **Edge**: CloudFront CDN distribution, S3 static frontend bucket, Route 53 DNS records for the domain (itsag2t2.com), ACM SSL/TLS certificates, and WAF with AWS Managed Common Rule Set.
- **Security**: AWS Cognito User Pool with 3 groups (agent, admin, root_admin), custom attributes (role, isRootAdmin), and enforced password policy (minimum 10 characters, uppercase, lowercase, numbers, symbols). KMS keys for encryption. SSM Parameter Store for 20+ application secrets and configuration values.
- **Data Ingestion**: AWS Transfer Family SFTP connector for scheduled file pulls from external banking systems, with S3 staging bucket and event-driven Lambda processing pipeline.

### CI/CD Pipeline Management
Owns and maintains 4 GitHub Actions workflows that automate the full build-test-deploy lifecycle:
- **Backend Services** (user, client, account-transaction): On push to respective `backend/` paths — Maven build (Java 21), Docker image build, ECR push with git SHA tagging, ECS task definition update, and service redeployment with health check stabilisation.
- **Frontend**: On push to `frontend/` — npm lint, Jest test suite with coverage, Docker multi-stage build, ECR push, S3 static export with CloudFront cache invalidation, and ECS task definition update with SSM secret injection (9 parameters).
- All pipelines use OIDC-based AWS authentication (no long-lived credentials), and ECS deployments wait for service stabilisation before marking success.

### Containerisation and Orchestration
Builds and maintains Dockerfiles for all 4 services:
- **Backend services**: Multi-stage builds using Eclipse Temurin 21 JDK (build) and JRE (runtime), with non-root users, JVM tuning flags (-XX:MaxRAMPercentage=75.0, -XX:+UseG1GC), and container health checks via Spring Boot Actuator (`/actuator/health`).
- **Frontend**: 3-stage Node 20.18-alpine build (deps → build → runtime), with non-root `appuser`, and health check via `/healthz` endpoint.
- **Local development**: Docker Compose orchestration with 5 services (3 backend + frontend + frontend-dev with hot reload), bridge networking, health-check-driven startup ordering, JSON file logging with rotation (10MB, 3 files), memory limits (256–512MB per service), and restart policies (on-failure:5).

### Auto-Scaling and Performance
Configures and tunes ECS service auto-scaling:
- Target tracking policy on average CPU utilisation at 70% threshold.
- Per-service scaling ranges: minimum 1–2 tasks, maximum 2–5 tasks.
- ElastiCache Multi-AZ with automatic failover for cache resilience.
- RDS Multi-AZ for automatic database failover.
- ALB health checks at 30-second intervals with 3-check healthy/unhealthy thresholds.

### Monitoring and Observability
Manages the monitoring stack:
- **CloudWatch Logs**: Dedicated log groups per ECS service (`/ecs/accord-crm/{service}`) with 30-day retention. Lambda function logs captured automatically.
- **Health Checks**: ALB target group health checks for all 4 services (Spring Boot Actuator for backends, `/healthz` for frontend). Container-level HEALTHCHECK instructions in all Dockerfiles with 15-second intervals.
- **ALB Metrics**: Request count, target response time, HTTP 4xx/5xx error rates published to CloudWatch.
- **Auto-Scaling Metrics**: CPU utilisation tracking for scaling decisions.

### Security and Compliance
Enforces security across all layers:
- **Network isolation**: Backend services and databases in private subnets with no direct internet access. VPC endpoints for AWS service communication without traversing the public internet.
- **Encryption**: KMS encryption at rest for S3, RDS, DynamoDB, and EBS volumes. TLS in transit via ACM certificates on ALB and CloudFront.
- **Secrets management**: Application credentials stored in SSM Parameter Store (SecureString with KMS). ECS tasks inject secrets at runtime, never baked into images.
- **IAM**: Service-specific IAM roles following least-privilege. OIDC federation for GitHub Actions (no stored AWS keys). Separate task roles and execution roles for ECS.
- **WAF**: AWS WAF with Managed Common Rule Set attached to CloudFront, protecting against common web exploits.
- **Terraform state**: Remote state in S3 with versioning, KMS encryption, DynamoDB locking, and public access blocked.

### Database Operations
Manages database lifecycle and maintenance:
- Flyway-based schema migrations (V1, V2) applied automatically on service startup.
- 7-day automated backup retention with point-in-time recovery.
- Multi-AZ deployment for automatic failover.
- Separate databases per service (user_db, client_db, account_transaction_db) for data isolation.
- Mock data seeding scripts for development and testing environments.

### Environment Management
Maintains environment parity and configuration:
- **Terraform workspaces**: Separate `dev.tfvars` and `prod.tfvars` for environment-specific overrides.
- **Feature flags**: SSM Parameter Store for runtime toggles (e.g., `smartcrm-chatbot-enabled`).
- **Bootstrap process**: One-time `bootstrap-tf-state.sh` script to initialise S3 backend and KMS key before first `terraform apply`.
- **Environment template**: `.env.example` documenting all required environment variables for local development.

### Operational Scripts
Maintains infrastructure automation scripts:
- `bootstrap-tf-state.sh`: Initialises Terraform remote state (S3 + KMS + DynamoDB lock).
- `build-static.sh`: Builds Next.js static export for S3/CloudFront deployment, with automatic file restoration on completion.
- `seed-mock-data.sh`: Seeds all 3 databases and Cognito with test data (users, clients, accounts), supporting `--sql` and `--cognito` modes for partial execution.

### Service Discovery and Inter-Service Communication
Configures internal service routing:
- AWS Cloud Map private DNS namespace (`accord-crm.local`) for service-to-service communication within the VPC.
- Service DNS entries: `user.accord-crm.local:8081`, `client.accord-crm.local:8082`, `account-transaction.accord-crm.local:8083`.
- ALB path-based routing for external traffic to appropriate ECS target groups.

### What the DevOps Engineer Does NOT Do
- Does not manage clients, accounts, or transactions through the CRM application.
- Does not create or delete CRM users (agents, admins, root admins) through the application.
- Does not modify business logic, application code, or frontend UI.
- Does not interact with the SmartCRM AI chatbot or review audit logs through the application.
- Does not handle client communications or email content.

### Summary
The DevOps Engineer ensures that AccordCRM is continuously built, securely deployed, and reliably operated. They own the infrastructure lifecycle from initial provisioning (Terraform) through deployment automation (GitHub Actions + ECS) to runtime monitoring (CloudWatch + health checks), enabling the development team to ship features and the operations team to serve users without infrastructure friction.
