# MediCare Backend API

Modern, restructured Node.js/Express backend following clean architecture principles.

## Features

- ✅ Clean Architecture with separation of concerns
- ✅ Modern JavaScript (ES Modules)
- ✅ Comprehensive error handling
- ✅ Request validation middleware
- ✅ JWT-based authentication
- ✅ Environment-based configuration
- ✅ Scheduled tasks (cron jobs)
- ✅ SMS and Push notification services
- ✅ Prisma ORM for database access

## Project Structure

```
backend/
├── src/
│   ├── app.js                 # Application entry point
│   ├── config/                # Configuration files
│   │   ├── database.js       # Prisma client
│   │   └── env.js            # Environment variables
│   ├── routes/               # Route definitions
│   │   ├── index.js          # Route aggregator
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   └── ...
│   ├── controllers/          # Request handlers
│   │   ├── auth.controller.js
│   │   └── ...
│   ├── services/            # Business logic
│   │   ├── auth.service.js
│   │   ├── sms.service.js
│   │   └── ...
│   ├── middleware/          # Express middleware
│   │   ├── auth.middleware.js
│   │   ├── error.middleware.js
│   │   ├── validation.middleware.js
│   │   └── logger.middleware.js
│   ├── validators/          # Validation schemas
│   │   └── auth.validators.js
│   ├── utils/              # Utility functions
│   │   ├── phone.validator.js
│   │   └── phone.normalizer.js
│   └── errors/             # Custom error classes
│       └── AppError.js
├── prisma/
│   └── schema.prisma      # Database schema
├── .env.example           # Environment variables template
├── package.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your configuration

5. Set up the database:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/profile` - Get current user profile

### Health Check
- `GET /` - API health check
- `GET /api/health` - Detailed health status

## Architecture Principles

### Clean Architecture Layers

1. **Routes Layer**: Define API endpoints and HTTP methods
2. **Controllers Layer**: Handle HTTP requests/responses, input validation
3. **Services Layer**: Business logic, data processing
4. **Data Access Layer**: Database operations via Prisma

### Error Handling

- Custom error classes for different error types
- Centralized error handling middleware
- Consistent error response format

### Validation

- Request validation using express-validator
- Separate validation schemas for reusability
- Automatic validation error responses

### Security

- JWT-based authentication
- Password hashing with bcrypt
- CORS configuration
- Environment-based secrets

## Development

### Running in Development Mode

```bash
npm run dev
```

Uses Node.js watch mode for automatic restarts.

### Code Style

- ESLint for linting
- Prettier for formatting

## Production Deployment

1. Set `NODE_ENV=production`
2. Ensure all environment variables are set
3. Run database migrations
4. Start the server:
   ```bash
   npm start
   ```

## License

ISC
