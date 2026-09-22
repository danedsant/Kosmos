const canvas = document.getElementById('cosmosCanvas');
const ctx = canvas.getContext('2d', { alpha: false });

let stars = [];
const numStars = 100;
let bgGradient;

const starCanvas = document.createElement('canvas');
const starCtx = starCanvas.getContext('2d');
starCanvas.width = 10;
starCanvas.height = 10;

const half = starCanvas.width / 2;
const gradient = starCtx.createRadialGradient(half, half, 0, half, half, half);
gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

starCtx.fillStyle = gradient;
starCtx.fillRect(0, 0, starCanvas.width, starCanvas.height);

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    bgGradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height, 0,
        canvas.width / 2, canvas.height, canvas.height * 1.2
    );
    bgGradient.addColorStop(0, '#1b2735');
    bgGradient.addColorStop(1, '#090a0f');
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Star {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 3 + 1;
        this.speedY = (Math.random() * 0.3) + 0.1;
        this.opacity = Math.random();
        this.fadeDir = Math.random() > 0.5 ? 1 : -1;
    }

    update() {
        this.y -= this.speedY;

        this.opacity += 0.005 * this.fadeDir;
        if (this.opacity <= 0.1) {
            this.fadeDir = 1;
        } else if (this.opacity >= 1) {
            this.fadeDir = -1;
        }

        if (this.y < -10) {
            this.y = canvas.height + 10;
            this.x = Math.random() * canvas.width;
        }
    }

    draw() {
        ctx.globalAlpha = this.opacity;
        ctx.drawImage(starCanvas, this.x, this.y, this.size, this.size);
    }
}

function initStars() {
    stars = [];
    for (let i = 0; i < numStars; i++) {
        stars.push(new Star());
    }
}

function animate() {
    ctx.globalAlpha = 1;
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < stars.length; i++) {
        stars[i].update();
        stars[i].draw();
    }

    requestAnimationFrame(animate);
}

initStars();
animate();
