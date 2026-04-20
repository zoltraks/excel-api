FROM node:22-alpine
WORKDIR /tests
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY tsconfig.json jest.config.ts setup.ts helpers.ts ./
COPY integration/ ./integration/
CMD ["npm", "test"]
