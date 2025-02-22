# Express App - Version 3.0.0

Welcome to the **Express App** developed by **Vugar Safarzada**. This modern, dynamic Express.js application is designed to provide a robust and scalable foundation for web development projects.

## Table of Contents

- [Installation](#installation)
- [Scripts](#scripts)
- [Project Structure](#project-structure)
- [Database Management](#database-management)
- [Environment Variables](#environment-variables)
- [License](#license)

## Installation

To get started with the project, clone the repository and install the dependencies:

```bash
git clone https://github.com/yourusername/express-app.git
cd express-app
npm install
```

## Scripts

The following scripts are available for managing and running the application:

- `npm start`: Start the application using `ts-node`.
- `npm run dev`: Start the application in development mode using `nodemon` and `ts-node`.
- `npm run test`: Placeholder for the test script.
- `npm run db:pull`: Pull the database schema using Prisma.
- `npm run db:deploy`: Deploy the database migrations using Prisma.
- `npm run db:migrate`: Run the Prisma migrations in development mode.
- `npm run db:reset`: Reset the database using Prisma.

## Project Structure

The project structure is organized as follows:

```
.
├── src
│   ├── assets
│   │   ├── helpers
│   │   └── types
│   ├── controllers
│   ├── public
│   ├── routes
│   ├── bin
│   │   └── www.ts
│   └── app.ts
├── prisma
│   ├── schema.prisma
├── .env
├── package.json
└── README.md
```

## Database Management

This project uses [Prisma](https://www.prisma.io/) for database management. The following commands help manage the database schema and migrations:

- `db:pull`: Synchronizes your Prisma schema with the database schema.
- `db:deploy`: Applies all pending migrations to the database.
- `db:migrate`: Creates a new migration based on the changes in your Prisma schema and applies it.
- `db:reset`: Resets the database by rolling back and reapplying all migrations.

Ensure you have configured your database connection string in the `.env` file.

## Environment Variables

Create a `.env` file in the root directory of your project and configure the necessary environment variables. For example:

```
DATABASE_URL="mysql://user:password@localhost:3306/mydatabase"
JWT_SECRET="your_jwt_secret"
```
## New Skills On The Version V3:
- Writing clean code with an Object-Oriented Programming structure using TypeScript
- Utilizing Prisma as a new ORM for database management
- Implementing dynamic debugging and logging (enhanced with a Telegram bot)
- Developing a security system for API services

## License

This project is licensed under the ISC License. See the [LICENSE](LICENSE) file for more information.

---
By Vugar Safarzada