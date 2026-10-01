# Production environment setup

Create a `.env` file on the server (do not commit it) using `.env.example` as the template.

Required production values:
- `MONGO_URI`: production MongoDB connection string
- `JWT_SECRET`: long random secret
- `CLIENT_URL`: exact production frontend origin
- `ADMIN_USERNAME` / `ADMIN_PASSWORD`: strong admin credentials
- `SMTP_*`: Gmail SMTP/App Password or another transactional SMTP provider
- `PASSWORD_RESET_CODE_MINUTES`: reset-code lifetime (recommended: 10)
- `PASSWORD_RESET_RESEND_SECONDS`: resend cooldown (recommended: 60)
- `PASSWORD_RESET_MAX_ATTEMPTS`: maximum verification attempts (recommended: 5)
- `ALLOW_RESET_CODE_IN_RESPONSE=false`: keep false in production

Never place SMTP passwords, database credentials, JWT secrets, or API keys in frontend source code or Vite `VITE_*` variables.
