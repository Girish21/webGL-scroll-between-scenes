uniform float uTime;
uniform float uProgress;
uniform sampler2D uTexture1;
uniform sampler2D uTexture2;

varying vec2 vUv;

void main() {
  vec4 t1 = texture2D(uTexture1, vUv);
  vec4 t2 = texture2D(uTexture2, vUv);
  float sweep = step(1. - vUv.y, uProgress);
  // gl_FragColor = mix(t1, t2, vUv.x);
  gl_FragColor = mix(t1, t2, sweep);
}
