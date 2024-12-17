# Use official Node.js LTS image
FROM node:18-alpine

# Set working directory in the container
WORKDIR /usr/src/app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Create uploads directory
RUN mkdir -p /usr/src/app/uploads

# Expose the port the app runs on
EXPOSE 3000

# Environment variable defaults (can be overridden)
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# Start the application
CMD ["npm", "start"]