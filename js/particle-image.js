(function() {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    return;
  }

  /**
   * @typedef {Object} Particle
   * @property {number} x - Current x position
   * @property {number} y - Current y position
   * @property {number} originX - Original x position
   * @property {number} originY - Original y position
   * @property {number} vx - Velocity x
   * @property {number} vy - Velocity y
   * @property {string} color - Particle color (rgba)
   * @property {number} size - Particle size
   */

  class ParticleImage {
    /**
     * @param {HTMLImageElement} img
     * @param {Object} options
     */
    constructor(img, options = {}) {
      this.img = img;
      this.canvas = null;
      this.ctx = null;
      this.particles = [];
      this.mouse = { x: null, y: null, radius: options.mouseRadius || 80 };
      this.animationFrame = null;
      this.clickPoint = { x: null, y: null, startTime: 0, active: false };
      this.isColorized = false;
      this.autoTimer = 1000;
      this.loadTime = performance.now(); // Track when particles were created

      this.options = {
        particleGap: options.particleGap || 2,
        particleSize: options.particleSize || 3,
        returnSpeed: options.returnSpeed || 0.08,
        mouseForce: options.mouseForce || 0.3,
        flowSpeed: options.flowSpeed || 0.032,
        flowAmplitude: options.flowAmplitude || 8,
        damping: options.damping || 0.38,
        circular: options.circular !== false, // default true
        circularPadding: options.circularPadding || 10,
        ...options
      };

      this.time = 0;

      this.init();
    }

    init() {
      // Create canvas
      this.canvas = document.createElement('canvas');
      this.canvas.className = 'particle-canvas';
      this.ctx = this.canvas.getContext('2d');

      // Wait for image to load
      if (this.img.complete) {
        this.setup();
      } else {
        this.img.addEventListener('load', () => this.setup());
      }
    }

    setup() {
      // Set canvas internal resolution to match image
      this.canvas.width = this.img.naturalWidth;
      this.canvas.height = this.img.naturalHeight;

      // Insert canvas after image
      this.img.parentNode.insertBefore(this.canvas, this.img.nextSibling);

      // Hide original image (CSS will handle this with .js-enabled)
      this.img.classList.add('particle-image-source');

      // Create particles from image
      this.createParticles();

      // Add mouse event listeners
      this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
      this.canvas.addEventListener('mouseleave', () => this.handleMouseLeave());
      this.canvas.addEventListener('click', (e) => this.handleClick(e));

      // Start animation
      this.animate();
    }

    createParticles() {
      // Draw image to canvas to get pixel data
      this.ctx.drawImage(this.img, 0, 0);
      const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      const gap = this.options.particleGap;
      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;
      const radius = Math.min(centerX, centerY) - this.options.circularPadding;

      for (let y = 0; y < this.canvas.height; y += gap) {
        for (let x = 0; x < this.canvas.width; x += gap) {
          const index = (y * this.canvas.width + x) * 4;
          const r = imageData.data[index];
          const g = imageData.data[index + 1];
          const b = imageData.data[index + 2];
          const alpha = imageData.data[index + 3];

          // Check if particle is within circular bounds (if circular option is enabled)
          if (this.options.circular) {
            const dx = x - centerX;
            const dy = y - centerY;
            const distanceSq = dx * dx + dy * dy;
            if (distanceSq > radius * radius) {
              continue; // Skip particles outside the circle
            }
          }

          // Only create particle if pixel is not transparent
          if (alpha > 128) {
            // Calculate grayscale value
            const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

            this.particles.push({
              x: x,
              y: y,
              originX: x,
              originY: y,
              vx: 0,
              vy: 0,
              color: [r, g, b, alpha / 255],
              grayColor: [gray, gray, gray, alpha / 255],
              size: this.options.particleSize,
              offset: Math.random() * Math.PI * 2,
              illuminated: 0
            });
          }
        }
      }
    }

    handleMouseMove(e) {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;

      this.mouse.x = (e.clientX - rect.left) * scaleX;
      this.mouse.y = (e.clientY - rect.top) * scaleY;
    }

    handleMouseLeave() {
      this.mouse.x = null;
      this.mouse.y = null;
    }

    handleClick(e) {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;

      this.clickPoint.x = (e.clientX - rect.left) * scaleX;
      this.clickPoint.y = (e.clientY - rect.top) * scaleY;
      this.clickPoint.startTime = performance.now();
      this.clickPoint.active = true;

      // Toggle colorization state
      this.isColorized = !this.isColorized;
    }

    animate() {
      this.time += this.options.flowSpeed;

      // Auto-timer: trigger colorize wave after 5 seconds
      const elapsed = performance.now() - this.loadTime;
      if (elapsed >= this.autoTimer && !this.isColorized && !this.clickPoint.active) {
        // Trigger automatic colorize wave from center
        this.clickPoint.x = this.canvas.width / 2;
        this.clickPoint.y = this.canvas.height / 2;
        this.clickPoint.startTime = performance.now();
        this.clickPoint.active = true;
        this.isColorized = true;
        this.autoTimer = Infinity; // Disable auto-timer after first trigger
      }

      // Create ImageData buffer for batch drawing
      const imageData = this.ctx.createImageData(this.canvas.width, this.canvas.height);
      const data = imageData.data;

      this.particles.forEach(particle => {
        // Mouse interaction (disabled when colorized or during wave)
        const mouseActive = this.mouse.x !== null && this.mouse.y !== null && !this.isColorized && !this.clickPoint.active;
        let distanceFromMouse = Infinity;
        let distanceFromMouseSq = Infinity;
        let nearMouse = false;

        if (mouseActive) {
          const dx = this.mouse.x - particle.x;
          const dy = this.mouse.y - particle.y;
          distanceFromMouseSq = dx * dx + dy * dy;
          nearMouse = distanceFromMouseSq < this.mouse.radius * this.mouse.radius;

          if (nearMouse) {
            distanceFromMouse = Math.sqrt(distanceFromMouseSq);
            const force = (this.mouse.radius - distanceFromMouse) / this.mouse.radius;
            const angle = Math.atan2(dy, dx);
            const easedForce = force * force;

            particle.vx -= Math.cos(angle) * easedForce * this.options.mouseForce;
            particle.vy -= Math.sin(angle) * easedForce * this.options.mouseForce;
            particle.illuminated = Math.max(particle.illuminated, force);
          }
        }

        // Click wave effect
        let effectiveReturnSpeed = this.options.returnSpeed;
        let effectiveFlowAmplitude = this.options.flowAmplitude;

        if (this.clickPoint.active) {
          const elapsed = performance.now() - this.clickPoint.startTime;
          const waveRadius = (elapsed / 1000) * 150;
          const dx = this.clickPoint.x - particle.x;
          const dy = this.clickPoint.y - particle.y;
          const distanceFromClickSq = dx * dx + dy * dy;
          const waveRadiusSq = waveRadius * waveRadius;

          if (distanceFromClickSq < waveRadiusSq) {
            const distanceFromClick = Math.sqrt(distanceFromClickSq);
            const progress = Math.min(1, (waveRadius - distanceFromClick) / 80);

            // Apply color and sharpness changes
            if (this.isColorized) {
              particle.illuminated = Math.max(particle.illuminated, progress);
              effectiveReturnSpeed *= (1 + progress * 5);
              effectiveFlowAmplitude *= (1 - progress * 0.95);
            } else {
              particle.illuminated = Math.min(particle.illuminated, 1 - progress);
              effectiveReturnSpeed = this.options.returnSpeed;
              effectiveFlowAmplitude = this.options.flowAmplitude;
            }
          }

          // Check if wave completed
          const maxDistanceSq = this.canvas.width * this.canvas.width + this.canvas.height * this.canvas.height;
          if ((waveRadius + 100) * (waveRadius + 100) > maxDistanceSq) {
            this.clickPoint.active = false;
          }
        } else {
          // Post-wave behavior
          if (this.isColorized) {
            particle.illuminated = Math.min(1, particle.illuminated + 0.05);
            effectiveReturnSpeed *= 5;
            effectiveFlowAmplitude *= 0.05;
          } else {
            particle.illuminated *= 0.92;
          }
        }

        // Mouse proximity sharpening (only when not colorized)
        if (mouseActive) {
          const transitionRadius = this.mouse.radius * 1.8; // Extended radius for smooth transition
          const transitionRadiusSq = transitionRadius * transitionRadius;

          if (!nearMouse && distanceFromMouseSq < transitionRadiusSq) {
            // Transition zone - smooth gradient from normal to sharpened
            if (distanceFromMouse === Infinity) {
              distanceFromMouse = Math.sqrt(distanceFromMouseSq);
            }
            const transitionFactor = (distanceFromMouse - this.mouse.radius) / (transitionRadius - this.mouse.radius);
            const sharpenStrength = transitionFactor; // 0 at mouse.radius, 1 at transitionRadius

            effectiveReturnSpeed = this.options.returnSpeed * (1 + sharpenStrength * 1.5);
            effectiveFlowAmplitude = this.options.flowAmplitude * (1 - sharpenStrength * 0.8);
          } else if (!nearMouse) {
            // Far from mouse - gentle sharpening with movement
            effectiveReturnSpeed *= 1.5;
            effectiveFlowAmplitude *= 0.3;
          }
        }

        // Organic flow movement using sine waves - applied as direct position offset
        const flowX = Math.sin(this.time + particle.offset) * effectiveFlowAmplitude;
        const flowY = Math.cos(this.time * 0.8 + particle.offset) * effectiveFlowAmplitude;

        // Calculate target position with organic flow
        const targetX = particle.originX + flowX;
        const targetY = particle.originY + flowY;

        // Move towards target position
        particle.vx += (targetX - particle.x) * effectiveReturnSpeed;
        particle.vy += (targetY - particle.y) * effectiveReturnSpeed;

        // Apply velocity with damping (smoother)
        particle.vx *= this.options.damping;
        particle.vy *= this.options.damping;

        particle.x += particle.vx;
        particle.y += particle.vy;

        // Calculate final color values
        let r, g, b, a;
        if (particle.illuminated > 0.01) {
          const gray = particle.grayColor;
          const color = particle.color;
          const factor = particle.illuminated;
          r = Math.round(gray[0] + (color[0] - gray[0]) * factor);
          g = Math.round(gray[1] + (color[1] - gray[1]) * factor);
          b = Math.round(gray[2] + (color[2] - gray[2]) * factor);
          a = Math.round((gray[3] + (color[3] - gray[3]) * factor) * 255);
        } else {
          const gray = particle.grayColor;
          r = gray[0];
          g = gray[1];
          b = gray[2];
          a = Math.round(gray[3] * 255);
        }

        // Draw particle to ImageData buffer (as small square for performance)
        const px = Math.round(particle.x);
        const py = Math.round(particle.y);
        const size = Math.round(particle.size);

        // Draw a filled square instead of circle for performance
        for (let dy = 0; dy < size; dy++) {
          for (let dx = 0; dx < size; dx++) {
            const drawX = px + dx - Math.floor(size / 2);
            const drawY = py + dy - Math.floor(size / 2);

            // Bounds check
            if (drawX >= 0 && drawX < this.canvas.width && drawY >= 0 && drawY < this.canvas.height) {
              const index = (drawY * this.canvas.width + drawX) * 4;
              data[index] = r;
              data[index + 1] = g;
              data[index + 2] = b;
              data[index + 3] = a;
            }
          }
        }
      });

      // Draw the entire frame at once
      this.ctx.putImageData(imageData, 0, 0);

      this.animationFrame = requestAnimationFrame(() => this.animate());
    }

    destroy() {
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
      }
      if (this.canvas && this.canvas.parentNode) {
        this.canvas.parentNode.removeChild(this.canvas);
      }
      this.img.classList.remove('particle-image-source');
    }
  }

  // Auto-initialize on images with class 'particle-image'
  function initParticleImages() {
    const images = document.querySelectorAll('img.particle-image');
    images.forEach(img => {
      new ParticleImage(img);
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initParticleImages);
  } else {
    initParticleImages();
  }
})();