FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy all source files
COPY . .

# Expose ports for all services
EXPOSE 3000 3001 3010 8080

# Start all services
CMD ["npm", "start"]