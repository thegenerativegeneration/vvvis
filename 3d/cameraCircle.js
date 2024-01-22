import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Configuration
let ellipseRadiusX = 300;
let ellipseRadiusY = 300;
let numOfCameras = 12;
let focalLength = 7; // in mm
let sensorSize = 16; // Assuming a 35mm (full-frame) sensor width
let rectWidth = 100;
let rectHeight = 100;
let aspectRatio = 16 / 9;
let cameraHeight = 120; // Height from the floor
let userFov = -1;
//const verticalCameraAngle = Math.PI / 2; // 45 degrees, for example

// Scene, camera, and renderer setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 6000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
//document.body.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
document.getElementById('threejs-container').appendChild(renderer.domElement);

// Function to calculate field of view in degrees
function calculateFOV(focalLength, sensorSize) {
    return 2 * Math.atan(sensorSize / (2 * focalLength)) * (180 / Math.PI);
}
function createFrustumGeometry(fov, aspect, near, far) {
    const geometry = new THREE.BufferGeometry();

    // Calculate the half angles for the FOV
    const halfVerticalFOV = THREE.MathUtils.degToRad(fov) / 2;
    const halfHorizontalFOV = Math.atan(Math.tan(halfVerticalFOV) * aspect);

    // Calculate near and far plane widths and heights
    const nearHeight = 2 * Math.tan(halfVerticalFOV) * near;
    const nearWidth = 2 * Math.tan(halfHorizontalFOV) * near;
    const farHeight = 2 * Math.tan(halfVerticalFOV) * far;
    const farWidth = 2 * Math.tan(halfHorizontalFOV) * far;

    // Vertices
    const vertices = new Float32Array([
        // Near plane
        -nearWidth / 2, -nearHeight / 2, -near, // bottom left
         nearWidth / 2, -nearHeight / 2, -near, // bottom right
         nearWidth / 2,  nearHeight / 2, -near, // top right
        -nearWidth / 2,  nearHeight / 2, -near, // top left

        // Far plane
        -farWidth / 2, -farHeight / 2, -far, // bottom left
         farWidth / 2, -farHeight / 2, -far, // bottom right
         farWidth / 2,  farHeight / 2, -far, // top right
        -farWidth / 2,  farHeight / 2, -far, // top left
    ]);

    // Indexes for the faces
    const indices = [
        // Near plane
        0, 2, 1,  0, 3, 2,
        // Far plane
        4, 5, 6,  4, 6, 7,
        // Sides
        0, 1, 5,  0, 5, 4,
        1, 2, 6,  1, 6, 5,
        2, 3, 7,  2, 7, 6,
        3, 0, 4,  3, 4, 7
    ];

    // Apply vertices and indices to the geometry
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setIndex(indices);

    // Compute normals for the faces
    geometry.computeVertexNormals();

    return geometry;
}

function createFrustum(fov, aspect, near, far) {
    const geometry = createFrustumGeometry(fov, aspect, -near, -far);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
    return new THREE.Mesh(geometry, material);
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



function createCamerasAndFrustums() {
    // Clear existing cameras and frustums
    //scene.children = scene.children.filter(child => !(child instanceof THREE.Mesh && child.geometry instanceof THREE.ConeGeometry));

    clearScene();
    // Your logic for creating cameras and frustums
    // Create box (target)
    const boxHeight = 240; // Specify the height of the box
    const geometry = new THREE.BoxGeometry(rectWidth, boxHeight, rectHeight);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const box = new THREE.Mesh(geometry, material);
    box.position.set(0, boxHeight / 2, 0); // Position so the base is on the plane
    scene.add(box);

    createEllipse(ellipseRadiusX, ellipseRadiusY, 0x0000FF, true);
    const ellipse = createEllipse(ellipseRadiusX, ellipseRadiusY, 0xFFD433, false);
    ellipse.position.set(0, cameraHeight, 0);

    // Create cameras and frustums
    let fov = 0;
    if (userFov > 1) {
        fov = userFov;
    }
    else {
        fov = calculateFOV(focalLength, sensorSize);
    }
    const near = 1; // Near clipping plane
    const far = 2000; // Far clipping plane
    for (let i = 0; i < numOfCameras; i++) {
        const theta = (i / numOfCameras) * 2 * Math.PI;
        const x = ellipseRadiusX * Math.cos(theta);
        const z = ellipseRadiusY * Math.sin(theta);

        // Create frustum
        const frustum = createFrustum(fov, aspectRatio, near, far);
        frustum.position.set(x, cameraHeight, z);
        //frustum.lookAt(rectangle.position);
        frustum.lookAt(new THREE.Vector3(0, cameraHeight, 0));
        scene.add(frustum);
    }

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    // Camera setup for the scene
    camera.position.set(0, 300, 1000);
    camera.lookAt(new THREE.Vector3(0, cameraHeight, 0));


}
function updateVisualization() {
    // Read new values from the input elements
    ellipseRadiusX = parseInt(document.getElementById('ellipseRadiusXInput').value);
    ellipseRadiusY = parseInt(document.getElementById('ellipseRadiusYInput').value);
    numOfCameras = parseInt(document.getElementById('cameraCountInput').value);
    focalLength = parseInt(document.getElementById('focalLengthInput').value);
    sensorSize = parseInt(document.getElementById('sensorSizeInput').value);
    rectWidth = parseInt(document.getElementById('rectWidthInput').value);
    rectHeight = parseInt(document.getElementById('rectHeightInput').value);
    aspectRatio = parseInt(document.getElementById('aspectRatioInput').value);
    cameraHeight = parseInt(document.getElementById('cameraHeightInput').value);
    userFov = parseInt(document.getElementById('fovInput').value);

    // Clear existing cameras and frustums
    scene.children = scene.children.filter(child => !(child instanceof THREE.Mesh && child.geometry instanceof THREE.ConeGeometry));

    // Re-create cameras and frustums with new parameters
    createCamerasAndFrustums();
}


document.getElementById('updateButton').addEventListener('click', updateVisualization);

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
updateVisualization();
animate();

