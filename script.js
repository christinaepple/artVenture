let scene, camera, renderer, controls;
let layers = [];
let isSwitchScreen = false; // Flag for switching screen
let isJPGScreen = false; // Flag for JPG screen
let initialPinchDistance = null; // Stores the initial pinch distance for zooming
let initialFOV; // Store the initial field of view (FOV)
let compassInitialized = false; // Track if compass is initialized

let aspect = window.innerWidth / window.innerHeight;
const frustumSize = 600;

const textureLoader = new THREE.TextureLoader();
const preloadedTextures = {};

function loadTextures() {
    const layerConfigs = [
        { texture: 'img/backnew.png', radius: 500, speed: 0.1 },
        { texture: 'img/middlenew.png', radius: 490, speed: 0.2 },
        { texture: 'img/frontnew.png', radius: 480, speed: 0.3 },
    ];
    layerConfigs.forEach(config => {
        preloadedTextures[config.texture] = textureLoader.load(config.texture);
    });
}

function init() {
    const layerConfigs = [
        { texture: 'img/backnew.png', radius: 500, speed: 0.1 },
        { texture: 'img/middlenew.png', radius: 490, speed: 0.2 },
        { texture: 'img/frontnew.png', radius: 480, speed: 0.3 },
    ];

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    initialFOV = camera.fov;

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.id = 'panoramaCanvas';
    document.body.appendChild(renderer.domElement);

    layerConfigs.forEach(config => {
        const geometry = new THREE.SphereGeometry(config.radius, 200, 100);
        geometry.scale(-1, 1, 1);
        const material = new THREE.MeshBasicMaterial({
            map: preloadedTextures[config.texture],
            transparent: true,
        });
        const layer = new THREE.Mesh(geometry, material);
        layer.userData.speed = config.speed;
        layers.push(layer);
        scene.add(layer);
    });

    controls = new THREE.DeviceOrientationControls(camera);

    window.addEventListener('resize', onWindowResize);
    window.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', () => (initialPinchDistance = null));

    // Add click event listener for switching to JPG screen
    renderer.domElement.addEventListener('click', showJPGScreen);
}

// Show JPG Screen Overlay
function showJPGScreen() {
    const jpgOverlay = document.getElementById('jpgOverlay');
    if (!jpgOverlay) {
        console.error('JPG Overlay not found.');
        return;
    }
    isJPGScreen = true;
    jpgOverlay.style.display = 'flex';

    // Reinitialize switchOverlay functionality for JPG screen
    setupSwitchScreenTriggerForJPG();

}

// Hide JPG Screen Overlay
function hideJPGScreen() {
    const jpgOverlay = document.getElementById('jpgOverlay');
    if (!jpgOverlay) {
        console.error('JPG Overlay not found.');
        return;
    }
    isJPGScreen = false;
    jpgOverlay.style.display = 'none';

    // Restore switchOverlay functionality for main screen
    setupSwitchScreenTrigger();

}

// Initialize compass functionality
function initializeCompass() {
    if (window.DeviceOrientationEvent) {
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission()
                .then(permissionState => {
                    if (permissionState === 'granted') {
                        window.addEventListener('deviceorientation', updateArrow);
                        compassInitialized = true;
                    } else {
                        alert('Permission denied for device orientation.');
                    }
                })
                .catch(console.error);
        } else {
            window.addEventListener('deviceorientation', updateArrow);
            compassInitialized = true;
        }
    } else {
        alert('Device orientation is not supported on this device.');
    }
}

// Update compass arrow rotation
function updateArrow(event) {
    const arrow = document.getElementById('arrow');
    if (arrow && event.alpha !== null) {
        const alpha = event.alpha; // Rotation around the z-axis (0–360 degrees)
        arrow.style.transform = `translate(-50%, -50%) rotate(${alpha}deg)`;
    }
}

// Handle pinch zoom (start)
function onTouchStart(event) {
    if (event.touches.length === 2) {
        initialPinchDistance = getPinchDistance(event.touches);
    }
}

// Handle pinch zoom (move)
function onTouchMove(event) {
    if (event.touches.length === 2 && initialPinchDistance) {
        const currentDistance = getPinchDistance(event.touches);
        const zoomFactor = initialPinchDistance / currentDistance;
        camera.fov = THREE.MathUtils.clamp(initialFOV * zoomFactor, 30, 100);
        camera.updateProjectionMatrix();
    }
}

// Utility function to calculate the distance between two touch points
function getPinchDistance(touches) {
    const dx = touches[0].pageX - touches[1].pageX;
    const dy = touches[0].pageY - touches[1].pageY;
    return Math.sqrt(dx * dx + dy * dy);
}

// Update parallax effect
function updateParallax() {
    layers.forEach(layer => {
        layer.rotation.y = camera.rotation.y * layer.userData.speed;
        layer.rotation.x = camera.rotation.x * layer.userData.speed;
    });
}

// Animation Loop
function animate() {
    requestAnimationFrame(animate);
    if (!isSwitchScreen && !isJPGScreen) {
        controls.update();
        updateParallax();
        renderer.render(scene, camera);
    }
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Setup switch screen trigger for JPG screen
function setupSwitchScreenTriggerForJPG() {
    window.addEventListener('deviceorientation', event => {
        if (!isJPGScreen) return; // Only active in JPG screen

        const beta = event.beta;
        const gamma = event.gamma;
        const isFlat = Math.abs(beta) < 50 && Math.abs(gamma) < 30;

        if (isFlat && !isSwitchScreen) {
            showSwitchScreen();
        } else if (!isFlat && isSwitchScreen) {
            hideSwitchScreen();
        }
    });
}

// Show switch screen (general function)
function showSwitchScreen() {
    const switchOverlay = document.getElementById('switchOverlay');
    if (!switchOverlay) {
        console.error('Switch Overlay not found.');
        return;
    }
    isSwitchScreen = true;
    switchOverlay.style.display = 'flex';

    // Initialize compass functionality
    if (!compassInitialized) {
        initializeCompass();
    }
}

// Hide switch screen
function hideSwitchScreen() {
    const switchOverlay = document.getElementById('switchOverlay');
    if (!switchOverlay) {
        console.error('Switch Overlay not found.');
        return;
    }
    isSwitchScreen = false;
    switchOverlay.style.display = 'none';

    // Remove compass listener to save resources
    window.removeEventListener('deviceorientation', updateArrow);
    compassInitialized = false;
}

// Initialize device orientation with iOS permission handling
function initializeDeviceOrientation() {
    const startScreen = document.getElementById('startScreen');
    if (window.DeviceOrientationEvent) {
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission()
                .then(permissionState => {
                    if (permissionState === 'granted') {
                        startScreen.classList.add('hidden');
                        setTimeout(() => startScreen.style.display = 'none', 500);
                        init(preloadedTextures);
                        animate();
                    } else {
                        alert('Permission denied for device orientation.');
                    }
                })
                .catch(console.error);
        } else {
            startScreen.classList.add('hidden');
            setTimeout(() => startScreen.style.display = 'none', 500);
            init(preloadedTextures);
            animate();
        }
    } else {
        alert('Device orientation is not supported on this device.');
    }
}

// Call preloadedTextures on page load
loadTextures();

// Add event listener to start button
document.getElementById('startButton').addEventListener('click', () => {
    document.getElementById('startScreen').style.display = 'none';
    init();
    animate();
});


function adjustForSafeArea() {
    const safeAreaTop = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-top)'));
    const safeAreaBottom = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-bottom)'));

    document.body.style.paddingTop = `${safeAreaTop}px`;
    document.body.style.paddingBottom = `${safeAreaBottom}px`;
}

// Run adjustment on page load
window.addEventListener('load', adjustForSafeArea);


