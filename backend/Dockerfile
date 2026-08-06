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
# Tentativa revertida (06/08/2026): -XX:ReservedCodeCacheSize=48m +
# -XX:MaxDirectMemorySize=32m pareciam reduzir o teto teorico, mas na pratica
# o proximo deploy crashou em ~1min (antes levava 12min+) - PIOROU em vez de
# ajudar. Hipotese nao confirmada (talvez o pico de JIT/alocacao do BOOT do
# Spring precise de mais do que 48m/32m, e cortar isso durante o startup
# quebra mais rapido do que deixar sobrar em regime de cruzeiro). Revertido
# sem esses dois flags - teoria nao bateu com o dado real, entao volta pro
# que ja tinha (mesmo sem entender 100% o mecanismo ainda).
# -Duser.timezone=America/Sao_Paulo: o container do Render roda em UTC por
# padrao - sem isso, todo LocalDateTime.now() do backend (Mensagem.criadoEm,
# ContatoService.ultimaMensagemEm, etc.) grava hora UTC, e o frontend exibe
# esse valor como se ja fosse horario de Brasilia (sem converter fuso),
# fazendo mensagens aparecerem ~3h no futuro (as vezes ate no dia seguinte).
ENTRYPOINT ["java", "-Duser.timezone=America/Sao_Paulo", "-Xmx288m", "-Xss256k", "-XX:MaxMetaspaceSize=160m", "-XX:+UseSerialGC", "-jar", "app.jar"]
