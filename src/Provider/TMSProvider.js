import * as THREE from 'three';
import OGCWebServiceHelper from './OGCWebServiceHelper';
import URLBuilder from './URLBuilder';
import Extent from '../Core/Geographic/Extent';
import VectorTileHelper from './VectorTileHelper';

function preprocessDataLayer(layer) {
    if (!layer.extent) {
        // default to the full 3857 extent
        layer.extent = new Extent('EPSG:3857',
            -20037508.342789244, 20037508.342789244,
            -20037508.342789255, 20037508.342789244);
    }
    if (!(layer.extent instanceof (Extent))) {
        if (!layer.projection) {
            throw new Error(`Missing projection property for layer '${layer.id}'`);
        }
        layer.extent = new Extent(layer.projection, ...layer.extent);
    }
    layer.origin = layer.origin || (layer.protocol == 'xyz' ? 'top' : 'bottom');
    if (!layer.options.zoom) {
        layer.options.zoom = {
            min: 0,
            max: 18,
        };
    }
    layer.fx = layer.fx || 0.0;
}

function getVectorTile(tile, coords, layer) {
    const url = URLBuilder.xyz(coords, layer);

    if (layer.type == 'color') {
        return VectorTileHelper.getVectorTileTextureByUrl(url, tile, layer, coords);
    }
}

function executeCommand(command) {
    const layer = command.layer;
    const tile = command.requester;

    const promises = [];
    const supportedFormats = {
        'application/x-protobuf;type=mapbox-vector': getVectorTile.bind(this),
    };
    const func = supportedFormats[layer.format];

    for (const coordTMS of tile.getCoordsForLayer(layer)) {
        const coordTMSParent = (command.targetLevel < coordTMS.zoom) ?
            OGCWebServiceHelper.WMTS_WGS84Parent(coordTMS, command.targetLevel) :
            undefined;
        if (func) {
            promises.push(func(tile, coordTMSParent || coordTMS, layer));
        } else {
            const urld = URLBuilder.xyz(coordTMSParent || coordTMS, layer);

            promises.push(OGCWebServiceHelper.getColorTextureByUrl(urld, layer.networkOptions).then((texture) => {
                const result = {};
                const pitch = coordTMSParent ?
                    coordTMS.offsetToParent(coordTMSParent) :
                    new THREE.Vector4(0, 0, 1, 1);
                result.texture = texture;
                result.texture.coords = coordTMSParent || coordTMS;
                result.pitch = pitch;
                if (layer.transparent) {
                    texture.premultiplyAlpha = true;
                }
                return result;
            }));
        }
    }
    return Promise.all(promises);
}

function tileTextureCount(tile, layer) {
    return tileInsideLimit(tile, layer) ? 1 : 0;
}

function tileInsideLimit(tile, layer, targetLevel) {
    // assume 1 TMS texture per tile (ie: tile geometry CRS is the same as layer's CRS)
    let tmsCoord = tile.getCoordsForLayer(layer)[0];

    if (targetLevel < tmsCoord.zoom) {
        tmsCoord = OGCWebServiceHelper.WMTS_WGS84Parent(tmsCoord, targetLevel);
    }

    return layer.options.zoom.min <= tmsCoord.zoom &&
            tmsCoord.zoom <= layer.options.zoom.max;
}

export default {
    preprocessDataLayer,
    executeCommand,
    tileTextureCount,
    tileInsideLimit,
};
