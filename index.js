var PDFDocument = require('pdfkit');
var argv = require('optimist').argv;
var colors = require('colors');
var rimraf = require('rimraf');
var async = require('async');
var unzip = require('unzip');
var fs = require('fs');

var DEBUG = false;

var Creator = {

	page: 0,
	generateNewPage: function (images, opts, next) {
		
		Creator.page++;
		// Do not generate first page on first page...
		if('moreThanOnePage' in opts.pdf)
			opts.pdf.addPage({
				margins: opts.margins,
				size: PAGE_SIZE,
			});

		opts.pdf.moreThanOnePage = true;

		var margin = opts.margin;
		var groupsWidth = (opts.imageSize + opts.imageGap*2) * opts.imageRepeat;
		var groupsHeight = opts.groupsHeight;

		var pdfW = opts.pdf._pageBuffer[0].width;
		var pdfH = opts.pdf._pageBuffer[0].height;

		var tickLen = 10;

		// Add ticks to the border
		for(var l = 0; l < opts.lines + 1; l++){
			var y = margin + l * (groupsHeight) + opts.marginTop;

			// Add Line ticks (LEFT)
			opts.pdf.lineWidth(1)
				.lineCap('round')
				.moveTo(0, y)
				.lineTo(tickLen, y)
				.strokeColor('#888')
				.stroke();

			// Add Line ticks (LEFT)
			opts.pdf.lineWidth(1)
				.lineCap('round')
				.moveTo(pdfW, y)
				.lineTo(pdfW - tickLen, y)
				.strokeColor('#888')
				.stroke();

			for(var c = 0; c < opts.columns + 1; c++){
				var x = margin + c * (groupsWidth + opts.groupsGap) - (c > 0 ? opts.groupsGap/2 : 0);

				// Add Line ticks (TOP)
				opts.pdf.lineWidth(1)
					.lineCap('round')
					.moveTo(x, opts.marginTop)
					.lineTo(x, opts.marginTop - tickLen)
					.strokeColor('#888')
					.stroke();

				// Add Line ticks (BOT)
				opts.pdf.lineWidth(1)
					.lineCap('round')
					.moveTo(x, pdfH)
					.lineTo(x, pdfH - tickLen)
					.strokeColor('#888')
					.stroke();

			}
		}	

		// Draw Page
		opts.pdf
			.fontSize(12)
			.fillColor('#444')
			.font('CustomFont')
			.text(useProgram.name + ' > ' + useType.name +' ['+cliTitle+']', 30, opts.marginTop/2);	

		opts.pdf
			.fontSize(12)
			.fillColor('#444')
			.font('CustomFont')
			.text(Creator.page, pdfW/4, opts.marginTop - 20);	

		for(var l = 0; l < opts.lines; l++){
			for(var c = 0; c < opts.columns; c++){

				var image = images[l * opts.columns + c];
				
				if(!image)
					continue;

				var helpText = 'QR code '+useType.name+' - Válido para o programa '+useProgram.simpleName + ' - '+cliYear;

				Creator.generateNewImageGroupAt({
					x: margin + c * (groupsWidth + opts.groupsGap),
					y: margin + l * (groupsHeight) + opts.marginTop,
					width: groupsWidth,
					height: groupsHeight,
					text: helpText,
				}, image, opts);

			}
		}

		next();

	},

	generateNewImageGroupAt: function (loc, image, opts){

		// Draw Help Text bg
		opts.pdf.lineWidth(12)
			.lineCap('round')
			.moveTo(loc.x + opts.imageGap*2, loc.y + opts.imageSize + opts.imageGap*2 + 6)
			.lineTo(loc.x + loc.width - opts.imageGap*2, loc.y + opts.imageSize + opts.imageGap*2 + 6)
			.strokeColor(useType.color)
			.stroke();
			
		// Draw Help Text
		opts.pdf
			.fontSize(8)
			.fillColor('#FFF')
			.font('CustomFont')
			.text(loc.text, loc.x, loc.y + opts.imageSize + opts.imageGap*2, {
				width: loc.width,
				height: 30,
				align: 'center',
			});

		if(DEBUG){
			opts.pdf.lineWidth(2)
				.lineCap('butt')
				.moveTo(loc.x, loc.y)
				.lineTo(loc.x + loc.width, loc.y)
				.lineTo(loc.x + loc.width, loc.y + loc.height)
				.lineTo(loc.x, loc.y + loc.height)
				.lineTo(loc.x, loc.y)
				.stroke();
		}

		// Add images
		var x = loc.x + opts.imageGap;
		var y = loc.y + opts.imageGap;

		for(var k = 0; k < opts.imageRepeat; k++){
			opts.pdf.image(image, x, y, {width: opts.imageSize});
			
			if(DEBUG)
				opts.pdf.rect(x,y,opts.imageSize, opts.imageSize).stroke();

			x += opts.imageSize + opts.imageGap*2;
		}



	},

	loadImagesFromPath: function (path, next){

	},

	walk: function (dir, filter) {
		var results = []
		var list = fs.readdirSync(dir)
		list.forEach(function(file) {
			file = dir + '/' + file
			var stat = fs.statSync(file)
			if (stat && stat.isDirectory()){
				results = results.concat(Creator.walk(file, filter))
			}else{
				if(filter && file.indexOf(filter) < 0)
					return;

				results.push(file);
			}
		})
		return results
	},

	printHelp: function (){

		console.log();
		console.log('===== AJUDA ===='.cyan);
		console.log();
		console.log('Para criar PDF`s a partir de um arquivo ou pasta, utilize o comando: ');
		console.log('  node createPdf -t <programa.tipo> --path pasta_ou_arquivo_zip --save nome_para_salvar -y 2015');
		console.log('(o arquivo .pdf será salvo na mesma pasta, a não ser que um nome seja especificado para ele)');
		console.log();
		console.log('ex: node createPdf -t 0.aluno --path Pasta_Qrcodes --save qrcodesaluno.pdf -y 2015 --title 100000_to_11000');

		console.log();
		var space = '\t'.blue;
		console.log('Programas cadastrados:'.blue);
			

		for(programKey in Programs){
			var program = Programs[programKey];
			console.log(('\t'+programKey+': '+program.name).blue.bold);
			console.log(('\t  tipos de licenças:').blue);

			for(var licKey in program.types){
				var license = program.types[licKey];

				console.log(('\t\t'+licKey+': '+license.name + ' [use: '+programKey+'.'+licKey+']').blue.bold);
				
			}

			console.log(('\t').blue);
			
		}
	}

}


/*
	Get params from command line from CLI path
*/
var filesPath = argv.path;
var cliType = argv.t || '';
var cliYear = argv.y;
var cliTitle = argv.title;
var outputPath = argv.save || '';

var files = null;
var doc = null;
var stream = null;

/*
	Load Program Templates
*/
var Programs = require('./Programs');

var cliProgram = cliType.split('.')[0];
var cliProgramType = cliType.split('.')[1];

var useProgram = Programs[cliProgram];
var useType = useProgram ? useProgram.types[cliProgramType] : null;


/*
	PDF Generation configuration

	NOTE: Page width will be calculated as follows:
		(IMAGE_SIZE + IMAGE_GAP*2) * IMAGE_REPEAT * COLUMNS + 2 * PAGE_MARGIN + (COLUMNS - 1) * GROUPS_GAP
*/
var PAGE_LINES = 7;
var PAGE_COLUMNS = 2;
var PAGE_SIZE = 'A3';
var PAGE_MARGIN = 20;
var PAGE_MARGIN_TOP = 75;

var IMAGE_GAP = 10;
var IMAGE_WIDTH = 110;
var IMAGE_REPEAT = 3;

var GROUPS_GAP = 20;
var GROUPS_HEIGTH = IMAGE_WIDTH + 20 + IMAGE_GAP * 2;


var process = [
	/*
		Validate files path
	*/
	function validateFilesPath(next){
		// Validate Path
		if(!filesPath || !fs.existsSync(filesPath))
			return next('Invalid path. File not found for: '+filesPath);

		next();
	},
	
	/*
		Clear tmp folder
	*/
	function clearTmp(next){
		console.log(' Cleaning tmp folder... '.bgCyan)
		rimraf('tmp', next);
	},

	/*
		Unzip if it's a zip
	*/
	function unzipIfNeeded(next){
		// Detects If file is a folder, and skip
		if(fs.lstatSync(filesPath).isDirectory()){
			console.log(' Path is a directory. Continuing... '.bgCyan);
			return next();
		}

		console.log(' Unzipping... '.bgCyan);

		// It's a file. Try to unzip...
		var unzipExtractor = unzip.Extract({ path: 'tmp' });
		unzipExtractor.on('error', next);
		unzipExtractor.on('close', next);

		fs.createReadStream(filesPath).pipe(unzipExtractor);

		// Set new path as the tmp folder
		filesPath = 'tmp';
	},

	/*
		Find all files
	*/
	function findAllFiles(next){
		files = Creator.walk(filesPath, '.png');
		console.log((' Found '+files.length+' files ').bgCyan);
		next();
	},

	/*
		Validate params
	*/
	function validateParams(next){
		if(!cliType){
			// Try matching to a existing one
			var sampleFile = files[0];
			
			// Search Programs
			for(var p in Programs){
				if(useType)
					break;

				var program = Programs[p];
				var types = program.types;

				for(var t in types){
					var type = types[t];
					if(sampleFile.indexOf(type.prependFile) >= 0){
						useType = type;
						useProgram = program;
						break;
					}

				}
			}

			// Check if found
			if(useProgram && useType){
				console.log(' Template não foi setado, mas detectado automaticamente '.bgGreen);
			}else{
				return next('Template selecionado não setado: '+cliType);
			}

		}

		if(!useType)
			return next('Programa não existente: '+cliType);

		if(!cliTitle)
			return next('Título não setado: '+cliType);

		if(!cliYear || cliYear < 2014 || cliYear > 2030)
			return next('Ano não informado, ou inválido');

		if(!outputPath)
			outputPath = useType.prependFile+'_'+cliYear+'.pdf';


		console.log((' Usando Template para '+useProgram.name+' > '+useType.name +' ').bgGreen);

		next();
	},

	/*
		Create PDF archive
	*/
	function createPDFArchive(next){
		console.log((' Creating doccument in '+outputPath+' ').bgCyan);

		// Calculate page size
		var margin = 2 * PAGE_MARGIN;
		var pageWidth = (IMAGE_WIDTH + IMAGE_GAP * 2) * IMAGE_REPEAT * PAGE_COLUMNS + margin + (PAGE_COLUMNS - 1) * GROUPS_GAP;
		var pageHeight = (GROUPS_HEIGTH) * PAGE_LINES + margin + (PAGE_LINES - 1) * GROUPS_GAP;

		doc = new PDFDocument({
			size: PAGE_SIZE,
			autoFirstPage: false,
		});

		doc.registerFont('CustomFont', 'fonts/Allerta-Regular.ttf', 'Allerta-Regular')

		stream = doc.pipe(fs.createWriteStream(outputPath)); // write to PDF

		next();
	},

	function createContent(next){

		var tmpFiles = files;
		var groupedImages = [];
		
		var GROUPS_PER_PAGE = PAGE_COLUMNS * PAGE_LINES;

		while(tmpFiles.length > 0){
			groupedImages.push(tmpFiles.slice(0, GROUPS_PER_PAGE));
			tmpFiles = tmpFiles.slice(GROUPS_PER_PAGE, tmpFiles.length);
		}

		console.log((' Will generate '+groupedImages.length+' pages ').bgCyan);

		async.map(groupedImages, function (images, next){
			Creator.generateNewPage(images, {
				pdf: doc,

				marginTop: PAGE_MARGIN_TOP,

				margin: PAGE_MARGIN,
				columns: PAGE_COLUMNS,
				lines: PAGE_LINES,

				groupsGap: GROUPS_GAP,
				groupsHeight: GROUPS_HEIGTH,

				imageSize: IMAGE_WIDTH,
				imageRepeat: IMAGE_REPEAT,
				imageGap: IMAGE_GAP,

			}, next);
		}, next)

	},

	/*
		End PDF file
	*/
	function saveFile(next){
		console.log(' Saving '.bgCyan);
		stream.on('finish', next);
		doc.end();
		// next();
	}
];



/*
	Execute steps
*/
console.log(' STARTING PROCESS '.bgGreen);
async.series(process, function (err){
	if(err){
		console.error(' ERROR '.bgRed, err);
		Creator.printHelp();
	}else{
		console.log(' ALL OK '.bgGreen);
	}
});