FROM node:20-alpine
WORKDIR /app
COPY package.json server.js ./
COPY assets ./assets
COPY index.html ./
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
