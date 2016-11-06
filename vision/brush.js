var output = document.getElementById('output');
var screenDiv = document.getElementById('screen');
var video = document.getElementById('camera');
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
ctx.strokeStyle = 'yellow';

var task = null;

function clearCanvas(){
	ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawRect(r){
	ctx.beginPath();
	clearCanvas();
	ctx.rect(r.x, r.y, r.width, r.height);
	ctx.stroke();
	ctx.closePath();
}

function flipHorizontal(domObj){
	domObj.style.cssText = "-moz-transform: scale(-1, 1); \
	-webkit-transform: scale(-1, 1); -o-transform: scale(-1, 1); \
	transform: scale(-1, 1); filter: FlipH;";
}

flipHorizontal(video);
flipHorizontal(canvas);

var adjustScreenSize = function(){
	task.stop();
	var h = video.videoHeight;
	var w = video.videoWidth;
	video.width = w;
	video.height = h;
	canvas.width = w;
	canvas.height = h;
	screenDiv.style.width = w + 'px';
	screenDiv.style.height = h + 'px';
	screenDiv.style.marginLeft = (w/-2) + 'px';
	clearCanvas();
	ctx = canvas.getContext('2d');
	ctx.strokeStyle = 'yellow';
	task = tracking.track('#camera', brushTracker, {camera: true});
	video.removeEventListener('playing', adjustScreenSize, false);
}

video.addEventListener('playing', adjustScreenSize, false);

// Blue Cap: rgb(50,86,231)
// Pink Arm: rgb(243,168,172)
// Green Point: rgb(133,197,179)
// rgb(26,119,107)
// rgb(242,142,147)
// Blue Tape: rgb(20,43,76)

function colorValidatorFactory(r, g, b, tolerance){
	var tol = tolerance || 50;
	var validator = function(ri, gi, bi){
		var rRange = Math.abs(r - ri) < tol;
		var gRange = Math.abs(g - gi) < tol;
		var bRange = Math.abs(b - bi) < tol;
		if(rRange && gRange && bRange){
			return true;
		}
		else{
			return false;
		}
	}
	return validator;
}

// rgb(142,184,81)

function registerColorV(name, r, g, b, t){
	tracking.ColorTracker.registerColor(name, colorValidatorFactory(r, g, b, t));
}

//tracking.ColorTracker.registerColor('tape', colorValidatorFactory(142,170,108, 20));

registerColorV('t1', 142, 170, 108, 20);
registerColorV('t2', 142, 184, 81, 20);

var colors = new tracking.ColorTracker(['t1', 't2']);

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

function dumpData(){
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

//task = tracking.track('#camera', colors, {camera: true});

function componentToHex(c){
	var hex = c.toString(16);
	return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b){
	return "" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function hexToRgb(hex){
	var bigint = parseInt(hex, 16);
	var r = (bigint >> 16) & 255;
	var g = (bigint >> 8) & 255;
	var b = bigint & 255;
	return r + "," + g + "," + b;
}

var COLOR_DIFF_MAX = Math.sqrt(3 * Math.pow(255, 2));

function colorDiff(c1, c2){
	var dR = c2[0] - c1[0];
	console.log(c2[0], c1[0]);
	console.log(c2[1], c1[1]);
	console.log(c2[2], c1[2]);
	var dG = c2[1] - c1[1];
	var dB = c2[2] - c1[2];
	var d = Math.sqrt(Math.pow(dR, 2) + Math.pow(dG, 2) + Math.pow(dB, 2));
	return d;
}

var BrushTracker = function(){
	BrushTracker.base(this, 'constructor');
}
tracking.inherits(BrushTracker, tracking.Tracker);

var LIM_CPRINT = 0;

BrushTracker.prototype.track = function(raw, width, height){
	// 307200 pixels
	var pixels = [];
	var c = [null, null, null, null];
	for(var i = 0; i < raw.length; i++){
		var idx = i%4;
		c[idx] = raw[i];
		if((i+1)%4 === 0 && LIM_CPRINT < 100){
			//console.log('%c      ', 'background:rgba(' + c.join(',') + ');');
			LIM_CPRINT++;
			pixels.push(rgbToHex(c[0], c[1], c[2]));
		}
	}

	pixels.sort(function(a, b){
		return parseInt(a, 16) - parseInt(b, 16);
	});

	pixels = pixels.map(function(hex){
		return hexToRgb(hex);
	});

	for(var u = 0; u < pixels.length; u++){
		console.log('%c      ', 'background:rgba(' + pixels[u] + ',1);');
	}

	this.emit('track', {
		// Your results here
	});
}

tracking.BrushTracker = BrushTracker;

var brushTracker = new tracking.BrushTracker();

brushTracker.on('track', function(event){
	//
});

task = tracking.track('#camera', brushTracker, {camera: true});

window.onerror = function(event){
	alert(event);
}