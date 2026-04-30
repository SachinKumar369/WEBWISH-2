FROM mcr.microsoft.com/playwright:v1.40.0-jammy

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install Node dependencies
RUN npm ci

# Install Playwright browsers
RUN npx playwright install

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p logs screenshots videos test-results traces allure-results

# Set environment variables for headless execution
ENV HEADLESS=true
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV DISPLAY=:99

# Default command
CMD ["npm", "test"]

