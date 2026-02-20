// Configuration
const CONFIG = {
  imageCount: 10, // User mentioned 10 images
  basePath: '',
  imageNamePrefix: 'c',
  imageExtension: '.JPG'
};

// Map marker positions (in percentage x, y)
// The user can adjust these values to match their actual locations on the map image
const MARKER_POSITIONS = {
  'c1.JPG': { x: 60, y: 50 },
  'c2.JPG': { x: 45, y: 50 },
  'c3.JPG': { x: 35, y: 50 },
  'c4.JPG': { x: 35, y: 65 },
  'c5.JPG': { x: 55, y: 65 },
  'c6.JPG': { x: 75, y: 65 },
  // 'c7.JPG': { x: 60, y: 45 },
  // 'c8.JPG': { x: 65, y: 25 },
  // 'c9.JPG': { x: 65, y: 15 },
  // 'c10.JPG': { x: 5, y: 5 }
};

// Global variables
let imageFiles = [];
let currentSource = null;
let currentScene = null;
let viewer = null;
let currentImageFile = '';

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
  initializeApp();
});

// Main initialization function
async function initializeApp() {
  // Wait for Marzipano to be loaded before initializing
  if (typeof Marzipano === 'undefined') {
    console.error('Marzipano library failed to load');
    setTimeout(initializeApp, 100);
    return;
  }

  const viewerContainer = document.getElementById('pano-container');
  viewer = new Marzipano.Viewer(viewerContainer);

  await populateImageList();
  setupEventListeners();
  setupMapMarkers();
}

// Function to fetch and populate image list
async function populateImageList() {
  try {
    const url = CONFIG.basePath ? `/${CONFIG.basePath}/image-list.json` : '/image-list.json';
    const response = await fetch(url);
    if (response.ok) {
      const imageNames = await response.json();
      imageFiles = imageNames.map(name => {
        return CONFIG.basePath ? `${CONFIG.basePath}/${name}` : name;
      });
    } else {
      imageFiles = [];
      for (let i = 1; i <= CONFIG.imageCount; i++) {
        imageFiles.push(`${CONFIG.basePath}/${CONFIG.imageNamePrefix}${i}${CONFIG.imageExtension}`);
      }
    }
  } catch (error) {
    console.warn('Could not fetch image-list.json, using sequential fallback');
    imageFiles = [];
    for (let i = 1; i <= CONFIG.imageCount; i++) {
      imageFiles.push(`${CONFIG.basePath}/${CONFIG.imageNamePrefix}${i}${CONFIG.imageExtension}`);
    }
  }

  // Preload images in the background for faster switching
  preloadImages();
}

// Function to preload images into browser cache
function preloadImages() {
  // Start preloading after a short delay to prioritize the first image load
  setTimeout(() => {
    imageFiles.forEach((file, index) => {
      // Don't preload the first one (it's already loading)
      if (index === 0) return;

      const img = new Image();
      // Use a slight delay between starting each preload to avoid network congestion
      setTimeout(() => {
        img.src = `/${file}`;
        img.onload = () => console.log(`Preloaded: ${file}`);
      }, index * 1000);
    });
  }, 2000);
}

// Function to setup map markers
function setupMapMarkers() {
  const markerContainer = document.getElementById('map-markers');
  if (!markerContainer) return;

  markerContainer.innerHTML = '';

  imageFiles.forEach((file, index) => {
    // Extract just the filename to match MARKER_POSITIONS
    const fileName = file.split('/').pop();
    const pos = MARKER_POSITIONS[fileName];

    if (pos) {
      const marker = document.createElement('div');
      marker.className = 'map-marker';
      marker.style.left = `${pos.x}%`;
      marker.style.top = `${pos.y}%`;
      marker.title = fileName;
      marker.dataset.file = file;
      marker.textContent = index + 1; // Add the number here

      marker.addEventListener('click', () => {
        if (currentImageFile !== file) {
          loadImage(file);
        }
      });

      markerContainer.appendChild(marker);
    }
  });
}

// Function to update active marker
function updateActiveMarker(activeFile) {
  const markers = document.querySelectorAll('.map-marker');
  markers.forEach(m => {
    if (m.dataset.file === activeFile) {
      m.classList.add('active');
    } else {
      m.classList.remove('active');
    }
  });
}

// Function to set up event listeners
function setupEventListeners() {
  // Load the first image by default
  if (imageFiles.length > 0) {
    loadImage(imageFiles[0]);
  }

  // Zoom controls (now inside the map panel)
  const zoomInBtn = document.getElementById('zoom-in');
  const zoomOutBtn = document.getElementById('zoom-out');
  const resetBtn = document.getElementById('reset-view');

  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => {
      if (currentScene) {
        const view = currentScene.view();
        view.setFov(Math.max(view.fov() * 0.75, 0.1));
      }
    });
  }

  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => {
      if (currentScene) {
        const view = currentScene.view();
        view.setFov(Math.min(view.fov() * 1.25, Math.PI));
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (currentScene) {
        currentScene.view().setFov(Math.PI / 2);
        currentScene.view().setYaw(0);
        currentScene.view().setPitch(0);
      }
    });
  }

  // UI Toggle functionality
  const uiToggleBtn = document.getElementById('ui-toggle-btn');
  const mapContainer = document.getElementById('map-container');

  if (uiToggleBtn) {
    uiToggleBtn.addEventListener('click', () => {
      if (mapContainer) mapContainer.classList.toggle('ui-hidden');
    });
  }

  // Keyboard controls
  document.addEventListener('keydown', (event) => {
    if (!currentScene) return;
    const view = currentScene.view();
    const step = 0.1;

    switch (event.key) {
      case 'ArrowLeft': view.setYaw(view.yaw() - step); break;
      case 'ArrowRight': view.setYaw(view.yaw() + step); break;
      case 'ArrowUp': view.setPitch(Math.max(view.pitch() - step, -Math.PI / 2)); break;
      case 'ArrowDown': view.setPitch(Math.min(view.pitch() + step, Math.PI / 2)); break;
      case '+': case '=': view.setFov(Math.max(view.fov() * 0.9, 0.01)); break;
      case '-': view.setFov(Math.min(view.fov() * 1.1, Math.PI)); break;
      case '0':
        view.setFov(Math.PI / 2);
        view.setYaw(0);
        view.setPitch(0);
        break;
    }
  });
}

// Function to load a new image
function loadImage(imageFile) {
  if (currentImageFile === imageFile) return;
  currentImageFile = imageFile;

  // Update map UI immediately for better feedback
  updateActiveMarker(imageFile);

  // Create source from image
  currentSource = Marzipano.ImageUrlSource.fromString(
    `/${imageFile}`,
    { width: 4000, height: 2000 }
  );

  const geometry = new Marzipano.EquirectGeometry([{ width: 4000 }]);
  const view = new Marzipano.RectilinearView();

  const newScene = viewer.createScene({
    source: currentSource,
    geometry: geometry,
    view: view,
    pinFirstLevel: true
  });

  setTimeout(() => {
    newScene.switchTo({ transitionDuration: 1000 });
    setTimeout(() => {
      if (currentScene && currentScene !== newScene) {
        currentScene.destroy();
      }
      currentScene = newScene;
    }, 1200);
  }, 100);
}
