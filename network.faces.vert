varying float v_z;
varying vec3 v_normal;
uniform vec3 u_mouse;
void main()
{
    vec3 pos = vec3(position.xy, 0.0);
    float dist = distance(u_mouse, pos);
    vec3 dir = normalize(u_mouse - pos);
    pos += dir * min(pow(max(1.0 - dist, 0.0), 20.0), dist);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    v_z = position.z;
    v_normal = normal;
}