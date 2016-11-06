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
	task = tracking.track('#camera', colors, {camera: true});
	//task.stop(); //
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

function registerColorV(name, r, g, b, t){
	tracking.ColorTracker.registerColor(name, colorValidatorFactory(r, g, b, t));
}

//tracking.ColorTracker.registerColor('tape', colorValidatorFactory(142,170,108, 20));

/*registerColorV('t1', 142, 170, 108, 20);
registerColorV('t2', 142, 184, 81, 20);*/

registerColorV('tracker',174,234,197,20);
//registerColorV('tracker',37,84,215,20);

var colors = new tracking.ColorTracker(['tracker']);

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

function dumpData(){
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
	console.log(brush_coords);
	console.log('as it were');
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

task = tracking.track('#camera', colors, {camera: true});

window.onerror = function(event){
	console.error(event);
	alert(event);
}