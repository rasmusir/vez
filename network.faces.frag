
varying float v_z;
varying vec3 v_normal;
void main()
{
    vec3 color = vec3(1.0);
    gl_FragColor = vec4(color, min(dot(vec3(0.0, 0.0, 1.0), v_normal), 0.5) * 0.1 + pow(v_z, 3.0));
}