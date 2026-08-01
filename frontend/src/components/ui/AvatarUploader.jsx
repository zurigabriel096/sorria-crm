import { useCallback, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import { T } from "../../theme";
import { s } from "../../styles/s";
import { Modal } from "./Modal";
import { getCroppedImageBlob } from "../../utils/cropImage";
import { uploadAvatar } from "../../api/me";

const TAMANHO_MAX = 5 * 1024 * 1024;

// Fluxo: escolher arquivo -> recortar (quadrado, com zoom/arraste) -> confirma ->
// recorta em canvas no navegador (fica pequeno, ~480x480) -> sobe pro backend, que
// repassa pro Supabase Storage e salva a URL no usuário.
export function AvatarUploader({ onUploaded, onClose, showToast }) {
  const inp = useRef(null);
  const [src, setSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPixels, setAreaPixels] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const escolherArquivo = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > TAMANHO_MAX) return showToast("Arquivo maior que 5MB", "warn");
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) return showToast("Envie um JPEG, PNG ou WebP", "warn");
    const reader = new FileReader();
    reader.onload = () => setSrc(reader.result);
    reader.readAsDataURL(f);
  };

  const onCropComplete = useCallback((_area, pixels) => setAreaPixels(pixels), []);

  const confirmar = async () => {
    if (!areaPixels) return;
    setEnviando(true);
    try {
      const blob = await getCroppedImageBlob(src, areaPixels);
      const usuario = await uploadAvatar(blob);
      onUploaded(usuario);
      showToast("Foto de perfil atualizada", "ok");
      onClose();
    } catch (e) {
      showToast(e.message || "Erro ao enviar a foto", "warn");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal title="Foto de perfil" onClose={onClose}>
      {!src ? (
        <div
          onClick={() => inp.current.click()}
          style={{ ...s.importBox, flexDirection: "column", textAlign: "center", padding: 30 }}
        >
          <input ref={inp} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={escolherArquivo} />
          <div style={{ fontWeight: 700, color: T.ink, fontSize: 14 }}>Escolher foto</div>
          <div style={{ fontSize: 12, color: T.inkSoft, marginTop: 4 }}>JPEG, PNG ou WebP, até 5MB. Você recorta em seguida.</div>
        </div>
      ) : (
        <>
          <div style={{ position: "relative", width: "100%", height: 300, background: "#1b2a3d", borderRadius: 12, overflow: "hidden" }}>
            <Cropper image={src} crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid={false} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} />
          </div>
          <div style={{ margin: "14px 0 4px" }}>
            <div style={{ fontSize: 11, color: T.inkSoft, marginBottom: 4 }}>Zoom</div>
            <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} style={{ width: "100%", accentColor: T.primary }} />
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button style={{ ...s.btnGhost, flex: 1 }} onClick={() => setSrc(null)}>Escolher outra</button>
            <button style={{ ...s.btnPrimary, flex: 1, opacity: enviando ? .6 : 1 }} onClick={confirmar} disabled={enviando}>{enviando ? "Enviando..." : "Salvar foto"}</button>
          </div>
        </>
      )}
    </Modal>
  );
}
