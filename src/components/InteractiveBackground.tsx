import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// As cores da sua marca
const PALETTE = ['#00a8ff', '#4cd137', '#ef9f4b', '#f1c40f'];
const PARTICLE_COUNT = 350; // Quantidade de bolinhas (ajuste se ficar lento)

function Particles() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { viewport, mouse } = useThree();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Cria posições, velocidades e cores iniciais aleatórias
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const t = Math.random() * 100;
      const factor = 20 + Math.random() * 100;
      const speed = 0.01 + Math.random() / 200;
      const xFactor = -50 + Math.random() * 100;
      const yFactor = -50 + Math.random() * 100;
      const zFactor = -50 + Math.random() * 100;
      const color = new THREE.Color(PALETTE[Math.floor(Math.random() * PALETTE.length)]);
      temp.push({ t, factor, speed, xFactor, yFactor, zFactor, color, mx: 0, my: 0 });
    }
    return temp;
  }, []);

  // Aplica as cores a cada instância uma única vez no início
  useEffect(() => {
    if (meshRef.current) {
      particles.forEach((particle, i) => {
        meshRef.current!.setColorAt(i, particle.color);
      });
      meshRef.current.instanceColor!.needsUpdate = true;
    }
  }, [particles]);

  // O Loop de Animação (Roda a 60fps) - Removemos o 'state' daqui
  useFrame(() => {
    if (!meshRef.current) return;

    particles.forEach((particle, i) => {
      let { t, factor, speed, xFactor, yFactor, zFactor } = particle;
      
      // 1. Movimento natural de fluxo (subindo e ondulando)
      t = particle.t += speed / 2;
      
      // Removemos as variáveis 'a' e 'b' e mantivemos apenas a escala 's'
      const s = Math.cos(t);

      // Posição base da partícula
      let x = (xFactor + Math.cos((t / 10) * factor) + (Math.sin(t * 1) * factor) / 10) * (viewport.width / 50);
      let y = (yFactor + Math.sin((t / 10) * factor) + (Math.cos(t * 2) * factor) / 10) * (viewport.height / 50);
      let z = (zFactor + Math.cos((t / 10) * factor) + (Math.sin(t * 3) * factor) / 10) * (viewport.width / 50);

      // 2. Interação com o Mouse (Repulsão)
      // Convertemos a posição do mouse (-1 a 1) para coordenadas do mundo 3D
      const mouseX = (mouse.x * viewport.width) / 2;
      const mouseY = (mouse.y * viewport.height) / 2;
      
      // Calcula a distância entre o mouse e a partícula
      const dx = mouseX - x;
      const dy = mouseY - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Se o mouse estiver perto (raio de repulsão), empurra a partícula
      const repulsionRadius = 8; // Aumente para o mouse empurrar mais longe
      if (dist < repulsionRadius) {
          const force = (repulsionRadius - dist) / repulsionRadius;
          const angle = Math.atan2(dy, dx);
          // Adiciona força à velocidade momentânea da partícula
          particle.mx -= Math.cos(angle) * force * 0.5;
          particle.my -= Math.sin(angle) * force * 0.5;
      }

      // Aplica a velocidade do mouse e suaviza (inércia)
      x += particle.mx;
      y += particle.my;
      // Faz a força do mouse diminuir gradualmente
      particle.mx *= 0.94; 
      particle.my *= 0.94;

      // 3. Reset infinito: se sair muito para cima, volta para baixo
      if (y > 30) particle.yFactor = -50;

      // Atualiza a posição e escala da instância
      dummy.position.set(x, y, z);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    
    // Avisa o Three.js que as posições mudaram
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
      {/* Forma da partícula: uma esfera simples e leve */}
      <circleGeometry args={[0.6, 16]} /> 
      {/* Material: Básico, sem necessidade de luzes, com cores vivas e um pouco de transparência para blending */}
      <meshBasicMaterial transparent opacity={0.8} depthWrite={false} blending={THREE.AdditiveBlending} />
    </instancedMesh>
  );
}

// O componente principal que configura a cena 3D
export function InteractiveBackground() {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}>
      <Canvas camera={{ position: [0, 0, 30], fov: 60 }} dpr={[1, 2]}> {/* dpr ajuda na nitidez em telas retina */}
        <color attach="background" args={['#1e3c72']} /> {/* Cor de fundo base (caso o CSS falhe) */}
        <Particles />
      </Canvas>
    </div>
  );
}