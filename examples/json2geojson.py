import json
import argparse

from pprint import pprint

parser = argparse.ArgumentParser(description='convert old json format to new geojson format.')
parser.add_argument('camera', help='camera json file')
parser.add_argument('pano', help='pano json file')
parser.add_argument('-o', '--out', help='output geojson file')
parser.add_argument('-c', '--crs', help='output geojson file', default=2154)
parser.add_argument('--offset', help='offset', nargs=3, type=float, default=[0, 0, 0])
parser.add_argument('-opk', help='rename Roll Pitch Heading to Omega Phi Kappa',action='store_true')
args = parser.parse_args()
args.out = args.out or (args.pano[:-4]+'geojson')

print('Reading: ', args.camera)
with open(args.camera) as data_file:    
    camera = json.load(data_file)

print('Reading: ', args.pano)
with open(args.pano) as data_file:    
    pano = json.load(data_file)

offset= { "x": args.offset[0], "y": args.offset[1], "z": args.offset[2] }

geojson = { "type": "FeatureCollection", "features": [], "properties": camera, "crs": {"type": "EPSG","properties": { "code": args.crs}}}

for p in pano:
	p['easting']  += offset["x"]
	p['northing'] += offset["y"]
	p['altitude'] += offset["z"]
	f = { "type": "Feature", "geometry": { "type": "Point", "coordinates": [p['easting'], p['northing'], p['altitude']]},"properties": {}}
	if (args.opk):
		p['omega'] = p.pop('roll')
		p['phi'] = p.pop('pitch')
		p['kappa'] = p.pop('heading')
	f['properties'] = p
	geojson['features'].append(f)

print('Writing: ', args.out);
with open(args.out, 'w') as outfile:  
    json.dump(geojson, outfile)

# geojson = { "type": "MultiPoint", "coordinates": [], "properties": camera}
# for p in pano:
# 	geojson['coordinates'].append([p['easting'], p['northing']])
# 	# f = { "type": "Feature", "geometry": { "type": "Point", "coordinates": [p['easting'], p['northing']]},"properties": {}}
# 	# f['properties'] = p
# 	# geojson['features'].append(f)

# with open('demo_091117_CAM24.geojson', 'w') as outfile:  
#     json.dump(geojson, outfile)

# geojson = { "type": "GeometryCollection", "geometries": [], "properties": ""}
# for p in pano:
# 	f = { "type": "Point", "coordinates": [p['easting'], p['northing']]}
# 	# f['properties'] = p
# 	geojson['geometries'].append(f)

# with open('demo_091117_CAM24.geojson', 'w') as outfile:  
#     json.dump(geojson, outfile)