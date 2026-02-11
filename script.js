// =======================
// INICIALIZACIÓN
// =======================
let scene, camera, renderer;
let earth, stars, galaxy, atmosphere;
let controls;
let isDragging = false;
let autoRotate = true;
let dayNightCycle = true;
let galaxyMode = false;
let zoomLevel = 1.0;

// Variables de control de movimiento
const keys = {};
let mouseX = 0;
let mouseY = 0;
let mouseDown = false;

// Posición inicial de la cámara
let cameraDistance = 10;
let cameraTarget = new THREE.Vector3(0, 0, 0);

// =======================
// TEXTURAS Y MATERIALES
// =======================
const textures = {
    earth: {
        map: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg',
        bump: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_normal_2048.jpg',
        specular: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_specular_2048.jpg',
        clouds: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_clouds_1024.png'
    }
};

// =======================
// INICIALIZAR ESCENA
// =======================
function init() {
    // Crear escena
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 50, 300);

    // Crear cámara
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 3, cameraDistance);

    // Crear renderer
    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('gameCanvas'),
        antialias: true,
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Crear controles
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.5;
    controls.minDistance = 2;
    controls.maxDistance = 50;

    // Crear elementos
    createStars();
    createGalaxy();
    createEarth();
    createAtmosphere();
    createLights();

    // Configurar eventos
    setupEventListeners();

    // Ocultar loading screen
    setTimeout(() => {
        document.querySelector('.loading').style.opacity = '0';
        setTimeout(() => {
            document.querySelector('.loading').style.display = 'none';
        }, 500);
    }, 1000);

    // Iniciar animación
    animate();
}

// =======================
// CREAR ESTRELLAS
// =======================
function createStars() {
    const starCount = 5000;
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.1,
        transparent: true
    });

    const starVertices = [];

    for (let i = 0; i < starCount; i++) {
        const x = THREE.MathUtils.randFloatSpread(1000);
        const y = THREE.MathUtils.randFloatSpread(1000);
        const z = THREE.MathUtils.randFloatSpread(1000);
        starVertices.push(x, y, z);
    }

    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
}

// =======================
// CREAR VÍA LÁCTEA
// =======================
function createGalaxy() {
    const galaxyGeometry = new THREE.SphereGeometry(200, 32, 32);
    const galaxyMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0.0 }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            varying vec2 vUv;

            void main() {
                vec2 uv = vUv * 2.0 - 1.0;
                float dist = length(uv);

                // Crear efecto espiral de galaxia
                float angle = atan(uv.y, uv.x);
                float spiral = sin(angle * 5.0 + dist * 10.0 + time) * 0.5 + 0.5;

                // Crear núcleo brillante
                float core = 1.0 - smoothstep(0.0, 0.5, dist);

                // Combinar efectos
                float intensity = mix(spiral * 0.3, 0.8, core);

                // Colores de la Vía Láctea
                vec3 color = mix(
                    vec3(0.1, 0.1, 0.3),
                    vec3(0.8, 0.8, 1.0),
                    intensity
                );

                gl_FragColor = vec4(color, intensity * 0.3);
            }
        `,
        transparent: true,
        side: THREE.BackSide
    });

    galaxy = new THREE.Mesh(galaxyGeometry, galaxyMaterial);
    scene.add(galaxy);
}

// =======================
// CREAR TIERRA
// =======================
function createEarth() {
    const earthGeometry = new THREE.SphereGeometry(5, 64, 64);

    // Textura de la Tierra
    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load(textures.earth.map);
    const bumpTexture = textureLoader.load(textures.earth.bump);
    const specularTexture = textureLoader.load(textures.earth.specular);
    const cloudsTexture = textureLoader.load(textures.earth.clouds);

    const earthMaterial = new THREE.MeshPhongMaterial({
        map: earthTexture,
        bumpMap: bumpTexture,
        bumpScale: 0.05,
        specularMap: specularTexture,
        specular: new THREE.Color(0x333333),
        shininess: 5
    });

    earth = new THREE.Mesh(earthGeometry, earthMaterial);
    earth.castShadow = true;
    earth.receiveShadow = true;
    scene.add(earth);

    // Crear nubes
    const cloudsGeometry = new THREE.SphereGeometry(5.1, 64, 64);
    const cloudsMaterial = new THREE.MeshPhongMaterial({
        map: cloudsTexture,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide
    });

    const clouds = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
    earth.add(clouds);
}

// =======================
// CREAR ATMÓSFERA
// =======================
function createAtmosphere() {
    const atmosphereGeometry = new THREE.SphereGeometry(5.2, 64, 64);
    const atmosphereMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0.0 }
        },
        vertexShader: `
            varying vec3 vNormal;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            varying vec3 vNormal;

            void main() {
                float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
                vec3 atmosphereColor = mix(
                    vec3(0.3, 0.6, 1.0),
                    vec3(0.8, 0.9, 1.0),
                    sin(time * 0.5) * 0.5 + 0.5
                );
                gl_FragColor = vec4(atmosphereColor, intensity * 0.3);
            }
        `,
        transparent: true,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending
    });

    atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    earth.add(atmosphere);
}

// =======================
// CREAR LUCES
// =======================
function createLights() {
    // Luz principal (Sol)
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
    sunLight.position.set(50, 30, 30);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    scene.add(sunLight);

    // Luz ambiental
    const ambientLight = new THREE.AmbientLight(0x333344, 0.1);
    scene.add(ambientLight);

    // Luz de relleno
    const fillLight = new THREE.DirectionalLight(0x4466aa, 0.3);
    fillLight.position.set(-30, 20, -30);
    scene.add(fillLight);
}

// =======================
// EVENT LISTENERS
// =======================
function setupEventListeners() {
    // Mouse events
    renderer.domElement.addEventListener('mousedown', (e) => {
        mouseDown = true;
        document.body.classList.add('grabbing');
        isDragging = true;
    });

    renderer.domElement.addEventListener('mouseup', () => {
        mouseDown = false;
        document.body.classList.remove('grabbing');
        isDragging = false;
    });

    renderer.domElement.addEventListener('mousemove', (e) => {
        if (mouseDown) {
            mouseX = e.movementX * 0.005;
            mouseY = e.movementY * 0.005;
        }
    });

    // Wheel (zoom)
    renderer.domElement.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        zoomLevel *= zoomFactor;
        zoomLevel = Math.max(0.5, Math.min(zoomLevel, 5.0));

        cameraDistance *= zoomFactor;
        cameraDistance = Math.max(2, Math.min(cameraDistance, 50));

        updateInfoPanel();
    });

    // Keyboard events
    document.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        handleSpecialKeys(e.code);
    });

    document.addEventListener('keyup', (e) => {
        keys[e.code] = false;
    });

    // Window resize
    window.addEventListener('resize', onWindowResize);
}

function handleSpecialKeys(key) {
    switch(key) {
        case 'KeyR': // Reset
            resetView();
            break;
        case 'Space': // Auto-rotación
            autoRotate = !autoRotate;
            updateInfoPanel();
            break;
        case 'KeyM': // Modo Vía Láctea
            galaxyMode = !galaxyMode;
            galaxy.visible = galaxyMode;
            updateInfoPanel();
            break;
        case 'KeyN': // Ciclo día/noche
            dayNightCycle = !dayNightCycle;
            updateInfoPanel();
            break;
    }
}

// =======================
// RESET VIEW
// =======================
function resetView() {
    controls.reset();
    cameraDistance = 10;
    zoomLevel = 1.0;
    camera.position.set(0, 3, cameraDistance);
    camera.lookAt(cameraTarget);
    updateInfoPanel();
}

// =======================
// MOVIMIENTO CON TECLADO
// =======================
function handleKeyboardMovement() {
    const moveSpeed = 0.1;
    const rotateSpeed = 0.02;

    // Movimiento de cámara
    if (keys['KeyW']) { // Adelante
        camera.position.z -= moveSpeed;
    }
    if (keys['KeyS']) { // Atrás
        camera.position.z += moveSpeed;
    }
    if (keys['KeyA']) { // Izquierda
        camera.position.x -= moveSpeed;
    }
    if (keys['KeyD']) { // Derecha
        camera.position.x += moveSpeed;
    }
    if (keys['KeyQ']) { // Ascender
        camera.position.y += moveSpeed;
    }
    if (keys['KeyE']) { // Descender
        camera.position.y -= moveSpeed;
    }

    // Rotación manual
    if (keys['ArrowLeft']) {
        earth.rotation.y += rotateSpeed;
    }
    if (keys['ArrowRight']) {
        earth.rotation.y -= rotateSpeed;
    }
    if (keys['ArrowUp']) {
        earth.rotation.x += rotateSpeed;
    }
    if (keys['ArrowDown']) {
        earth.rotation.x -= rotateSpeed;
    }
}

// =======================
// UPDATE INFO PANEL
// =======================
function updateInfoPanel() {
    document.getElementById('zoomLevel').textContent = zoomLevel.toFixed(1) + 'x';
    document.getElementById('rotX').textContent = (earth.rotation.x * (180/Math.PI)).toFixed(1) + '°';
    document.getElementById('rotY').textContent = (earth.rotation.y * (180/Math.PI)).toFixed(1) + '°';
    document.getElementById('currentMode').textContent =
        galaxyMode ? 'Vía Láctea' :
        dayNightCycle ? 'Día/Noche' : 'Navegación';
}

// =======================
// WINDOW RESIZE
// =======================
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// =======================
// ANIMATION LOOP
// =======================
function animate() {
    requestAnimationFrame(animate);

    const time = Date.now() * 0.001;

    // Rotación automática de la Tierra
    if (autoRotate) {
        earth.rotation.y += 0.002;
    }

    // Rotación manual con mouse
    if (isDragging) {
        earth.rotation.y += mouseX;
        earth.rotation.x += mouseY;
        mouseX = mouseY = 0;
    }

    // Ciclo día/noche
    if (dayNightCycle) {
        scene.children.forEach(child => {
            if (child.type === 'DirectionalLight') {
                child.position.x = Math.cos(time * 0.1) * 50;
                child.position.z = Math.sin(time * 0.1) * 50;
            }
        });
    }

    // Animación de nubes
    if (earth.children[0]) {
        earth.children[0].rotation.y += 0.0005;
    }

    // Animación de atmósfera
    if (atmosphere && atmosphere.material.uniforms.time) {
        atmosphere.material.uniforms.time.value = time;
    }

    // Animación de galaxia
    if (galaxy && galaxy.material.uniforms.time) {
        galaxy.material.uniforms.time.value = time;
    }

    // Manejar movimiento con teclado
    handleKeyboardMovement();

    // Actualizar controles
    controls.update();

    // Actualizar panel de información
    updateInfoPanel();

    // Renderizar
    renderer.render(scene, camera);
}

// =======================
// INICIALIZAR
// =======================
window.onload = init;
