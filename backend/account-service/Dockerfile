# --- Stage 1: Build the application ---
FROM eclipse-temurin:21-jdk-jammy AS build
WORKDIR /app

# 1. Copy maven wrapper and pom to cache dependencies
COPY .mvn/ .mvn
COPY mvnw pom.xml ./
# Fix line endings if developed on Windows and ensure execution permissions
RUN chmod +x mvnw && ./mvnw dependency:go-offline -B

# 2. Copy source code and build the JAR
COPY src ./src
RUN ./mvnw clean package -Dmaven.test.skip=true -B

# --- Stage 2: Create the runtime image ---
FROM eclipse-temurin:21-jre-jammy

LABEL maintainer="AccordCRM <accordcrm.noreply@gmail.com>"
LABEL service="account-service"

# 1. Install curl for the Healthcheck and create a non-root user for security
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/* && \
    groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser

WORKDIR /app

# 2. Copy only the built JAR from the build stage
# Note: Using a wildcard * to match the versioned JAR name automatically
COPY --from=build --chown=appuser:appuser /app/target/account-service-*.jar app.jar

# 3. Switch to the non-root user
USER appuser

# 4. Expose the port your Spring Boot app is configured to use
EXPOSE 8083

# 5. Healthcheck: Tells the Docker engine (and ALB) if the app is actually ready
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=10 \
    CMD curl -f http://localhost:8083/actuator/health || exit 1

# 6. Optimized Entrypoint for Java in Containers
ENTRYPOINT ["java", \
    "-XX:MaxRAMPercentage=75.0", \
    "-XX:+UseG1GC", \
    "-Djava.security.egd=file:/dev/./urandom", \
    "-jar", "app.jar"]