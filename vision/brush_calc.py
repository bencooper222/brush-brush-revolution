import math
import csv

from plotly import __version__
from plotly.offline import download_plotlyjs, init_notebook_mode, iplot, plot 
from plotly.graph_objs import *

import numpy as np

# from sklearn import linear_model 

def calculate_brush_coordinates(file): 
	"""
	Take csv input of brush raw data and return a list
	of coordinates in the formation of [(x, y, z, v, a, t)]
	wherein xyz are the coordinates in their respective planes, 
	velocity and acceleration are v and a, and t is the delta 
	time difference
	""" 

	# Get raw coordinates
	raw_coordinates = [] 
	with open(file, 'rb') as f: 
		file_reader = csv.reader(f)
		for row in file_reader: 
			raw_coordinates.append((float(row[0]), float(row[1]), float(row[2]), float(row[3]), float(row[4])))
	
	indices = []
	for i in range(1,len(raw_coordinates)): 
		if raw_coordinates[i][0] == raw_coordinates[i-1][0]: 
			raw_coordinates[i] = (raw_coordinates[i][0], (raw_coordinates[i][1] + raw_coordinates[i-1][1])/2,(raw_coordinates[i][2] + raw_coordinates[i-1][2])/2,(raw_coordinates[i][3] + raw_coordinates[i-1][3])/2,(raw_coordinates[i][4] + raw_coordinates[i-1][4])/2)
			indices.append(i-1)
	
	count = 0 
	for i in indices: 
		del raw_coordinates[i-count]
		count += 1

	final_coordinates = []

	# Loop through raw coordinates and find the necessary values
	for i in range(0, len(raw_coordinates)): 
		if i == 0:
			# Base coordinates are 0 for everything except x and y
			x = raw_coordinates[i][1] * 0.75
			y = raw_coordinates[i][2]
			z = 0 
			v = 0 
			a = 0 
			t = 0 
			t0 = 0
			final_coordinates.append(
				(x,y,z,v,a,t,t0)
			)
		else: 
			w0 = int(float(raw_coordinates[i-1][3]))
			h0 = int(float(raw_coordinates[i-1][4]))
			w1 = int(float(raw_coordinates[i][3]))
			h1 = int(float(raw_coordinates[i][4]))
			x0 = int(float(raw_coordinates[i-1][1])) * 0.68
			y0 = int(float(raw_coordinates[i-1][2]))
			x = int(float(raw_coordinates[i][1])) * 0.68
			y = int(float(raw_coordinates[i][2])) 
			# Helper functions because I'm lazy
			z = z_delta(w0,h0,w1,h1)
			t = time_delta(float(raw_coordinates[i-1][0]),float(raw_coordinates[i][0]))
			v = vel(x0,y0,x,y,t)
			a = accel(final_coordinates[i-1][3],v,t)
			t0 = raw_coordinates[i][0]
			final_coordinates.append(
				(x,y,z,v,a,t,t0)
			)
			
	return final_coordinates

def z_delta(w0,h0,w1,h1): 
	"""
	Computation of delta z is determined through: 
	extension of the square to make dank af triangles
	then finding the hypotenuse of another triangles 
	through zika angles
	"""
	BRUSH_WIDTH = 168

	# calculate hypotenuse of the first triangle
	h0 = math.sqrt((BRUSH_WIDTH + w0) ** 2 + (h0) ** 2)
	# calculate the hypotenuse of the second triangle
	h1 = math.sqrt((BRUSH_WIDTH + w1) ** 2 + (h1) ** 2) 

	# Assuming this is a right triangle, probably wrong boize 
	if h1 < h0: 
		delta_z = -math.sqrt(abs(h1 ** 2 - h0 ** 2))
	else: 
		delta_z = math.sqrt(abs(h1 ** 2 - h0 ** 2))

	return delta_z

def time_delta(t0,t1): 
	return (t1 - t0) 

def vel(x0,y0,x,y,t): 
	# calculate velocities
	return (math.sqrt(x**2 + y**2) - math.sqrt(x0**2 + y0**2)) / t

def accel(v0,v,t): 
	# calculate accelerations
	return (v - v0) / t

def normalize_distributions(coordinates): 
	origin = coordinates[5:] 
	normalizer = (origin[0][1], origin[0][2])

	lst = list(origin[0])
	lst[5] = 0
	origin[0] = tuple(lst)
	for i in range(0, len(origin)): 
		lst = list(origin[i])
		lst[1] -= normalizer[0]
		lst[2] -= normalizer[1]
		origin[i] = tuple(lst)
	
	return origin 

def ideal_time_index_score(coordinates): 
	delta = coordinates[-1][-1] - coordinates[0][-1]
	scalar = delta / 12000.0
	return int(scalar * 10.0)

def ideal_angle_index_score(coordinates): 
	x = np.array([row[0] for row in coordinates])
	y = np.array([row[1] for row in coordinates])
 
	A = np.vstack([x, np.ones(len(x))]).T

	m, c = np.linalg.lstsq(A, y)[0]

	theta = int(math.degrees(math.atan(m))) % 90

	error = abs(float(theta - 45) / 45.0)

	return int(10 - (10*error))

def ideal_qudrant_index_score(coordinates): 
	normalized_distribution = normalize_distributions(coordinates)
	q1 = [] 
	q2 = [] 
	q3 = [] 
	q4 = [] 


	for row in normalized_distribution: 
		if row[1] < 0 and row[2] > 0: 
			q1.append(row[5])
		elif row[1] > 0 and row[2] > 0: 
			q2.append(row[5])
		elif row[1] < 0 and row[2] < 0: 
			q3.append(row[5])
		else: 
			q4.append(row[5])
	
	s1 = 10 - (10 * abs((((max(q1) - min(q1)) % 30) - 30) / 30))
	s2 = 10 - (10 * abs((((max(q2) - min(q2)) % 30) - 30) / 30))
	s3 = 10 - (10 * abs((((max(q3) - min(q3)) % 30) - 30) / 30))
	s4 = 10 - (10 * abs((((max(q4) - min(q4)) % 30) - 30) / 30))

	return int((s1+s2+s3+s4)/4)

def ideal_behavior_score(coordinates): 
	'''
	Function to compute the ideal behavior index. 
	This index is a score 1-10 depicting how well 
	the user brushed their teeth. It is determined three 
	ways via percentages on 3 variables: time, angle, and 
	quadrant. Percentages are multiplied by ten and averaged
	to compute the resulting index. 
	'''

	time_index = ideal_time_index_score(coordinates)
	angle_index = ideal_angle_index_score(coordinates)
	quadrant_index = ideal_qudrant_index_score(coordinates)

	return int(( time_index + angle_index + quadrant_index ) / 3)

# a = calculate_brush_coordinates('Brush_Tracking_Output.csv')
# print ideal_angle_index_score(a)

a = calculate_brush_coordinates('Brush_Tracking_Output.csv')
b = calculate_brush_coordinates('Top_Left.csv')
c = calculate_brush_coordinates('Top_Right.csv')
d = calculate_brush_coordinates('Bottom_Right.csv')

tracea1 = Scatter(
	x = [row[-1] for row in a], 
	y = [row[0] for row in a], 
	name = "X vs time of Bottom Left Movement"
)

tracea2 = Scatter(
	x = [row[-1] for row in a], 
	y = [row[1] for row in a], 
	name = "Y vs time of Bottom Left Movement"
)

tracea3 = Scatter(
	x = [row[-1] for row in a], 
	y = [row[2] for row in a], 
	name = "Delta Z vs time of Bottom Left Movement"
)

traceb1 = Scatter(
	x = [row[-1] for row in b], 
	y = [row[0] for row in b], 
	name = "X vs time of Top Left Movement"
)

traceb2 = Scatter(
	x = [row[-1] for row in b], 
	y = [row[1] for row in b], 
	name = "Y vs time of Top Left Movement"
)

traceb3 = Scatter(
	x = [row[-1] for row in b], 
	y = [row[2] for row in b], 
	name = "Delta Z vs time of Top Left Movement"
)

tracec1 = Scatter(
	x = [row[-1] for row in c], 
	y = [row[0] for row in c], 
	name = "X vs time of Top Right Movement"
)

tracec2 = Scatter(
	x = [row[-1] for row in c], 
	y = [row[1] for row in c], 
	name = "Y vs time of Top Right Movement"
)

tracec3 = Scatter(
	x = [row[-1] for row in c], 
	y = [row[2] for row in c], 
	name = "Delta Z vs time of Top Right Movement"
)

traced1 = Scatter(
	x = [row[-1] for row in d], 
	y = [row[0] for row in d], 
	name = "X vs time of Bottom Right Movement"
)

traced2 = Scatter(
	x = [row[-1] for row in d], 
	y = [row[1] for row in d], 
	name = "Y vs time of Bottom Right Movement"
)

traced3 = Scatter(
	x = [row[-1] for row in d], 
	y = [row[2] for row in d], 
	name = "Delta Z vs time of Bottom Right Movement"
)

normalize = normalize_distributions(a)
zik = Scatter(
	x = [row[1] for row in normalize], 
	y = [row[2] for row in normalize],
	name = "normalize"
)

print ideal_behavior_score(a)
# plot([tracea3, traceb3, tracec3, traced3])

