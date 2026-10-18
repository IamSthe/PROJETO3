FROM node:24-alpine
WORKDIR /app
COPY . .
ENV PORT=3000 DATABASE_PATH=/data/blackhearts.sqlite
EXPOSE 3000
CMD ["node","server/server.mjs"]
