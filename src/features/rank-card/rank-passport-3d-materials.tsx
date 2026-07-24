"use client";

import { shaderMaterial } from "@react-three/drei";
import { extend, useFrame } from "@react-three/fiber";
import { useRef, type Ref } from "react";
import * as THREE from "three";

const PassportCoverMaterialImpl = shaderMaterial(
  {
    uTime: 0,
    uShimmer: 1,
    uBaseColor: new THREE.Color("var(--mx-navy)"),
    uFoilColor: new THREE.Color("var(--mx-gold)"),
  },
  /* glsl */ `
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  /* glsl */ `
    uniform float uTime;
    uniform float uShimmer;
    uniform vec3 uBaseColor;
    uniform vec3 uFoilColor;

    varying vec3 vNormal;
    varying vec3 vViewPosition;

    void main() {
      vec3 viewDir = normalize(vViewPosition);
      float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 2.4);
      float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
      float wave = sin(uTime * 1.6 + vNormal.x * 8.0 + vNormal.y * 5.0) * 0.5 + 0.5;

      vec3 holo = mix(
        uFoilColor,
        vec3(0.39, 0.4, 0.95),
        wave * uShimmer
      );
      holo = mix(holo, vec3(0.13, 0.83, 0.93), fresnel * 0.45 * uShimmer);

      vec3 color = mix(uBaseColor, holo, fresnel * 0.55 + grain * 0.03);
      gl_FragColor = vec4(color, 1.0);
    }
  `,
);

extend({ PassportCoverMaterial: PassportCoverMaterialImpl });

declare module "@react-three/fiber" {
  interface ThreeElements {
    passportCoverMaterial: THREE.ShaderMaterialParameters & {
      uTime?: number;
      uShimmer?: number;
      uBaseColor?: THREE.Color;
      uFoilColor?: THREE.Color;
      ref?: Ref<THREE.ShaderMaterial>;
    };
  }
}

export function PassportCoverMaterial({
  reduceMotion = false,
}: {
  reduceMotion?: boolean;
}) {
  const ref = useRef<THREE.ShaderMaterial>(null);

  useFrame((state) => {
    const material = ref.current;
    if (!material?.uniforms) return;
    (material.uniforms.uTime as THREE.IUniform<number>).value = state.clock.elapsedTime;
    (material.uniforms.uShimmer as THREE.IUniform<number>).value = reduceMotion ? 0.25 : 1;
  });

  return <passportCoverMaterial ref={ref as Ref<THREE.ShaderMaterial>} />;
}

export function PassportPaperMaterial({
  color = "#F8F6F0",
}: {
  color?: string;
}) {
  return <meshStandardMaterial color={color} roughness={0.94} metalness={0.02} />;
}

export function PassportEdgeMaterial({ color = "#070D18" }: { color?: string }) {
  return <meshStandardMaterial color={color} roughness={0.82} metalness={0.08} />;
}
