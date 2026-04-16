FROM oven/bun:1-alpine

RUN apk add --no-cache \
    bash \
    git \
    curl \
    ca-certificates

ENV PATH="/root/.local/bin:${PATH}"
ENV IS_SANDBOX=1
ENV CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=true
ENV DISABLE_AUTOUPDATER=1
ENV GIT_DIR=/workspace/.git

WORKDIR /workspace

ENTRYPOINT ["claude", "--dangerously-skip-permissions", "--allow-dangerously-skip-permissions", "--no-chrome"]
