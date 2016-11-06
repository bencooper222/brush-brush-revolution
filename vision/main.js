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
	clearCanvas();
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
	var toPrint = lines.length + ' data points:';
	toPrint += '\n' + ['timestamp', 'x', 'y', 'width', 'height'].join(',');
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
		printData();
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
		console.log(brush_coords);
		console.log('as it were');
	}
}

var lastRect = false;

function launchColorTracker(r, g, b, t){
	ctx.strokeStyle = 'yellow';
	registerColorV('tracker', r, g, b, t);

	var colors = new tracking.ColorTracker(['tracker']);

	colors.on('track', function(event){
		if(event.data.length === 0){
			//document.body.style.background = 'white';
			canvas.style.background = 'rgba(0,0,0,0.50)';
			if(lastRect){
				drawRect({
					x: lastRect.x + 1,
					y: lastRect.y + 1,
					height: lastRect.height + 2,
					width: lastRect.width - 2
				});
			}
		}
		else{
			//document.body.style.background = 'black';
			canvas.style.background = 'rgba(0,0,0,0.00)';
			event.data.forEach(function(rect){
				lastRect = rect;
				rect.timestamp = Date.now();
				drawRect(rect);
				/*var corners = tracking.Fast.findCorners(raw, width, height);
				console.log(corners);*/
				saveRect(rect);
			});
		}
	});

	task = tracking.track('#camera', colors, {camera: true});
}

var colorButton = document.getElementById('color');
var CALIBRATING = true;

function chooseColor(){
	CALIBRATING = false;
	var trackerColor = colorButton.style.background;
	task.stop();
	document.body.style.background = trackerColor;
	colorButton.style.background = trackerColor;
	clearCanvas();
	var c = cStrToArr(trackerColor);
	launchColorTracker(c[0], c[1], c[2], 20);
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
		//console.log(counts)
		return highest.value;
	}

	var LAST_COLOR = false;
	var SIM_SEQ = 0;

	BrushTracker.prototype.track = function(raw, width, height){
		if(SCALED && CALIBRATING){
			var size = 50;
			var cbtr = {
				x: Math.floor((width - size) / 2),
				y: Math.floor(2*((height - size) / 3)),
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
					if(shadeFilter(rgb)){
						pixels.push(rgb);
						rgbStr.push(rgb.join(','));
						rgbStack[0].push(raw[i]);
						rgbStack[1].push(raw[i+1]);
						rgbStack[2].push(raw[i+2]);
					}
				}
			}

			var modeRGB = [mode(rgbStack[0]), mode(rgbStack[1]), mode(rgbStack[2])];
			var modePix = mode(rgbStr);

			//console.log('%c Average Color', 'background: rgba(' + modePix + ',1)');
			//var finalStr = 'rgba(' + modeRGB + ',1)';
			var finalStr = cArrToStr(modeRGB);
			
			console.log(pixels.length);
			console.log('Integrate from y = ' + cbtr.y + ' to ' + y + ': Delta(y) = ' + (y - cbtr.y));
			console.log('Integrate from x = ' + cbtr.x + ' to ' + x + ': Delta(x) = ' + (x - cbtr.x));
			console.color(finalStr, 'Color Integral')


			document.body.style.background = finalStr;
			colorButton.style.background = finalStr;
			drawRect(cbtr, finalStr);

			if(shadeFilter(cStrToArr(finalStr))){
				if(LAST_COLOR){
					var lastStreak = false;
					var d = colorDiff(cStrToArr(finalStr), cStrToArr(LAST_COLOR));
					if(d === 0){
						SIM_SEQ++;
					}
					else{
						lastStreak = SIM_SEQ;
						SIM_SEQ = 0;
					}
					this.emit('track', {
						timestamp: Date.now(),
						color: finalStr,
						last: LAST_COLOR,
						diff: d,
						didx: d / COLOR_DIFF_MAX,
						current_streak: SIM_SEQ,
						last_streak: lastStreak
					});
				}
				LAST_COLOR = finalStr;
			}
		}
	}

	tracking.BrushTracker = BrushTracker;

	var brushTracker = new tracking.BrushTracker();

	var lastColor = false;
	var cStream = [];
	var cMap = {};

	brushTracker.on('track', function(event){
		if(event.last_streak && CALIBRATING){
			/*var rgbKey = cRoundToFive(cStrToArr(event.color)).join('-');
			cMap[rgbKey] = cMap[rgbKey] + 1 || 1;*/
			var rounded = cArrToStr(cRoundToFive(cStrToArr(event.color)))
			/*console.log('%c ' + event.color, 'background:' + event.color);
			console.log('ROUNDS: %c ' + rounded, 'background:' + rounded);*/
			var rgbKey = cStrToArr(rounded).join('-');
			cMap[rgbKey] = cMap[rgbKey] + 1 || 1;
			if(cMap[rgbKey] > 3){
				console.log('ROUNDS: %c ' + rounded, 'background:' + rounded);
			}
			/*cStream.push(event);
			if(cStream.length > 6){
				var cands = cStream.slice(cStream.length-6, cStream.length-1);
				var sumDiff = cands.reduce(function(a, b, i){
					console.log('%c ', 'background:' + b.color);
					if(i === 0){
						return a.diff + b.diff;
					}
					else{
						return a + b.diff;
					}
				});
				console.log(sumDiff);
			}*/

			/*console.log(event.last_streak + ' color streak!');
			console.log('%c ' + event.diff.toFixed(5) + ' ', 'background:' + event.color + ';color:white;');
			console.log(event.color);*/
			
			//chooseColor();
			//lastColor = event.color;
		}
	});

	task = tracking.track('#camera', brushTracker, {camera: true});
}

window.onerror = function(event){
	console.error(event);
	alert(event);
}

launchBrushTracker();