# Vaccine Data Dashboard (Frontend)

React + Vite frontend for browsing, filtering, adding, and visualizing vaccine case data from the CS510 backend API.

## Features

- Table view with sorting, column filters, pagination, and free-text search.
- Add Case form with dropdown values loaded from the database.
- Duplicate check before insert (`/api/table/{table}/row`).
- Visualization page (bar chart) based on currently filtered rows.
- CSV and PNG export from the graph view.

## Tech Stack

- React 19
- Vite 8
- Chart.js + react-chartjs-2

## Project Structure

```text
frontend/
  src/
    App.jsx
    database_calls.js
    data_table/
    new_info/
    visualization/
```

## Prerequisites

- Node.js 18+ (Node.js 20+ recommended)
- Running backend API on `http://localhost:8000`

## Setup

From `frontend/`:

```bash
npm install
```

## Run in Development

```bash
npm run dev
```

Frontend runs on:

- `http://localhost:5173`

## Build for Production

```bash
npm run build
npm run preview
```

## Backend Integration

This frontend calls:

- `http://localhost:8000/api/table/{table}`
- `http://localhost:8000/api/table/{table}/filters`
- `http://localhost:8000/api/table/{table}/rows`
- `http://localhost:8000/api/table/{table}/row`

The default table used by the app is:

- `cases`

If you run the backend from this repository:

1. Create and activate a Python virtual environment in `backend/`.
2. Install backend dependencies:

```bash
pip install -r requirements.txt
```

3. Copy `backend/.env.example` to `backend/.env` and set DB values.
4. Start FastAPI:

```bash
uvicorn app.main:app --reload
```

## Lint

```bash
npm run lint
```

## Notes

- CORS is configured in the backend for `http://localhost:5173` and `http://127.0.0.1:5173`.
- Graph visualization currently groups rows by the first column in the dataset.
