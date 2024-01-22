const canvas = document.getElementById('cameraCanvas');
const ctx = canvas.getContext('2d');

let ellipseRadiusX = 300; 
let ellipseRadiusY = 300; 
let numOfCameras = 12; 
let focalLength = 7; 
let sensorSize = 16; // In mm
let rectWidth = 100; 
let rectHeight = 100; 


const canvasSize = 700; // Desired size of the box in pixels
let scaleFactor;

canvas.width = canvasSize;
canvas.height = canvasSize;

function calculateScaleFactor() {
    const maxDimension = Math.max(ellipseRadiusX*2, ellipseRadiusY*2); // Consider other elements if they are larger
    scaleFactor = canvasSize / maxDimension;
}

window.onload = function() {
    draw();
};
function getEllipsePoints(centerX, centerY, a, b, numPoints) {
    let points = [];
    let eSquared = 1 - (b * b) / (a * a);

    for (let i = 0; i < numPoints; i++) {
        let t = (i / numPoints) * 2 * Math.PI;
        let theta = t + (eSquared / 8 + eSquared * eSquared / 16 + 71 * Math.pow(eSquared, 3) / 2048) * Math.sin(2 * t) +
                    (5 * eSquared * eSquared / 256 + 5 * Math.pow(eSquared, 3) / 256) * Math.sin(4 * t) +
                    29 * Math.pow(eSquared, 3) / 6144 * Math.sin(6 * t);

        let x = centerX + a * Math.cos(theta);
        let y = centerY + b * Math.sin(theta);

        points.push({ x, y });
    }

    return points;
}


function linesIntersect(p0_x, p0_y, p1_x, p1_y, p2_x, p2_y, p3_x, p3_y) {
    let s1_x, s1_y, s2_x, s2_y;
    s1_x = p1_x - p0_x;     
    s1_y = p1_y - p0_y;
    s2_x = p3_x - p2_x;     
    s2_y = p3_y - p2_y;

    let s, t;
    s = (-s1_y * (p0_x - p2_x) + s1_x * (p0_y - p2_y)) / (-s2_x * s1_y + s1_x * s2_y);
    t = ( s2_x * (p0_y - p2_y) - s2_y * (p0_x - p2_x)) / (-s2_x * s1_y + s1_x * s2_y);

    return (s >= 0 && s <= 1 && t >= 0 && t <= 1);
}


function drawSquare(centerX, centerY, size) {
    ctx.beginPath();
    ctx.rect(centerX - size / 2, centerY - size / 2, size, size);
    ctx.stroke();
}

function drawRectangle(x, y, width, height) {
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.stroke();
}

function drawEllipse(centerX, centerY, radiusX, radiusY) {
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
    ctx.stroke();
}

function drawCamera(x, y, fov, centerX, centerY) {

    const angleToCenter = Math.atan2(centerY - y, centerX - x);

    // Draw camera body as a small circle
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, 2 * Math.PI);
    ctx.fill();

    // Draw field of view
    const fovStart = angleToCenter - fov / 2;
    const fovEnd = angleToCenter + fov / 2;
    const fovRadius = 10000; 

    let line1_x1 = x;
    let line1_y1 = y;
    let line1_x2 = x + fovRadius * Math.cos(fovStart);
    let line1_y2 = y + fovRadius * Math.sin(fovStart);

    let line2_x1 = x;
    let line2_y1 = y;
    let line2_x2 = x + fovRadius * Math.cos(fovEnd);
    let line2_y2 = y + fovRadius * Math.sin(fovEnd);

    // Define the corners of the square
    let rectTopLeft = { x: centerX - rectWidth / 2, y: centerY - rectHeight / 2 };
    let rectTopRight = { x: centerX + rectWidth / 2, y: centerY - rectHeight / 2 };
    let rectBottomLeft = { x: centerX - rectWidth / 2, y: centerY + rectHeight / 2 };
    let rectBottomRight = { x: centerX + rectWidth / 2, y: centerY + rectHeight / 2 };

    // Check if either of the FOV lines intersect with any side of the square
    // TODO: buggy; this does not work for all lines
    let intersects = linesIntersect(line1_x1, line1_y1, line1_x2, line1_y2, rectTopLeft.x, rectTopLeft.y, rectTopRight.x, rectTopRight.y) ||
                     linesIntersect(line1_x1, line1_y1, line1_x2, line1_y2, rectTopRight.x, rectTopRight.y, rectBottomRight.x, rectBottomRight.y) ||
                     linesIntersect(line1_x1, line1_y1, line1_x2, line1_y2, rectBottomRight.x, rectBottomRight.y, rectBottomLeft.x, rectBottomLeft.y) ||
                     linesIntersect(line1_x1, line1_y1, line1_x2, line1_y2, rectBottomLeft.x, rectBottomLeft.y, rectTopLeft.x, rectTopLeft.y) ||
                     linesIntersect(line2_x1, line2_y1, line2_x2, line2_y2, rectTopLeft.x, rectTopLeft.y, rectTopRight.x, rectTopRight.y) ||
                     linesIntersect(line2_x1, line2_y1, line2_x2, line2_y2, rectTopRight.x, rectTopRight.y, rectBottomRight.x, rectBottomRight.y) ||
                     linesIntersect(line2_x1, line2_y1, line2_x2, line2_y2, rectBottomRight.x, rectBottomRight.y, rectBottomLeft.x, rectBottomLeft.y) ||
                     linesIntersect(line2_x1, line2_y1, line2_x2, line2_y2, rectBottomLeft.x, rectBottomLeft.y, rectTopLeft.x, rectTopLeft.y);

    // Set line color based on intersection
    ctx.strokeStyle = intersects ? 'red' : 'green';

    // Draw FOV lines
    ctx.beginPath();
    ctx.moveTo(line1_x1, line1_y1);
    ctx.lineTo(line1_x2, line1_y2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(line2_x1, line2_y1);
    ctx.lineTo(line2_x2, line2_y2);
    ctx.stroke();

    // Reset stroke color
    ctx.strokeStyle = 'black';
}

function calculateFOV(focalLength) {
    // Calculate the horizontal field of view
    return 2 * Math.atan(sensorSize / (2 * focalLength));
}

function draw() {
    calculateScaleFactor();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply the scaling transformation
    const centerX = ellipseRadiusX; // Adjust as necessary for your visualization
    const centerY = ellipseRadiusY; // Adjust as necessary for your visualization

    const fov = calculateFOV(focalLength);

    ctx.save(); // Save the current state of the canvas
    //ctx.scale(scaleFactor, scaleFactor);

    drawEllipse(centerX, centerY, ellipseRadiusX, ellipseRadiusY);
    drawRectangle(centerX - rectWidth / 2, centerY - rectHeight / 2, rectWidth, rectHeight);

    

    // Use getEllipsePoints to get camera positions
    const cameraPoints = getEllipsePoints(centerX, centerY, ellipseRadiusX, ellipseRadiusY, numOfCameras);

    // Iterate over camera points to draw each camera
    cameraPoints.forEach(point => {
        drawCamera(point.x, point.y, fov, centerX, centerY);
    });

    ctx.restore(); // Restore the canvas to its original state
}

document.getElementById('updateButton').addEventListener('click', function() {
    ellipseRadiusX = parseInt(document.getElementById('ellipseRadiusXInput').value);
    ellipseRadiusY = parseInt(document.getElementById('ellipseRadiusYInput').value);
    numOfCameras = parseInt(document.getElementById('cameraCountInput').value);
    focalLength = parseInt(document.getElementById('focalLengthInput').value);
    sensorSize = parseInt(document.getElementById('sensorSizeInput').value);
    rectWidth = parseInt(document.getElementById('rectWidthInput').value);
    rectHeight = parseInt(document.getElementById('rectHeightInput').value);
    draw();
});

