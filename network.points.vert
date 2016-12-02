#include network.compute.glsl

void main()
{
    vec3 pos = CalculatePositions(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = 3.0 + position.z * 3.0;
}