# FinTracker - Expense Tracking App

## Docker Deployment Guide for Ubuntu

### Prerequisites
- Ubuntu 20.04+ or any Linux distribution
- Docker Engine 20.10+
- Docker Compose v2+
- At least 2GB RAM
- Port 80 available (or customize as needed)

---

## Quick Start

### Step 1: Install Docker (if not installed)

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up the repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add your user to docker group (avoids using sudo)
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker compose version
```

### Step 2: Clone/Download the Project

```bash
# Create project directory
mkdir -p ~/fintracker && cd ~/fintracker

# Copy all the project files here (frontend/, backend/, docker-compose.yml, etc.)
```

### Step 3: Configure Environment Variables

```bash
# Create production environment file
cat > .env << 'EOF'
# MongoDB
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=your_secure_password_here
MONGO_URL=mongodb://admin:your_secure_password_here@mongodb:27017
DB_NAME=fintracker_db

# JWT Secret (generate a secure random string)
JWT_SECRET=your_very_long_random_secret_key_at_least_32_characters

# Backend
CORS_ORIGINS=http://localhost,http://localhost:80,http://your-domain.com

# Frontend
REACT_APP_BACKEND_URL=http://localhost/api
EOF

# Generate a secure JWT secret (optional - recommended)
echo "JWT_SECRET=$(openssl rand -hex 32)" >> .env
```

### Step 4: Build and Run

```bash
# Build and start all services
docker compose up -d --build

# Check if all containers are running
docker compose ps

# View logs
docker compose logs -f
```

### Step 5: Access the Application

Open your browser and navigate to:
- **Frontend**: http://localhost (or http://your-server-ip)
- **API Health Check**: http://localhost/api/

---

## Project Structure for Docker

```
fintracker/
├── docker-compose.yml
├── .env
├── nginx/
│   └── nginx.conf
├── backend/
│   ├── Dockerfile
│   ├── server.py
│   ├── requirements.txt
│   └── .env (will be overridden by docker-compose)
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    └── src/
```

---

## Useful Commands

```bash
# Stop all services
docker compose down

# Stop and remove all data (including database)
docker compose down -v

# Rebuild a specific service
docker compose build backend
docker compose build frontend

# Restart a specific service
docker compose restart backend

# View logs for a specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f mongodb

# Access MongoDB shell
docker compose exec mongodb mongosh -u admin -p your_secure_password_here

# Access backend container shell
docker compose exec backend bash

# Check container resource usage
docker stats
```

---

## Production Deployment Tips

### 1. Use a Reverse Proxy (Nginx/Traefik)
The included nginx configuration handles this, but for production consider:
- SSL/TLS certificates (Let's Encrypt)
- Rate limiting
- Security headers

### 2. Enable HTTPS with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate (replace with your domain)
sudo certbot --nginx -d your-domain.com
```

### 3. Database Backups

```bash
# Create backup
docker compose exec mongodb mongodump --uri="mongodb://admin:password@localhost:27017" --out=/backup

# Restore backup
docker compose exec mongodb mongorestore --uri="mongodb://admin:password@localhost:27017" /backup
```

### 4. Update Application

```bash
# Pull latest changes (if using git)
git pull origin main

# Rebuild and restart
docker compose up -d --build
```

---

## Troubleshooting

### Container won't start
```bash
# Check logs
docker compose logs backend
docker compose logs frontend

# Check if ports are in use
sudo lsof -i :80
sudo lsof -i :8001
```

### Database connection issues
```bash
# Verify MongoDB is running
docker compose ps mongodb

# Test connection
docker compose exec mongodb mongosh --eval "db.adminCommand('ping')"
```

### Frontend can't connect to backend
- Ensure `REACT_APP_BACKEND_URL` is set correctly
- Check nginx proxy configuration
- Verify CORS_ORIGINS includes your domain

---

## System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 1 core | 2+ cores |
| RAM | 1 GB | 2+ GB |
| Storage | 5 GB | 20+ GB |
| OS | Ubuntu 20.04 | Ubuntu 22.04 |
