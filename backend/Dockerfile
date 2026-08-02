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
# MaxMetaspaceSize subiu de 96m pra 160m (com Xmx caindo de 320m pra 288m, pra
# manter o mesmo teto de ~448MB): o app cresceu bastante desde que o limite de
# 96m foi definido (WhatsAppNumero, Mensagem, EtapaKanban, decodificacao de
# midia...) e passou a estourar Metaspace mesmo com o heap sobrando.
ENTRYPOINT ["java", "-Xmx288m", "-Xss256k", "-XX:MaxMetaspaceSize=160m", "-XX:+UseSerialGC", "-jar", "app.jar"]
