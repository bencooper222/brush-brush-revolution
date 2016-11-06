var output = document.getElementById('output');
var screenDiv = document.getElementById('screen');
var video = document.getElementById('camera');
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');

var task = null;

function clearCanvas(){
	ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawRect(r, fill){
	ctx.beginPath();
	clearCanvas();
	ctx.rect(r.x, r.y, r.width, r.height);
	ctx.stroke();
	if(fill){
		ctx.fillStyle = fill;
		ctx.fill();
	}
	ctx.closePath();
}

function flipHorizontal(domObj){
	domObj.style.cssText = "-moz-transform: scale(-1, 1); \
	-webkit-transform: scale(-1, 1); -o-transform: scale(-1, 1); \
	transform: scale(-1, 1); filter: FlipH;";
}

flipHorizontal(video);
flipHorizontal(canvas);

var SCALED = false;

var adjustScreenSize = function(){
	//task.stop();
	var h = video.videoHeight;
	var w = video.videoWidth;
	video.width = w;
	video.height = h;
	canvas.width = w;
	canvas.height = h;
	screenDiv.style.width = w + 'px';
	screenDiv.style.height = h + 'px';
	screenDiv.style.marginLeft = (w/-2) + 'px';
	SCALED = true;
	/*clearCanvas();
	ctx = canvas.getContext('2d');
	launchColorTracker();*/
	video.removeEventListener('playing', adjustScreenSize, false);
}

video.addEventListener('playing', adjustScreenSize, false);

var saved = [];

function saveRect(rect){
	saved.push({
		timestamp: rect.timestamp,
		x: rect.x,
		y: rect.y,
		width: rect.width,
		height: rect.height
	});
}

function printData(){
	saved.sort(function(a, b){
		return a.timestamp - b.timestamp;
	});
	var start = saved[0].timestamp;
	var lines = saved.map(function(d){
		var time = d.timestamp - start;
		return [time, d.x, d.y, d.width, d.height].join(',');
	});
	var toPrint = '';
	//['timestamp', 'x', 'y', 'width', 'height'].join(',');
	for(var i = 0; i < lines.length; i++){
		toPrint += '\n' + lines[i];
	}
	output.value = toPrint;
	screenDiv.style.display = 'none';
}

function endCameraFeed(){
	task.stop();
	var trackDiv = document.getElementById('track');
	document.body.removeChild(trackDiv);
}

function dumpData(){
	if(saved.length > 0){
		//printData();
		saved.sort(function(a, b){
			return a.timestamp - b.timestamp;
		});
		var start = saved[0].timestamp;
		var raw_coords = saved.map(function(d){
			var time = d.timestamp - start;
			return {
				timestamp: time,
				x: d.x,
				y: d.y,
				width: d.width,
				height: d.height
			};
		});
		var brush_coords = calculateBrushCoordinates(raw_coords);
		//console.log(brush_coords);
		finalAnalysis(brush_coords);
	}
}

function launchColorTracker(r, g, b, t){
	ctx.strokeStyle = 'yellow';
	//registerColorV('tracker',174,234,197,20);
	registerColorV('tracker', r, g, b, t);

	var colors = new tracking.ColorTracker(['tracker']);

	colors.on('track', function(event){
		if(event.data.length === 0){
			//console.log('No colors detected.');
			//canvas.style.background = 'rgba(0,0,0,0.25)';
		}
		else{
			//canvas.style.background = 'rgba(0,0,0,0.00)';
			event.data.forEach(function(rect){
				rect.timestamp = Date.now();
				//console.log(rect);
				drawRect(rect);
				saveRect(rect);
			});
		}
	});

	task = tracking.track('#camera', colors, {camera: true});
}

var colorButton = document.getElementById('color');

colorButton.addEventListener('click', chooseColor);

function chooseColor(){
	var trackerColor = colorButton.style.background;
	//console.log(trackerColor);
	task.stop();
	//document.body.style.background = trackerColor;
	colorButton.style.background = trackerColor;
	colorButton.innerText = 'Calibrated To: ' + trackerColor;
	colorButton.style.height = '30px';
	colorButton.style.lineHeight = '30px';
	clearCanvas();
	var c = trackerColor.substr(4).replace(')', '').split(', ');
	launchColorTracker(c[0], c[1], c[2], 30);
	colorButton.removeEventListener('click', chooseColor);
}

function launchBrushTracker(){
	ctx.strokeStyle = 'red';
	var BrushTracker = function(){
		BrushTracker.base(this, 'constructor');
	}

	tracking.inherits(BrushTracker, tracking.Tracker);

	var LIM_CPRINT = 0;

	function mode(list){
		var counts = {};
		for(var i = 0; i < list.length; i++){
			var n = list[i]
			counts[n] = counts[n] + 1 || 1;
		}
		var highest = {count: 0, value: false};
		for(var m in counts){
			if(counts[m] > highest.count){
				highest.count = counts[m];
				highest.value = m;
			}
		}
		return highest.value;
	}

	BrushTracker.prototype.track = function(raw, width, height){
		if(SCALED){
			var size = 50;
			var cbtr = {
				x: Math.floor((width - size) / 2),
				y: Math.floor((height - size) / 2),
				width: size,
				height: size
			};
			drawRect(cbtr);

			var pixels = [];
			var rgbStr = [];
			var rgbStack = [[], [], []];
			var avg = [0, 0, 0];
			for(var y = cbtr.y; y < (cbtr.y + cbtr.height); y++){
				for(var x = cbtr.x; x < (cbtr.x + cbtr.width); x++){
					var i = 4 * x * y;
					var rgb = [raw[i], raw[i+1], raw[i+2]];
					pixels.push(rgb);
					rgbStr.push(rgb.join(','));
					rgbStack[0].push(raw[i]);
					rgbStack[1].push(raw[i+1]);
					rgbStack[2].push(raw[i+2]);
				}
			}

			var modeRGB = [mode(rgbStack[0]), mode(rgbStack[0]), mode(rgbStack[0])];
			var modePix = mode(rgbStr);

			//console.log('%c Average Color', 'background: rgba(' + modePix + ',1)');
			var finalStr = 'rgba(' + modePix + ',1)';
			//document.body.style.background = finalStr;
			colorButton.style.background = finalStr;
			drawRect(cbtr, finalStr);

			//SCALED = false;
		}

		/*this.emit('track', {
			// Your results here
		});*/
	}

	tracking.BrushTracker = BrushTracker;

	var brushTracker = new tracking.BrushTracker();

	brushTracker.on('track', function(event){
		//
	});

	task = tracking.track('#camera', brushTracker, {camera: true});
}

/*window.onerror = function(event){
	console.error(event);
	alert(event);
}*/

launchBrushTracker();

/*var FDATA = JSON.parse('[{"x":131,"y":0,"z":0,"t0":0,"t":0,"v":0,"a":0},{"x":138,"y":331,"z":127.56958885251609,"t0":13831,"t":1,"v":-73.84908103911908,"a":-75.12663121064728},{"x":314,"y":117,"z":26.9443871706155,"t0":543,"t":101,"v":-2.956760587482774,"a":-0.03187489532102451},{"x":231.25,"y":405.25,"z":-324.98153793715727,"t0":12554,"t":101,"v":0.4992383711719221,"a":0.004456097123031145},{"x":320,"y":114,"z":-108.33282051160673,"t0":1505,"t":103,"v":0.156882706260829,"a":0.0027683522700410077},{"x":326,"y":447,"z":-240.96057768855053,"t0":13943,"t":106,"v":1.5421572243983754,"a":0.00950466778155035},{"x":452,"y":82,"z":-162.12032568435092,"t0":11397,"t":108,"v":1.646278406693663,"a":0.015927425174847406},{"x":265,"y":323,"z":-178.8770527485289,"t0":13720,"t":111,"v":1.2775501715281856,"a":0.01934117374269442},{"x":488,"y":206,"z":-266.0093983302094,"t0":10837,"t":111,"v":0.3558173483425574,"a":0.0035876985364115994},{"x":188,"y":354,"z":181.4386948806676,"t0":13832,"t":111,"v":0.5346624395540382,"a":0.6701238151231813},{"x":341.5,"y":332,"z":-187.449993331555,"t0":12312,"t":113,"v":1.2660327756099528,"a":0.016527361642515493},{"x":303,"y":164,"z":-84.39786727163188,"t0":1033,"t":114,"v":-0.15475124968139004,"a":-0.0020085101083120167},{"x":321,"y":106,"z":39.9124040869503,"t0":1390,"t":115,"v":-0.12825757755339479,"a":-0.0028291173982562456},{"x":160,"y":234,"z":-131.93559034619892,"t0":13602,"t":118,"v":-0.8693201139108949,"a":-0.008264918051719052},{"x":310,"y":178,"z":58.32666628567074,"t0":777,"t":119,"v":-0.11802130258838406,"a":-0.003523495315008284},{"x":325,"y":111,"z":-90.4599358832406,"t0":1271,"t":119,"v":0.19709092324607347,"a":0.003216933611910249},{"x":318,"y":228,"z":181.04143172213372,"t0":10461,"t":120,"v":1.7388808558575468,"a":0.014616882222409753},{"x":294,"y":77,"z":57.7148161220323,"t0":11276,"t":121,"v":-0.0738835121898566,"a":0.0018399642609645936},{"x":213.5,"y":166,"z":-263.12687053966954,"t0":12959,"t":121,"v":0.31484510118216225,"a":0.002907946979916344},{"x":376,"y":202,"z":114.02631275280284,"t0":13080,"t":123,"v":0.5241404544429669,"a":0.0017015882378927205},{"x":432,"y":246,"z":242.77458680842196,"t0":10713,"t":124,"v":-0.04241718919913014,"a":-0.008123207088060955},{"x":314,"y":103,"z":28.548204847240395,"t0":1147,"t":124,"v":-0.1857241765712462,"a":-0.00024978166846658203},{"x":326,"y":231,"z":113.11940593903424,"t0":13474,"t":128,"v":0.10594021619195315,"a":-0.0009364846445658465},{"x":345,"y":133,"z":-156.97452022541742,"t0":13346,"t":128,"v":0.2258102506963815,"a":0.005534225770079506},{"x":294,"y":336,"z":263.03136695078786,"t0":12425,"t":129,"v":0.04917256174577645,"a":-0.009433024913675784},{"x":433.5,"y":273.5,"z":-221.8163654918185,"t0":10581,"t":132,"v":0.9648604897204283,"a":-0.005863790652553928},{"x":306,"y":107,"z":191.30081024397148,"t0":10948,"t":132,"v":-1.6389006065008218,"a":-0.015111499657904388},{"x":318,"y":183,"z":83.33066662399855,"t0":644,"t":133,"v":0.3012746398976017,"a":0.024496505469025383},{"x":296,"y":209,"z":-85.77878525602945,"t0":896,"t":137,"v":0.07421890266617989,"a":0.0014032131770406128},{"x":170,"y":204,"z":118.66338946785561,"t0":11855,"t":142,"v":-0.9294951306418101,"a":0.00046193369535192983},{"x":311,"y":84,"z":187.5973080830319,"t0":13203,"t":143,"v":-0.4825706478737952,"a":-0.007039937778438895},{"x":296,"y":277,"z":120.21647141718981,"t0":11708,"t":147,"v":-0.9950897153817841,"a":-0.009516422857448125},{"x":378,"y":150,"z":-232.8948260481542,"t0":11997,"t":149,"v":1.193187603608996,"a":0.014246192847320847},{"x":36,"y":322,"z":100.47885349664384,"t0":12807,"t":152,"v":-0.037016483387715404,"a":0.009441147437840596},{"x":82,"y":206,"z":264.1306494899825,"t0":12655,"t":152,"v":-1.472070893939486,"a":-0.012969139902048737},{"x":242,"y":158,"z":229.0676755895515,"t0":12146,"t":166,"v":-0.601559089994298,"a":-0.01081172706989936},{"x":292,"y":48,"z":-117.21348045340169,"t0":11080,"t":196,"v":-0.29651918776657243,"a":0.006848884789460456},{"x":452,"y":277,"z":207.04347369574344,"t0":11505,"t":203,"v":0.40382444466309037,"a":-0.006120462867145679},{"x":314,"y":122,"z":-538.048324967191,"t0":321,"t":222,"v":0.2626038399407017,"a":-0.005068760652836834},{"x":300,"y":0,"z":-492.2997054640597,"t0":0,"t":321,"v":1.3878687048704788,"a":0.004323578519845728},{"x":124,"y":133,"z":128.1834622718547,"t0":1608,"t":8853,"v":-0.015145010831623581,"a":-0.000019431573149491993}]');
endCameraFeed();
finalAnalysis(FDATA);*/

function finalAnalysis(brushCoords){

	var results = document.getElementById('results');
	results.style.display = 'block';

	brushCoords.sort(function(a, b){
		return a.t0 - b.t0;
	});

	console.log(brushCoords);

	var x_axis = [];
	var x_pos = [];
	var y_pos = [];
	var z_pos = [];
	var vel = [];

	for(var i = 0; i < brushCoords.length; i++){
		var pt = brushCoords[i];
		x_axis.push(pt.t0);
		x_pos.push(pt.x);
		y_pos.push(pt.y);
		z_pos.push(pt.z);
		vel.push(pt.v);
	}

	var plotData = [{
		name: 'x(t)',
		marker: {color: '#D10000'},
		x: x_axis,
		y: x_pos,
		type: 'line'
	}, {
		name: 'y(t)',
		marker: {color: '#FD9D24'},
		x: x_axis,
		y: y_pos,
		type: 'line'
	}, {
		name: 'z(t)',
		marker: {color: '#2854D6'},
		x: x_axis,
		y: z_pos,
		type: 'line'
	}, {
		name: 'Velocity',
		marker: {color: '#56C02B'},
		x: x_axis,
		y: vel,
		type: 'line'
	}];

	Plotly.newPlot('plot', plotData);

	var brushScore = idealBehaviorScore(brushCoords);
	var timeSpent = (brushCoords[brushCoords.length-1].t0 - brushCoords[0].t0)/1000;
	var mouthPart = false;

	switch(window.SAD_QUAD){
		case 0: mouthPart = 'Top Left'; break;
		case 1: mouthPart = 'Top Right'; break;
		case 2: mouthPart = 'Bottom Left'; break;
		case 3: mouthPart = 'Bottom Right'; break;
		default: mouthPart = 'All Over'; break;
	}

	var top = document.getElementById('top');
	var left = document.getElementById('left');
	var right = document.getElementById('right');

	top.innerHTML = '<h2>Your Ideal Brushing Score</h2><h1>' + brushScore.toFixed(0) + ' / 10</h1>';
	left.innerHTML = '<h2>Next Time, Brush More Here:</h2><h1>' + mouthPart + '</h1>';
	right.innerHTML = '<h2>Time You Spent Brushing:</h2><h1>' + timeSpent.toFixed(1) + ' secs</h1>';

	endCameraFeed();
}