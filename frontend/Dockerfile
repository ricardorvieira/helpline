FROM node:20-alpine AS builder

WORKDIR /app

COPY frontend/package*.json ./
COPY frontend/yarn.lock ./

RUN yarn install

COPY frontend/ .

RUN yarn build   # Produces /dist folder

# ---------------- runtime container ----------------
FROM node:20-alpine

WORKDIR /app

RUN npm install -g serve

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]
