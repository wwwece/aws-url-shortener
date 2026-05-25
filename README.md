# aws-url-shortener

A small URL shortener built as a learning project for AWS — Lambda + API Gateway + DynamoDB on the backend, a React/Vite frontend served via S3 + CloudFront, and AWS CDK for infrastructure.

## Structure

```
.
├── backend/   # Lambda handlers (TypeScript)
├── frontend/  # React + Vite single-page app
└── infra/     # AWS CDK stack (TypeScript)
```

## Prerequisites

- Node.js 20+
- AWS CLI configured with credentials (`aws configure`)
- CDK bootstrapped once per account/region: `cd infra && npx cdk bootstrap`

### backend/
Lambda handlers (`create`, `redirect`) bundled with esbuild. Writes short codes to DynamoDB and resolves them on lookup.

### frontend/
Vite + React app that calls the API. The API base URL is read from `VITE_API_URL` in `frontend/.env` (not committed).

```bash
cd frontend
npm install
npm run dev
```

### infra/
CDK app that provisions:
- DynamoDB table for short code → URL mappings
- Two Lambda functions (`create`, `redirect`)
- HTTP API Gateway in front of the Lambdas
- S3 bucket + CloudFront distribution serving the built frontend

## First-time deploy

The CDK stack uploads `frontend/dist` to S3, so the frontend must be built before `cdk deploy`. On a fresh account there's no API URL yet, so the first deploy is a two-step dance:

```bash
# 1. Build the frontend (empty VITE_API_URL is fine for the first pass)
cd frontend && npm install && npm run build

# 2. Deploy the stack
cd ../infra && npm install && npx cdk deploy
```

The deploy prints two outputs:
- `ApiUrl` — the HTTP API endpoint
- `SiteUrl` — the CloudFront URL serving the frontend

Put `ApiUrl` into `frontend/.env`:

```
VITE_API_URL=https://xxxx.execute-api.<region>.amazonaws.com
```

Then rebuild and redeploy so the frontend ships pointing at the real API:

```bash
cd frontend && npm run build
cd ../infra && npx cdk deploy
```

## Teardown

When you're done testing, tear the stack down to avoid ongoing AWS charges:

```bash
cd infra
npx cdk destroy
```

## Notes

This is a personal sandbox for learning AWS. Not intended for production use.
