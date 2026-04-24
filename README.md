# BFHL Full Stack Project

This repository contains a BFHL hierarchy-processing application with:

- a Node.js + Express backend that validates and processes `A->B` style relationships
- a React + Vite frontend that sends input to the API and visualizes the response

## Project Structure

```text
.
├── bfhl-project/
│   └── backend/
│       ├── src/
│       │   ├── controllers/
│       │   ├── routes/
│       │   └── services/
│       ├── server.js
│       └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## What the Backend Does

The backend exposes a BFHL API that:

- validates input entries such as `A->B`
- rejects malformed or invalid relationships
- detects duplicate edges
- applies the multi-parent rule where the first parent wins
- separates connected components
- detects cycles
- builds tree output for non-cyclic components
- returns a response summary

## API Endpoints

### `GET /`

Health check endpoint.

Example response:

```json
{
  "status": "API is running"
}
```

### `GET /bfhl`

Returns the operation code.

Example response:

```json
{
  "operation_code": 1
}
```

### `POST /bfhl`

Processes hierarchy input.

Request body:

```json
{
  "data": ["A->B", "A->C", "B->D"]
}
```

Example response:

```json
{
  "user_id": "Mohamed Jaasir",
  "email_id": "mj3055@srmist.edu.in",
  "college_roll_number": "RA2311026020018",
  "has_cycle": false,
  "hierarchies": [
    {
      "root": "A",
      "tree": {
        "A": {
          "B": {
            "D": {}
          },
          "C": {}
        }
      },
      "depth": 3
    }
  ],
  "invalid_entries": [],
  "duplicate_edges": [],
  "summary": {
    "total_trees": 1,
    "total_cycles": 0,
    "largest_tree_root": "A"
  }
}
```

## Local Setup

### 1. Start the backend

```bash
cd bfhl-project/backend
npm install
npm start
```

The backend runs on `http://localhost:3000`.

### 2. Start the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173`.

In local development, Vite proxies `/bfhl` requests to `http://localhost:3000`.

## Frontend Environment Variable

The frontend supports `VITE_API_URL`.

Example:

```bash
VITE_API_URL=http://localhost:3000/bfhl
```

If `VITE_API_URL` is not set, the frontend falls back to `/bfhl`.

## Validation Rules

Accepted input format:

- single uppercase node names only
- arrow format must be exactly `X->Y`

Examples of invalid input:

- `A->A` for self-loops
- `AB->C` for multi-character nodes
- `1->2` for non-letter nodes
- `A-B` for invalid separators
- `A->` for incomplete edges

## Useful Scripts

### Backend

```bash
npm start
npm test
npm run test:sample
```

### Frontend

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## Deployment Notes

- Deploy the backend from `bfhl-project/backend`
- Deploy the frontend from `frontend`
- In production, set `VITE_API_URL` to the deployed backend `/bfhl` endpoint

## Tech Stack

- Backend: Node.js, Express, CORS
- Frontend: React, Vite
- Language: JavaScript
