FROM mysql:8.0-debian

RUN apt-get update && apt-get install -y \
    locales \
    tzdata \
    && rm -rf /var/lib/apt/lists/*

ENV LANG ja_JP.UTF-8
ENV LANGUAGE ja_JP:ja
ENV LC_ALL ja_JP.UTF-8
ENV TZ=Asia/Tokyo