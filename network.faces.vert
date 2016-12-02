varying float v_z;
varying vec3 v_normal;
#include network.compute.glsl

void main()
{
    vec3 pos = CalculatePositions(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    v_z = position.z;
    v_normal = normal;
}