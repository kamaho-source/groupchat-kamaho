# 1. ベースイメージ
FROM node:20-alpine

# 2. 作業ディレクトリ
WORKDIR /app

# 2.1. ビルド時の環境変数（Next config がビルド時に評価されるため）
ARG BACKEND_ORIGIN=http://groupchat-kamaho-app:80
ARG NEXT_PUBLIC_API_BASE=/api
ENV BACKEND_ORIGIN=$BACKEND_ORIGIN
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE
ENV NODE_ENV=production

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
