import * as THREE from 'three';

THREE.Matrix4.prototype.setMatrix3 = function setMatrix3(m) {
    this.elements[0] = m.elements[0];
    this.elements[1] = m.elements[1];
    this.elements[2] = m.elements[2];
    this.elements[4] = m.elements[3];
    this.elements[5] = m.elements[4];
    this.elements[6] = m.elements[5];
    this.elements[8] = m.elements[6];
    this.elements[9] = m.elements[7];
    this.elements[10] = m.elements[8];
    return this;
};

function parseCalibration(calibration, options) {
    const proj = calibration.projection;
    const size = new THREE.Vector2().fromArray(calibration.size);
    const focal = new THREE.Vector2(proj[0], proj[4]);
    const point = new THREE.Vector2(proj[2], proj[5]);
    const skew = proj[1];

    var camera = new THREE.Camera();
    camera.textureMatrix = new THREE.Matrix4().set(
        focal.x / size.x, skew / size.x, point.x / size.x, 0,
        0, focal.y / size.y, point.y / size.y, 0,
        0, 0, 0, 1,
        0, 0, 1, 0);

    camera.projectionMatrix.multiplyMatrices(new THREE.Matrix4().set(
        2, 0, 0, -1,
        0, 2, 0, -1,
        0, 0, 1, 0,
        0, 0, 0, 1), camera.textureMatrix);

    var position = new THREE.Vector3().fromArray(calibration.position);
    var rotation = new THREE.Matrix3().fromArray(calibration.rotation).transpose();
    // console.log('rotation avant: ', rotation.clone().transpose());
    // if (options.orientationType === 'Stereopolis2') {
    //     rotation.multiply(new THREE.Matrix3().set(
    //         0, 1, 0,
    //         -1, 0, 0,
    //         0, 0, 1));
    // }
    // console.log('rotation apres: ', rotation.clone().transpose());
    camera.matrix = new THREE.Matrix4().setMatrix3(rotation.transpose()).setPosition(position);
    var matrixInverse = new THREE.Matrix4().getInverse(camera.matrix);
    camera.mp2t = camera.textureMatrix.clone().multiply(matrixInverse);
    camera.size = size;
    camera.name = calibration.id;
    if (calibration.distortion) {
        camera.distortion = {
            pps: new THREE.Vector2().fromArray(calibration.distortion.pps),
            poly357: new THREE.Vector4().fromArray(calibration.distortion.poly357),
            l1l2: new THREE.Vector3().set(0, 0, 0),
        };
        camera.distortion.poly357.w = calibration.distortion.limit * calibration.distortion.limit;
        if (calibration.distortion.l1l2) {
            camera.distortion.l1l2.fromArray(calibration.distortion.l1l2);
            camera.distortion.l1l2.z = calibration.distortion.etats;
        }
    }
    return camera;
}


function getTransfoLocalToPanoFromRollPitchHeading(roll, pitch, heading) {
    // const euler = new THREE.Euler(
    //     pitch * Math.PI / 180,
    //     roll * Math.PI / 180,
    //     heading * Math.PI / 180, 'ZXY');
    // const qLocalToPano = new THREE.Quaternion().setFromEuler(euler);
    // return new THREE.Matrix4().makeRotationFromQuaternion(qLocalToPano);
    // The sample code with explicit rotation composition
    var R = new THREE.Matrix4().makeRotationZ(pitch * Math.PI / 180);
    R.multiply(new THREE.Matrix4().makeRotationY(roll * Math.PI / 180));
    R.multiply(new THREE.Matrix4().makeRotationZ(heading * Math.PI / 180));
    return R;
}

function getTransfoLocalToPanoFromOmegaPhiKappa(omega, phi, kappa) {
    // From DocMicMac
    // transfo image to world
    // M = R(roll / X).R(pitch / Y).R(heading / Z).cv2p
    // cv2p : conversion from computer vision image coordinate system to photogrammetry image coordinate system
    // computer vision image coordinate system = line top down
    // photogrammetry image coordinate system = line bottom up
    // so for LocalToPano (reverse transformation)
    // M = trix.[R(roll / X).R(pitch / Y).R(heading / Z)]^-1
    const cv2p = new THREE.Matrix4().set(
            1, 0, 0, 0,
            0, -1, 0, 0,
            0, 0, -1, 0,
            0, 0, 0, 1);
    // const euler = new THREE.Euler(
    //     roll * Math.PI / 180,
    //     pitch * Math.PI / 180,
    //     heading * Math.PI / 180, 'XYZ');
    // const qPanoToLocal = new THREE.Quaternion().setFromEuler(euler);
    // const rLocalToPano = (new THREE.Matrix4().makeRotationFromQuaternion(qPanoToLocal)).transpose();
    // return cv2p.multiply(rLocalToPano);
    // The sample code with explicit rotation composition
    var R = new THREE.Matrix4().makeRotationX(omega * Math.PI / 180);
    R.multiply(new THREE.Matrix4().makeRotationY(phi * Math.PI / 180));
    R.multiply(new THREE.Matrix4().makeRotationZ(kappa * Math.PI / 180));
    R.transpose();
    return cv2p.multiply(R);
}

function getTransfoGeoCentriqueToLocal(cGeocentrique) {
    var position = new THREE.Vector3().set(cGeocentrique._values[0], cGeocentrique._values[1], cGeocentrique._values[2]);
    var object = new THREE.Object3D();
    object.up = THREE.Object3D.DefaultUp;
    object.position.copy(position);
    object.lookAt(position.clone().multiplyScalar(1.1));
    object.updateMatrixWorld();
    return new THREE.Matrix4().makeRotationFromQuaternion(object.quaternion.clone().inverse()).multiply(new THREE.Matrix4().makeTranslation(-position.x, -position.y, -position.z));
}


function getTransfoWorldToPano(orientationType, ori) {
    var worldToLocal = getTransfoGeoCentriqueToLocal(ori.geometry.vertices[0]);
    if ((ori.properties.roll != undefined) && (ori.properties.pitch != undefined) && (ori.properties.heading != undefined)) {
        return getTransfoLocalToPanoFromRollPitchHeading(ori.properties.roll, ori.properties.pitch, ori.properties.heading).multiply(worldToLocal);
    }
    else if ((ori.properties.omega != undefined) && (ori.properties.phi != undefined) && (ori.properties.kappa != undefined)) {
        return getTransfoLocalToPanoFromOmegaPhiKappa(ori.properties.omega, ori.properties.phi, ori.properties.kappa).multiply(worldToLocal);
    }
    return worldToLocal;
}


// initialize a 3D position for each image (including CRS conversion if necessary)
function orientedImagesInit(orientations, options = {}) {
    if (options.crsOut !== 'EPSG:4978') {
        console.warn('orientedImagesInit untested for this crsOut: ', options.crsOut);
    }

    for (const ori of orientations) {
        ori.matrixWorldInverse = getTransfoWorldToPano(options.orientationType, ori);
    }
    return orientations;
}

export default {
    orientedImagesInit,

    /** @module OrientedImageParser */
    /**
     * @function parse
     * @param {string|JSON} json - the json content of the calibration file.
     * @param {Object} options - Options controlling the parsing.
     * @param {string} options.crsOut - The CRS to convert the input coordinates to.
     * @param {string} options.orientationType - 'micmac' or 'Stereopolis2'
     * @return {Promise} - a promise that resolves with a camera.
     */
    parse(json, options = {}) {
        options.orientationType = options.orientationType || 'micmac';
        if (typeof (json) === 'string') {
            json = JSON.parse(json);
        }
        return Promise.resolve(json.map(calibration => parseCalibration(calibration, options)));
    },
};
