
uniform vec3 u_mouse;

void main()
{
    vec2 circCoord = 2.0 * gl_PointCoord - 1.0;
    vec3 color = vec3(1.0);

    float circDot = 1.0 - dot(circCoord, circCoord);

    gl_FragColor = vec4(color, min(1.0, circDot * 2.0) * 0.15);
}