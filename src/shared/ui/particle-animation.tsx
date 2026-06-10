"use client";

import { useEffect, useRef } from "react";
import { gsap } from 'gsap';
import { cn } from "@/shared/core/utils";

interface Mouse {
    x: number;
    y: number;
    smoothX: number;
    smoothY: number;
    diff: number;
    vx?: number;
    vy?: number;
}

interface Viewport {
    width: number;
    height: number;
}

class Particle {
    size: number;
    x: number;
    y: number;
    seed: number;
    freq: number;
    amplitude: number;
    color: string;
    el: SVGCircleElement;

    constructor(x: number, y: number, size: number, particles: Particle[]) {
        this.size = size;
        this.x = x;
        this.y = y;
        this.seed = Math.random() * 1000;
        this.freq = (0.5 + Math.random() * 1) * 0.01;
        this.amplitude = (1 - Math.random() * 2) * 0.5;
        this.color = '#22d3ee'; // Mentrixa Cyan

        this.el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        this.el.setAttribute('cx', this.x.toString());
        this.el.setAttribute('cy', this.y.toString());
        this.el.setAttribute('r', this.size.toString());
        this.el.setAttribute('fill', this.color);
        this.el.setAttribute('opacity', '0.8');
        this.el.style.filter = 'drop-shadow(0 0 8px rgba(34, 211, 238, 0.4))';
        this.el.style.willChange = 'transform, r';

        gsap.to(this, {
            size: this.size * 2,
            ease: 'power1.inOut',
            duration: 2,
            onComplete: () => {
                gsap.to(this, {
                    size: 0,
                    ease: 'power4.in',
                    duration: 4,
                    delay: 1,
                    onComplete: () => this.kill(particles)
                });
            }
        });
    }

    kill(particles: Particle[]) {
        const index = particles.indexOf(this);
        if (index > -1) {
            particles.splice(index, 1);
        }
        if (this.el.parentNode) {
            this.el.remove();
        }
    }

    render() {
        this.el.setAttribute('cy', this.y.toString());
        this.el.setAttribute('cx', this.x.toString());
        this.el.setAttribute('r', this.size.toString());
    }
}

interface ParticleAnimationProps {
    className?: string;
}

export default function ParticleAnimation({ className }: ParticleAnimationProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const wrapperRef = useRef<SVGGElement>(null);
    const cursorRef = useRef<HTMLDivElement>(null);

    const mouseRef = useRef<Mouse>({
        x: 0,
        y: 0,
        smoothX: 0,
        smoothY: 0,
        diff: 0,
        vx: 0,
        vy: 0
    });

    const viewportRef = useRef<Viewport>({
        width: typeof window !== 'undefined' ? window.innerWidth : 1920,
        height: typeof window !== 'undefined' ? window.innerHeight : 1080
    });

    const particlesRef = useRef<Particle[]>([]);
    const animationIdRef = useRef<number>();

    useEffect(() => {
        const mouse = mouseRef.current;
        const viewport = viewportRef.current;
        const particles = particlesRef.current;

        const onMouseMove = (e: MouseEvent) => {
            if (mouse.vx !== undefined && mouse.vy !== undefined) {
                mouse.vx += mouse.x - e.pageX;
                mouse.vy += mouse.y - e.pageY;
            }
            mouse.x = e.pageX;
            mouse.y = e.pageY;
        };

        const onResize = () => {
            viewport.width = window.innerWidth;
            viewport.height = window.innerHeight;

            if (svgRef.current) {
                svgRef.current.style.width = viewport.width + 'px';
                svgRef.current.style.height = viewport.height + 'px';
            }
        };

        const emitParticle = () => {
            let x = 0;
            let y = 0;
            let size = 0;

            if (mouse.diff > 0.01) {
                x = mouse.smoothX;
                y = mouse.smoothY;
                size = mouse.diff * 0.2;
            }

            const particle = new Particle(x, y, size, particles);
            particles.push(particle);

            if (wrapperRef.current) {
                wrapperRef.current.prepend(particle.el);
            }
        };

        const render = () => {
            mouse.smoothX += (mouse.x - mouse.smoothX) * 0.1;
            mouse.smoothY += (mouse.y - mouse.smoothY) * 0.1;
            mouse.diff = Math.hypot(mouse.x - mouse.smoothX, mouse.y - mouse.smoothY);

            emitParticle();

            if (cursorRef.current) {
                cursorRef.current.style.setProperty('--x', mouse.smoothX + 'px');
                cursorRef.current.style.setProperty('--y', mouse.smoothY + 'px');
            }

            particles.forEach((particle: Particle) => {
                particle.render();
            });

            animationIdRef.current = requestAnimationFrame(render);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('resize', onResize);

        onResize();
        render();

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('resize', onResize);
            if (animationIdRef.current) {
                cancelAnimationFrame(animationIdRef.current);
            }
        };
    }, []);

    return (
        <div className={cn("pointer-events-none fixed inset-0 z-50", className)}>
            <div className="cursor js-cursor absolute h-4 w-4 rounded-full bg-white/20 blur-sm mix-blend-screen transition-transform duration-75" 
                 ref={cursorRef}
                 style={{ 
                     left: 'var(--x, 0px)', 
                     top: 'var(--y, 0px)',
                     transform: 'translate(-50%, -50%)'
                 }}
            ></div>

            <svg
                ref={svgRef}
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="none"
                width="100"
                height="100"
                className="absolute inset-0 h-full w-full opacity-40 mix-blend-screen"
            >
                <mask id="mask-gooey">
                    <g ref={wrapperRef} filter="url(#gooey-effect)"></g>
                </mask>
                <filter id="gooey-effect">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="15" />
                    <feColorMatrix
                        type="matrix"
                        values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 30 -7"
                        result="goo"
                    />
                </filter>
                <rect width="100%" height="100%" mask="url(#mask-gooey)" fill="white" />
            </svg>
        </div>
    );
}
