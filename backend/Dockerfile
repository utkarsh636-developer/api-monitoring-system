FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package configuration files
COPY package*.json ./

# Install all dependencies
RUN npm install

# Copy database schema first
COPY prisma ./prisma/

# Generate Prisma Client
RUN npx prisma generate

# Copy the rest of the application code
COPY . .

# Compile TypeScript code to JS
RUN npm run build

# Prune devDependencies to keep the production image small
RUN npm prune --production

# Create logs directory
RUN mkdir -p logs

# Expose port 5000
EXPOSE 5000

# Start the Express API server using npm start
CMD ["npm", "start"]
