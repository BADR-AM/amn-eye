import React, { useEffect, useRef, useState } from 'react';
import { shaderSource } from './liquidOrbShader';

export const stateSeeds = {
  idle: [
    1, 1, 0, 0.2460000067949295, 0.7200000286102295, 0.3384000062942505, 1.6640000343322754, 0.23999999463558197,
    1.9800000190734863, 0.11999999731779099, 0.2800000011920929, 0.23999999463558197, 0.18000000715255737,
    0.18000000715255737, 1.3600000143051147, 9, 0.004999999888241291, 0, 0, 1, 0.4399999976158142, 0, 2,
    0.41999998688697815, 0.7699999809265137, 0.23000000417232513, 65, 0, 0, 1, 0.2199999988079071, 0.25,
    0.7200000286102295, 5, 0.41999998688697815, 1.25, 0.550000011920929, 0.30000001192092896, 1.2000000476837158,
    0.699999988079071, 0.7098039388656616, 0.6509804129600525, 0.45490196347236633, 1, 0.3686274588108063,
    0.529411792755127, 0.5803921818733215, 1, 0.6039215922355652, 0.3921568691730499, 0.5411764979362488, 1,
    0.38823530077934265, 0.35686275362968445, 0.5411764979362488, 1, 0.7137255072593689, 0.7686274647712708,
    0.8235294222831726, 1, 1, 1, 1, 1, 0.6078431606292725, 0.95686274766922, 1, 1, 0.772549033164978,
    0.6627451181411743, 1, 1, 0.9176470637321472, 0.95686274766922, 1, 1, 0.8627451062202454, 0.9176470637321472,
    1, 1, 0.0117647061124444, 0.01568627543747425, 0.03529411926865578, 1, 0.42352941632270813,
    0.40784314274787903, 0.5607843399047852, 1, 0.9686274528503418, 0.9843137264251709, 1, 1, 0.9372549057006836,
    0.9647058844566345, 0.9921568632125854, 1, 0.8784313797950745, 0.9333333373069763, 0.9764705896377563, 1,
    0.8313725590705872, 0.9019607901573181, 0.9686274528503418, 1, 0.7333333492279053, 0.8352941274642944,
    0.9529411792755127, 1, 0.6509804129600525, 0.7803921699523926, 0.9411764740943909, 1, 0.529411792755127,
    0.6901960968971252, 0.9215686321258545, 1, 0.43529412150382996, 0.6196078658103943, 0.9098039269447327, 1,
    0.43529412150382996, 0.6196078658103943, 0.9098039269447327, 1, 0.43529412150382996, 0.6196078658103943,
    0.9098039269447327, 1, 0.43529412150382996, 0.6196078658103943, 0.9098039269447327, 1, 0.43529412150382996,
    0.6196078658103943, 0.9098039269447327, 1
  ],
  thinking: [
    1, 1, 0, 0.8199999928474426, 0.7200000286102295, 0.36000001430511475, 3.200000047683716, 0.5,
    2.200000047683716, 0.11999999731779099, 0.2800000011920929, 0.23999999463558197, 0.18000000715255737,
    0.18000000715255737, 2, 9, 0.004999999888241291, 0, 0, 1, 0.4399999976158142, 0, 2, 0.41999998688697815,
    0.7699999809265137, 0.23000000417232513, 65, 0, 0, 1, 0.2199999988079071, 0.25, 0.7200000286102295, 5,
    0.41999998688697815, 1.25, 0.550000011920929, 0.30000001192092896, 1.2000000476837158, 0.699999988079071,
    1, 0.8470588326454163, 0.41960784792900085, 1, 0.5098039507865906, 0.95686274766922, 1, 1, 1,
    0.48235294222831726, 0.8352941274642944, 1, 0.5568627715110779, 0.42352941632270813, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 0.6078431606292725, 0.95686274766922, 1, 1, 0.772549033164978, 0.6627451181411743, 1, 1,
    0.9176470637321472, 0.95686274766922, 1, 1, 0.8627451062202454, 0.9176470637321472, 1, 1, 0.0117647061124444,
    0.01568627543747425, 0.03529411926865578, 1, 0.5843137502670288, 0.42352941632270813, 1, 1,
    0.9686274528503418, 0.9843137264251709, 1, 1, 0.9372549057006836, 0.9647058844566345, 0.9921568632125854,
    1, 0.8784313797950745, 0.9333333373069763, 0.9764705896377563, 1, 0.8313725590705872, 0.9019607901573181,
    0.9686274528503418, 1, 0.7333333492279053, 0.8352941274642944, 0.9529411792755127, 1, 0.6509804129600525,
    0.7803921699523926, 0.9411764740943909, 1, 0.529411792755127, 0.6901960968971252, 0.9215686321258545, 1,
    0.43529412150382996, 0.6196078658103943, 0.9098039269447327, 1, 0.43529412150382996, 0.6196078658103943,
    0.9098039269447327, 1, 0.43529412150382996, 0.6196078658103943, 0.9098039269447327, 1, 0.43529412150382996,
    0.6196078658103943, 0.9098039269447327, 1, 0.43529412150382996, 0.6196078658103943, 0.9098039269447327, 1
  ]
};

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
    if (typeof window === 'undefined' || !navigator.gpu) {
      setUseFallback(true);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    let stopped = false;
    let animationFrame = 0;
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

    async function initWebGPU() {
      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter || stopped) {
          setUseFallback(true);
          return;
        }

        device = await adapter.requestDevice();
        if (stopped) {
          device.destroy();
          return;
        }

        const context = canvas.getContext('webgpu');
        if (!context) {
          setUseFallback(true);
          return;
        }

        const format = navigator.gpu.getPreferredCanvasFormat();
        context.configure({ device, format, alphaMode: 'premultiplied' });

        const shader = device.createShaderModule({ code: shaderSource });
        const compilation = await shader.getCompilationInfo();
        const errors = compilation.messages.filter(m => m.type === 'error');
        if (errors.length > 0) {
          console.warn('WebGPU shader compilation error:', errors);
          setUseFallback(true);
          return;
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
          if (!stopped) setUseFallback(true);
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
            console.warn('WebGPU frame render error:', err);
            setUseFallback(true);
          }
        }

        animationFrame = requestAnimationFrame(frame);
      } catch (err) {
        console.warn('WebGPU initialization failed, switching to fallback:', err);
        setUseFallback(true);
      }
    }

    initWebGPU();

    return () => {
      stopped = true;
      cancelAnimationFrame(animationFrame);
      try {
        ribbonTarget?.destroy();
        device?.destroy();
      } catch (e) {
        // ignore
      }
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
      {useFallback ? (
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
