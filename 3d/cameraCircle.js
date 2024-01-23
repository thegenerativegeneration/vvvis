import * as dat from 'dat.gui';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Configuration
let ellipseRadiusX = 300;
let ellipseRadiusY = 300;
let numOfCameras = 12;
let focalLength = 7; // in mm
let sensorSize = 16; // Assuming a 35mm (full-frame) sensor width
let spaceWidthX = 100;
let spaceWidthY = 100;
let spaceHeight = 240;
let aspectRatio = 16 / 9;
let cameraHeight = 120; // Height from the floor
let userFov = -1;

const BASE_VALID_COLOR = 0x00FF00;
const BASE_INVALID_COLOR = 0xFF0000;

// Scene, camera, and renderer setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 6000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
//document.body.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);

// Create a GUI instance
const gui = new dat.GUI();

// Configuration object for GUI
const config = {
    ellipseRadiusX: 300,
    ellipseRadiusY: 300,
    numOfCameras: 12,
    focalLength: 7,
    sensorSize: 16,
    spaceWidthX: 100,
    spaceWidthY: 100,
    spaceHeight: 240,
    aspectRatio: 16 / 9,
    cameraHeight: 120,
    userFov: -1,
    updateVisualization: createCamerasAndFrustums // Function to call when any parameter changes
};

// Add GUI controllers
gui.add(config, 'ellipseRadiusX', 100, 1000).onChange(config.updateVisualization);
gui.add(config, 'ellipseRadiusY', 100, 1000).onChange(config.updateVisualization);
gui.add(config, 'numOfCameras', 1, 20).step(1).onChange(config.updateVisualization);
gui.add(config, 'focalLength', 5, 200).onChange(config.updateVisualization);
gui.add(config, 'sensorSize', 1, 35).onChange(config.updateVisualization);
gui.add(config, 'spaceWidthX', 50, 1000).onChange(config.updateVisualization);
gui.add(config, 'spaceWidthY', 50, 1000).onChange(config.updateVisualization);
gui.add(config, 'spaceHeight', 50, 1000).onChange(config.updateVisualization);
gui.add(config, 'aspectRatio', 0.4, 4).onChange(config.updateVisualization);
gui.add(config, 'cameraHeight', 50, 300).onChange(config.updateVisualization);
gui.add(config, 'userFov', -1, 180).onChange(config.updateVisualization);


document.getElementById('threejs-container').appendChild(renderer.domElement);

// Function to calculate field of view in degrees
function calculateFOV(focalLength, sensorSize) {
    return 2 * Math.atan(sensorSize / (2 * focalLength)) * (180 / Math.PI);
}

function clearScene() {
    while(scene.children.length > 0){ 
        let child = scene.children[0];
        if (child.dispose) {
            // Dispose of the object if it has a dispose method
            child.dispose();
        }
        if (child.geometry) {
            // Dispose of the geometry
            child.geometry.dispose();
        }
        if (child.material) {
            // Dispose of the material
            child.material.dispose();
        }
        scene.remove(child);
    }
}

function createEllipse(ellipseRadiusX, ellipseRadiusY, color = 0x0000FF, filled = false) {
    let ellipse;
    if (filled) {
        // Create a filled ellipse
        const ellipseShape = new THREE.Shape();
        ellipseShape.moveTo(ellipseRadiusX, 0);
        ellipseShape.absellipse(0, 0, ellipseRadiusX, ellipseRadiusY, 0, 2 * Math.PI, false);

        const geometry = new THREE.ShapeGeometry(ellipseShape);
        const material = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide });
        ellipse = new THREE.Mesh(geometry, material);
        ellipse.rotateX(-Math.PI / 2); // Rotate to lay flat if required
    } else {
        // Create an elliptical line
        const curve = new THREE.EllipseCurve(
            0, 0,            // ax, ay: Ellipse center x, y position
            ellipseRadiusX, ellipseRadiusY, // xRadius, yRadius
            0, 2 * Math.PI,  // startAngle, endAngle
            false,           // clockwise
            0                // rotation
        );

        const points = curve.getPoints(50); // Generate points on the curve
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: color });
        ellipse = new THREE.Line(geometry, material);
        ellipse.rotateX(-Math.PI / 2); // Rotate to lay flat if required
    }

    scene.add(ellipse);
    return ellipse;
}

function isBoxInCameraView(box, camera) {
    camera.updateMatrixWorld(); // Ensure the camera's latest position and orientation is used
    const frustum = new THREE.Frustum();
    frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));

    const vertices = [
        new THREE.Vector3(box.min.x, box.min.y, box.min.z),
        new THREE.Vector3(box.min.x, box.min.y, box.max.z),
        new THREE.Vector3(box.min.x, box.max.y, box.min.z),
        new THREE.Vector3(box.min.x, box.max.y, box.max.z),
        new THREE.Vector3(box.max.x, box.min.y, box.min.z),
        new THREE.Vector3(box.max.x, box.min.y, box.max.z),
        new THREE.Vector3(box.max.x, box.max.y, box.min.z),
        new THREE.Vector3(box.max.x, box.max.y, box.max.z)
    ];

    for (let i = 0; i < vertices.length; i++) {
        if (!frustum.containsPoint(vertices[i])) {
            return false; // If any vertex is outside the frustum, the box is not fully visible
        }
    }

    return true; // All vertices are inside the frustum, the box is fully visible
}

function shiftColor(baseColor, index, total) {
    // Convert hex color to HSL
    const hsl = new THREE.Color(baseColor).getHSL({});

    // Adjust hue based on index
    hsl.h += (index / total) * 0.1; // Adjust 0.1 as needed
    hsl.h %= 1; // Ensure hue stays within the [0, 1] range

    // Convert back to hex and return
    return new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l);
}

function createCamerasAndFrustums() {
    ellipseRadiusX = config.ellipseRadiusX;
    ellipseRadiusY = config.ellipseRadiusY;
    numOfCameras = config.numOfCameras;
    focalLength = config.focalLength;
    sensorSize = config.sensorSize;
    spaceWidthX = config.spaceWidthX;
    spaceWidthY = config.spaceWidthY;
    spaceHeight = config.spaceHeight;
    aspectRatio = config.aspectRatio;
    cameraHeight = config.cameraHeight;
    userFov = config.userFov;
    // Clear existing cameras and frustums
    clearScene();

    // Create box (target)
    const boxGeometry = new THREE.BoxGeometry(spaceWidthX, spaceHeight, spaceWidthY);
    const boxMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const boxObject = new THREE.Mesh(boxGeometry, boxMaterial);
    boxObject.position.set(0, spaceHeight / 2, 0); // Position so the base is on the plane
    scene.add(boxObject);

    // Create a bounding box for the box
    const box = new THREE.Box3().setFromObject(boxObject);

    createEllipse(ellipseRadiusX, ellipseRadiusY, 0x0000FF, true);
    const ellipse = createEllipse(ellipseRadiusX, ellipseRadiusY, 0xFFD433, false);
    ellipse.position.set(0, cameraHeight, 0);

    // Create cameras and frustums
    let fov = userFov > 1 ? userFov : calculateFOV(focalLength, sensorSize);
    const near = 1; // Near clipping plane
    const far = 2000; // Far clipping plane

    for (let i = 0; i < numOfCameras; i++) {
        const theta = (i / numOfCameras) * 2 * Math.PI;
        const x = ellipseRadiusX * Math.cos(theta);
        const z = ellipseRadiusY * Math.sin(theta);

        // Create a new PerspectiveCamera
        const simCamera = new THREE.PerspectiveCamera(fov, aspectRatio, near, far);

        simCamera.position.set(x, cameraHeight, z);
        simCamera.up.set(0, 1, 0);
        simCamera.lookAt(0, cameraHeight, 0);
        
        // log orientation
        simCamera.updateMatrixWorld();


        const isVisible = isBoxInCameraView(box, simCamera);
        let frustrumColor = isVisible ? BASE_VALID_COLOR : BASE_INVALID_COLOR;
        frustrumColor = shiftColor(frustrumColor, i*1, numOfCameras);


        // camera sphere marker
        const sphereGeometry = new THREE.SphereGeometry(5, 32, 32);
        const sphereMaterial = new THREE.MeshBasicMaterial({ color: frustrumColor });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.position.set(x, cameraHeight, z);
        scene.add(sphere);



        // Create a CameraHelper for the PerspectiveCamera
        const helper = new THREE.CameraHelper(simCamera);
        
        helper.traverse((child) => {
            if (child instanceof THREE.LineSegments) {
                child.material.color.set(frustrumColor);
            }
        });
        
        scene.add(helper);
    }

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);


    // Adjust the main camera's position
    camera.position.set(0, 1000, 1000);
    camera.lookAt(new THREE.Vector3(0, cameraHeight, 0));
}



// Animation loop
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
createCamerasAndFrustums();
animate();

