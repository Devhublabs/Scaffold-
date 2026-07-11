
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 4000

# Runs nodemon so edits to mounted source hot-reload inside the container
CMD ["npm", "run", "dev"]
