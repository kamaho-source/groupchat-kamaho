# 1. ベースイメージ
FROM node:20-alpine

# 2. 作業ディレクトリ
WORKDIR /app

# 3. package.json を先にコピーして npm install
COPY ./frontend/package*.json ./
RUN npm install

# 4. 残りのソースをコピー
COPY . .

# 5. 開発用ポート
EXPOSE 3000

# 6. 起動コマンド
CMD ["npm", "run", "dev"]
