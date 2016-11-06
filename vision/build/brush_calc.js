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



