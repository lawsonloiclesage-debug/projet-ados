FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
ENV PORT=3000 DB_FILE=/data/projet-ados.db
VOLUME /data
EXPOSE 3000
CMD ["node", "server.js"]
