#!/bin/bash
# NueraDigital WhatsApp Gateway - VPS Setup Script
# Hanya untuk sistem operasi Ubuntu 22.04 LTS

set -e

echo "================================================="
echo "   NueraDigital WhatsApp Gateway VPS Setup       "
echo "================================================="
echo "Memulai instalasi dependencies..."

# Update OS
sudo apt-get update
sudo apt-get upgrade -y

# Install tools dasar
sudo apt-get install -y curl wget git nginx certbot python3-certbot-nginx apt-transport-https ca-certificates software-properties-common

# Install Docker
if ! command -v docker &> /dev/null
then
    echo "Menginstal Docker..."
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
else
    echo "Docker sudah terinstal."
fi

# Install Node.js (untuk keperluan utility / pm2 jika butuh di luar docker)
if ! command -v node &> /dev/null
then
    echo "Menginstal Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "Node.js sudah terinstal."
fi

echo "================================================="
echo "Instalasi selesai!"
echo "Langkah selanjutnya:"
echo "1. Clone repositori project ke VPS."
echo "2. Salin .env.example menjadi .env"
echo "3. Sesuaikan konfigurasi di file .env."
echo "4. Jalankan perintah: docker compose up -d"
echo "================================================="
