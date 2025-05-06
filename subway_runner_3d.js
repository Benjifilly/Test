// Subway Runner 3D - Implémentation avec Three.js

// Variables globales
let scene, camera, renderer;
let player, track;
let obstacles = [];
let score = 0;
let speed = 5;
let obstacleDelay = 60;
let counter = 0;
let gameActive = false;
let lanes = 4;
let laneWidth;
let clock = new THREE.Clock();
let lights = [];
let isMobile = false;
let particleSystem;
let lastTime = 0;
let deltaTime = 0;
let highScore = localStorage.getItem('subwayRunnerHighScore') || 0;

// Éléments UI
const startMenu = document.getElementById('startMenu');
const pauseMenu = document.getElementById('pauseMenu');
const gameOverMenu = document.getElementById('gameOverMenu');
const scoreElement = document.getElementById('score');
const finalScoreElement = document.getElementById('finalScore');

// Détection des appareils mobiles
isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// Configuration des événements UI
document.getElementById('startButton').addEventListener('click', startGame);
document.getElementById('resumeButton').addEventListener('click', resumeGame);
document.getElementById('quitButton').addEventListener('click', quitGame);
document.getElementById('restartButton').addEventListener('click', startGame);
document.getElementById('quitGameButton').addEventListener('click', quitGame);

// Configuration des contrôles tactiles
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');

// Événements tactiles pour mobile
if (leftBtn && rightBtn) {
    // Événements pour le bouton gauche
    leftBtn.addEventListener('touchstart', function(e) {
        e.preventDefault();
        if (gameActive) movePlayer('left');
    });
    
    // Événements pour le bouton droit
    rightBtn.addEventListener('touchstart', function(e) {
        e.preventDefault();
        if (gameActive) movePlayer('right');
    });
    
    // Support des clics pour les tests sur desktop
    leftBtn.addEventListener('click', function() {
        if (gameActive) movePlayer('left');
    });
    
    rightBtn.addEventListener('click', function() {
        if (gameActive) movePlayer('right');
    });
}

// Initialisation de la scène Three.js
function init() {
    // Création de la scène
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.01);
    
    // Afficher/masquer les contrôles tactiles selon le type d'appareil
    const touchControls = document.getElementById('touchControls');
    if (touchControls) {
        touchControls.style.display = isMobile ? 'flex' : 'none';
    }
    
    // Création de la caméra
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, -20);
    
    // Création du renderer avec optimisations
    renderer = new THREE.WebGLRenderer({ 
        antialias: !isMobile, // Désactiver l'antialiasing sur mobile pour les performances
        powerPreference: 'high-performance',
        alpha: false
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000);
    renderer.shadowMap.enabled = !isMobile; // Désactiver les ombres sur mobile pour les performances
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(window.devicePixelRatio > 1 ? 1.5 : 1);
    document.body.appendChild(renderer.domElement);
    
    // Gestion du redimensionnement de la fenêtre
    window.addEventListener('resize', onWindowResize);
    
    // Création des lumières
    createLights();
    
    // Création du décor
    createEnvironment();
    
    // Création du joueur
    createPlayer();
    
    // Gestion des contrôles
    document.addEventListener('keydown', handleKeyDown);
}

function createLights() {
    // Lumière ambiante
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);
    
    // Lumière directionnelle (soleil)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    // Lumières néon pour les voies
    const colors = [0xff00ff, 0x00ffff, 0xffff00, 0x00ff00];
    
    for (let i = 0; i < lanes; i++) {
        const lanePos = getLanePosition(i + 1);
        
        // Lumière ponctuelle pour chaque voie
        const pointLight = new THREE.PointLight(colors[i % colors.length], 0.8, 20);
        pointLight.position.set(lanePos, 0.5, -20);
        scene.add(pointLight);
        lights.push(pointLight);
    }
}

function createEnvironment() {
    // Création du sol (piste)
    const trackGeometry = new THREE.PlaneGeometry(20, 100);
    const trackMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x101010,
        roughness: 0.3,
        metalness: 0.7
    });
    track = new THREE.Mesh(trackGeometry, trackMaterial);
    track.rotation.x = -Math.PI / 2;
    track.position.z = -45;
    track.receiveShadow = true;
    scene.add(track);
    
    // Création des lignes de voie
    laneWidth = 20 / lanes;
    
    for (let i = 1; i < lanes; i++) {
        const lineGeometry = new THREE.BoxGeometry(0.1, 0.1, 100);
        const lineMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 0.5
        });
        const line = new THREE.Mesh(lineGeometry, lineMaterial);
        line.position.x = -10 + (i * laneWidth);
        line.position.y = 0.05;
        line.position.z = -45;
        scene.add(line);
    }
    
    // Création des murs latéraux
    const wallGeometry = new THREE.BoxGeometry(0.5, 3, 100);
    const wallMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x0088ff,
        emissive: 0x0044aa,
        emissiveIntensity: 0.5
    });
    
    const leftWall = new THREE.Mesh(wallGeometry, wallMaterial);
    leftWall.position.set(-10.25, 1.5, -45);
    scene.add(leftWall);
    
    const rightWall = new THREE.Mesh(wallGeometry, wallMaterial);
    rightWall.position.set(10.25, 1.5, -45);
    scene.add(rightWall);
}

function createPlayer() {
    // Création du joueur avec une géométrie plus intéressante
    let playerGeometry;
    
    if (!isMobile) {
        // Version détaillée pour desktop
        const bodyGeo = new THREE.BoxGeometry(laneWidth * 0.5, 0.8, 1.2);
        const cockpitGeo = new THREE.SphereGeometry(0.4, 16, 16);
        
        playerGeometry = bodyGeo;
        
        const playerMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x0088ff,
            emissive: 0x0044aa,
            emissiveIntensity: 0.8,
            metalness: 0.8,
            roughness: 0.2
        });
        
        const cockpitMaterial = new THREE.MeshStandardMaterial({
            color: 0x88ccff,
            emissive: 0x4488ff,
            emissiveIntensity: 0.5,
            metalness: 0.9,
            roughness: 0.1,
            transparent: true,
            opacity: 0.9
        });
        
        player = new THREE.Mesh(bodyGeo, playerMaterial);
        
        const cockpit = new THREE.Mesh(cockpitGeo, cockpitMaterial);
        cockpit.position.y = 0.4;
        cockpit.position.z = -0.2;
        player.add(cockpit);
        
        // Ajouter des lumières au joueur
        const playerLight = new THREE.PointLight(0x0088ff, 1, 5);
        playerLight.position.set(0, 0.5, -1);
        player.add(playerLight);
    } else {
        // Version simplifiée pour mobile
        playerGeometry = new THREE.BoxGeometry(laneWidth * 0.6, 1, 1);
        const playerMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x0088ff,
            emissive: 0x0044aa,
            emissiveIntensity: 0.8,
            metalness: 0.8,
            roughness: 0.2
        });
        player = new THREE.Mesh(playerGeometry, playerMaterial);
    }
    
    player.position.y = 0.5;
    player.position.z = 0;
    player.castShadow = !isMobile;
    player.receiveShadow = !isMobile;
    
    // Position initiale (voie 2)
    player.userData.lane = 2;
    player.position.x = getLanePosition(player.userData.lane);
    
    scene.add(player);
}

function createObstacle() {
    // Choix aléatoire de la voie
    const lane = Math.floor(Math.random() * lanes) + 1;
    
    // Création de l'obstacle
    const obstacleGeometry = new THREE.BoxGeometry(laneWidth * 0.6, 1, 1);
    const obstacleMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 0.5,
        metalness: 0.8,
        roughness: 0.2
    });
    
    const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
    obstacle.position.y = 0.5;
    obstacle.position.z = -90;
    obstacle.position.x = getLanePosition(lane);
    obstacle.userData.lane = lane;
    obstacle.castShadow = true;
    obstacle.receiveShadow = true;
    
    scene.add(obstacle);
    obstacles.push(obstacle);
}

function getLanePosition(lane) {
    // Calcul de la position X en fonction de la voie
    return -10 + (laneWidth / 2) + ((lane - 1) * laneWidth);
}

function movePlayer(direction) {
    if (!gameActive) return;
    
    if (direction === 'left' && player.userData.lane > 1) {
        player.userData.lane--;
    } else if (direction === 'right' && player.userData.lane < lanes) {
        player.userData.lane++;
    }
    
    // Animation fluide vers la nouvelle position
    const targetX = getLanePosition(player.userData.lane);
    const tween = new TWEEN.Tween(player.position)
        .to({ x: targetX }, 200)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();
}

function handleKeyDown(event) {
    if (!gameActive) return;
    
    switch (event.key) {
        case 'ArrowLeft':
            movePlayer('left');
            break;
        case 'ArrowRight':
            movePlayer('right');
            break;
        case 'p':
            pauseGame();
            break;
        case 'Escape':
            pauseGame();
            break;
    }
}

function updateObstacles() {
    // Déplacement des obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obstacle = obstacles[i];
        obstacle.position.z += speed;
        
        // Vérification des collisions
        if (checkCollision(obstacle)) {
            gameOver();
            return;
        }
        
        // Suppression des obstacles sortis de l'écran
        if (obstacle.position.z > 5) {
            scene.remove(obstacle);
            obstacles.splice(i, 1);
        }
    }
    
    // Création de nouveaux obstacles
    counter++;
    if (counter >= obstacleDelay) {
        createObstacle();
        counter = 0;
        
        // Augmentation du score
        score++;
        scoreElement.textContent = `Score: ${score}`;
        
        // Augmentation de la difficulté
        if (score % 10 === 0) {
            speed += 0.5;
            if (obstacleDelay > 20) {
                obstacleDelay -= 2;
            }
        }
    }
}

function checkCollision(obstacle) {
    // Vérification simple des collisions basée sur la voie et la position Z
    return (
        player.userData.lane === obstacle.userData.lane &&
        Math.abs(player.position.z - obstacle.position.z) < 1
    );
}

function updateLights() {
    // Animation des lumières
    const time = Date.now() * 0.001;
    
    for (let i = 0; i < lights.length; i++) {
        const light = lights[i];
        light.intensity = 0.5 + Math.sin(time * 2 + i) * 0.3;
    }
}

function createParticleSystem() {
    // Système de particules pour l'effet de vitesse
    const particleCount = isMobile ? 500 : 1500;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() * 40) - 20;     // x
        positions[i * 3 + 1] = (Math.random() * 20);     // y
        positions[i * 3 + 2] = (Math.random() * 100) - 100; // z
    }
    
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
        color: 0x88ccff,
        size: 0.2,
        transparent: true,
        opacity: 0.6,
        sizeAttenuation: true
    });
    
    particleSystem = new THREE.Points(particles, particleMaterial);
    scene.add(particleSystem);
}

function updateParticles() {
    if (!particleSystem) return;
    
    const positions = particleSystem.geometry.attributes.position.array;
    const particleCount = positions.length / 3;
    
    for (let i = 0; i < particleCount; i++) {
        // Déplacer les particules vers l'avant
        positions[i * 3 + 2] += speed * 0.2;
        
        // Si la particule est trop proche, la replacer loin
        if (positions[i * 3 + 2] > 10) {
            positions[i * 3] = (Math.random() * 40) - 20;
            positions[i * 3 + 1] = (Math.random() * 20);
            positions[i * 3 + 2] = -100;
        }
    }
    
    particleSystem.geometry.attributes.position.needsUpdate = true;
}

function animate(time) {
    requestAnimationFrame(animate);
    
    // Calcul du deltaTime pour des animations fluides
    if (!lastTime) lastTime = time;
    deltaTime = (time - lastTime) / 1000;
    lastTime = time;
    
    if (gameActive) {
        updateObstacles();
        updateLights();
        updateParticles();
        TWEEN.update(time);
        
        // Animation du joueur
        if (player) {
            player.rotation.z = Math.sin(time * 0.003) * 0.1;
            player.rotation.x = Math.sin(time * 0.002) * 0.05;
        }
    }
    
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function startGame() {
    // Réinitialisation du jeu
    resetGame();
    
    // Masquer les menus
    startMenu.style.display = 'none';
    gameOverMenu.style.display = 'none';
    pauseMenu.style.display = 'none';
    
    // Créer le système de particules s'il n'existe pas encore
    if (!particleSystem) {
        createParticleSystem();
    }
    
    // Démarrer le jeu
    gameActive = true;
    
    // Activer le mode plein écran sur iOS
    if (isMobile && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log('Erreur lors du passage en plein écran:', err);
        });
    }
}

function pauseGame() {
    gameActive = false;
    pauseMenu.style.display = 'flex';
}

function resumeGame() {
    pauseMenu.style.display = 'none';
    gameActive = true;
}

function gameOver() {
    gameActive = false;
    
    // Mise à jour du meilleur score
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('subwayRunnerHighScore', highScore);
    }
    
    // Affichage du score et du meilleur score
    finalScoreElement.textContent = `Score: ${score} | Meilleur: ${highScore}`;
    gameOverMenu.style.display = 'flex';
    
    // Effet de vibration sur mobile
    if (isMobile && navigator.vibrate) {
        navigator.vibrate(500);
    }
}

function quitGame() {
    gameActive = false;
    resetGame();
    startMenu.style.display = 'flex';
    pauseMenu.style.display = 'none';
    gameOverMenu.style.display = 'none';
}

function resetGame() {
    // Réinitialisation des variables
    score = 0;
    speed = 5;
    obstacleDelay = 60;
    counter = 0;
    
    // Mise à jour du score affiché
    scoreElement.textContent = `Score: ${score}`;
    
    // Suppression des obstacles
    for (const obstacle of obstacles) {
        scene.remove(obstacle);
    }
    obstacles = [];
    
    // Réinitialisation de la position du joueur
    player.userData.lane = 2;
    player.position.x = getLanePosition(player.userData.lane);
}

// Chargement de la bibliothèque Tween.js
function loadScript(url, callback) {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = url;
    script.onload = callback;
    document.head.appendChild(script);
}

// Initialisation
loadScript('https://cdnjs.cloudflare.com/ajax/libs/tween.js/18.6.4/tween.umd.js', function() {
    init();
    animate();
    
    // Gestion des événements tactiles pour iOS
    document.addEventListener('touchmove', function(e) {
        if (gameActive) e.preventDefault();
    }, { passive: false });
    
    // Gestion de l'orientation de l'appareil pour contrôler le joueur
    if (isMobile && window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', function(e) {
            if (!gameActive) return;
            
            // Utiliser l'inclinaison de l'appareil pour déplacer le joueur
            if (e.gamma !== null) {
                const tilt = Math.round(e.gamma);
                
                if (tilt < -10 && player.userData.lane > 1) {
                    movePlayer('left');
                } else if (tilt > 10 && player.userData.lane < lanes) {
                    movePlayer('right');
                }
            }
        }, true);
    }
});