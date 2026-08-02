package br.com.sorria.crm.conversa;

import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

// Midia do WhatsApp (via Baileys/Evolution) chega criptografada - o "URL" do
// webhook so tem bytes cifrados, inuteis sem isso aqui. Implementa o esquema
// padrao de descriptografia de midia do WhatsApp (documentado publicamente,
// usado por Baileys/whatsapp-web.js): expande a mediaKey (32 bytes) via
// HKDF-SHA256 em 112 bytes -> [iv(16) | cipherKey(32) | macKey(32) | refKey(32,
// nao usado] - depois AES-256-CBC com esse iv/cipherKey. Os ultimos 10 bytes
// do arquivo baixado sao o MAC (HMAC-SHA256 truncado), nao fazem parte do
// ciphertext.
public final class WhatsAppMediaDecryptor {

    private WhatsAppMediaDecryptor() {
    }

    public static String infoParaMimetype(String mimetype) {
        if (mimetype == null) return "WhatsApp Document Keys";
        if (mimetype.startsWith("image")) return "WhatsApp Image Keys";
        if (mimetype.startsWith("video")) return "WhatsApp Video Keys";
        if (mimetype.startsWith("audio")) return "WhatsApp Audio Keys";
        return "WhatsApp Document Keys";
    }

    public static byte[] decrypt(byte[] arquivoCifrado, byte[] mediaKey, String info) throws Exception {
        byte[] expandido = hkdfExpandSha256(mediaKey, 112, info);
        byte[] iv = Arrays.copyOfRange(expandido, 0, 16);
        byte[] cipherKey = Arrays.copyOfRange(expandido, 16, 48);

        int tamanhoSemMac = arquivoCifrado.length - 10; // ultimos 10 bytes = MAC, nao fazem parte do conteudo
        byte[] ciphertext = Arrays.copyOfRange(arquivoCifrado, 0, tamanhoSemMac);

        Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
        cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(cipherKey, "AES"), new IvParameterSpec(iv));
        return cipher.doFinal(ciphertext);
    }

    // HKDF (RFC 5869) com salt = 32 bytes zerados (padrao quando o protocolo
    // nao informa salt proprio - e o caso do esquema de midia do WhatsApp).
    private static byte[] hkdfExpandSha256(byte[] ikm, int tamanho, String info) throws Exception {
        Mac macExtract = Mac.getInstance("HmacSHA256");
        macExtract.init(new SecretKeySpec(new byte[32], "HmacSHA256"));
        byte[] prk = macExtract.doFinal(ikm);

        Mac macExpand = Mac.getInstance("HmacSHA256");
        macExpand.init(new SecretKeySpec(prk, "HmacSHA256"));
        byte[] infoBytes = info.getBytes(StandardCharsets.UTF_8);

        byte[] resultado = new byte[tamanho];
        byte[] anterior = new byte[0];
        int posicao = 0;
        byte contador = 1;
        while (posicao < tamanho) {
            macExpand.reset();
            macExpand.update(anterior);
            macExpand.update(infoBytes);
            macExpand.update(contador);
            anterior = macExpand.doFinal();
            int copiar = Math.min(anterior.length, tamanho - posicao);
            System.arraycopy(anterior, 0, resultado, posicao, copiar);
            posicao += copiar;
            contador++;
        }
        return resultado;
    }
}
