# CampusLoop
Cloud-based campus item borrow &amp; return system (Node.js + AWS + MySQL)

## Local troubleshooting notes

CampusLoop runs across three local services:

- Frontend: `http://localhost:8080`
- Backend API: `http://localhost:5550`
- MySQL: `localhost:3306`

### Problems solved during development

- `ECONNREFUSED 127.0.0.1:3306` occurred because MySQL was not installed or running. Starting MySQL and loading `database/schema.sql` restored the database connection.
- The `campusloop` database initially did not exist. The schema creates the `users`, `items`, `borrow_requests`, and `notifications` tables.
- An empty `items` table is valid. `GET /api/items` returns `[]`, and the frontend displays its empty-state message until a user lists an item.
- The frontend entered an infinite reload when `auth.js` redirected every page to `browse.html` whenever a token existed. The redirect is now limited to the login and registration pages.
- `BrokenPipeError` from Python's development server was a symptom of browser requests being cancelled during repeated navigation, not the root database or API failure.

### Start the local application

Start MySQL, then run the backend in one terminal:

```bash
cd backend
npm run dev
```

Serve the frontend in a second terminal:

```bash
cd frontend
python3 -m http.server 8080
```

Open `http://localhost:8080/login.html` in a browser. Do not run frontend files such as `auth.js` directly with Node.js because they use browser APIs such as `document` and `localStorage`.

### Demonstration workflow

Use two accounts to demonstrate the core flow:

1. Account A lists an item.
2. Account B browses the item and requests to borrow it.
3. Account A approves or rejects the request.
4. Account B checks the request status and notification.

Resetting or recreating the database removes existing test users and items, so avoid re-running destructive schema commands after creating demonstration data.
