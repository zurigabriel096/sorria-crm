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
# ReservedCodeCacheSize/MaxDirectMemorySize adicionados em 06/08/2026: o log
# de memoria real (VmRSS, MemoriaDiagnosticoScheduler) mostrou o processo
# subindo devagar e CONSTANTE (522MB->535MB em 15min, sem nenhuma acao de
# usuario no meio) até o Render matar - Xmx/MaxMetaspaceSize sozinhos nao
# cobrem o cache de codigo JIT (sem teto, cresce conforme o app compila mais
# metodos com o tempo de execucao - baguncava exatamente com esse padrao de
# "cresce sozinho, devagar, sem pico") nem os buffers diretos (NIO do
# Tomcat/JDBC), que por padrao sem -XX:MaxDirectMemorySize usam um teto igual
# ao -Xmx (mais 288MB "escondidos").
# -Duser.timezone=America/Sao_Paulo: o container do Render roda em UTC por
# padrao - sem isso, todo LocalDateTime.now() do backend (Mensagem.criadoEm,
# ContatoService.ultimaMensagemEm, etc.) grava hora UTC, e o frontend exibe
# esse valor como se ja fosse horario de Brasilia (sem converter fuso),
# fazendo mensagens aparecerem ~3h no futuro (as vezes ate no dia seguinte).
ENTRYPOINT ["java", "-Duser.timezone=America/Sao_Paulo", "-Xmx288m", "-Xss256k", "-XX:MaxMetaspaceSize=160m", "-XX:ReservedCodeCacheSize=48m", "-XX:MaxDirectMemorySize=32m", "-XX:+UseSerialGC", "-jar", "app.jar"]
