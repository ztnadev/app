# FinTracker - Complete Docker Deployment Guide for Ubuntu

## Overview
This guide will help you deploy the FinTracker expense tracking application on an Ubuntu server using Docker.

---

## STEP 1: Prepare Your Ubuntu Server

### 1.1 Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Install Docker
```bash
# Install prerequisites
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add your user to docker group (so you don't need sudo)
sudo usermod -aG docker $USER

# Apply group changes (or logout and login again)
newgrp docker

# Verify installation
docker --version
docker compose version
```

---

## STEP 2: Create Project Directory Structure

```bash
# Create main project directory
mkdir -p ~/fintracker
cd ~/fintracker

# Create subdirectories
mkdir -p backend frontend/src/pages frontend/src/components/ui frontend/public
```

---

## STEP 3: Create All Required Files

### 3.1 Create docker-compose.yml
```bash
cat > ~/fintracker/docker-compose.yml << 'DOCKERCOMPOSE'
version: '3.8'

services:
  # MongoDB Database
  mongodb:
    image: mongo:7.0
    container_name: fintracker-mongodb
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_ROOT_USERNAME:-admin}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD:-fintracker2024}
    volumes:
      - mongodb_data:/data/db
    networks:
      - fintracker-network
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

  # FastAPI Backend
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: fintracker-backend
    restart: unless-stopped
    environment:
      - MONGO_URL=mongodb://${MONGO_ROOT_USERNAME:-admin}:${MONGO_ROOT_PASSWORD:-fintracker2024}@mongodb:27017
      - DB_NAME=${DB_NAME:-fintracker_db}
      - JWT_SECRET=${JWT_SECRET:-expense-tracker-secure-jwt-secret-key-2024-cad}
      - CORS_ORIGINS=${CORS_ORIGINS:-*}
    depends_on:
      mongodb:
        condition: service_healthy
    networks:
      - fintracker-network

  # React Frontend with Nginx
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        - REACT_APP_BACKEND_URL=${REACT_APP_BACKEND_URL:-}
    container_name: fintracker-frontend
    restart: unless-stopped
    ports:
      - "${APP_PORT:-80}:80"
    depends_on:
      - backend
    networks:
      - fintracker-network

volumes:
  mongodb_data:
    driver: local

networks:
  fintracker-network:
    driver: bridge
DOCKERCOMPOSE
```

### 3.2 Create Environment File
```bash
cat > ~/fintracker/.env << 'ENVFILE'
# MongoDB Configuration
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=YourSecurePassword123!

# Database Name
DB_NAME=fintracker_db

# JWT Secret - Use a long random string
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-make-it-long

# CORS Origins
CORS_ORIGINS=*

# Frontend API URL (leave empty for relative URLs with nginx proxy)
REACT_APP_BACKEND_URL=

# Application Port (default 80)
APP_PORT=80
ENVFILE
```

### 3.3 Create Backend Dockerfile
```bash
cat > ~/fintracker/backend/Dockerfile << 'DOCKERFILE'
FROM python:3.11-slim

WORKDIR /app

# Install curl for healthcheck
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy and install requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

EXPOSE 8001

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
DOCKERFILE
```

### 3.4 Create Backend requirements.txt
```bash
cat > ~/fintracker/backend/requirements.txt << 'REQUIREMENTS'
fastapi==0.110.1
uvicorn==0.25.0
python-dotenv>=1.0.1
pymongo==4.5.0
motor==3.3.1
pydantic>=2.6.4
email-validator>=2.2.0
pyjwt>=2.10.1
bcrypt==4.1.3
passlib>=1.7.4
python-jose>=3.3.0
python-multipart>=0.0.9
REQUIREMENTS
```

### 3.5 Create Frontend Dockerfile
```bash
cat > ~/fintracker/frontend/Dockerfile << 'DOCKERFILE'
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json yarn.lock* ./

# Install dependencies
RUN yarn install --frozen-lockfile || yarn install

# Copy source
COPY . .

# Build argument
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL

# Build
RUN yarn build

# Production stage
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
DOCKERFILE
```

### 3.6 Create Frontend nginx.conf
```bash
cat > ~/fintracker/frontend/nginx.conf << 'NGINXCONF'
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # API proxy
    location /api/ {
        proxy_pass http://backend:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static files
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINXCONF
```

---

## STEP 4: Download Application Source Code

You need to copy the application source files. Here's how to get them:

### Option A: If you have the files from Emergent
Download/export the project and copy:
- All files from `/app/backend/` to `~/fintracker/backend/`
- All files from `/app/frontend/` to `~/fintracker/frontend/`

### Option B: Create files manually
I'll provide you with the key source files below.

---

## STEP 5: Build and Run

```bash
cd ~/fintracker

# Build all containers
docker compose build

# Start the application
docker compose up -d

# Check status
docker compose ps

# View logs (optional)
docker compose logs -f
```

---

## STEP 6: Access Your Application

Open your web browser and go to:
- **http://your-server-ip** (or http://localhost if running locally)

You should see the FinTracker login page!

---

## Common Commands

```bash
# Stop the application
docker compose down

# Restart the application
docker compose restart

# View logs
docker compose logs -f

# View logs for specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f mongodb

# Rebuild after code changes
docker compose up -d --build

# Remove everything including database
docker compose down -v

# Check container status
docker compose ps

# Enter a container shell
docker compose exec backend bash
docker compose exec mongodb mongosh -u admin -p YourSecurePassword123!
```

---

## Troubleshooting

### Issue: Port 80 already in use
```bash
# Check what's using port 80
sudo lsof -i :80

# Change port in .env file
APP_PORT=8080
```

### Issue: MongoDB connection failed
```bash
# Check if MongoDB is healthy
docker compose ps
docker compose logs mongodb

# Restart MongoDB
docker compose restart mongodb
```

### Issue: Frontend shows blank page
```bash
# Check frontend build logs
docker compose logs frontend

# Rebuild frontend
docker compose build frontend
docker compose up -d frontend
```

### Issue: API not responding
```bash
# Check backend logs
docker compose logs backend

# Test API directly
curl http://localhost/api/
```

---

## Production Recommendations

### 1. Change default passwords in .env
```bash
# Generate secure password
openssl rand -base64 32

# Generate JWT secret
openssl rand -hex 32
```

### 2. Setup SSL with Let's Encrypt (for HTTPS)
```bash
# Install certbot
sudo apt install certbot

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com
```

### 3. Setup firewall
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 4. Setup automatic backups
```bash
# Create backup script
cat > ~/backup-fintracker.sh << 'BACKUP'
#!/bin/bash
BACKUP_DIR=~/fintracker-backups
mkdir -p $BACKUP_DIR
docker compose exec -T mongodb mongodump --archive --gzip -u admin -p YourSecurePassword123! > $BACKUP_DIR/backup-$(date +%Y%m%d).gz
find $BACKUP_DIR -mtime +7 -delete
BACKUP

chmod +x ~/backup-fintracker.sh

# Add to crontab for daily backups
(crontab -l 2>/dev/null; echo "0 2 * * * ~/backup-fintracker.sh") | crontab -
```

---

## File Structure Reference

After setup, your directory should look like:

```
~/fintracker/
├── docker-compose.yml
├── .env
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── server.py
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    ├── yarn.lock
    ├── public/
    │   └── index.html
    └── src/
        ├── App.js
        ├── App.css
        ├── index.js
        ├── index.css
        ├── components/
        │   ├── Layout.jsx
        │   └── ui/
        │       └── (shadcn components)
        └── pages/
            ├── Login.jsx
            ├── Register.jsx
            ├── Dashboard.jsx
            ├── Income.jsx
            ├── Expenses.jsx
            ├── Budget.jsx
            ├── CreditCards.jsx
            ├── Recurring.jsx
            └── Analytics.jsx
```
