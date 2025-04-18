# Use the official Node.js 18 image as a parent image
FROM node:18-alpine AS builder

# Set the working directory in the container to /app
WORKDIR /app

# Copy package.json and package-lock.json into the container
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --ignore-scripts

# Copy the rest of the application code into the container
COPY src/ ./src/
COPY tsconfig.json ./

# Build the project
RUN npm run build

# Use a minimal node image as the base image for running
FROM node:18-alpine AS runner

WORKDIR /app

# Copy compiled code from the builder stage
COPY --from=builder /app/build ./build
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm ci --production --ignore-scripts

# The EXA_API_KEY should be provided as an environment variable at runtime.
# Example: docker run -e EXA_API_KEY='your-actual-key' ... your-image-name
# Ensure this variable is configured in your deployment environment (e.g., Smithery).

# Expose the port the app runs on
EXPOSE 3000

# Run the application
ENTRYPOINT ["node", "build/index.js"]