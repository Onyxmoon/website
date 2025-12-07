(function() {
  'use strict';

  // Check for reduced motion preference
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
      this.mouse = { x: null, y: null, radius: options.mouseRadius || 100 };
      this.animationFrame = null;

      this.options = {
        particleGap: options.particleGap || 2,
        particleSize: options.particleSize || 3,
        returnSpeed: options.returnSpeed || 0.08,
        mouseForce: options.mouseForce || 0.3,
        flowSpeed: options.flowSpeed || 0.032,
        flowAmplitude: options.flowAmplitude || 12,
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
      // Set canvas size to match image
      const rect = this.img.getBoundingClientRect();
      this.canvas.width = this.img.naturalWidth;
      this.canvas.height = this.img.naturalHeight;
      this.canvas.style.width = rect.width + 'px';
      this.canvas.style.height = rect.height + 'px';

      // Insert canvas after image
      this.img.parentNode.insertBefore(this.canvas, this.img.nextSibling);

      // Hide original image (CSS will handle this with .js-enabled)
      this.img.classList.add('particle-image-source');

      // Create particles from image
      this.createParticles();

      // Add mouse event listeners
      this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
      this.canvas.addEventListener('mouseleave', () => this.handleMouseLeave());

      // Start animation
      this.animate();

      // Handle window resize
      window.addEventListener('resize', () => this.handleResize());
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
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > radius) {
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
              color: `rgba(${r}, ${g}, ${b}, ${alpha / 255})`,
              grayColor: `rgba(${gray}, ${gray}, ${gray}, ${alpha / 255})`,
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

    handleResize() {
      const rect = this.img.getBoundingClientRect();
      this.canvas.style.width = rect.width + 'px';
      this.canvas.style.height = rect.height + 'px';
    }

    interpolateColor(color1, color2, factor) {
      // Extract rgba values from color strings
      const rgba1 = color1.match(/[\d.]+/g).map(Number);
      const rgba2 = color2.match(/[\d.]+/g).map(Number);

      const r = Math.round(rgba1[0] + (rgba2[0] - rgba1[0]) * factor);
      const g = Math.round(rgba1[1] + (rgba2[1] - rgba1[1]) * factor);
      const b = Math.round(rgba1[2] + (rgba2[2] - rgba1[2]) * factor);
      const a = rgba1[3] + (rgba2[3] - rgba1[3]) * factor;

      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }

    animate() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.time += this.options.flowSpeed;

      this.particles.forEach(particle => {
        // Calculate distance from mouse
        const mouseActive = this.mouse.x !== null && this.mouse.y !== null;
        let distanceFromMouse = Infinity;
        let nearMouse = false;

        if (mouseActive) {
          const dx = this.mouse.x - particle.x;
          const dy = this.mouse.y - particle.y;
          distanceFromMouse = Math.sqrt(dx * dx + dy * dy);
          nearMouse = distanceFromMouse < this.mouse.radius;

          if (nearMouse) {
            const force = (this.mouse.radius - distanceFromMouse) / this.mouse.radius;
            const angle = Math.atan2(dy, dx);

            // Softer wave-like repulsion with easing
            const easedForce = force * force; // Square for softer falloff
            particle.vx -= Math.cos(angle) * easedForce * this.options.mouseForce;
            particle.vy -= Math.sin(angle) * easedForce * this.options.mouseForce;

            // Illuminate particle based on proximity to mouse
            particle.illuminated = Math.max(particle.illuminated, force);
          }
        }

        // Fade out illumination over time
        particle.illuminated *= 0.92;

        // Adjust behavior based on mouse proximity
        // When mouse is active but particle is far from it, sharpen the image
        let effectiveReturnSpeed = this.options.returnSpeed;
        let effectiveFlowAmplitude = this.options.flowAmplitude;

        if (mouseActive) {
          const transitionRadius = this.mouse.radius * 1.8; // Extended radius for smooth transition

          if (!nearMouse && distanceFromMouse < transitionRadius) {
            // Transition zone - smooth gradient from normal to sharpened
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

        // Interpolate between gray and color based on illumination
        const currentColor = particle.illuminated > 0.01
          ? this.interpolateColor(particle.grayColor, particle.color, particle.illuminated)
          : particle.grayColor;

        // Draw particle as circle
        this.ctx.fillStyle = currentColor;
        this.ctx.beginPath();
        this.ctx.arc(
          particle.x,
          particle.y,
          particle.size / 2,
          0,
          Math.PI * 2
        );
        this.ctx.fill();
      });

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