# 1. ベースイメージ
FROM node:20-alpine

# 2. 作業ディレクトリ
WORKDIR /app

# 3. package.json を先にコピーして依存関係をインストール
COPY ./frontend/package*.json ./
RUN npm install

# 4. 残りのソースコードをコピー
COPY ./frontend .

# 5. ビルドを実行
RUN npm run build

# 6. ポートを公開
EXPOSE 3000

# 7. 本番用のコマンド
CMD ["npm", "start"]