FROM rust:1.94-alpine AS builder
WORKDIR /app
RUN apk add pkgconfig openssl-dev musl-dev build-base gcc
COPY . .
RUN rustup target add x86_64-unknown-linux-musl && \
    RUSTFLAGS="-C target-feature=+crt-static" cargo build --release --target x86_64-unknown-linux-musl -p edusync-api-server

FROM alpine:3.20
RUN apk add --no-cache ca-certificates libc6-compat
COPY --from=builder /app/target/x86_64-unknown-linux-musl/release/edusync-api-server /usr/local/bin/edusync-api
EXPOSE 8080
CMD ["edusync-api"]
