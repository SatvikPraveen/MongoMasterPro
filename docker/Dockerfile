# Location: `/docker/Dockerfile`

FROM mongo:7.0

# Set working directory
WORKDIR /app

# Install additional tools
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    curl \
    jq \
    vim \
    && rm -rf /var/lib/apt/lists/*

# Copy configuration files
COPY config/mongodb.conf /etc/mongod.conf
COPY config/mongodb-rs.conf /etc/mongod-rs.conf

# Copy initialization scripts
COPY docker/init/bootstrap.js /docker-entrypoint-initdb.d/

# Copy all project scripts
COPY scripts/ /app/scripts/
COPY data/ /app/data/
COPY tests/ /app/tests/

# Set permissions
RUN chmod +x /docker-entrypoint-initdb.d/bootstrap.js
RUN chmod -R +r /app/

# Create data directories
RUN mkdir -p /data/db /data/configdb /var/log/mongodb

# Install Python dependencies for data generation
COPY data/generators/requirements.txt /tmp/
RUN pip3 install -r /tmp/requirements.txt

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD mongosh --eval "db.adminCommand('ping')" --quiet || exit 1

# Expose MongoDB port
EXPOSE 27017

# Default command
CMD ["mongod", "--config", "/etc/mongod.conf"]
