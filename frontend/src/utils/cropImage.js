// Recorte de imagem no navegador (canvas), usado no upload de foto de perfil.
// Recebe a área recortada (em pixels da imagem original, que o react-easy-crop já
// calcula) e devolve um Blob quadrado já redimensionado — assim o arquivo final
// fica pequeno (na casa de dezenas de KB) não importa o tamanho da foto original.
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function getCroppedImageBlob(imageSrc, areaPixels, outputSize = 480) {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(
    image,
    areaPixels.x, areaPixels.y, areaPixels.width, areaPixels.height,
    0, 0, outputSize, outputSize
  );
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
}
