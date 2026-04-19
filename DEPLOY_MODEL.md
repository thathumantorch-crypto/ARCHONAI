# Deploying Your Trained Model to Render

After training your model in Colab, you need to upload `archon_model.pt` to Render.

## Option 1: Render File Upload (Quickest)

1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Click on your **archonai-jxpe** service
3. Go to **Files** tab
4. Click **New File**
5. Upload `archon_model.pt`
6. Set path: `/opt/render/project/procache/archon_model.pt` or just `archon_model.pt`

## Option 2: Google Drive Link

1. Upload your model to Google Drive
2. Get shareable link
3. In Render, add environment variable:
   - `MODEL_PATH` = the path where you upload the model

## Option 3: Disable Demo Mode

Once model is uploaded, set environment variable in Render:

| Variable | Value |
|----------|-------|
| `DEMO_MODE` | `false` |
| `MODEL_PATH` | `/opt/render/project/procache/archon_model.pt` |

Then redeploy the service.

## Verify It Works

Test the endpoint:
```bash
curl -X POST https://archonai-jxpe.onrender.com/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What is ARCHON?", "max_length": 150}'
```

You should get a neural network-generated response instead of the demo response.