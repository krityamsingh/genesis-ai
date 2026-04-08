# Cloud Deployment

## Google Cloud Run

```bash
# Build and push
gcloud builds submit --tag gcr.io/YOUR_PROJECT/genesis-api

# Deploy
gcloud run deploy genesis-api \
  --image gcr.io/YOUR_PROJECT/genesis-api \
  --platform managed \
  --region us-central1 \
  --set-env-vars HF_TOKEN=hf_...
```

## Kubernetes

```bash
kubectl apply -f infra/k8s/deployment.yaml
kubectl apply -f infra/k8s/service.yaml
kubectl apply -f infra/k8s/ingress.yaml
```

## Environment Variables

Set as Kubernetes secrets or Cloud Run env vars — see `.env.example`.
