// -------------------------------------------------------------
// 1. ESTILOS CSS Y LEYENDA TECLADO (Inyectados dinámicamente)
// -------------------------------------------------------------
const style = document.createElement('style');
style.textContent = `
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }
    body {
        background: #090a0f;
        overflow: hidden;
        font-family: 'Orbitron', Arial, sans-serif;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        width: 100vw;
    }
    .game-container {
        position: relative;
        width: 100vw;
        height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
        background: radial-gradient(circle at center, #14192d 0%, #050608 100%);
    }
    .game-container::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-image: 
            linear-gradient(to right, rgba(0, 243, 255, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 243, 255, 0.05) 1px, transparent 1px);
        background-size: 50px 50px;
        pointer-events: none;
    }
    #canvas {
        display: block;
        box-shadow: 0 0 30px rgba(0, 243, 255, 0.2), inset 0 0 15px rgba(0, 243, 255, 0.1);
        border: 1px solid rgba(0, 243, 255, 0.3);
    }
    /* Panel de HUD para los controles de física */
    #hud {
        position: absolute;
        top: 15px;
        left: 15px;
        color: #00f3ff;
        font-size: 12px;
        background: rgba(5, 6, 8, 0.7);
        padding: 10px 15px;
        border: 1px solid rgba(0, 243, 255, 0.3);
        border-radius: 5px;
        pointer-events: none;
        box-shadow: 0 0 10px rgba(0, 243, 255, 0.2);
    }
`;
document.head.appendChild(style);

// Crear panel indicativo HUD
const hud = document.createElement('div');
hud.id = 'hud';
hud.innerHTML = `
    <strong>CONTROLES DE FÍSICA:</strong><br>
    [G] Gravedad: <span id="grav-status">DESACTIVADA</span><br>
    [F] Fricción: <span id="fric-status">DESACTIVADA</span>
`;
document.body.appendChild(hud);

// -------------------------------------------------------------
// 2. CONFIGURACIÓN GLOBAL Y PARÁMETROS FÍSICOS
// -------------------------------------------------------------
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let window_height = window.innerHeight;
let window_width = window.innerWidth;

canvas.height = window_height;
canvas.width = window_width;

// Variables de entorno físico
let enableGravity = false;
let enableFriction = false;
const GRAVITY = 0.2;
const FRICTION = 0.992;
const RESTITUTION = 0.9; // Elasticidad de choque (90% rebote)

window.addEventListener("resize", () => {
    window_height = window.innerHeight;
    window_width = window.innerWidth;
    canvas.height = window_height;
    canvas.width = window_width;
});

// Teclado para conmutar física
window.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "g") {
        enableGravity = !enableGravity;
        document.getElementById("grav-status").textContent = enableGravity ? "ACTIVADA" : "DESACTIVADA";
        document.getElementById("grav-status").style.color = enableGravity ? "#00ff66" : "#00f3ff";
    }
    if (e.key.toLowerCase() === "f") {
        enableFriction = !enableFriction;
        document.getElementById("fric-status").textContent = enableFriction ? "ACTIVADA" : "DESACTIVADA";
        document.getElementById("fric-status").style.color = enableFriction ? "#00ff66" : "#00f3ff";
    }
});

let particles = [];

// -------------------------------------------------------------
// CLASE PARTICLE (Chispas con gravedad propia)
// -------------------------------------------------------------
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.radius = Math.random() * 3 + 1.5;
        
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 6 + 2;
        this.dx = Math.cos(angle) * speed;
        this.dy = Math.sin(angle) * speed;
        
        this.life = 1.0;
        this.decay = Math.random() * 0.03 + 0.02;
    }

    draw(context) {
        context.save();
        context.globalAlpha = this.life;
        context.shadowColor = this.color;
        context.shadowBlur = 10;
        context.fillStyle = this.color;

        context.beginPath();
        context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        context.fill();
        context.restore();
    }

    update(context) {
        if (enableGravity) this.dy += 0.1; // Caída de chispas si hay gravedad
        this.x += this.dx;
        this.y += this.dy;
        this.life -= this.decay;
        this.radius *= 0.96;
        this.draw(context);
    }
}

function createSparks(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, color));
    }
}

// -------------------------------------------------------------
// CLASE CIRCLE (Orbes con Masa e Impulso)
// -------------------------------------------------------------
class Circle {
    constructor(x, y, radius, color, text, speed) {
        this.posX = x;
        this.posY = y;
        this.radius = radius;
        
        // MASA PROPORCIONAL AL ÁREA DEL CÍRCULO (m = π * r²)
        this.mass = Math.PI * this.radius * this.radius;
        
        this.originalColor = color; 
        this.color = color;         
        this.text = text;
        this.speed = speed;
        
        let angle = Math.random() * Math.PI * 2;
        this.dx = Math.cos(angle) * this.speed;
        this.dy = Math.sin(angle) * this.speed;
        
        this.isColliding = false;
    }

    draw(context) {
        context.save();
        const currentColor = this.isColliding ? "#00f3ff" : this.color;

        context.shadowColor = currentColor;
        context.shadowBlur = this.isColliding ? 25 : 12;

        let gradient = context.createRadialGradient(
            this.posX - this.radius * 0.3, 
            this.posY - this.radius * 0.3, 
            this.radius * 0.1, 
            this.posX, 
            this.posY, 
            this.radius
        );
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.3, currentColor);
        gradient.addColorStop(1, '#000000');

        context.beginPath();
        context.arc(this.posX, this.posY, this.radius, 0, Math.PI * 2, false);
        context.fillStyle = gradient;
        context.fill();

        context.lineWidth = this.isColliding ? 3 : 1.5;
        context.strokeStyle = currentColor;
        context.stroke();
        context.closePath();

        context.shadowBlur = 5;
        context.shadowColor = "#ffffff";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.font = "bold 13px 'Orbitron', Arial, sans-serif";
        context.fillStyle = "#ffffff";
        context.fillText(this.text, this.posX, this.posY);

        context.restore();
    }

    update(context) {
        // 1. Aplicar Gravedad
        if (enableGravity) {
            this.dy += GRAVITY;
        }

        // 2. Aplicar Fricción ambiental
        if (enableFriction) {
            this.dx *= FRICTION;
            this.dy *= FRICTION;
        }

        this.posX += this.dx;
        this.posY += this.dy;

        // 3. Rebote en paredes con pérdida elástica de energía
        if (this.posX + this.radius > window_width) {
            this.posX = window_width - this.radius;
            this.dx = -this.dx * RESTITUTION;
            createSparks(window_width, this.posY, this.color, 6);
        } else if (this.posX - this.radius < 0) {
            this.posX = this.radius;
            this.dx = -this.dx * RESTITUTION;
            createSparks(0, this.posY, this.color, 6);
        }

        if (this.posY + this.radius > window_height) {
            this.posY = window_height - this.radius;
            this.dy = -this.dy * RESTITUTION;
            // Reducir la fricción con el piso al rodar
            if (enableGravity) this.dx *= 0.98; 
            createSparks(this.posX, window_height, this.color, 6);
        } else if (this.posY - this.radius < 0) {
            this.posY = this.radius;
            this.dy = -this.dy * RESTITUTION;
            createSparks(this.posX, 0, this.color, 6);
        }

        this.draw(context);
    }

    getDistance(otherCircle) {
        const dx = otherCircle.posX - this.posX;
        const dy = otherCircle.posY - this.posY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    isCollidingWith(otherCircle) {
        const distance = this.getDistance(otherCircle);
        return distance < (this.radius + otherCircle.radius);
    }

    /**
     * Resuelve el choque considerando Masa y Conservación de Momento Lineal
     */
    resolveCollision(otherCircle) {
        if (!this.isCollidingWith(otherCircle)) return;

        this.isColliding = true;
        otherCircle.isColliding = true;

        // Vector normal y distancia
        const dx = otherCircle.posX - this.posX;
        const dy = otherCircle.posY - this.posY;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;

        const nx = dx / distance;
        const ny = dy / distance;

        // Emisión de chispas en el punto de contacto
        const collisionX = this.posX + nx * this.radius;
        const collisionY = this.posY + ny * this.radius;
        createSparks(collisionX, collisionY, "#00f3ff", 12);

        // 1. Separación física ponderada según sus masas
        const overlap = (this.radius + otherCircle.radius) - distance;
        const totalMass = this.mass + otherCircle.mass;

        this.posX -= (overlap * (otherCircle.mass / totalMass)) * nx;
        this.posY -= (overlap * (otherCircle.mass / totalMass)) * ny;
        otherCircle.posX += (overlap * (this.mass / totalMass)) * nx;
        otherCircle.posY += (overlap * (this.mass / totalMass)) * ny;

        // 2. Velocidad relativa en la normal
        const kx = this.dx - otherCircle.dx;
        const ky = this.dy - otherCircle.dy;
        const p = 2 * (nx * kx + ny * ky) / (this.mass + otherCircle.mass);

        // 3. Intercambio de momento elástico
        this.dx -= p * otherCircle.mass * nx;
        this.dy -= p * otherCircle.mass * ny;
        otherCircle.dx += p * this.mass * nx;
        otherCircle.dy += p * this.mass * ny;
    }
}

let circles = [];

const neonColors = [
    "#ff0055", // Rosa Neón
    "#ff9900", // Naranja Eléctrico
    "#00ff66", // Verde Neón
    "#ff00ff", // Magenta
    "#ffff00", // Amarillo Neón
    "#00ffff"  // Cyan
];

function generateCircles(n) {
    circles = [];
    for (let i = 0; i < n; i++) {
        // Variación de tamaños de 15px a 45px para notar la diferencia de masas
        let radius = Math.random() * 30 + 15; 
        let x = Math.random() * (window_width - radius * 4) + radius * 2;
        let y = Math.random() * (window_height - radius * 4) + radius * 2;
        
        let color = neonColors[Math.floor(Math.random() * neonColors.length)];
        let speed = Math.random() * 3 + 1.5;
        let text = `C${i + 1}`;
        
        circles.push(new Circle(x, y, radius, color, text, speed));
    }
}

function animate() {
    ctx.fillStyle = "rgba(9, 10, 15, 0.3)";
    ctx.fillRect(0, 0, window_width, window_height);

    circles.forEach(circle => circle.isColliding = false);

    // Calcular choques físicos entre orbes
    for (let i = 0; i < circles.length; i++) {
        for (let j = i + 1; j < circles.length; j++) {
            circles[i].resolveCollision(circles[j]);
        }
    }

    circles.forEach(circle => {
        circle.update(ctx);
    });

    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update(ctx);
        if (particles[i].life <= 0 || particles[i].radius <= 0.2) {
            particles.splice(i, 1);
        }
    }

    requestAnimationFrame(animate);
}

generateCircles(20);
animate();