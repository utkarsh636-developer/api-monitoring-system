FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Set Next.js environment variables (baked in at build time)
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

# Build the Next.js application
RUN npm run build

# Expose port 3000
EXPOSE 3000

# Start Next.js server
CMD ["npm", "start"]
