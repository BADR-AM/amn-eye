import React, { useEffect, useRef, useState } from 'react';
import { shaderSource } from './liquidOrbShader';
import { stateSeeds } from './liquidOrbSeeds';

const ribbonStyleIndex = 24;
const ribbonInstanceCount = 221184;
const activationDurationMs = 220;
const settleDurationMs = 650;

function srgbToLinear(value) {
  return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
}

function linearToSrgb(value) {
  return value <= 0.0031308 ? value * 12.92 : 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
}

function mixSrgb(from, to, progress) {
  return linearToSrgb(srgbToLinear(from) + (srgbToLinear(to) - srgbToLinear(from)) * progress);
}

// High-fidelity WebGL shader for devices without WebGPU (e.g. mobile Safari/iOS, Android browsers, older systems)
const webglVs = `
  attribute vec2 position;
  varying vec2 v_uv;
  void main() {
    v_uv = (position + 1.0) * 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const webglFs = `
  precision highp float;
  varying vec2 v_uv;
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform float u_state; // 0.0 = idle, 1.0 = thinking

  vec2 siriBand(vec2 q, float drift, float phaseOffset, float amplitude, float mainY, float envelope, float softness) {
    float y = amplitude * envelope * sin(q.x * 1.0 + drift + phaseOffset);
    float distanceToLine = abs(q.y - y);
    float line = 0.018 / (sqrt(distanceToLine * distanceToLine + softness * softness) + 0.026);
    float bandDistance = max(0.0, max(q.y - max(mainY, y), min(mainY, y) - q.y));
    float band = 0.018 / (bandDistance + 0.075);
    return vec2(line, band);
  }

  void main() {
    vec2 p = (v_uv * 2.0 - 1.0);
    float r = length(p);
    if (r > 1.0) {
      gl_FragColor = vec4(0.0);
      return;
    }

    // Interpolate parameters between idle and thinking states
    float speed = mix(0.246, 0.82, u_state);
    float zoom = mix(0.3384, 0.36, u_state);
    float warp = mix(1.664, 3.2, u_state);
    float ridgeAmt = mix(0.24, 0.5, u_state);
    float exposure = mix(1.36, 2.0, u_state);

    // Official Siri palette interpolation
    vec3 colorA = mix(vec3(0.710, 0.651, 0.455), vec3(1.0, 0.847, 0.420), u_state);
    vec3 colorB = mix(vec3(0.369, 0.529, 0.580), vec3(0.510, 0.957, 1.0), u_state);
    vec3 colorC = mix(vec3(0.604, 0.392, 0.541), vec3(1.0, 0.482, 0.835), u_state);
    vec3 colorD = mix(vec3(0.388, 0.357, 0.541), vec3(0.557, 0.424, 1.0), u_state);
    vec3 highlightColor = mix(vec3(0.714, 0.769, 0.824), vec3(1.0, 1.0, 1.0), u_state);

    float t = u_time * speed;

    // Glass refraction wave mapping
    float edgeDepth = max(1.0 - r, 0.0);
    float refractionProfile = pow(1.0 - sqrt(max(1.0 - (1.0 - edgeDepth) * (1.0 - edgeDepth), 0.0)), 0.68);
    vec2 normal = normalize(p);
    vec2 refractedP = p - normal * (0.16 * refractionProfile);

    float scale = 0.74 + zoom * 0.34;
    vec2 q = refractedP / scale;
    float xNorm = q.x;
    float envelopeBase = cos(1.57079633 * min(abs(0.9 * xNorm), 1.0));
    float envelope = envelopeBase * envelopeBase;
    float low = 0.5 + 0.5 * cos(t * 0.37);
    float mid = 0.5 + 0.5 * sin(t * 0.51 + 1.2);
    float high = 0.5 + 0.5 * cos(t * 0.73 + 2.1);
    float drift = t * 2.4;
    float mainAmplitude = 0.25 + ridgeAmt * 0.075 + low * 0.018;
    float bandAmplitude = mainAmplitude + mid * 0.025 + high * 0.018;
    float mainY = mainAmplitude * envelope * sin(q.x * 1.1 + drift);
    float separation = 1.85 + warp * 0.2 + mid * 0.28;
    float softness = 0.035 + (1.0 - ridgeAmt) * 0.018 + mid * 0.006;

    vec2 b0 = siriBand(q, drift, -separation, bandAmplitude, mainY, envelope, softness);
    vec2 b1 = siriBand(q, drift, -separation * 0.34, bandAmplitude, mainY, envelope, softness);
    vec2 b2 = siriBand(q, drift, separation * 0.34, bandAmplitude, mainY, envelope, softness);
    vec2 b3 = siriBand(q, drift, separation, bandAmplitude, mainY, envelope, softness);

    float total = b0.x + b0.y + b1.x + b1.y + b2.x + b2.y + b3.x + b3.y;
    float dom0 = (b0.x + b0.y) * (b0.x + b0.y);
    float dom1 = (b1.x + b1.y) * (b1.x + b1.y);
    float dom2 = (b2.x + b2.y) * (b2.x + b2.y);
    float dom3 = (b3.x + b3.y) * (b3.x + b3.y);
    float domTotal = dom0 + dom1 + dom2 + dom3;

    vec3 spectral = (colorA * dom0 + colorC * dom1 + colorB * dom2 + colorD * dom3) / max(domTotal, 0.0001);
    float energy = (1.0 - exp(-total * 0.58)) * envelope;
    float mainDistance = abs(q.y - mainY);
    float whiteCore = exp(-mainDistance * mainDistance / 0.0028) * envelope;
    vec3 atmosphere = mix(colorD, colorB, smoothstep(-0.7, 0.7, q.y)) * 0.022;

    vec3 col = atmosphere + spectral * energy * 1.25;
    col += highlightColor * whiteCore * (0.22 + 0.12 * low);
    col = col / (vec3(1.0) + col * 0.18);

    // Glass shell & Rim highlights
    float surfaceBand = (1.0 - smoothstep(0.0, 0.045, edgeDepth));
    float opticalRim = pow(surfaceBand, 1.6);
    vec2 keyDir = normalize(vec2(-0.68, 0.73));
    float key = opticalRim * pow(max(dot(normal, keyDir), 0.0), 2.5) * 1.2;
    vec2 fillDir = normalize(vec2(0.74, -0.67));
    float fill = opticalRim * pow(max(dot(normal, fillDir), 0.0), 3.0) * 0.8;

    col = col * (1.0 - opticalRim * 0.25) + vec3(1.0) * key + mix(colorB, highlightColor, 0.5) * fill;

    // Anti-aliased boundary
    float alpha = 1.0 - smoothstep(0.97, 1.0, r);
    col = clamp(col * exposure, 0.0, 1.0);

    // Outer glow
    float halo = exp(-max(r - 0.95, 0.0) * 12.0) * 0.25 * (1.0 - alpha);
    vec3 glowCol = mix(colorD, colorC, 0.5) * halo;

    gl_FragColor = vec4(col * alpha + glowCol, max(alpha, halo));
  }
`;

export default function LiquidOrb({
  state = 'idle',
  size = 36,
  className = '',
  showPill = false,
  pillText = null,
  onClick = null
}) {
  const canvasRef = useRef(null);
  const [useFallback, setUseFallback] = useState(false);
  const orbControllerRef = useRef(null);

  const pxSize = typeof size === 'number' 
    ? size 
    : size === 'xs' ? 22 
    : size === 'sm' ? 28 
    : size === 'md' ? 42 
    : size === 'lg' ? 64 
    : size === 'xl' ? 100 
    : 36;

  const isSmall = pxSize <= 48;

  // React to state prop updates
  useEffect(() => {
    if (orbControllerRef.current && orbControllerRef.current.setState) {
      try {
        orbControllerRef.current.setState(state);
      } catch (err) {
        console.warn('Failed to update liquid orb state:', err);
      }
    }
  }, [state]);

  useEffect(() => {
    // If small or fallback, do not allocate WebGL/WebGPU contexts
    if (isSmall || useFallback) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    let stopped = false;
    let animationFrame = 0;

    // --- 1. WEBGL ENGINE (Primary engine for cross-platform 60fps support including iOS/Safari) ---
    function initWebGL() {
      try {
        const gl = canvas.getContext('webgl', { alpha: true, antialias: true }) || 
                   canvas.getContext('experimental-webgl', { alpha: true, antialias: true });
        if (!gl) {
          setUseFallback(true);
          return false;
        }

        function createShader(glCtx, type, source) {
          const shader = glCtx.createShader(type);
          glCtx.shaderSource(shader, source);
          glCtx.compileShader(shader);
          if (!glCtx.getShaderParameter(shader, glCtx.COMPILE_STATUS)) {
            console.warn('WebGL shader error:', glCtx.getShaderInfoLog(shader));
            glCtx.deleteShader(shader);
            return null;
          }
          return shader;
        }

        const vs = createShader(gl, gl.VERTEX_SHADER, webglVs);
        const fs = createShader(gl, gl.FRAGMENT_SHADER, webglFs);
        if (!vs || !fs) {
          setUseFallback(true);
          return false;
        }

        const program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);

        const posBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
          -1, -1,
           1, -1,
          -1,  1,
          -1,  1,
           1, -1,
           1,  1
        ]), gl.STATIC_DRAW);

        const posLoc = gl.getAttribLocation(program, 'position');
        const timeLoc = gl.getUniformLocation(program, 'u_time');
        const resLoc = gl.getUniformLocation(program, 'u_resolution');
        const stateLoc = gl.getUniformLocation(program, 'u_state');

        let currentVal = state === 'thinking' ? 1.0 : 0.0;
        let targetVal = currentVal;
        const startTime = performance.now();

        orbControllerRef.current = {
          setState: (st) => {
            targetVal = st === 'thinking' ? 1.0 : 0.0;
          },
          getState: () => (targetVal > 0.5 ? 'thinking' : 'idle')
        };

        function renderWebGL(now) {
          if (stopped) return;
          try {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
            const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));

            if (canvas.width !== w || canvas.height !== h) {
              canvas.width = w;
              canvas.height = h;
              gl.viewport(0, 0, w, h);
            }

            // Smooth state transition
            currentVal += (targetVal - currentVal) * 0.08;

            gl.useProgram(program);
            gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
            gl.enableVertexAttribArray(posLoc);
            gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

            const elapsed = (now - startTime) * 0.001;
            gl.uniform1f(timeLoc, elapsed);
            gl.uniform2f(resLoc, w, h);
            gl.uniform1f(stateLoc, currentVal);

            gl.drawArrays(gl.TRIANGLES, 0, 6);
            animationFrame = requestAnimationFrame(renderWebGL);
          } catch (e) {
            console.warn('WebGL render error:', e);
            setUseFallback(true);
          }
        }

        animationFrame = requestAnimationFrame(renderWebGL);
        return true;
      } catch (err) {
        console.warn('WebGL initialization failed:', err);
        setUseFallback(true);
        return false;
      }
    }

    // --- 2. WEBGPU ENGINE (For systems with WebGPU enabled) ---
    async function initWebGPU() {
      if (typeof window === 'undefined' || !navigator.gpu) {
        return initWebGL();
      }

      let device = null;
      let ribbonTarget = null;
      let currentState = state;
      let transitionTargetState = state;
      let fromUniforms = new Float32Array(stateSeeds[state] || stateSeeds.idle);
      let targetUniforms = new Float32Array(stateSeeds[state] || stateSeeds.idle);
      const displayedUniforms = new Float32Array(stateSeeds[state] || stateSeeds.idle);
      let transitionStartedAt = 0;
      let activeTransitionDuration = 0;
      let lastFrameAt = null;
      let motionPhase = 0;

      function transitionProgress(now) {
        if (activeTransitionDuration === 0) return 1;
        const raw = Math.min(1, Math.max(0, (now - transitionStartedAt) / activeTransitionDuration));
        return transitionTargetState === 'thinking'
          ? 1 - Math.pow(1 - raw, 3)
          : raw * raw * (3 - 2 * raw);
      }

      function sampleTransition(now) {
        const progress = transitionProgress(now);
        for (let index = 3; index < displayedUniforms.length; index += 1) {
          const colorComponent = index >= 40 && (index - 40) % 4 < 3;
          displayedUniforms[index] = colorComponent
            ? mixSrgb(fromUniforms[index], targetUniforms[index], progress)
            : fromUniforms[index] + (targetUniforms[index] - fromUniforms[index]) * progress;
        }
        return displayedUniforms;
      }

      function changeState(nextState) {
        if (!stateSeeds[nextState]) return;
        if (nextState === currentState) return;

        const now = performance.now();
        sampleTransition(now);
        fromUniforms = new Float32Array(displayedUniforms);
        targetUniforms = new Float32Array(stateSeeds[nextState]);
        transitionTargetState = nextState;
        transitionStartedAt = now;
        activeTransitionDuration = nextState === 'thinking' ? activationDurationMs : settleDurationMs;
        currentState = nextState;
      }

      orbControllerRef.current = {
        setState: changeState,
        getState: () => currentState
      };

      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter || stopped) {
          return initWebGL();
        }

        device = await adapter.requestDevice();
        if (stopped) {
          device.destroy();
          return;
        }

        const context = canvas.getContext('webgpu');
        if (!context) {
          return initWebGL();
        }

        const format = navigator.gpu.getPreferredCanvasFormat();
        context.configure({ device, format, alphaMode: 'premultiplied' });

        const shader = device.createShaderModule({ code: shaderSource });
        const compilation = await shader.getCompilationInfo();
        const errors = compilation.messages.filter(m => m.type === 'error');
        if (errors.length > 0) {
          console.warn('WebGPU shader compilation error:', errors);
          return initWebGL();
        }

        const pipeline = device.createRenderPipeline({
          layout: 'auto',
          vertex: { module: shader, entryPoint: 'vs_main' },
          fragment: {
            module: shader,
            entryPoint: 'fs_main',
            targets: [{
              format,
              blend: {
                color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
                alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }
              }
            }]
          },
          primitive: { topology: 'triangle-list' }
        });

        const ribbonPipeline = device.createRenderPipeline({
          layout: 'auto',
          vertex: { module: shader, entryPoint: 'ribbon_vs_main' },
          fragment: {
            module: shader,
            entryPoint: 'ribbon_fs_main',
            targets: [{
              format,
              blend: {
                color: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
                alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }
              }
            }]
          },
          primitive: { topology: 'triangle-list' }
        });

        const ribbonCompositePipeline = device.createRenderPipeline({
          layout: 'auto',
          vertex: { module: shader, entryPoint: 'vs_main' },
          fragment: {
            module: shader,
            entryPoint: 'ribbon_composite_fs_main',
            targets: [{
              format,
              blend: {
                color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
                alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }
              }
            }]
          },
          primitive: { topology: 'triangle-list' }
        });

        const values = new Float32Array(displayedUniforms);
        const uniformBuffer = device.createBuffer({
          size: values.byteLength,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        const bindGroup = device.createBindGroup({
          layout: pipeline.getBindGroupLayout(0),
          entries: [{ binding: 0, resource: { buffer: uniformBuffer } }]
        });

        const ribbonBindGroup = device.createBindGroup({
          layout: ribbonPipeline.getBindGroupLayout(0),
          entries: [{ binding: 0, resource: { buffer: uniformBuffer } }]
        });

        const ribbonSampler = device.createSampler({
          addressModeU: 'clamp-to-edge',
          addressModeV: 'clamp-to-edge',
          magFilter: 'linear',
          minFilter: 'linear'
        });

        let ribbonCompositeBindGroup = null;

        device.lost.then(() => {
          if (!stopped) initWebGL();
        });

        function frame(now) {
          if (stopped) return;
          try {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
            const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));

            if (canvas.width !== width || canvas.height !== height) {
              canvas.width = width;
              canvas.height = height;
              ribbonTarget?.destroy();
              ribbonTarget = null;
              ribbonCompositeBindGroup = null;
            }

            values.set(sampleTransition(now));
            const frameDelta = lastFrameAt === null ? 0 : Math.min(0.1, Math.max(0, (now - lastFrameAt) / 1000));
            lastFrameAt = now;
            motionPhase += frameDelta * Math.max(values[3], 0);
            values[0] = width;
            values[1] = height;
            values[2] = motionPhase / Math.max(values[3], 0.001);
            device.queue.writeBuffer(uniformBuffer, 0, values);

            const isParticleRibbon = Math.round(values[15]) === ribbonStyleIndex;
            const encoder = device.createCommandEncoder();

            if (isParticleRibbon) {
              if (!ribbonTarget || !ribbonCompositeBindGroup) {
                ribbonTarget = device.createTexture({
                  size: { width, height },
                  format,
                  usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
                });
                ribbonCompositeBindGroup = device.createBindGroup({
                  layout: ribbonCompositePipeline.getBindGroupLayout(0),
                  entries: [
                    { binding: 0, resource: { buffer: uniformBuffer } },
                    { binding: 1, resource: ribbonTarget.createView() },
                    { binding: 2, resource: ribbonSampler }
                  ]
                });
              }
              const particlePass = encoder.beginRenderPass({
                colorAttachments: [{
                  view: ribbonTarget.createView(),
                  clearValue: { r: 0, g: 0, b: 0, a: 0 },
                  loadOp: 'clear',
                  storeOp: 'store'
                }]
              });
              particlePass.setPipeline(ribbonPipeline);
              particlePass.setBindGroup(0, ribbonBindGroup);
              particlePass.draw(6, ribbonInstanceCount);
              particlePass.end();
            }

            const pass = encoder.beginRenderPass({
              colorAttachments: [{
                view: context.getCurrentTexture().createView(),
                clearValue: { r: 0, g: 0, b: 0, a: 0 },
                loadOp: 'clear',
                storeOp: 'store'
              }]
            });

            if (isParticleRibbon) {
              pass.setPipeline(ribbonCompositePipeline);
              pass.setBindGroup(0, ribbonCompositeBindGroup);
            } else {
              pass.setPipeline(pipeline);
              pass.setBindGroup(0, bindGroup);
            }

            pass.draw(3);
            pass.end();

            device.queue.submit([encoder.finish()]);
            animationFrame = requestAnimationFrame(frame);
          } catch (err) {
            console.warn('WebGPU frame render error, falling back to WebGL:', err);
            initWebGL();
          }
        }

        animationFrame = requestAnimationFrame(frame);
      } catch (err) {
        console.warn('WebGPU init failed, switching to WebGL engine:', err);
        initWebGL();
      }
    }

    initWebGPU();

    return () => {
      stopped = true;
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  const orbContent = (
    <div
      className={
        'relative inline-flex items-center justify-center select-none overflow-hidden rounded-full ' + className
      }
      style={{ width: pxSize, height: pxSize }}
      onClick={onClick}
    >
      {(isSmall || useFallback) ? (
        <div 
          className={
            'w-full h-full rounded-full relative flex items-center justify-center transition-transform duration-500 ' +
            (state === 'thinking' ? 'scale-105 animate-pulse' : 'hover:scale-105')
          }
          style={{
            background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5) 0%, rgba(130,244,255,0.35) 28%, rgba(255,123,213,0.4) 55%, rgba(142,108,255,0.65) 80%, rgba(11,15,25,0.95) 100%)',
            boxShadow: state === 'thinking'
              ? '0 0 18px 3px rgba(142, 108, 255, 0.75), inset 0 0 12px rgba(255, 216, 107, 0.6), inset 0 2px 4px rgba(255,255,255,0.85)'
              : '0 0 10px 1px rgba(94, 135, 148, 0.4), inset 0 0 8px rgba(182, 196, 210, 0.4), inset 0 1px 3px rgba(255,255,255,0.6)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            backdropFilter: 'blur(4px)'
          }}
        >
          <div 
            className={
              'w-[75%] h-[32%] rounded-full opacity-90 blur-[1.5px] transition-all duration-700 ' +
              (state === 'thinking' ? 'animate-spin' : '')
            }
            style={{
              background: 'linear-gradient(90deg, #FFD86B 0%, #FF7BD5 35%, #82F4FF 70%, #8E6CFF 100%)',
              filter: 'blur(1.2px)',
              boxShadow: '0 0 8px rgba(255,255,255,0.85)'
            }}
          />
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          className="w-full h-full block pointer-events-none drop-shadow-md rounded-full"
          style={{ width: '100%', height: '100%' }}
        />
      )}
    </div>
  );

  if (showPill) {
    const text = pillText || (state === 'thinking' ? 'جاري التحليل والاستعلام...' : 'المساعد الذكي جاهز');
    return (
      <div 
        onClick={onClick}
        className={
          'inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-850 border border-slate-700/70 shadow-lg shadow-black/40 backdrop-blur-md transition-all ' +
          (onClick ? 'cursor-pointer ' : '') +
          (state === 'thinking' ? 'border-purple-500/50 shadow-purple-900/30' : '')
        }
      >
        {orbContent}
        <span className="text-xs font-semibold text-slate-200 select-none">
          {text}
        </span>
        {state === 'thinking' && (
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
          </span>
        )}
      </div>
    );
  }

  return orbContent;
}
