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

# Expose port (Fly will bind this)
EXPOSE 3000

# Start the server
CMD [ "npm", "run", "start" ]
