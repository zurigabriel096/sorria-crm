package br.com.sorria.crm.user;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Set;
import java.util.UUID;

// Fala direto com a API REST de Storage do Supabase via HttpClient nativo do Java
// (sem SDK extra) — upload simples de um objeto num bucket já existente e público.
@Service
public class AvatarService {

    private static final Set<String> TIPOS_PERMITIDOS = Set.of("image/jpeg", "image/png", "image/webp");
    private static final long TAMANHO_MAX_BYTES = 5L * 1024 * 1024;

    private final String supabaseUrl;
    private final String serviceKey;
    private final String bucket;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    public AvatarService(
            @Value("${supabase.url}") String supabaseUrl,
            @Value("${supabase.service-key}") String serviceKey,
            @Value("${supabase.avatar-bucket}") String bucket
    ) {
        this.supabaseUrl = supabaseUrl;
        this.serviceKey = serviceKey;
        this.bucket = bucket;
    }

    public String upload(Long usuarioId, MultipartFile arquivo) {
        if (supabaseUrl.isBlank() || serviceKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED,
                    "Upload de foto ainda nao configurado: defina SUPABASE_URL e SUPABASE_SERVICE_KEY no backend");
        }
        if (arquivo.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Arquivo vazio");
        }
        if (arquivo.getSize() > TAMANHO_MAX_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Arquivo maior que 5MB");
        }
        String tipo = arquivo.getContentType();
        if (tipo == null || !TIPOS_PERMITIDOS.contains(tipo)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Envie uma imagem JPEG, PNG ou WebP");
        }

        String extensao = tipo.equals("image/png") ? "png" : tipo.equals("image/webp") ? "webp" : "jpg";
        String caminho = "usuario-%d/%s.%s".formatted(usuarioId, UUID.randomUUID(), extensao);

        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create("%s/storage/v1/object/%s/%s".formatted(supabaseUrl, bucket, caminho)))
                    .header("Authorization", "Bearer " + serviceKey)
                    .header("Content-Type", tipo)
                    .header("x-upsert", "true")
                    .PUT(HttpRequest.BodyPublishers.ofByteArray(arquivo.getBytes()))
                    .build();
            HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() >= 300) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Supabase Storage recusou o upload: " + res.body());
            }
        } catch (IOException | InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Falha ao enviar a foto: " + e.getMessage());
        }

        return "%s/storage/v1/object/public/%s/%s".formatted(supabaseUrl, bucket, caminho);
    }
}
