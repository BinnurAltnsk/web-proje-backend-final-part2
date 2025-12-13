# Campus Management System - Backend

A comprehensive backend API for managing campus operations, built with Node.js, Express, and PostgreSQL.

## Features

- 🔐 JWT-based authentication with refresh tokens
- 👥 User management (students, faculty, admins)
- 📧 Email verification and password reset
- 📁 File uploads with Cloudinary integration
- 📚 Swagger API documentation
- 🛡️ Security middleware (Helmet, XSS protection, rate limiting)
- 🗄️ PostgreSQL database with Sequelize ORM
- 🐳 Docker support
- 📝 Database migrations

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Sequelize
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: Joi
- **Documentation**: Swagger
- **Logging**: Winston
- **Testing**: Jest

## Prerequisites

- Node.js 18 or higher
- PostgreSQL 14 or higher
- npm or yarn
- Docker (optional, for containerized deployment)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd campus-management-system-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and fill in your configuration values.

4. **Set up the database**
   ```bash
   # Create PostgreSQL database
   createdb campus_db

   # Run migrations
   npm run migrate
   ```

5. **Seed the database (optional)**
   ```bash
   npm run seed
   ```

## Environment Variables

See `.env.example` for all required environment variables. Key variables include:

- `NODE_ENV`: Environment (development/production)
- `PORT`: Server port (default: 5000)
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`: Database configuration
- `JWT_SECRET`: Secret key for JWT tokens
- `CLOUDINARY_*`: Cloudinary credentials for file uploads
- `FRONTEND_URL`: Frontend application URL for CORS

## Running the Application

### Development Mode
```bash
npm run dev
```
The server will start on `http://localhost:5000` with hot-reload enabled.

### Production Mode
```bash
npm start
```

### Using Docker
```bash
# Build and run with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f backend
```

## Database Migrations

This project uses Sequelize CLI for database migrations.

### Create a new migration
```bash
npx sequelize-cli migration:generate --name migration-name
```

### Run migrations
```bash
npm run migrate
# or
npx sequelize-cli db:migrate
```

### Rollback migrations
```bash
npx sequelize-cli db:migrate:undo
npx sequelize-cli db:migrate:undo:all
```

### Check migration status
```bash
npx sequelize-cli db:migrate:status
```

## API Documentation

Once the server is running, access the Swagger API documentation at:
```
http://localhost:5000/api-docs
```

## Project Structure

```
src/
├── app.js                 # Main application entry point
├── config/                # Configuration files
│   ├── constants.js       # Application constants
│   └── swagger.js         # Swagger configuration
├── controllers/           # Request handlers
│   ├── authController.js
│   └── userController.js
├── middleware/            # Express middleware
│   ├── authMiddleware.js
│   ├── error.js
│   ├── uploadMiddleware.js
│   └── validationMiddleware.js
├── models/                # Sequelize models
│   ├── department.js
│   ├── faculty.js
│   ├── student.js
│   └── user.js
├── routes/                # API routes
│   ├── authRoutes.js
│   └── userRoutes.js
├── scripts/               # Utility scripts
│   └── seed.js
└── utils/                 # Helper utilities
    ├── emailService.js
    ├── errorResponse.js
    ├── jwtHelper.js
    └── logger.js
```

## Testing

Run tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/verify-email/:token` - Verify email address
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password/:token` - Reset password

### Users
- `GET /api/v1/users` - Get all users (protected)
- `GET /api/v1/users/:id` - Get user by ID (protected)
- `PUT /api/v1/users/:id` - Update user (protected)
- `DELETE /api/v1/users/:id` - Delete user (protected)

## Security Features

- **Helmet**: Sets various HTTP headers for security
- **XSS Protection**: Cleans user input to prevent XSS attacks
- **Rate Limiting**: Prevents abuse with request rate limiting
- **CORS**: Configured for specific frontend origins
- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Bcrypt for password security

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

ISC

## Support

For support, email support@example.com or open an issue in the repository.

