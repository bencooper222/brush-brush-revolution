BRUSH_LENGTH = 100; 
MIN_THRESHOLD = 5;
MAX_THRESHOLD = 25;
K = 0.3; 

Array.prototype.diff = function(a) {
    return this.filter(function(i) {return a.indexOf(i) < 0;});
};

function computeDeltaZ(w0, h0, w1, h1) {
    /*
    Computation of delta z is determined through: 
	extension of the square to make dank af triangles
	then finding the hypotenuse of another triangles 
	through zika angles
    */
    
    // calculate hypotenuse of the first triangle
	h0 = math.sqrt((BRUSH_WIDTH + w0) ** 2 + (h0) ** 2)
	// calculate the hypotenuse of the second triangle
	h1 = math.sqrt((BRUSH_WIDTH + w1) ** 2 + (h1) ** 2) 

	// Assuming this is a right triangle, probably wrong boize 
	if (h1 < h0) {
		delta_z = -math.sqrt(abs(h1 ** 2 - h0 ** 2))
    }
	else { 
		delta_z = math.sqrt(abs(h1 ** 2 - h0 ** 2))
    }

	return delta_z
}

function computeTimeDelta(t0, t1) {
    return (t1 - t0);
}

function computeVelocity(x0, y0, z0, x, y, z, t) {
    return (math.sqrt(x**2 + y**2 + z**2) - math.sqrt(x0**2 + y0**2 + z0**2)) / t; 
}

function computeAcceleration(v0, v, t) {
    return (v - v0) / t; 
}

function computeDeltaPos(coordinates) {
    pos = []; 
    for (obj in coordinates) {
        pos.push(math.sqrt(obj.x**2 + obj.y**2 + obj.z**2)); 
    }

    return pos; 
}

function computeDeltaPosPeriod(delta_pos) {
    for (i = 0; i < delta_pos.length; i++) {
        if (delta_pos[i] + delta_pos[i+1] + delta_pos[i+2] / 3 > MIN_THRESHOLD && (delta_pos[i] + delta_pos[i+1] + delta_pos[i+2] / 3 < MAX_THRESHOLD)) {
            period += 1; 
        }
    }

    return period; 
}

function computeRigor(coordinates) {
    delta = computeDeltaPos(coordinates); 
    period = computeDeltaPosPeriod(delta); 
    delta_r = []; 

    for (i = 0; i < coordinates.length; i++) {
        if (coordinates[i].t == 0) {
            var rigor = 0; 
        }
        else {
            var rigor = abs(K * delta[i] * period * coordinates[i].v); 
        }
        delta_r.push(rigor); 
    }

    return delta_r; 
}

function adjustForDuplicates(raw_coordinates) {
    /* 
    * Function to identify the duplicate values produced in the 
    * And adjust for them by computing the average between the two 
    * then removing the first instance of the duplicate. 
    */ 

    duplicates = []; 
    for (var i = 0; i < raw_coordinates.length; i++) {
        if (raw_coordinates[i].timestamp == raw_coordinates[i-1].timestamp) {
            duplicates.add(raw_coordinates[i - 1]); 
            raw_coordinates[i].timestamp = (raw_coordinates[i].timestamp + raw_coordinates[i-1].timestamp) / 2;
            raw_coordinates[i].x = (raw_coordinates[i].x + raw_coordinates[i-1].x) / 2;
            raw_coordinates[i].y = (raw_coordinates[i].y + raw_coordinates[i-1].y) / 2;
            raw_coordinates[i].width = (raw_coordinates[i].width + raw_coordinates[i-1].width) / 2; 
            raw_coordinates[i].height = (raw_coordinates[i].height + raw_coordinates[i-1].height) / 2;
        }        
    }
    return raw_coordinates.diff(duplicates); 
}

function calculateBrushCoordinates (raw_coordinates) {
    /* 	
	 The array input of objects in the form and generate the form in [obj.x, obj.y]
	 wherein xyz are the coordinates in their respective planes, 
	 velocity and acceleration are v and a, and t is the delta 
	 time difference
    */ 

    adjusted_coordinates = adjustForDuplicates(raw_coordinates); 
    
    final_coordinates = []; 

    for (var i = 0; i < adjusted_coordinates.length; i++) {
        if (i == 0) {
             var x = adjusted_coordinates[i].x; 
             var y = adjusted_coordinates[i].y; 
             var z = 0; 
             var v = 0; 
             var a = 0; 
             var t = 0; 
             var t0 = 0; 
        }

        else {
            var w0 = adjusted_coordinates[i - 1].width;
            var h0 = adjusted_coordinates[i - 1].height; 
            var w1 = adjusted_coordinates[i].width; 
            var h1 = adjusted_coordinates[i].height; 
            var x0 = adjusted_coordinates[i - 1].x; 
            var y0 = adjusted_coordinates[i - 1].y; 
            var z0 = final_coordinates[i - 1].z; 
            var x = adjusted_coordinates[i].x; 
            var y = adjusted_coordinates[i].y; 
            var z = computeDeltaZ(w0,h0,w1,h1);
            var t0 = adjusted_coordinates[i - 1].timestamp; 
            var t = computeTimeDelta(t0, adjusted_coordinates[i].timestamp);
            var v = computeVelocity(x0,y0,z0,x,y,z,t);
            var a = computeAcceleration(final_coordinates[i - 1].v, v, t); 
        }

        final_coordinates.push({
            x: x, 
            y: y, 
            z: z, 
            t0: t0, 
            t: t, 
            v: v, 
            a: a 
        }); 
    }

    rigor_index = computeRigor(final_coordinates); 
    for (i = 0; i < rigor_index.length; i++) {
        final_coordinates[i].r = rigor_index[i]; 
    }

    return final_coordinates; 
}

function normalize_distributions(coordinates) {
    var origin = coordinates.slice(5, -1); 
    var normalizer = [origin[0].x, origin[0].y];

    origin[0].t = 0; 
    for (i = 0; i < origin.length; i++) {
        origin[i].x -= normalizer[0]; 
        origin[i].y -= normalizer[1]; 
    } 

    return origin 
}

function find_quadrant(obj) { 
    var normalized = normalize_distributions([obj]); 
    var quadrant; 
    if (normalized[0].x < 0 && normalized[0].y < 0) {
        quadrant = "top left"; 
    }
    else if (normalized[0].x > 0 && normalized[0].y > 0) {
        quadrant = "top right"; 
    }
    else if (normalized[0].x < 0 && normalized[0].y < 0) {
        quadrant = "bottom left"; 
    }
    else {
        quadrant = "bottom right";
    }

    return quadrant 
}

function ideal_time_index_score(coordinates) {
    delta = coordinates[-1].t0 - coordinates[0].t0; 
    scalar = delta / 12000.0; 
    return parseInt(scalar * 10.0); 
}

function ideal_angle_index_score(coordinates) {
    var _x = []; 
    var _y = []; 
    var nj = require('num.js'); 
    for (i = 0; i < coordinates.length; i++) {
        _x.push(coordinates[i][0]); 
        _y.pus(coordinates[i][1]);
    }
    
    var x = nj.array(_x);
	var y = nj.array(_y);
 
	var A = nj.vstack([x, np.ones(len(x))]).T

	m, c = nj.linalg.lstsq(A, y)[0]

	theta = parseInt(Math.degrees(arctan(m))) % 90;

	error = abs(parseFloat(theta - 45) / 45.0);

	return parseInt(10 - (10*error))
}

function ideal_quadrant_index_score(coordinates) {
    var normalized_distribution = normalize_distributions(coordinates); 
    var q1 = []; 
    var q2 = []; 
    var q3 = []; 
    var q4 = []; 

    for (i = 0; i < normalized_distribution.length; i++) {
        if (normalized_distribution[i].x < 0 && normalized_distribution[i].y < 0) {
            q1.push(normalized_distribution[i]); 
        }
        else if (normalized_distribution[i].x > 0 && normalized_distribution[i].y > 0) {
            q2.push(normalized_distribution[i]); 
        }
        else if (normalized_distribution[i].x < 0 && normalized_distribution[i].y < 0) {
            q3.push(normalized_distribution[i]); 
        }
        else {
            q4.push(normalized_distribution[i]);
        }   
    }

	var s1 = 10 - (10 * abs((((Math.max(q1) - Math.min(q1)) % 30) - 30) / 30));
	var s2 = 10 - (10 * abs((((Math.max(q2) - Math.min(q2)) % 30) - 30) / 30));
	var s3 = 10 - (10 * abs((((Math.max(q3) - Math.min(q3)) % 30) - 30) / 30));
	var s4 = 10 - (10 * abs((((Math.max(q4) - Math.min(q4)) % 30) - 30) / 30));

	return parseInt((s1+s2+s3+s4)/4)
}

function idealBehaviorScore(coordinates) {
    var time_index = ideal_time_index_score(coordinates); 
    var angle_index = ideal_angle_index_score(coordinates); 
    var quadrant_index = ideal_quadrant_index_score(coordinates); 

    return parseInt((time_index + angle_index + quadrant_index) / 3)
}