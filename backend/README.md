Uses 

Node.js
Express.js
PostgreSQL
pgAdmin (recommended)

1. DATABASE SETUP

Open PostgreSQL using pgAdmin.

Create a database named wayback.

Open the Query Tool for the wayback database.

Run the SQL statements from schema.sql to create the required tables.

2. Environment Variables

Make .env file in backend and paste this into it 

DB_HOST=localhost
DB_PORT=5432
DB_NAME=wayback
DB_USER=postgres
DB_PASSWORD=YOUR_POSTGRES_PASSWORD
JWT_SECRET=RANDOM_SECRET

Replace the placeholder values with your local PostgreSQL password and a long, randomly generated JWT secret. Bottom two lines.

Do not upload the .env file to GitHub.

3. Start the Backend

node server.js (in backend directory)
runs at http://localhost:3000

4. Test the API

http://localhost:3000/api/health
Should confirm that the WayBack API is running and connected to the wayback database.