// =============================================================
// 1. INYECCIÓN DE ESTILOS CSS NEÓN PARA HTML Y BOTONES G Y F
// =============================================================
const styleElement = document.createElement("style");
styleElement.innerHTML = `
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }
    body {
        overflow: hidden;
        background-color: #05020a;
        font-family: 'Orbitron', sans-serif;
        user-select: none;
    }
    .neon-header {
        position: absolute;
        top: 15px;
        left: 25px;
        z-index: 10;
        pointer-events: none;
    }
    .neon-title {
        color: #ffffff;
        font-size: 24px;
        font-weight: 900;
        letter-spacing: 2px;
        text-shadow: 0 0 10px #ff007f, 0 0 20px #ff007f, 0 0 40px #ff007f;
    }
    .neon-title .highlight {
        color: #00f0ff;
        text-shadow: 0 0 10px #00f0ff, 0 0 20px #00f0ff, 0 0 40px #00f0ff;
    }
    .neon-subtitle {
        color: #e0e0e0;
        font-family: 'Rajdhani', sans-serif;
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 1px;
        text-shadow: 0 0 5px #00f0ff;
        margin-top: 2px;
    }

    /* BOTONES NEÓN G Y F */
    .controls-panel {
        position: absolute;
        bottom: 25px;
        left: 25px;
        z-index: 100;
        display: flex;
        gap: 15px;
    }
    .neon-btn {
        background: rgba(10, 15, 30, 0.85);
        border: 2px solid #00f0ff;
        color: #00f0ff;
        padding: 10px 18px;
        font-family: 'Orbitron', sans-serif;
        font-size: 12px;
        font-weight: 800;
        border-radius: 8px;
        cursor: pointer;
        box-shadow: 0 0 10px #00f0ff;
        transition: all 0.3s ease;
    }
    .neon-btn.active {
        border-color: #ff007f;
        color: #ffffff;
        background: rgba(255, 0, 127, 0.2);
        box-shadow: 0 0 15px #ff007f, inset 0 0 10px #ff007f;
    }
    .neon-btn:hover {
        transform: scale(1.05);
    }

    canvas {
        display: block;
        cursor: pointer;
    }
`;
document.head.appendChild(styleElement);

// =============================================================
// 2. CONFIGURACIÓN DEL CANVAS Y ESTADO GLOBAL
// =============================================================
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const window_width = window.innerWidth;
const window_height = window.innerHeight;
canvas.width = window_width;
canvas.height = window_height;

let score = 0;
const TOTAL_OBJECTS = 25;

let gravityEnabled = true;  // Estado del Botón [G]
let collisionEnabled = true; // Estado del Botón [F]

// RUTAS DE LAS IMÁGENES
const WALLPAPER_PATH = "assets/img/images (3).jpg";

const IMAGE_DATA = [
    { name: "F1: Dog", path: "assets/img/dog (1).png" },
    { name: "F2: DogNeon", path: "assets/img/dog.png" },
    { name: "F3: Globe", path: "assets/img/globe.png" },
    { name: "F4: Headset", path: "assets/img/headset.png" },
    { name: "F5: Bolt", path: "assets/img/neon.png" },
    { name: "F6: Camera", path: "assets/img/neon-camera.png" },
    { name: "F7: Pad1", path: "assets/img/neon-controller (1).png" },
    { name: "F8: Pad2", path: "assets/img/neon-controller.png" },
    { name: "F9: Burger", path: "assets/img/neon-hamburger.png" },
    { name: "F10: Bulb", path: "assets/img/neon-light-bulb.png" }
];

const bgImage = new Image();
bgImage.src = WALLPAPER_PATH;

const loadedImages = IMAGE_DATA.map(item => {
    const img = new Image();
    img.src = item.path;
    return { name: item.name, img: img };
});

// =============================================================
// 3. CLASE PARTÍCULA (SISTEMA DE EXPLOSIÓN NEÓN)
// =============================================================
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = Math.random() * 3 + 2;
        
        // Paleta de colores neón para la explosión
        const colors = ["#ff007f", "#00f0ff", "#ffbb00", "#00ff88", "#ffffff"];
        this.color = colors[Math.floor(Math.random() * colors.length)];
        
        // Dirección y velocidad de explosión
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 6 + 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        
        this.alpha = 1; // Transparencia para desvanecimiento
        this.friction = 0.95; // Rozamiento
        this.gravity = 0.1;   // Caída suave de la partícula
    }

    draw(context) {
        context.save();
        context.globalAlpha = this.alpha;
        context.shadowColor = this.color;
        context.shadowBlur = 10;
        context.fillStyle = this.color;
        context.beginPath();
        context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        context.fill();
        context.restore();
    }

    update(context) {
        this.draw(context);
        this.vx *= this.friction;
        this.vy *= this.friction;
        this.vy += this.gravity;
        
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= 0.02; // Desvanecimiento gradual
    }
}

let particles = [];

function createExplosion(x, y) {
    for (let i = 0; i < 16; i++) {
        particles.push(new Particle(x, y));
    }
}

function handleParticles(context) {
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update(context);
        if (particles[i].alpha <= 0) {
            particles.splice(i, 1);
        }
    }
}

// =============================================================
// 4. CLASE POO: FALLING OBJECT (OBJETOS CAYENDO)
// =============================================================
class FallingObject {
    constructor(id) {
        this.id = id;
        this.size = Math.random() * 20 + 55;
        this.radius = this.size / 2;
        this.resetToTop(true);
    }

    resetToTop(isFirstSpawn = false) {
        this.posX = Math.random() * (window_width - this.size * 2) + this.size;
        
        if (isFirstSpawn) {
            this.posY = -this.size - (Math.random() * window_height * 0.8);
        } else {
            this.posY = -this.size - (Math.random() * 120);
        }

        const item = loadedImages[Math.floor(Math.random() * loadedImages.length)];
        this.image = item.img;
        this.functionName = item.name;

        let speedMultiplier = 1;
        if (score > 20) {
            speedMultiplier = 2.4;
        } else if (score > 10) {
            speedMultiplier = 1.7;
        }

        this.vx = (Math.random() - 0.5) * 4 * speedMultiplier;
        this.vy = (Math.random() * 2.5 + 1.5) * speedMultiplier;
        
        this.g = 0.35 * speedMultiplier;
        this.bounceFactor = 0.65;
        this.friction = 0.98;
    }

    draw(context) {
        context.save();

        context.shadowColor = "#00f0ff";
        context.shadowBlur = 15;

        if (this.image && this.image.complete && this.image.naturalWidth !== 0) {
            context.drawImage(
                this.image,
                this.posX - this.radius,
                this.posY - this.radius,
                this.size,
                this.size
            );
        } else {
            context.fillStyle = "#00f0ff";
            context.beginPath();
            context.arc(this.posX, this.posY, this.radius, 0, Math.PI * 2);
            context.fill();
        }

        context.shadowColor = "#ff007f";
        context.shadowBlur = 8;
        context.fillStyle = "#ffffff";
        context.font = "bold 11px Orbitron, sans-serif";
        context.textAlign = "center";
        context.textBaseline = "bottom";
        context.fillText(this.functionName, this.posX, this.posY - this.radius - 4);

        context.restore();
    }

    update(context) {
        this.draw(context);

        if (gravityEnabled) {
            this.vy += this.g;
        }

        this.posX += this.vx;
        this.posY += this.vy;

        this.vx *= this.friction;

        // Paredes laterales
        if (this.posX + this.radius > window_width) {
            this.posX = window_width - this.radius;
            this.vx = -this.vx * this.bounceFactor;
        } else if (this.posX - this.radius < 0) {
            this.posX = this.radius;
            this.vx = -this.vx * this.bounceFactor;
        }

        // Rebote en el suelo / techo
        if (this.posY + this.radius >= window_height) {
            this.posY = window_height - this.radius;
            this.vy = -this.vy * this.bounceFactor;

            if (Math.abs(this.vy) < 1.2 && gravityEnabled) {
                this.resetToTop();
            }
        } else if (this.posY - this.radius < 0 && !gravityEnabled) {
            this.posY = this.radius;
            this.vy = -this.vy * this.bounceFactor;
        }
    }

    getDistance(otherObject) {
        let xDistance = otherObject.posX - this.posX;
        let yDistance = otherObject.posY - this.posY;
        return Math.sqrt(xDistance * xDistance + yDistance * yDistance);
    }

    isPointInside(mouseX, mouseY) {
        let xDistance = mouseX - this.posX;
        let yDistance = mouseY - this.posY;
        return Math.sqrt(xDistance * xDistance + yDistance * yDistance) <= this.radius;
    }
}

// =============================================================
// 5. DETECCIÓN DE COLISIONES ENTRE OBJETOS (BOTÓN [F])
// =============================================================
function handleObjectCollisions() {
    if (!collisionEnabled) return;

    for (let i = 0; i < objects.length; i++) {
        for (let j = i + 1; j < objects.length; j++) {
            let obj1 = objects[i];
            let obj2 = objects[j];

            let distance = obj1.getDistance(obj2);

            if (distance <= obj1.radius + obj2.radius) {
                let tempVx = obj1.vx;
                let tempVy = obj1.vy;
                
                obj1.vx = obj2.vx;
                obj1.vy = obj2.vy;
                
                obj2.vx = tempVx;
                obj2.vy = tempVy;

                let overlap = (obj1.radius + obj2.radius) - distance;
                let dx = (obj2.posX - obj1.posX) / (distance || 1);
                let dy = (obj2.posY - obj1.posY) / (distance || 1);

                obj1.posX -= dx * (overlap / 2);
                obj1.posY -= dy * (overlap / 2);
                obj2.posX += dx * (overlap / 2);
                obj2.posY += dy * (overlap / 2);
            }
        }
    }
}

// =============================================================
// 6. RENDERING Y ANIMACIÓN
// =============================================================
let objects = [];

function generateObjects() {
    objects = [];
    for (let i = 0; i < TOTAL_OBJECTS; i++) {
        objects.push(new FallingObject(i + 1));
    }
}

function drawBackgroundAndUI() {
    if (bgImage.complete && bgImage.naturalWidth !== 0) {
        ctx.drawImage(bgImage, 0, 0, window_width, window_height);
    } else {
        ctx.fillStyle = "#0d0221";
        ctx.fillRect(0, 0, window_width, window_height);
    }

    ctx.fillStyle = "rgba(10, 5, 25, 0.2)";
    ctx.fillRect(0, 0, window_width, window_height);

    // MARCADOR ESQUINA SUPERIOR DERECHA
    ctx.save();
    ctx.fillStyle = "rgba(10, 15, 30, 0.85)";
    ctx.strokeStyle = "#ff007f";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#ff007f";
    ctx.shadowBlur = 10;
    ctx.fillRect(window_width - 250, 20, 230, 85);
    ctx.strokeRect(window_width - 250, 20, 230, 85);

    ctx.shadowColor = "transparent";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 15px Orbitron, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`ELIMINADOS: ${score}`, window_width - 235, 48);

    let speedText = "Velocidad: Inicial";
    let speedColor = "#00ff88";

    if (score > 20) {
        speedText = "Velocidad: Alta !!!";
        speedColor = "#ff2255";
    } else if (score > 10) {
        speedText = "Velocidad: Media !";
        speedColor = "#ffbb00";
    }

    ctx.fillStyle = speedColor;
    ctx.font = "bold 12px Orbitron, sans-serif";
    ctx.fillText(speedText, window_width - 235, 75);
    ctx.restore();
}

function animate() {
    drawBackgroundAndUI();

    handleObjectCollisions();

    objects.forEach(obj => {
        obj.update(ctx);
    });

    // Renderizar y actualizar partículas
    handleParticles(ctx);

    requestAnimationFrame(animate);
}

// =============================================================
// 7. EVENTOS E INTERACTIVIDAD
// =============================================================
const btnG = document.getElementById("btnG");
const btnF = document.getElementById("btnF");

btnG.addEventListener("click", toggleGravity);
btnF.addEventListener("click", toggleCollision);

function toggleGravity() {
    gravityEnabled = !gravityEnabled;
    btnG.classList.toggle("active", gravityEnabled);
    btnG.innerText = `BOTÓN [G]: GRAVEDAD ${gravityEnabled ? "ON" : "OFF"}`;
}

function toggleCollision() {
    collisionEnabled = !collisionEnabled;
    btnF.classList.toggle("active", collisionEnabled);
    btnF.innerText = `BOTÓN [F]: COLISIÓN ${collisionEnabled ? "ON" : "OFF"}`;
}

window.addEventListener("keydown", function(event) {
    if (event.key === "g" || event.key === "G") {
        toggleGravity();
    } else if (event.key === "f" || event.key === "F") {
        toggleCollision();
    }
});

// CLIC EN EL CANVAS PARA ELIMINAR Y GENERAR EXPLOSIÓN DE PARTÍCULAS
canvas.addEventListener("click", function (event) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    for (let i = objects.length - 1; i >= 0; i--) {
        if (objects[i].isPointInside(mouseX, mouseY)) {
            score++;
            
            // Generar partículas en las coordenadas del clic
            createExplosion(objects[i].posX, objects[i].posY);
            
            // Reaparecer arriba
            objects[i].resetToTop();
            break;
        }
    }
});

generateObjects();
animate();