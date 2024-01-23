# Visualization

Visualizes the camera setup of a circular capture setup and checks if the rectangular capture space is within view of each camera.

If a camera does not completely capture the space, its frustrum is colored in red.

Note: the 2D version currently more evenly distributes the points on an elliptic setup than the 3D version does.

## 2D Version

![vis](images/vis_2d.png)

To use just open [index.html](2d/index.html).

## 3D Version

![vis](images/vis_3d.png)

### Install

Run `npm install` from within the `3d` directory.

### Run

Run server with `npx vite`.