FROM node:20-alpine
WORKDIR /app
COPY package.json server.js ./
COPY assets ./assets
COPY tools ./tools
COPY index.html ./
COPY sitemap.xml robots.txt ./
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
