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
registerColorV('t2', 142, 184, 81, 20);
registerColorV('tracker',37,84,215,20);*/

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
	/*console.log(c2[0], c1[0]);
	console.log(c2[1], c1[1]);
	console.log(c2[2], c1[2]);*/
	var dG = c2[1] - c1[1];
	var dB = c2[2] - c1[2];
	var d = Math.sqrt(Math.pow(dR, 2) + Math.pow(dG, 2) + Math.pow(dB, 2));
	return d;
}

function cStrToArr(rgbStr){
	var str = rgbStr + '';
	if(str.indexOf('a') > -1){
		return str.substr(5).replace(')', '').split(',').map(function(n){return parseInt(n, 10);}).splice(0, 3);
	}
	else{
		return str.substr(4).replace(')', '').split(',').map(function(n){return parseInt(n, 10);});
	}
}

function cArrToStr(rgbArr){
	if(rgbArr.length === 3){
		return 'rgb(' + rgbArr.join(',') + ')';
	}
	else if(rgbArr.length === 4){
		return 'rgba(' + rgbArr.join(',') + ')';	
	}
	else{
		console.error('Bad RGB Array!');
	}
}

function cRoundToFive(c){
	var m = 5;
	var n = [0, 0, 0];
	for(var i = 0; i < 3; i++){
		n[i] = (c[i] % m) < (m/2) ? c[i] - (c[i] % m) : c[i] + (m-(c[i] % m));
	}
	return n;
}

window.console.color = function(c, text){
	console.log(c)
	console.log('%c ' + text, 'background:' + c);
}

function shadeFilter(c, opts){
	var opts = opts || {};
	var wT = opts.white || 5;
	var bT = opts.black || 5;
	var whiteDiff = colorDiff(c, [255, 255, 255]);
	var blackDiff = colorDiff(c, [0, 0, 0]);
	return (whiteDiff > wT && blackDiff > bT);
}