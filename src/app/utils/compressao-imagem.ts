// Compressao client-side antes do upload -- decisao explicita de arquitetura (ver conversa
// sobre estrategia): a foto NUNCA trafega em tamanho original pela rede, seja o servidor local
// ou (depois do Capacitor) dados moveis do usuario. O backend so aceita JPEG e tem um limite de
// 3MB como rede de seguranca (ver FotoMissionarioService/application.properties no backend) --
// o resultado esperado aqui e bem menor que isso, ~250-350kb.
//
// createImageBitmap com { imageOrientation: 'from-image' } resolve de forma nativa o gotcha
// classico de EXIF (foto tirada em pe no celular saindo deitada apos passar por um <canvas> --
// sem isso, o canvas ignora o metadado de orientacao e desenha os pixels crus). Suportado nos
// navegadores/engines relevantes (Chrome/Edge/Firefox e Safari 15+, que cobre o que o Capacitor
// empacota em Android/iOS hoje).
const LARGURA_OU_ALTURA_MAXIMA = 1200;
const QUALIDADE_JPEG = 0.75;

export async function comprimirImagem(arquivo: File): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo, { imageOrientation: 'from-image' });

  const maiorLado = Math.max(bitmap.width, bitmap.height);
  const fator = maiorLado > LARGURA_OU_ALTURA_MAXIMA ? LARGURA_OU_ALTURA_MAXIMA / maiorLado : 1;
  const largura = Math.round(bitmap.width * fator);
  const altura = Math.round(bitmap.height * fator);

  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;

  const contexto = canvas.getContext('2d');
  if (!contexto) {
    bitmap.close();
    throw new Error('Não foi possível processar a imagem neste navegador.');
  }
  contexto.drawImage(bitmap, 0, 0, largura, altura);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Falha ao comprimir a imagem.'))),
      'image/jpeg',
      QUALIDADE_JPEG
    );
  });
}
