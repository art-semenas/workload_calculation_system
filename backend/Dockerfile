FROM maven:3.9.13-eclipse-temurin-21 AS build
WORKDIR /app

COPY pom.xml .
RUN mvn dependency:go-offline -DskipTests -q

COPY src ./src
RUN mvn clean package -DskipTests -q

# Health probe for the distroless runtime, which has no shell/wget/curl.
COPY docker/HealthCheck.java /tmp/HealthCheck.java
RUN javac -d /healthcheck /tmp/HealthCheck.java

FROM gcr.io/distroless/java21-debian12:nonroot
WORKDIR /app
COPY --from=build /app/target/workload-backend-*.jar /app/app.jar
COPY --from=build /healthcheck /app/healthcheck

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
