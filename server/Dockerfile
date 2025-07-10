# Use Node LTS
FROM node:18

# Create app directory
WORKDIR /app

# Copy package files and install deps
COPY package*.json ./
RUN npm install

# Copy the rest of your app
COPY . .

# Build TypeScript
RUN npm run build

# Expose port 5001 (matching your .env PORT)
EXPOSE 5001

# Start the server
CMD [ "npm", "run", "start" ]
