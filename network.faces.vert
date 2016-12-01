varying float v_z;
varying vec3 v_normal;
void main()
{
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    v_z = position.z;
    v_normal = normal;
}