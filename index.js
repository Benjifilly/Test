// Variables globales
let scene, camera, renderer;
let player, track;
let obstacles = [];
let lasers = [];
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

// Variables pour le saut
let isJumping = false;
let jumpHeight = 2.5;
let jumpSpeed = 0.15;
let gravity = 0.008;
let verticalVelocity = 0;

// Variables pour le décor et la qualité visuelle
let skybox;
let stars = [];
let clouds = [];
let background2D;
let visualQuality = 'auto'; // 'low', 'medium', 'high', 'auto'
let effectsEnabled = true;
let skyEnabled = true;

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
const jumpBtn = document.getElementById('jumpBtn');

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
    // Détection des capacités de l'appareil et configuration de la qualité
    detectDeviceCapabilities();
    
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
    
    // Création du renderer avec optimisations basées sur la qualité visuelle
    renderer = new THREE.WebGLRenderer({ 
        antialias: visualQuality !== 'low', // Antialiasing selon la qualité
        powerPreference: 'high-performance',
        alpha: false
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000);
    renderer.shadowMap.enabled = visualQuality !== 'low'; // Ombres selon la qualité
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Ajustement du pixel ratio selon la qualité
    if (visualQuality === 'high') {
        renderer.setPixelRatio(window.devicePixelRatio);
    } else if (visualQuality === 'medium') {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    } else {
        renderer.setPixelRatio(1);
    }
    
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
    
    // Configuration des événements pour le menu des paramètres
    setupSettingsMenu();
}

function detectDeviceCapabilities() {
    // Récupération des paramètres sauvegardés
    const savedQuality = localStorage.getItem('subwayRunnerQuality');
    const savedEffects = localStorage.getItem('subwayRunnerEffects');
    const savedSky = localStorage.getItem('subwayRunnerSky');
    
    // Application des paramètres sauvegardés s'ils existent
    if (savedQuality) visualQuality = savedQuality;
    if (savedEffects) effectsEnabled = savedEffects === 'true';
    if (savedSky) skyEnabled = savedSky === 'true';
    
    // Bâtiments toujours désactivés car remplacés par un fond 2D
    buildingsEnabled = false;
    
    // Si la qualité est en mode auto, la déterminer automatiquement
    if (visualQuality === 'auto') {
        // Détection basée sur l'appareil et les performances
        if (isMobile) {
            // Appareils mobiles en basse qualité par défaut
            visualQuality = 'low';
        } else {
            // Détection basée sur la résolution d'écran pour desktop
            const pixelCount = window.screen.width * window.screen.height;
            
            if (pixelCount > 2073600) { // Plus de 1920x1080
                visualQuality = 'high';
            } else if (pixelCount > 921600) { // Plus de 1280x720
                visualQuality = 'medium';
            } else {
                visualQuality = 'low';
            }
        }
    }
    
    // Mise à jour des éléments UI pour refléter les paramètres actuels
    updateSettingsUI();
}

function updateSettingsUI() {
    // Mise à jour des contrôles du menu des paramètres
    const qualitySelect = document.getElementById('qualitySelect');
    const effectsToggle = document.getElementById('effectsToggle');
    const skyToggle = document.getElementById('skyToggle');
    const buildingsToggle = document.getElementById('buildingsToggle');
    
    if (qualitySelect) qualitySelect.value = visualQuality;
    if (effectsToggle) effectsToggle.checked = effectsEnabled;
    if (skyToggle) skyToggle.checked = skyEnabled;
    
    // Masquer l'option des bâtiments car elle est remplacée par un fond 2D
    if (buildingsToggle) {
        buildingsToggle.parentElement.style.display = 'none';
    }
}

function setupSettingsMenu() {
    // Récupération des éléments du menu
    const settingsButton = document.getElementById('settingsButton');
    const settingsMenu = document.getElementById('settingsMenu');
    const saveSettingsButton = document.getElementById('saveSettingsButton');
    const cancelSettingsButton = document.getElementById('cancelSettingsButton');
    
    // Événement pour ouvrir le menu des paramètres
    if (settingsButton) {
        settingsButton.addEventListener('click', function() {
            startMenu.style.display = 'none';
            settingsMenu.style.display = 'flex';
            updateSettingsUI();
        });
    }
    
    // Événement pour sauvegarder les paramètres
    if (saveSettingsButton) {
        saveSettingsButton.addEventListener('click', function() {
            // Récupération des valeurs
            const qualitySelect = document.getElementById('qualitySelect');
            const effectsToggle = document.getElementById('effectsToggle');
            const skyToggle = document.getElementById('skyToggle');
            
            // Sauvegarde des paramètres
            visualQuality = qualitySelect.value;
            effectsEnabled = effectsToggle.checked;
            skyEnabled = skyToggle.checked;
            // Bâtiments toujours désactivés car remplacés par un fond 2D
            buildingsEnabled = false;
            
            // Sauvegarde dans le localStorage
            localStorage.setItem('subwayRunnerQuality', visualQuality);
            localStorage.setItem('subwayRunnerEffects', effectsEnabled);
            localStorage.setItem('subwayRunnerSky', skyEnabled);
            localStorage.setItem('subwayRunnerBuildings', 'false');
            
            // Recréation de la scène avec les nouveaux paramètres
            resetScene();
            
            // Retour au menu principal
            settingsMenu.style.display = 'none';
            startMenu.style.display = 'flex';
        });
    }
    
    // Événement pour annuler les modifications
    if (cancelSettingsButton) {
        cancelSettingsButton.addEventListener('click', function() {
            settingsMenu.style.display = 'none';
            startMenu.style.display = 'flex';
        });
    }
}

function resetScene() {
    // Suppression des éléments existants
    if (particleSystem) {
        scene.remove(particleSystem);
        particleSystem = null;
    }
    
    // Recréation des éléments avec les nouveaux paramètres
    createEnvironment();
    
    // Mise à jour du renderer
    renderer.shadowMap.enabled = visualQuality !== 'low';
    
    if (visualQuality === 'high') {
        renderer.setPixelRatio(window.devicePixelRatio);
    } else if (visualQuality === 'medium') {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    } else {
        renderer.setPixelRatio(1);
    }
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
    
    // Création du fond 2D au lieu des bâtiments
    create2DBackground();
    
    if (skyEnabled) {
        createSky();
    }
}

function create2DBackground() {
    // Suppression du fond précédent s'il existe
    if (background2D) {
        scene.remove(background2D);
    }
    
    // Création d'un fond 2D avec effet néon futuriste
    const bgWidth = 500;
    const bgHeight = 200;
    
    // Création d'une texture procédurale pour le fond
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Dégradé de fond
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#000033');
    gradient.addColorStop(0.5, '#000066');
    gradient.addColorStop(1, '#000022');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Ajout de lignes horizontales style grille futuriste
    ctx.strokeStyle = '#0066ff';
    ctx.lineWidth = 1;
    
    // Nombre de lignes selon la qualité
    const lineCount = visualQuality === 'low' ? 10 : (visualQuality === 'medium' ? 20 : 30);
    
    for (let i = 0; i < lineCount; i++) {
        const y = canvas.height * (i / lineCount);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.globalAlpha = 0.3 + (i / lineCount) * 0.4; // Plus lumineux vers le bas
        ctx.stroke();
    }
    
    // Ajout de points lumineux (étoiles/lumières de ville)
    const pointCount = visualQuality === 'low' ? 50 : (visualQuality === 'medium' ? 100 : 200);
    
    for (let i = 0; i < pointCount; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = 1 + Math.random() * 2;
        
        // Couleur aléatoire néon
        const colors = ['#00ffff', '#ff00ff', '#ffff00', '#00ff00'];
        ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
        ctx.globalAlpha = 0.5 + Math.random() * 0.5;
        
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Création de la texture Three.js
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    // Création du plan de fond
    const bgGeometry = new THREE.PlaneGeometry(bgWidth, bgHeight);
    const bgMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
    });
    
    background2D = new THREE.Mesh(bgGeometry, bgMaterial);
    background2D.position.set(0, bgHeight/4, -150);
    scene.add(background2D);
}

function createSky() {
    // Nettoyage du ciel existant
    if (skybox) scene.remove(skybox);
    stars.forEach(star => scene.remove(star));
    clouds.forEach(cloud => scene.remove(cloud));
    stars = [];
    clouds = [];
    
    // Création du skybox
    const skyGeometry = new THREE.BoxGeometry(500, 500, 500);
    const skyMaterial = new THREE.MeshBasicMaterial({
        color: 0x000022,
        side: THREE.BackSide
    });
    skybox = new THREE.Mesh(skyGeometry, skyMaterial);
    scene.add(skybox);
    
    // Ajout d'étoiles
    const starCount = visualQuality === 'low' ? 100 : (visualQuality === 'medium' ? 300 : 500);
    
    for (let i = 0; i < starCount; i++) {
        const starGeometry = new THREE.SphereGeometry(0.1, 4, 4);
        const starMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 1
        });
        
        const star = new THREE.Mesh(starGeometry, starMaterial);
        
        // Position aléatoire dans le ciel
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const radius = 200 + Math.random() * 50;
        
        star.position.x = radius * Math.sin(phi) * Math.cos(theta);
        star.position.y = radius * Math.sin(phi) * Math.sin(theta);
        star.position.z = radius * Math.cos(phi);
        
        scene.add(star);
        stars.push(star);
    }
    
    // Ajout de nuages (pour qualité moyenne et haute)
    if (visualQuality !== 'low') {
        const cloudCount = visualQuality === 'medium' ? 10 : 20;
        
        for (let i = 0; i < cloudCount; i++) {
            const cloudGeometry = new THREE.SphereGeometry(5, 6, 6);
            const cloudMaterial = new THREE.MeshBasicMaterial({
                color: 0x8888ff,
                transparent: true,
                opacity: 0.2
            });
            
            const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
            
            // Position aléatoire dans le ciel
            cloud.position.x = (Math.random() - 0.5) * 200;
            cloud.position.y = 50 + Math.random() * 50;
            cloud.position.z = -100 - Math.random() * 200;
            
            // Taille aléatoire
            const scale = 1 + Math.random() * 2;
            cloud.scale.set(scale, scale * 0.6, scale);
            
            scene.add(cloud);
            clouds.push(cloud);
        }
    }
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
    
    // Décider aléatoirement si on crée un obstacle standard ou un laser
    const isLaser = Math.random() < 0.3; // 30% de chance d'avoir un laser
    
    if (isLaser) {
        createLaser(lane);
    } else {
        // Création de l'obstacle standard
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
        obstacle.userData.type = 'block';
        obstacle.userData.requiresJump = false;
        obstacle.castShadow = true;
        obstacle.receiveShadow = true;
        
        scene.add(obstacle);
        obstacles.push(obstacle);
    }
}

function createLaser(lane) {
    // Création du laser (obstacle qu'il faut sauter)
    const laserHeight = 2.5;
    const laserWidth = laneWidth * 0.8;
    
    // Création du support du laser
    const supportGeometry = new THREE.BoxGeometry(0.3, laserHeight, 0.3);
    const supportMaterial = new THREE.MeshStandardMaterial({
        color: 0x444444,
        metalness: 0.9,
        roughness: 0.1
    });
    
    // Groupe pour contenir tous les éléments du laser
    const laserGroup = new THREE.Group();
    laserGroup.position.z = -90;
    laserGroup.position.x = getLanePosition(lane);
    laserGroup.userData.lane = lane;
    laserGroup.userData.type = 'laser';
    laserGroup.userData.requiresJump = true;
    
    // Support gauche
    const leftSupport = new THREE.Mesh(supportGeometry, supportMaterial);
    leftSupport.position.x = -laserWidth/2;
    leftSupport.position.y = laserHeight/2;
    laserGroup.add(leftSupport);
    
    // Support droit
    const rightSupport = new THREE.Mesh(supportGeometry, supportMaterial);
    rightSupport.position.x = laserWidth/2;
    rightSupport.position.y = laserHeight/2;
    laserGroup.add(rightSupport);
    
    // Rayon laser
    const laserBeamGeometry = new THREE.BoxGeometry(laserWidth, 0.2, 0.2);
    const laserBeamMaterial = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x00ffff,
        emissiveIntensity: 1,
        transparent: true,
        opacity: 0.8
    });
    
    const laserBeam = new THREE.Mesh(laserBeamGeometry, laserBeamMaterial);
    laserBeam.position.y = 1.0; // Hauteur du laser
    laserGroup.add(laserBeam);
    
    // Ajout d'une lumière pour le laser
    if (visualQuality !== 'low') {
        const laserLight = new THREE.PointLight(0x00ffff, 1, 5);
        laserLight.position.y = 1.0;
        laserGroup.add(laserLight);
    }
    
    // Effet de particules pour le laser (qualité moyenne et haute)
    if (effectsEnabled && visualQuality !== 'low') {
        const particleCount = visualQuality === 'high' ? 50 : 20;
        const laserParticles = new THREE.BufferGeometry();
        const particlePositions = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            particlePositions[i * 3] = (Math.random() - 0.5) * laserWidth;
            particlePositions[i * 3 + 1] = 1.0 + (Math.random() - 0.5) * 0.2;
            particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
        }
        
        laserParticles.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        
        const particleMaterial = new THREE.PointsMaterial({
            color: 0x00ffff,
            size: 0.1,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        
        const particleSystem = new THREE.Points(laserParticles, particleMaterial);
        laserGroup.add(particleSystem);
    }
    
    scene.add(laserGroup);
    obstacles.push(laserGroup);
    lasers.push(laserGroup);
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
        case 'ArrowUp':
        case ' ':
            jump();
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
    // Vérification des collisions basée sur la voie, la position Z et la hauteur (pour les sauts)
    if (player.userData.lane !== obstacle.userData.lane) {
        return false; // Pas dans la même voie, pas de collision
    }
    
    // Vérifier la distance horizontale
    const horizontalDistance = Math.abs(player.position.z - obstacle.position.z);
    if (horizontalDistance >= 1) {
        return false; // Trop loin horizontalement
    }
    
    // Si l'obstacle nécessite un saut (laser) et que le joueur est en train de sauter assez haut
    if (obstacle.userData.requiresJump && player.position.y > 1.0) {
        return false; // Le joueur saute au-dessus du laser
    }
    
    // Si c'est un obstacle standard et que le joueur n'est pas en train de sauter
    if (!obstacle.userData.requiresJump && player.position.y < 1.0) {
        return true; // Collision avec un bloc standard
    }
    
    // Si c'est un laser et que le joueur ne saute pas assez haut
    if (obstacle.userData.requiresJump && player.position.y <= 1.0) {
        return true; // Collision avec le laser
    }
    
    return false; // Pas de collision
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
    // Vérifier si les effets sont activés
    if (!effectsEnabled) return;
    
    // Système de particules pour l'effet de vitesse
    // Ajuster le nombre de particules en fonction de la qualité visuelle
    let particleCount;
    
    if (visualQuality === 'low') {
        particleCount = 300;
    } else if (visualQuality === 'medium') {
        particleCount = 800;
    } else { // high
        particleCount = 1500;
    }
    
    // Réduire encore pour les appareils mobiles
    if (isMobile) {
        particleCount = Math.floor(particleCount / 2);
    }
    
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() * 40) - 20;     // x
        positions[i * 3 + 1] = (Math.random() * 20);     // y
        positions[i * 3 + 2] = (Math.random() * 100) - 100; // z
        
        // Couleurs variées pour les particules (uniquement en qualité moyenne et haute)
        if (visualQuality !== 'low') {
            // Variation de couleur entre bleu et violet
            colors[i * 3] = 0.5 + Math.random() * 0.5; // R
            colors[i * 3 + 1] = 0.5 + Math.random() * 0.5; // G
            colors[i * 3 + 2] = 0.8 + Math.random() * 0.2; // B
        } else {
            // Bleu uniforme pour la basse qualité
            colors[i * 3] = 0.5; // R
            colors[i * 3 + 1] = 0.7; // G
            colors[i * 3 + 2] = 1.0; // B
        }
    }
    
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
        size: visualQuality === 'high' ? 0.3 : 0.2,
        transparent: true,
        opacity: 0.6,
        sizeAttenuation: true,
        vertexColors: true
    });
    
    // Ajouter un effet de flou pour les particules en haute qualité
    if (visualQuality === 'high' && !isMobile) {
        particleMaterial.blending = THREE.AdditiveBlending;
    }
    
    particleSystem = new THREE.Points(particles, particleMaterial);
    scene.add(particleSystem);
}

function updateParticles() {
    if (!particleSystem || !effectsEnabled) return;
    
    const positions = particleSystem.geometry.attributes.position.array;
    const particleCount = positions.length / 3;
    
    // Facteur de vitesse basé sur la qualité visuelle
    const speedFactor = visualQuality === 'high' ? 0.25 : (visualQuality === 'medium' ? 0.2 : 0.15);
    
    for (let i = 0; i < particleCount; i++) {
        // Déplacer les particules vers l'avant
        positions[i * 3 + 2] += speed * speedFactor;
        
        // Si la particule est trop proche, la replacer loin
        if (positions[i * 3 + 2] > 10) {
            positions[i * 3] = (Math.random() * 40) - 20;
            positions[i * 3 + 1] = (Math.random() * 20);
            positions[i * 3 + 2] = -100;
            
            // Effet de scintillement pour les particules (qualité moyenne et haute)
            if (visualQuality !== 'low' && particleSystem.geometry.attributes.color) {
                const colors = particleSystem.geometry.attributes.color.array;
                // Variation de couleur entre bleu et violet
                colors[i * 3] = 0.5 + Math.random() * 0.5; // R
                colors[i * 3 + 1] = 0.5 + Math.random() * 0.5; // G
                colors[i * 3 + 2] = 0.8 + Math.random() * 0.2; // B
                
                particleSystem.geometry.attributes.color.needsUpdate = true;
            }
        }
    }
    
    particleSystem.geometry.attributes.position.needsUpdate = true;
    
    // Rotation légère du système de particules pour un effet plus dynamique (haute qualité)
    if (visualQuality === 'high') {
        particleSystem.rotation.y += 0.001;
        particleSystem.rotation.x += 0.0005;
    }
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
        updateEnvironment(time);
        updateJump(); // Mise à jour du saut
        updateLasers(time); // Animation des lasers
        TWEEN.update(time);
        
        // Animation du joueur
        if (player) {
            // Rotation réduite pendant le saut
            const jumpFactor = isJumping ? 0.3 : 1.0;
            player.rotation.z = Math.sin(time * 0.003) * 0.1 * jumpFactor;
            player.rotation.x = Math.sin(time * 0.002) * 0.05 * jumpFactor;
        }
    }
    
    renderer.render(scene, camera);
}

function updateJump() {
    if (!isJumping && !gameActive) return;
    
    // Appliquer la gravité à la vélocité verticale
    verticalVelocity -= gravity;
    
    // Mettre à jour la position verticale du joueur
    player.position.y += verticalVelocity;
    
    // Vérifier si le joueur a atterri
    if (player.position.y <= 0.5) {
        player.position.y = 0.5; // Position au sol
        verticalVelocity = 0;
        isJumping = false;
    }
}

function jump() {
    // Empêcher le double saut
    if (isJumping) return;
    
    isJumping = true;
    verticalVelocity = jumpSpeed;
    
    // Effet sonore de saut (si disponible)
    // playSound('jump');
}

function updateLasers(time) {
    // Animation des lasers
    lasers.forEach(laser => {
        if (!laser.children) return;
        
        // Trouver le rayon laser (3ème élément du groupe)
        const laserBeam = laser.children[2];
        if (laserBeam) {
            // Faire pulser la luminosité du laser
            const intensity = 0.8 + Math.sin(time * 0.01) * 0.2;
            laserBeam.material.emissiveIntensity = intensity;
            
            // Animer les particules si elles existent (qualité moyenne et haute)
            if (laser.children.length > 3 && effectsEnabled) {
                const particles = laser.children[4];
                if (particles && particles.geometry) {
                    const positions = particles.geometry.attributes.position.array;
                    const count = positions.length / 3;
                    
                    for (let i = 0; i < count; i++) {
                        // Faire bouger légèrement les particules
                        positions[i * 3] += (Math.random() - 0.5) * 0.05;
                        positions[i * 3 + 1] += (Math.random() - 0.5) * 0.05;
                        positions[i * 3 + 2] += (Math.random() - 0.5) * 0.05;
                        
                        // Réinitialiser les particules qui s'éloignent trop
                        if (Math.abs(positions[i * 3]) > laser.children[2].geometry.parameters.width / 2) {
                            positions[i * 3] = (Math.random() - 0.5) * laser.children[2].geometry.parameters.width;
                        }
                        if (Math.abs(positions[i * 3 + 1] - 1.0) > 0.3) {
                            positions[i * 3 + 1] = 1.0 + (Math.random() - 0.5) * 0.2;
                        }
                        if (Math.abs(positions[i * 3 + 2]) > 0.3) {
                            positions[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
                        }
                    }
                    
                    particles.geometry.attributes.position.needsUpdate = true;
                }
            }
        }
    });
}

function updateEnvironment(time) {
    // Animation des étoiles
    if (skyEnabled && stars.length > 0) {
        stars.forEach((star, index) => {
            star.material.opacity = 0.5 + Math.sin(time * 0.001 + index) * 0.5;
        });
    }
    
    // Animation des nuages
    if (skyEnabled && clouds.length > 0) {
        clouds.forEach((cloud, index) => {
            cloud.position.x += Math.sin(time * 0.0001 + index) * 0.01;
            cloud.position.z += Math.cos(time * 0.0001 + index * 0.5) * 0.01;
        });
    }
    
    // Animation du fond 2D
    if (background2D) {
        // Rotation légère pour donner un effet de mouvement
        background2D.rotation.y = Math.sin(time * 0.0001) * 0.05;
        
        // Effet de pulsation
        const scale = 1 + Math.sin(time * 0.0005) * 0.02;
        background2D.scale.set(scale, scale, 1);
    }
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