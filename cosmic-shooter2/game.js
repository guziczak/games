// Enhanced game variables
let player, projectiles, enemies, meteors, particles, powerups, stars;
let score = 0;
let level = 1;
let health = 100;
let shield = 0;
let gameActive = false;
let isPaused = false;

// Powerup types and durations
const POWERUP_TYPES = {
    SHIELD: { color: '#48f', symbol: 'S', duration: 10000 },
    TRIPLE_SHOT: { color: '#f84', symbol: 'T', duration: 8000 },
    SPEED: { color: '#4f8', symbol: 'B', duration: 6000 }
};

// Active powerups
let activePowerups = {
    shield: 0,
    tripleShot: 0,
    speed: 0
};

// Player spaceship with enhanced features
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 50;
        this.thrust = 0;
        this.rotation = 0;
        this.speed = 5;
        this.shootCooldown = 0;
        this.color = '#4AF';
        this.engineLight = 0;
        this.thrustParticleTimer = 0;
    }
    
    // MODIFIED METHOD: Removed thrust effect completely
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        // Only a simple triangle with no thrust effects
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(0, -this.height/2);
        ctx.lineTo(-this.width/2, this.height/2);
        ctx.lineTo(this.width/2, this.height/2);
        ctx.closePath();
        ctx.fill();
        
        // Shield is still needed for powerup display
        if (shield > 0) {
            ctx.strokeStyle = `rgba(100, 150, 255, ${0.5 + Math.sin(Date.now() * 0.005) * 0.5})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, this.width, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    // MODIFIED METHOD: Removed thrust particles
    update() {
        // Update cooldown
        if (this.shootCooldown > 0) this.shootCooldown--;
        
        // Completely disabled thrust particles
    }
    
    createThrustParticles() {
        const angle = this.rotation + Math.PI;
        const x = this.x + Math.cos(angle) * this.height/2;
        const y = this.y + Math.sin(angle) * this.height/2;
        
        for (let i = 0; i < 3; i++) {
            const spreadAngle = angle + (Math.random() - 0.5) * 1.0;
            const speed = 1 + Math.random() * 2;
            particles.push(new Particle(
                x,
                y,
                Math.cos(spreadAngle) * speed,
                Math.sin(spreadAngle) * speed,
                Math.random() * 5 + 2,
                `hsl(${30 + Math.random() * 30}, 100%, ${70 + Math.random() * 30}%)`,
                20
            ));
        }
    }
    
    shoot() {
        if (this.shootCooldown <= 0) {
            // Determine ship's forward direction
            const forwardX = Math.sin(this.rotation);
            const forwardY = -Math.cos(this.rotation);
            
            // Triple shot if powerup is active
            if (activePowerups.tripleShot > 0) {
                // Center shot
                projectiles.push(new Projectile(
                    this.x + forwardX * this.height/2,
                    this.y + forwardY * this.height/2,
                    this.rotation
                ));
                
                // Side shots (spread angle)
                projectiles.push(new Projectile(
                    this.x + forwardX * this.height/2,
                    this.y + forwardY * this.height/2,
                    this.rotation - 0.2
                ));
                projectiles.push(new Projectile(
                    this.x + forwardX * this.height/2,
                    this.y + forwardY * this.height/2,
                    this.rotation + 0.2
                ));
                
                playSound('laser', { volume: 0.4, rate: 1.2, pan: 0 });
            } else {
                // Single shot
                projectiles.push(new Projectile(
                    this.x + forwardX * this.height/2,
                    this.y + forwardY * this.height/2,
                    this.rotation
                ));
                playSound('laser', { volume: 0.3, rate: 1.0, pan: 0 });
            }
            
            // Apply cooldown (faster if speed powerup is active)
            this.shootCooldown = activePowerups.speed > 0 ? 8 : 15;
        }
    }
    
    move(keys) {
        // Movement speed (boosted if speed powerup is active)
        const moveSpeed = activePowerups.speed > 0 ? this.speed * 1.5 : this.speed;
        
        // Reset thrust
        this.thrust = 0;
        
        // Keyboard controls always active on all devices
        if (keys.ArrowUp || keys.w) {
            this.thrust = 1;
            // Move forward in the direction of rotation
            this.x += Math.sin(this.rotation) * moveSpeed;
            this.y -= Math.cos(this.rotation) * moveSpeed;
        }
        if (keys.ArrowDown || keys.s) {
            this.thrust = 0.5;
            // Move backward
            this.x -= Math.sin(this.rotation) * moveSpeed * 0.5;
            this.y += Math.cos(this.rotation) * moveSpeed * 0.5;
        }
        if (keys.ArrowLeft || keys.a) {
            this.rotation -= 0.05;
        }
        if (keys.ArrowRight || keys.d) {
            this.rotation += 0.05;
        }
        
        // Keep player on screen
        this.x = Math.max(this.width/2, Math.min(this.x, canvas.width - this.width/2));
        this.y = Math.max(this.height/2, Math.min(this.y, canvas.height - this.height/2));
    }
}

// Enhanced projectile with particle trail
class Projectile {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = 12;
        this.radius = 3;
        this.color = '#FF0';
        this.particleTimer = 0;
        this.life = 100; // Max distance before disappearing
    }
    
    draw() {
        ctx.save();
        
        // Add glow effect
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * 3);
        gradient.addColorStop(0, '#FFF');
        gradient.addColorStop(0.3, this.color);
        gradient.addColorStop(1, 'rgba(255, 255, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw the projectile core
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    update() {
        // Move based on angle
        this.x += Math.sin(this.angle) * this.speed;
        this.y -= Math.cos(this.angle) * this.speed;
        
        // Create particle trail
        this.particleTimer--;
        if (this.particleTimer <= 0) {
            particles.push(new Particle(
                this.x, 
                this.y, 
                (Math.random() - 0.5) * 0.5, 
                (Math.random() - 0.5) * 0.5, 
                Math.random() * 2 + 1, 
                `rgba(255, 255, ${Math.random() * 100 + 155}, ${Math.random() * 0.5 + 0.5})`,
                10
            ));
            this.particleTimer = 2;
        }
        
        // Reduce life (for range limit)
        this.life--;
    }
    
    isOffScreen() {
        return this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height || this.life <= 0;
    }
}

// Enemy ships with varied behaviors
class Enemy {
    constructor(type) {
        this.type = type || Math.floor(Math.random() * 3);
        
        // Position the enemy outside the visible area
        if (Math.random() < 0.5) {
            // Top or bottom
            this.x = Math.random() * canvas.width;
            this.y = Math.random() < 0.5 ? -50 : canvas.height + 50;
        } else {
            // Left or right
            this.x = Math.random() < 0.5 ? -50 : canvas.width + 50;
            this.y = Math.random() * canvas.height;
        }
        
        // Different properties based on enemy type
        switch(this.type) {
            case 0: // Basic enemy
                this.width = 30;
                this.height = 30;
                this.speed = 2 + level * 0.2;
                this.health = 1;
                this.color = '#F44';
                this.scoreValue = 10;
                break;
            case 1: // Fast enemy
                this.width = 25;
                this.height = 35;
                this.speed = 3 + level * 0.3;
                this.health = 1;
                this.color = '#F84';
                this.scoreValue = 15;
                break;
            case 2: // Tough enemy
                this.width = 40;
                this.height = 40;
                this.speed = 1.5 + level * 0.15;
                this.health = 2;
                this.color = '#A44';
                this.scoreValue = 20;
                break;
        }
        
        this.angle = 0;
        this.targetAngle = 0;
        this.shootTimer = Math.random() * 300;
        this.shootCooldown = 120;
    }
    
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle + Math.PI/2);
        
        // Draw the enemy based on its type
        switch(this.type) {
            case 0:
                // Basic triangular enemy
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.moveTo(0, -this.height/2);
                ctx.lineTo(-this.width/2, this.height/2);
                ctx.lineTo(this.width/2, this.height/2);
                ctx.closePath();
                ctx.fill();
                
                // Engine
                ctx.fillStyle = 'rgba(255, 200, 0, 0.7)';
                ctx.beginPath();
                ctx.moveTo(-this.width/4, this.height/2);
                ctx.lineTo(0, this.height/2 + 10);
                ctx.lineTo(this.width/4, this.height/2);
                ctx.closePath();
                ctx.fill();
                break;
                
            case 1:
                // Fast dart-shaped enemy
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.moveTo(0, -this.height/2);
                ctx.lineTo(-this.width/2, this.height/3);
                ctx.lineTo(0, this.height/2);
                ctx.lineTo(this.width/2, this.height/3);
                ctx.closePath();
                ctx.fill();
                
                // Engine
                ctx.fillStyle = 'rgba(255, 130, 50, 0.7)';
                ctx.beginPath();
                ctx.moveTo(-this.width/4, this.height/2);
                ctx.lineTo(0, this.height/2 + 15);
                ctx.lineTo(this.width/4, this.height/2);
                ctx.closePath();
                ctx.fill();
                break;
                
            case 2:
                // Tough hexagonal enemy
                ctx.fillStyle = this.color;
                ctx.beginPath();
                const sides = 6;
                const size = this.width / 2;
                ctx.moveTo(size * Math.cos(0), size * Math.sin(0));
                for (let i = 1; i <= sides; i++) {
                    const angle = i * 2 * Math.PI / sides;
                    ctx.lineTo(size * Math.cos(angle), size * Math.sin(angle));
                }
                ctx.closePath();
                ctx.fill();
                
                // Core
                ctx.fillStyle = 'rgba(200, 50, 50, 0.8)';
                ctx.beginPath();
                ctx.arc(0, 0, size/2, 0, Math.PI * 2);
                ctx.fill();
                break;
        }
        
        ctx.restore();
    }
    
    update() {
        // Calculate angle to player for tracking
        if (player) {
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            this.targetAngle = Math.atan2(dx, -dy);
            
            // Smoothly rotate towards the player
            let angleDiff = this.targetAngle - this.angle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            
            this.angle += angleDiff * 0.05;
        }
        
        // Move based on type
        switch(this.type) {
            case 0: // Basic follows player directly
                this.x += Math.sin(this.angle) * this.speed;
                this.y -= Math.cos(this.angle) * this.speed;
                break;
            case 1: // Fast enemy moves in quick bursts
                this.x += Math.sin(this.angle) * this.speed * (1 + Math.sin(Date.now() * 0.005) * 0.5);
                this.y -= Math.cos(this.angle) * this.speed * (1 + Math.sin(Date.now() * 0.005) * 0.5);
                break;
            case 2: // Tough enemy circles and approaches
                this.x += Math.sin(this.angle + Math.sin(Date.now() * 0.002) * 0.5) * this.speed;
                this.y -= Math.cos(this.angle + Math.sin(Date.now() * 0.002) * 0.5) * this.speed;
                break;
        }
        
        // Shoot at player (only certain types)
        if (this.type === 2) { // Only tough enemies shoot
            this.shootTimer--;
            if (this.shootTimer <= 0 && gameActive) {
                this.shootTimer = this.shootCooldown;
                this.enemyShoot();
            }
        }
        
        // Add engine particles
        if (Math.random() < 0.3) {
            const angle = this.angle - Math.PI;
            particles.push(new Particle(
                this.x + Math.sin(angle) * this.height/2,
                this.y - Math.cos(angle) * this.height/2,
                Math.sin(angle) * 2 + (Math.random() - 0.5),
                -Math.cos(angle) * 2 + (Math.random() - 0.5),
                Math.random() * 3 + 1,
                `hsl(${this.type === 1 ? 30 : 0}, 100%, 50%, ${Math.random() * 0.5 + 0.5})`,
                15
            ));
        }
    }
    
    enemyShoot() {
        // Create enemy projectile
        const projectile = new EnemyProjectile(this.x, this.y, this.angle);
        projectiles.push(projectile);
        
        // Sound effect for enemy shooting
        playSound('laser', { volume: 0.2, rate: 0.8, pan: (this.x / canvas.width) * 2 - 1 });
    }
    
    isOffScreen() {
        const margin = 100; // Allow enemies to travel further off-screen before removal
        return (
            this.x < -margin || 
            this.x > canvas.width + margin || 
            this.y < -margin || 
            this.y > canvas.height + margin
        );
    }
    
    hit() {
        this.health--;
        
        // Create hit effect
        createHitEffect(this.x, this.y, this.color);
        
        if (this.health <= 0) {
            // Create explosion
            createExplosion(this.x, this.y, this.color);
            
            // Chance to drop a powerup (higher chance for tough enemies)
            if (Math.random() < (this.type === 2 ? 0.3 : 0.1)) {
                powerups.push(new Powerup(this.x, this.y));
            }
            
            // Return score
            return this.scoreValue;
        }
        return 0;
    }
}

// Enemy projectile
class EnemyProjectile extends Projectile {
    constructor(x, y, angle) {
        super(x, y, angle);
        this.speed = 8;
        this.radius = 3;
        this.color = '#F44';
        this.isEnemyProjectile = true; // Flag to distinguish from player projectiles
    }
    
    draw() {
        ctx.save();
        
        // Add glow effect
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * 3);
        gradient.addColorStop(0, '#FFF');
        gradient.addColorStop(0.3, this.color);
        gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw the projectile core
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    update() {
        // Move based on angle
        this.x += Math.sin(this.angle) * this.speed;
        this.y -= Math.cos(this.angle) * this.speed;
        
        // Create particle trail (red)
        this.particleTimer--;
        if (this.particleTimer <= 0) {
            particles.push(new Particle(
                this.x, 
                this.y, 
                (Math.random() - 0.5) * 0.5, 
                (Math.random() - 0.5) * 0.5, 
                Math.random() * 2 + 1, 
                `rgba(255, ${Math.random() * 100}, ${Math.random() * 50}, ${Math.random() * 0.5 + 0.5})`,
                10
            ));
            this.particleTimer = 2;
        }
        
        // Reduce life (for range limit)
        this.life--;
    }
}

// Enhanced meteor with realistic appearance and physics
class Meteor {
    constructor() {
        // Random size - bigger meteors are slower but tougher
        this.radius = Math.random() * 25 + 15;
        
        // Position outside the screen
        const side = Math.floor(Math.random() * 4);
        switch(side) {
            case 0: // Top
                this.x = Math.random() * canvas.width;
                this.y = -this.radius;
                break;
            case 1: // Right
                this.x = canvas.width + this.radius;
                this.y = Math.random() * canvas.height;
                break;
            case 2: // Bottom
                this.x = Math.random() * canvas.width;
                this.y = canvas.height + this.radius;
                break;
            case 3: // Left
                this.x = -this.radius;
                this.y = Math.random() * canvas.height;
                break;
        }
        
        // Velocity directed towards center of screen with some randomness
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const angle = Math.atan2(centerX - this.x, centerY - this.y) + (Math.random() - 0.5) * 1.5;
        const baseSpeed = 1 + level * 0.1;
        const speedFactor = 35 / this.radius; // Smaller meteors move faster
        
        this.speedX = Math.sin(angle) * baseSpeed * speedFactor;
        this.speedY = Math.cos(angle) * baseSpeed * speedFactor;
        
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.05;
        
        // Health based on size (larger = more hits to destroy)
        this.health = Math.ceil(this.radius / 15);
        
        // Score value based on size
        this.scoreValue = Math.floor(this.radius);
        
        // Visual properties
        this.color = `hsl(${Math.random() * 30}, 20%, ${20 + Math.random() * 30}%)`;
        this.craters = [];
        
        // Generate random craters
        const craterCount = Math.floor(Math.random() * 5) + 3;
        for (let i = 0; i < craterCount; i++) {
            this.craters.push({
                x: (Math.random() - 0.5) * this.radius * 0.8,
                y: (Math.random() - 0.5) * this.radius * 0.8,
                radius: Math.random() * (this.radius * 0.3) + 3,
                shade: Math.random() * 0.2
            });
        }
    }
    
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        // Main body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        
        // Create irregular shape
        const points = 12;
        const variation = this.radius * 0.2;
        
        ctx.moveTo(
            this.radius + (Math.random() - 0.5) * variation,
            0
        );
        
        for (let i = 1; i <= points; i++) {
            const angle = (i / points) * Math.PI * 2;
            const distance = this.radius + (Math.random() - 0.5) * variation;
            ctx.lineTo(
                Math.cos(angle) * distance,
                Math.sin(angle) * distance
            );
        }
        
        ctx.closePath();
        ctx.fill();
        
        // Draw craters
        for (const crater of this.craters) {
            ctx.fillStyle = `rgba(30, 30, 30, ${crater.shade})`;
            ctx.beginPath();
            ctx.arc(crater.x, crater.y, crater.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    update() {
        // Update position
        this.x += this.speedX;
        this.y += this.speedY;
        
        // Rotate the meteor
        this.rotation += this.rotationSpeed;
        
        // Occasionally create dust particles
        if (Math.random() < 0.1) {
            particles.push(new Particle(
                this.x + (Math.random() - 0.5) * this.radius,
                this.y + (Math.random() - 0.5) * this.radius,
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5,
                Math.random() * 2 + 1,
                `rgba(120, 120, 120, ${Math.random() * 0.3 + 0.2})`,
                30
            ));
        }
    }
    
    isOffScreen() {
        const margin = this.radius + 50;
        return (
            this.x < -margin || 
            this.x > canvas.width + margin || 
            this.y < -margin || 
            this.y > canvas.height + margin
        );
    }
    
    hit() {
        this.health--;
        
        // Create hit effect
        createHitEffect(this.x, this.y, '#AAA');
        
        if (this.health <= 0) {
            // Create explosion
            createExplosion(this.x, this.y, '#AAA');
            
            // Break into smaller meteors if large enough
            if (this.radius > 30) {
                for (let i = 0; i < 2; i++) {
                    const smallMeteor = new Meteor();
                    smallMeteor.x = this.x;
                    smallMeteor.y = this.y;
                    smallMeteor.radius = this.radius * 0.6;
                    smallMeteor.speedX = this.speedX * 1.2 + (Math.random() - 0.5) * 2;
                    smallMeteor.speedY = this.speedY * 1.2 + (Math.random() - 0.5) * 2;
                    meteors.push(smallMeteor);
                }
            }
            
            // Small chance to drop powerup
            if (Math.random() < 0.05) {
                powerups.push(new Powerup(this.x, this.y));
            }
            
            // Return score
            return this.scoreValue;
        }
        
        return 0;
    }
}

// Particle system for effects
class Particle {
    constructor(x, y, speedX, speedY, radius, color, life) {
        this.x = x;
        this.y = y;
        this.speedX = speedX;
        this.speedY = speedY;
        this.radius = radius;
        this.originalRadius = radius;
        this.color = color;
        this.life = life;
        this.maxLife = life;
    }
    
    draw() {
        ctx.globalAlpha = this.life / this.maxLife;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
    
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life--;
        
        // Particles shrink as they age
        // Add Math.max check to prevent negative radius
        this.radius = Math.max(0.1, (this.life / this.maxLife) * this.originalRadius);
        
        // Apply resistance/drag
        this.speedX *= 0.99;
        this.speedY *= 0.99;
    }
}

// Star background particles
class Star {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.brightness = 0.2 + Math.random() * 0.8;
        this.blinkSpeed = Math.random() * 0.02 + 0.005;
        this.blinkOffset = Math.random() * Math.PI * 2;
        this.color = Math.random() < 0.2 ? 
            `rgba(${200 + Math.random() * 55}, ${200 + Math.random() * 55}, ${255}, ${this.brightness})` : 
            `rgba(255, 255, 255, ${this.brightness})`;
        this.speedY = 0.2 + Math.random() * 0.3;
    }
    
    draw() {
        // Twinkle effect
        const twinkle = 0.7 + Math.sin(Date.now() * this.blinkSpeed + this.blinkOffset) * 0.3;
        
        // Draw star
        ctx.fillStyle = this.color;
        ctx.globalAlpha = twinkle;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
    
    update() {
        // Stars move down to create parallax scrolling effect
        this.y += this.speedY;
        
        // Reset when off screen
        if (this.y > canvas.height) {
            this.y = 0;
            this.x = Math.random() * canvas.width;
        }
    }
}

// Powerup items
class Powerup {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        
        // Choose a random powerup type
        const types = Object.keys(POWERUP_TYPES);
        this.type = types[Math.floor(Math.random() * types.length)];
        this.info = POWERUP_TYPES[this.type];
        
        this.radius = 15;
        this.speedY = 1;
        this.pulseRate = 0;
        this.rotationAngle = 0;
    }
    
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Pulse effect
        this.pulseRate += 0.05;
        const pulse = 1 + Math.sin(this.pulseRate) * 0.2;
        
        // Outer glow
        ctx.shadowColor = this.info.color;
        ctx.shadowBlur = 15;
        
        // Background circle
        ctx.fillStyle = `rgba(0, 0, 0, 0.5)`;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * pulse, 0, Math.PI * 2);
        ctx.fill();
        
        // Border
        ctx.strokeStyle = this.info.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * pulse, 0, Math.PI * 2);
        ctx.stroke();
        
        // Symbol
        ctx.fillStyle = this.info.color;
        ctx.font = `bold ${this.radius * 1.2}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.info.symbol, 0, 0);
        
        ctx.restore();
    }
    
    update() {
        // Float downward slowly
        this.y += this.speedY;
        
        // Add floating effect
        this.x += Math.sin(Date.now() * 0.002) * 0.5;
        
        // Rotation for visual interest
        this.rotationAngle += 0.02;
        
        // Occasionally create trail particles
        if (Math.random() < 0.2) {
            particles.push(new Particle(
                this.x + (Math.random() - 0.5) * this.radius * 0.5,
                this.y + this.radius * 0.5,
                (Math.random() - 0.5) * 0.5,
                -Math.random() * 0.5 - 0.5,
                Math.random() * 3 + 1,
                this.info.color.replace(')', ', 0.7)').replace('rgb', 'rgba'),
                20
            ));
        }
    }
    
    isOffScreen() {
        return this.y > canvas.height + this.radius;
    }
    
    collect() {
        // Apply powerup effect
        activePowerups[this.type.toLowerCase()] = this.info.duration;
        
        // Create visual effect
        createPowerupEffect(this.x, this.y, this.info.color);
        
        // Create UI indicator
        updatePowerupUI();
        
        // Play powerup sound
        playSound('powerup', { volume: 0.4, rate: 1.0, pan: 0 });
        
        // Apply immediate effects
        if (this.type === 'SHIELD') {
            shield = 100;
            updateUI();
        }
    }
}

// Create explosion effect
function createExplosion(x, y, color) {
    // Add many particles for explosion
    for (let i = 0; i < 40; i++) {
        const speed = 1 + Math.random() * 5;
        const angle = Math.random() * Math.PI * 2;
        
        particles.push(new Particle(
            x, 
            y, 
            Math.cos(angle) * speed, 
            Math.sin(angle) * speed, 
            Math.random() * 5 + 2, 
            color, 
            30 + Math.random() * 20
        ));
    }
    
    // Add a shockwave particle
    const shockwave = new Particle(x, y, 0, 0, 5, 'rgba(255, 255, 255, 0.8)', 20);
    shockwave.draw = function() {
        ctx.strokeStyle = `rgba(255, 255, 255, ${this.life / this.maxLife * 0.8})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.x, this.y, (1 - this.life / this.maxLife) * 50, 0, Math.PI * 2);
        ctx.stroke();
    };
    shockwave.update = function() {
        this.life--;
    };
    particles.push(shockwave);
    
    // Play explosion sound with volume relative to size and stereo panning
    const volume = Math.min(0.8, 0.3 + (color === '#AAA' ? 0.1 : 0.2));
    const pan = (x / canvas.width) * 2 - 1; // -1 to 1 based on x position
    playSound('explosion', { volume, rate: 0.8 + Math.random() * 0.4, pan });
    
    // Screen shake effect for larger explosions
    if (Math.random() < 0.3) {
        document.body.classList.add('shake');
        setTimeout(() => {
            document.body.classList.remove('shake');
        }, 500);
    }
}

// Create hit effect
function createHitEffect(x, y, color) {
    // Smaller particles for hit effect
    for (let i = 0; i < 10; i++) {
        const speed = 0.5 + Math.random() * 3;
        const angle = Math.random() * Math.PI * 2;
        
        particles.push(new Particle(
            x, 
            y, 
            Math.cos(angle) * speed, 
            Math.sin(angle) * speed, 
            Math.random() * 3 + 1, 
            color, 
            15 + Math.random() * 10
        ));
    }
    
    // Play hit sound with stereo panning
    playSound('hit', { volume: 0.2, rate: 0.9 + Math.random() * 0.2, pan: (x / canvas.width) * 2 - 1 });
}

// Create powerup collection effect
function createPowerupEffect(x, y, color) {
    // Particles moving outward in a circle
    for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2;
        const speed = 1 + Math.random() * 3;
        
        particles.push(new Particle(
            x, 
            y, 
            Math.cos(angle) * speed, 
            Math.sin(angle) * speed, 
            Math.random() * 4 + 2, 
            color, 
            30 + Math.random() * 10
        ));
    }
    
    // Add a pulse effect
    const pulse = new Particle(x, y, 0, 0, 20, color.replace(')', ', 0.5)').replace('rgb', 'rgba'), 20);
    pulse.draw = function() {
        ctx.strokeStyle = color.replace(')', `, ${this.life / this.maxLife * 0.8})`).replace('rgb', 'rgba');
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.x, this.y, (1 - this.life / this.maxLife) * 50, 0, Math.PI * 2);
        ctx.stroke();
    };
    pulse.update = function() {
        this.life--;
    };
    particles.push(pulse);
}

// Create stars background
function createStarfield() {
    stars = [];
    // Create multiple layers of stars for parallax effect
    const starCount = Math.floor(canvas.width * canvas.height / 2000);
    for (let i = 0; i < starCount; i++) {
        stars.push(new Star());
    }
}

// Initialize game
function init() {
    // Reset game state
    player = new Player(canvas.width / 2, canvas.height - 100);
    projectiles = [];
    enemies = [];
    meteors = [];
    particles = [];
    powerups = [];
    
    score = 0;
    level = 1;
    health = 100;
    shield = 0;
    
    activePowerups = {
        shield: 0,
        tripleShot: 0,
        speed: 0
    };
    
    // Create UI elements
    createStarfield();
    updateUI();
    updatePowerupUI();
    
    // Start game
    gameActive = true;
    isPaused = false;
    
    // Setup enemy and meteor spawn rates
    clearInterval(enemySpawnInterval);
    clearInterval(meteorSpawnInterval);
    
    enemySpawnInterval = setInterval(() => {
        if (gameActive && !isPaused) {
            spawnEnemy();
        }
    }, 2000 - level * 100);
    
    meteorSpawnInterval = setInterval(() => {
        if (gameActive && !isPaused) {
            spawnMeteor();
        }
    }, 3000 - level * 150);
    
    // Setup level advancement
    levelCheckInterval = setInterval(() => {
        if (gameActive && !isPaused) {
            checkLevelAdvance();
        }
    }, 30000);
    
    // Set up touch controls for all devices
    setupTouchControls();
    
    // Show game UI elements
    document.getElementById('pauseButton').style.display = 'block';
    
    // Start the game loop
    animate();
}

// Check if player should advance to next level
function checkLevelAdvance() {
    if (level < 10) {
        level++;
        
        // Update UI
        document.getElementById('level').textContent = level;
        
        // Show level notification
        const notification = document.getElementById('levelNotification');
        notification.textContent = `POZIOM ${level}!`;
        notification.style.opacity = 1;
        
        // Hide after delay
        setTimeout(() => {
            notification.style.opacity = 0;
        }, 2000);
        
        // Increase spawn rates
        clearInterval(enemySpawnInterval);
        clearInterval(meteorSpawnInterval);
        
        enemySpawnInterval = setInterval(() => {
            if (gameActive && !isPaused) {
                spawnEnemy();
            }
        }, Math.max(500, 2000 - level * 100));
        
        meteorSpawnInterval = setInterval(() => {
            if (gameActive && !isPaused) {
                spawnMeteor();
            }
        }, Math.max(800, 3000 - level * 150));
        
        // Give player shield powerup on new level
        shield = 100;
        activePowerups.shield = 5000;
        updateUI();
        updatePowerupUI();
    }
}

// MODIFIED FUNCTION: Improved touch controls with fixed joystick movement
function setupTouchControls() {
    const canvas = document.getElementById('gameCanvas');
    const joystick = document.getElementById('joystick');
    const joystickKnob = document.getElementById('joystickKnob');
    
    // Hide controls
    joystick.style.display = 'none';
    
    // Touch variables
    let activeTouches = [];
    let joystickActive = false;
    let joystickOrigin = { x: 0, y: 0 };
    let joystickID = null;
    const maxDistance = 70;
    let lastShootTime = 0;
    
    // Variables for tap detection
    const tapThreshold = 200; // Time in ms after which a touch is no longer considered a tap
    const moveThreshold = 10; // Maximum distance in px that a finger can move to still be considered a tap
    
    // Touch event handlers for canvas
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });
    
    // Handle keyboard as normal
    window.addEventListener('keydown', (e) => {
        keys[e.key] = true;
        
        // Shoot on space or Enter
        if ((e.key === ' ' || e.key === 'Enter') && player && gameActive && !isPaused) {
            player.shoot();
        }
        
        // Pause on Escape or P
        if ((e.key === 'Escape' || e.key === 'p') && gameActive) {
            togglePause();
        }
    });

    window.addEventListener('keyup', (e) => {
        keys[e.key] = false;
    });
    
    function handleTouchStart(e) {
        if (!gameActive || isPaused) return;
        e.preventDefault();
        
        const newTouches = Array.from(e.changedTouches);
        
        newTouches.forEach(touch => {
            const touchIndex = activeTouches.findIndex(t => t.identifier === touch.identifier);
            
            // If this is a new touch
            if (touchIndex === -1) {
                const rect = canvas.getBoundingClientRect();
                const touchX = touch.clientX - rect.left;
                const touchY = touch.clientY - rect.top;
                
                // If there's no active joystick or this is the first touch
                if (!joystickActive) {
                    // Record touch time for tap detection
                    const touchStartTime = Date.now();
                    
                    joystickActive = true;
                    joystickID = touch.identifier;
                    joystickOrigin = { x: touchX, y: touchY };
                    
                    // Show and position joystick at touch location
                    joystick.style.display = 'block';
                    joystick.style.left = (touch.clientX - 75) + 'px';
                    joystick.style.top = (touch.clientY - 75) + 'px';
                    joystickKnob.style.transform = 'translate(-50%, -50%)';
                    
                    activeTouches.push({
                        identifier: touch.identifier,
                        type: 'joystick',
                        startX: touchX,
                        startY: touchY,
                        currentX: touchX,
                        currentY: touchY,
                        startTime: touchStartTime,
                        moved: false
                    });
                } else {
                    // If joystick already exists, this is a shot
                    if (Date.now() - lastShootTime > 200) { // Prevent shooting too quickly
                        player.shoot();
                        lastShootTime = Date.now();
                    }
                    
                    activeTouches.push({
                        identifier: touch.identifier,
                        type: 'fire',
                        startX: touchX,
                        startY: touchY,
                        currentX: touchX,
                        currentY: touchY
                    });
                }
            }
        });
    }
    
    function handleTouchMove(e) {
        if (!gameActive || isPaused) return;
        e.preventDefault();
        
        Array.from(e.changedTouches).forEach(touch => {
            const touchIndex = activeTouches.findIndex(t => t.identifier === touch.identifier);
            
            if (touchIndex !== -1) {
                const activeTouch = activeTouches[touchIndex];
                const rect = canvas.getBoundingClientRect();
                const touchX = touch.clientX - rect.left;
                const touchY = touch.clientY - rect.top;
                
                // Calculate move distance
                const moveDistance = Math.hypot(touchX - activeTouch.startX, touchY - activeTouch.startY);
                
                // If touch has moved more than threshold, mark as moved not a tap
                if (moveDistance > moveThreshold) {
                    activeTouch.moved = true;
                }
                
                activeTouch.currentX = touchX;
                activeTouch.currentY = touchY;
                
                if (activeTouch.type === 'joystick' && touch.identifier === joystickID) {
                    updateJoystickPosition(touchX, touchY);
                }
            }
        });
    }
    
    function handleTouchEnd(e) {
        e.preventDefault();
        
        Array.from(e.changedTouches).forEach(touch => {
            const touchIndex = activeTouches.findIndex(t => t.identifier === touch.identifier);
            
            if (touchIndex !== -1) {
                const removedTouch = activeTouches.splice(touchIndex, 1)[0];
                
                // Check if this was a tap (short touch without movement)
                if (removedTouch.type === 'joystick' && !removedTouch.moved && 
                    (Date.now() - removedTouch.startTime < tapThreshold)) {
                    // This was a tap - fire!
                    if (player && Date.now() - lastShootTime > 200) {
                        player.shoot();
                        lastShootTime = Date.now();
                    }
                }
                
                if (removedTouch.type === 'joystick' && touch.identifier === joystickID) {
                    // Hide joystick
                    joystick.style.display = 'none';
                    joystickActive = false;
                    joystickID = null;
                }
            }
        });
    }
    
    // MODIFIED FUNCTION: Fixed joystick movement by using consistent angle mathematics
    function updateJoystickPosition(touchX, touchY) {
        // Calculate distance from joystick center
        let dx = touchX - joystickOrigin.x;
        let dy = touchY - joystickOrigin.y;
        
        // Calculate angle
        const angle = Math.atan2(dy, dx);
        
        // Calculate distance
        let distance = Math.sqrt(dx * dx + dy * dy);
        
        // Limit distance to maximum
        if (distance > maxDistance) {
            dx = Math.cos(angle) * maxDistance;
            dy = Math.sin(angle) * maxDistance;
            distance = maxDistance;
        }
        
        // Update joystick knob position
        joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        
        // Update player movement
        if (player && gameActive && !isPaused) {
            // Update player rotation
            player.rotation = angle + Math.PI/2;
            
            // Use requestAnimationFrame for smoother movement
            window.requestAnimationFrame(() => {
                if (player && gameActive && !isPaused) {
                    const moveSpeed = player.speed * (activePowerups.speed > 0 ? 1.5 : 1);
                    
                    // Fix: Apply movement using the same logic as keyboard controls
                    // Move forward in the direction of rotation
                    player.x += Math.sin(player.rotation) * moveSpeed * (distance / maxDistance);
                    player.y -= Math.cos(player.rotation) * moveSpeed * (distance / maxDistance);
                    
                    // Limit player position to screen
                    player.x = Math.max(player.width/2, Math.min(player.x, canvas.width - player.width/2));
                    player.y = Math.max(player.height/2, Math.min(player.y, canvas.height - player.height/2));
                }
            });
        }
    }
}

// Spawn a new enemy
function spawnEnemy() {
    // Higher chance of tougher enemies at higher levels
    let enemyType;
    const rand = Math.random();
    
    if (level >= 5) {
        if (rand < 0.4) {
            enemyType = 2; // Tough enemy
        } else if (rand < 0.7) {
            enemyType = 1; // Fast enemy
        } else {
            enemyType = 0; // Basic enemy
        }
    } else if (level >= 3) {
        if (rand < 0.2) {
            enemyType = 2; // Tough enemy
        } else if (rand < 0.5) {
            enemyType = 1; // Fast enemy
        } else {
            enemyType = 0; // Basic enemy
        }
    } else {
        if (rand < 0.1) {
            enemyType = 2; // Tough enemy
        } else if (rand < 0.3) {
            enemyType = 1; // Fast enemy
        } else {
            enemyType = 0; // Basic enemy
        }
    }
    
    enemies.push(new Enemy(enemyType));
}

// Spawn a new meteor
function spawnMeteor() {
    meteors.push(new Meteor());
}

// Check for collisions
function checkCollisions() {
    // Player projectiles vs Enemies
    projectiles.forEach((p, pi) => {
        // Skip enemy projectiles
        if (p.isEnemyProjectile) return;
        
        enemies.forEach((e, ei) => {
            const distance = Math.hypot(p.x - e.x, p.y - e.y);
            if (distance < e.width / 2 + p.radius) {
                // Get score from hit
                const hitScore = e.hit();
                
                // If enemy is destroyed
                if (hitScore > 0) {
                    // Add score and remove the enemy
                    score += hitScore;
                    enemies.splice(ei, 1);
                }
                
                // Remove the projectile
                projectiles.splice(pi, 1);
                
                // Update UI
                updateUI();
                return;
            }
        });
    });
    
    // Player projectiles vs Meteors
    projectiles.forEach((p, pi) => {
        // Skip enemy projectiles
        if (p.isEnemyProjectile) return;
        
        meteors.forEach((m, mi) => {
            const distance = Math.hypot(p.x - m.x, p.y - m.y);
            if (distance < m.radius + p.radius) {
                // Get score from hit
                const hitScore = m.hit();
                
                // If meteor is destroyed
                if (hitScore > 0) {
                    // Add score and remove the meteor
                    score += hitScore;
                    meteors.splice(mi, 1);
                }
                
                // Remove the projectile
                projectiles.splice(pi, 1);
                
                // Update UI
                updateUI();
                return;
            }
        });
    });
    
    // Player vs Enemy
    if (player) {
        enemies.forEach((e, ei) => {
            const distance = Math.hypot(player.x - e.x, player.y - e.y);
            if (distance < e.width / 2 + player.width / 2) {
                // Create explosion
                createExplosion(e.x, e.y, e.color);
                
                // Remove the enemy
                enemies.splice(ei, 1);
                
                // Damage player
                playerHit(25);
            }
        });
    }
    
    // Player vs Meteor
    if (player) {
        meteors.forEach((m, mi) => {
            const distance = Math.hypot(player.x - m.x, player.y - m.y);
            if (distance < m.radius + player.width / 2) {
                // Create explosion
                createExplosion(m.x, m.y, m.color);
                
                // Remove the meteor
                meteors.splice(mi, 1);
                
                // Damage player (larger meteors do more damage)
                playerHit(Math.ceil(m.radius / 2));
            }
        });
    }
    
    // Player vs Enemy Projectiles
    if (player) {
        projectiles.forEach((p, pi) => {
            if (p.isEnemyProjectile) {
                const distance = Math.hypot(player.x - p.x, player.y - p.y);
                if (distance < player.width / 2 + p.radius) {
                    // Create hit effect
                    createHitEffect(p.x, p.y, p.color);
                    
                    // Remove the projectile
                    projectiles.splice(pi, 1);
                    
                    // Damage player
                    playerHit(10);
                }
            }
        });
    }
    
    // Player vs Powerup
    if (player) {
        powerups.forEach((powerup, i) => {
            const distance = Math.hypot(player.x - powerup.x, player.y - powerup.y);
            if (distance < player.width / 2 + powerup.radius) {
                // Apply powerup effect
                powerup.collect();
                
                // Remove the powerup
                powerups.splice(i, 1);
            }
        });
    }
}

// Player hit function
function playerHit(damage) {
    // If shield is active, damage shield instead of health
    if (shield > 0) {
        shield -= damage;
        if (shield < 0) {
            // Remaining damage goes to health
            health += shield;
            shield = 0;
        }
    } else {
        // Damage health directly
        health -= damage;
    }
    
    // Update UI
    updateUI();
    
    // Check for game over
    if (health <= 0) {
        gameOver();
    } else {
        // Screen shake for hit
        document.body.classList.add('shake');
        setTimeout(() => {
            document.body.classList.remove('shake');
        }, 300);
    }
}

// Game over function
function gameOver() {
    gameActive = false;
    
    // Show game over screen
    document.getElementById('finalScore').textContent = score;
    document.getElementById('finalLevel').textContent = level;
    document.getElementById('gameOverScreen').style.display = 'flex';
    
    // Hide pause button
    document.getElementById('pauseButton').style.display = 'none';
    
    // Hide touch controls
    document.getElementById('joystick').style.display = 'none';
    
    // Clear intervals
    clearInterval(enemySpawnInterval);
    clearInterval(meteorSpawnInterval);
    clearInterval(levelCheckInterval);
}

// Update UI elements
function updateUI() {
    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = level;
    
    // Update health bar
    const healthBar = document.getElementById('healthBar');
    healthBar.style.width = `${health}%`;
    
    // Update shield bar
    const shieldBar = document.getElementById('shieldBar');
    shieldBar.style.width = `${shield}%`;
}

// Update powerup UI indicators
function updatePowerupUI() {
    const powerupDisplay = document.getElementById('powerupDisplay');
    powerupDisplay.innerHTML = '';
    
    // Create indicators for active powerups
    if (activePowerups.shield > 0) {
        const indicator = document.createElement('div');
        indicator.className = 'powerup-icon powerup-shield';
        indicator.textContent = 'S';
        powerupDisplay.appendChild(indicator);
    }
    
    if (activePowerups.tripleShot > 0) {
        const indicator = document.createElement('div');
        indicator.className = 'powerup-icon powerup-triple';
        indicator.textContent = 'T';
        powerupDisplay.appendChild(indicator);
    }
    
    if (activePowerups.speed > 0) {
        const indicator = document.createElement('div');
        indicator.className = 'powerup-icon powerup-speed';
        indicator.textContent = 'B';
        powerupDisplay.appendChild(indicator);
    }
}

// Update powerup timers
function updatePowerups() {
    // Decrease timers
    if (activePowerups.shield > 0) {
        activePowerups.shield -= 16; // ~16ms per frame
        if (activePowerups.shield <= 0) {
            activePowerups.shield = 0;
            updatePowerupUI();
        }
    }
    
    if (activePowerups.tripleShot > 0) {
        activePowerups.tripleShot -= 16;
        if (activePowerups.tripleShot <= 0) {
            activePowerups.tripleShot = 0;
            updatePowerupUI();
        }
    }
    
    if (activePowerups.speed > 0) {
        activePowerups.speed -= 16;
        if (activePowerups.speed <= 0) {
            activePowerups.speed = 0;
            updatePowerupUI();
        }
    }
}

// Main animation loop
function animate() {
    if (!gameActive) return;
    if (isPaused) {
        requestAnimationFrame(animate);
        return;
    }
    
    // Clear canvas with slight transparency for trail effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw stars
    stars.forEach(star => {
        star.update();
        star.draw();
    });
    
    // Update player
    if (player) {
        player.update();
        player.move(keys);
        player.draw();
    }
    
    // Update projectiles
    projectiles.forEach((p, i) => {
        p.update();
        p.draw();
        
        // Remove if off screen
        if (p.isOffScreen()) {
            projectiles.splice(i, 1);
        }
    });
    
    // Update enemies
    enemies.forEach((e, i) => {
        e.update();
        e.draw();
        
        // Remove if off screen
        if (e.isOffScreen()) {
            enemies.splice(i, 1);
        }
    });
    
    // Update meteors
    meteors.forEach((m, i) => {
        m.update();
        m.draw();
        
        // Remove if off screen
        if (m.isOffScreen()) {
            meteors.splice(i, 1);
        }
    });
    
    // Update particles (using backward loop to safely remove items)
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        
        // Remove dead particles before drawing them
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
        } else {
            particles[i].draw();
        }
    }
    
    // Update powerups
    powerups.forEach((p, i) => {
        p.update();
        p.draw();
        
        // Remove if off screen
        if (p.isOffScreen()) {
            powerups.splice(i, 1);
        }
    });
    
    // Update powerup timers
    updatePowerups();
    
    // Check collisions
    checkCollisions();
    
    // Request next frame
    requestAnimationFrame(animate);
}

// Handle keyboard input
const keys = {};

window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    
    // Shoot on space or Enter
    if ((e.key === ' ' || e.key === 'Enter') && player && gameActive && !isPaused) {
        player.shoot();
    }
    
    // Pause on Escape or P
    if ((e.key === 'Escape' || e.key === 'p') && gameActive) {
        togglePause();
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// Handle pause functionality
function togglePause() {
    isPaused = !isPaused;
    
    if (isPaused) {
        // Show pause screen
        document.getElementById('pauseScreen').style.display = 'flex';
    } else {
        // Hide pause screen
        document.getElementById('pauseScreen').style.display = 'none';
    }
}

// Add pause button click handler
document.getElementById('pauseButton').addEventListener('click', () => {
    if (gameActive) {
        togglePause();
    }
});

// Resume button
document.getElementById('resumeButton').addEventListener('click', () => {
    isPaused = false;
    document.getElementById('pauseScreen').style.display = 'none';
});

// Quit button
document.getElementById('quitButton').addEventListener('click', () => {
    gameActive = false;
    document.getElementById('pauseScreen').style.display = 'none';
    document.getElementById('pauseButton').style.display = 'none';
    document.getElementById('startScreen').style.display = 'flex';
    
    // Hide touch controls
    document.getElementById('joystick').style.display = 'none';
    
    // Clear intervals
    clearInterval(enemySpawnInterval);
    clearInterval(meteorSpawnInterval);
    clearInterval(levelCheckInterval);
});

// Start button click handler
document.getElementById('startButton').addEventListener('click', () => {
    document.getElementById('startScreen').style.display = 'none';
    setupAudio();
    init();
});

// Restart button click handler
document.getElementById('restartButton').addEventListener('click', () => {
    document.getElementById('gameOverScreen').style.display = 'none';
    init();
});

// Handle window resize
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    createStarfield();
    
    // Center player if exists
    if (player) {
        player.x = canvas.width / 2;
        player.y = canvas.height / 2;
    }
});

// Set canvas size
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Variables for game intervals
let enemySpawnInterval, meteorSpawnInterval, levelCheckInterval;

// Create pulsing animation for back button
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        const backButton = document.querySelector('.back-button a');
        backButton.classList.add('pulse-once');
    }, 1000);
});