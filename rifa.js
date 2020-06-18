const fs = require('fs')
const PDFDocument = require('pdfkit')

// A few settings
const Width = 72 * 8.27
const Height = 72 * 11.69
const RIFAS_PER_FOLHA = 6

var blocos = [];
// Generate numbers
for(var nBloco = 0; nBloco < 15; nBloco ++){
  var folhas = [];
  for(var nFolha = 0; nFolha < 50; nFolha ++){
    var folha = [
      mapBlocoInFolha(nBloco, nFolha, 0),
      mapBlocoInFolha(nBloco, nFolha, 1),
      mapBlocoInFolha(nBloco, nFolha, 2),
      mapBlocoInFolha(nBloco, nFolha, 3),
      mapBlocoInFolha(nBloco, nFolha, 4),
      mapBlocoInFolha(nBloco, nFolha, 5),
    ];
    folhas.push(folha);
  }
  blocos.push(folhas);
}

function mapBlocoInFolha(nBloco, nFolha, nPos){
  let rifaBaseNumber = (nBloco * RIFAS_PER_FOLHA + nPos) + '';
  let rifaSubNumber = nFolha + 10 + '';

  let rifaString = 'Nº ';
  rifaString += (rifaBaseNumber.length < 2 ? '0' : '') + rifaBaseNumber;
  rifaString += (rifaSubNumber.length < 2 ? '0' : '') + rifaSubNumber;
  return rifaString;
}

var doc = new PDFDocument()
doc.pipe(fs.createWriteStream('rifas.pdf'))
for(var nBloco in blocos){
  var bloco = blocos[nBloco];

  // Create a document

  // Header
  // Add new Page
  doc.addPage({
    margin: 0,
    size: [Width, Height]
  });
  doc.font('fonts/Allerta-Regular.ttf')
    .fontSize(25)
    .fillColor('#000000')
    .text('Bloco de rifas Nº '+(nBloco * 1 + 1), 30, 400)
    .fontSize(12)
    .text('Blocos '+[0, 1, 2, 3, 4, 5].map(n => bloco[0][n].substring(3, 5)).join(', '),
        30, 460)

  console.log('Generating bloco '+(nBloco * 1 + 1));

  for(var nPagina in bloco){
    var pagina = bloco[nPagina];

    // Add new Page
    doc.addPage({
      margin: 0,
      size: [Width, Height]
    });


    for(var k = 0; k < 3; k++){
      var w = Width / 3;
      var x = w * k;
      var h = Height / 2;

      doc.image('rifa_up.png', x, 0, {
        width: Width / 3
      })

      doc.fontSize(16)
        .fillColor('#FFFFFF')
        .text(pagina[k * 2], x + 240 / 2, 22)
        .fontSize(12)
        .fillColor('#FFFFFF')
        .text(pagina[k * 2], x + 270 / 2, 383);

      doc.rotate(180, {
        origin: [x + w / 2, h]
      })

      doc.image('rifa_up.png', x, 0, {
        width: Width / 3
      })

      doc.fontSize(16)
        .fillColor('#FFFFFF')
        .text(pagina[k * 2 + 1], x + 240 / 2, 22)
        .fontSize(12)
        .fillColor('#FFFFFF')
        .text(pagina[k * 2 + 1], x + 270 / 2, 383);

      doc.rotate(180, {
        origin: [x + w / 2, h]
      })
      // doc.image('rifa_down.png', Width / 3 * k, Height / 2, {
      //   width: Width / 3
      // })
    }
  }


}
// Finalize PDF file
doc.end();
