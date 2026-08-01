FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn -B package -DskipTests

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/app.jar app.jar
EXPOSE 8080
# Limites explicitos de memoria - sem isso a JVM tenta usar mais do que o
# container de 512MB do Render aguenta e o processo e morto por OOM (visto em
# producao: "Ran out of memory (used over 512MB)" em loop de crash).
# UseSerialGC porque o G1 (default) reserva memoria extra que nao cabe aqui.
ENTRYPOINT ["java", "-Xmx320m", "-Xss256k", "-XX:MaxMetaspaceSize=96m", "-XX:+UseSerialGC", "-jar", "app.jar"]
