// Configuration
let CONFIG = {
  imageCount: 24,
  basePath: 'image/690116',
  imageNamePrefix: 'c',
  imageExtension: '.JPG'
};

// Available date folders (will be populated dynamically)
let DATE_FOLDERS = [];

// Default Map marker positions
let MARKER_POSITIONS = {
  'c1.JPG': { x: 70, y: 45 },
  'c2.JPG': { x: 50, y: 45 },
  'c3.JPG': { x: 35, y: 45 },
  'c4.JPG': { x: 30, y: 70 },
  'c5.JPG': { x: 50, y: 70 },
  'c6.JPG': { x: 80, y: 70 },
  'c8.JPG': { x: 80, y: 20 },
  'c9.JPG': { x: 80, y: 10 },
  'c10.JPG': { x: 60, y: 10 },
};

// Variable to store current folder's positions
let CURRENT_MARKER_POSITIONS = {};

// Global variables
let imageFiles = [];
let currentSource = null;
let currentScene = null;
let viewer = null;
let currentImageFile = '';
let currentMarkerIndex = 0;

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
  initializeApp();
});

// Helper to format folder name (YYMMDD) to Thai date
function formatThaiDate(folderName) {
  const months = ['มค.', 'กพ.', 'มีค.', 'เมย.', 'พค.', 'มิย.', 'กค.', 'สค.', 'กย.', 'ตค.', 'พย.', 'ธค.'];
  const day = parseInt(folderName.substring(4, 6));
  const monthIdx = parseInt(folderName.substring(2, 4)) - 1;
  const year = folderName.substring(0, 2);
  return `${day} ${months[monthIdx]} ${year}`;
}

// Helper to convert folder name (YYMMDD) to a Date object
function folderToDate(folderName) {
  const year = 2500 + parseInt(folderName.substring(0, 2)) - 543; // Convert Thai year to AD
  const month = parseInt(folderName.substring(2, 4)) - 1;
  const day = parseInt(folderName.substring(4, 6));
  return new Date(year, month, day);
}

// Main initialization function
async function initializeApp() {
  if (typeof Marzipano === 'undefined') {
    console.error('Marzipano library failed to load');
    setTimeout(initializeApp, 100);
    return;
  }

  // Fetch dynamic folder list before initializing UI
  await loadCatalog();

  const viewerContainer = document.getElementById('pano-container');
  viewer = new Marzipano.Viewer(viewerContainer, { stage: { preserveDrawingBuffer: true } });

  const dateSlider = document.getElementById('date-slider');
  const dateDisplay = document.getElementById('date-display');
  const overlayDateText = document.getElementById('overlay-date-text');

  if (dateSlider) {
    // Use 0-100 for smoother scrolling on timeline
    dateSlider.min = 0;
    dateSlider.max = 100;
    dateSlider.value = 0;
    
    const initialDate = DATE_FOLDERS[0];
    const formattedDate = formatThaiDate(initialDate);
    
    CONFIG.basePath = `image/${initialDate}`;
    if (dateDisplay) dateDisplay.textContent = formattedDate;
    if (overlayDateText) overlayDateText.textContent = formattedDate;
    
    dateSlider.addEventListener('input', handleSliderChange);
    
    // Create ticks based on actual date spacing
    setupTimelineTicks();
  }

  // Setup simple capture logic
  const captureBtn = document.getElementById('capture-btn');
  if (captureBtn) {
    captureBtn.addEventListener('click', () => {
      exportViewAsImage(true);
    });
  }

  try {
    await updateAppContent();
  } catch (error) {
    console.error('Error in initial content update:', error);
  }
  
  setupEventListeners();
}

// Function to create ticks on the timeline based on actual date distance
function setupTimelineTicks() {
  const ticksContainer = document.getElementById('slider-ticks');
  if (!ticksContainer || DATE_FOLDERS.length < 2) return;
  
  ticksContainer.innerHTML = '';
  
  const firstDate = folderToDate(DATE_FOLDERS[0]).getTime();
  const lastDate = folderToDate(DATE_FOLDERS[DATE_FOLDERS.length - 1]).getTime();
  const totalDuration = lastDate - firstDate;

  DATE_FOLDERS.forEach((folder) => {
    const currentDate = folderToDate(folder).getTime();
    const percentage = ((currentDate - firstDate) / totalDuration) * 100;
    
    const tick = document.createElement('div');
    tick.className = 'tick';
    tick.style.position = 'absolute';
    tick.style.left = `${percentage}%`;
    tick.style.transform = 'translateX(-50%)';
    ticksContainer.appendChild(tick);
  });
}

// Function to handle slider changes and snap to nearest date
async function handleSliderChange(event) {
  const sliderPercent = parseInt(event.target.value);
  
  const firstDate = folderToDate(DATE_FOLDERS[0]).getTime();
  const lastDate = folderToDate(DATE_FOLDERS[DATE_FOLDERS.length - 1]).getTime();
  const totalDuration = lastDate - firstDate;
  
  // Calculate the time at the current slider position
  const targetTime = firstDate + (totalDuration * (sliderPercent / 100));
  
  // Find the folder with the closest date
  let closestFolder = DATE_FOLDERS[0];
  let minDiff = Math.abs(targetTime - folderToDate(DATE_FOLDERS[0]).getTime());
  
  DATE_FOLDERS.forEach(folder => {
    const diff = Math.abs(targetTime - folderToDate(folder).getTime());
    if (diff < minDiff) {
      minDiff = diff;
      closestFolder = folder;
    }
  });

  // Only update if the date actually changed
  const newBasePath = `image/${closestFolder}`;
  if (CONFIG.basePath === newBasePath) return;

  const formattedDate = formatThaiDate(closestFolder);
  const dateDisplay = document.getElementById('date-display');
  const overlayDateText = document.getElementById('overlay-date-text');
  
  if (dateDisplay) dateDisplay.textContent = formattedDate;
  if (overlayDateText) overlayDateText.textContent = formattedDate;
  
  CONFIG.basePath = newBasePath;
  
  // Save current marker index
  const currentFileName = currentImageFile.split('/').pop();
  currentMarkerIndex = imageFiles.findIndex(f => f.endsWith(currentFileName));
  if (currentMarkerIndex === -1) currentMarkerIndex = 0;

  await updateAppContent();
}

// Function to export view as PNG
function exportViewAsImage(includeDate) {
  // Find the canvas element inside the container
  const canvas = document.querySelector('#pano-container canvas');
  if (!canvas) {
    console.error('Canvas element not found');
    alert('Error: Could not find the image to export.');
    return;
  }

  try {
    // Create a temporary canvas to add the watermark
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const ctx = tempCanvas.getContext('2d');

    // Draw the current view
    ctx.drawImage(canvas, 0, 0);

    if (includeDate) {
      const overlayText = document.getElementById('overlay-date-text');
      const dateText = overlayText ? overlayText.textContent : 'No Date';
      
      // Scale font size based on canvas width
      const fontSize = Math.max(24, Math.floor(canvas.width / 40));
      ctx.font = `bold ${fontSize}px "Noto Sans Thai Looped", sans-serif`;
      ctx.fillStyle = 'white';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.textAlign = 'right';
      
      // Position in bottom right corner with padding
      ctx.fillText(dateText, tempCanvas.width - (fontSize * 1.5), tempCanvas.height - (fontSize * 1.5));
    }

    // Create download link
    const slider = document.getElementById('date-slider');
    const dateIdx = slider ? parseInt(slider.value) : 0;
    const dateStr = DATE_FOLDERS[dateIdx] || 'current';
    
    const link = document.createElement('a');
    link.download = `360-view-${dateStr}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    
    // Append to body, click, and remove to ensure it works in all browsers
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('Image exported successfully');
  } catch (error) {
    console.error('Export failed:', error);
    alert('Failed to export image. This might be due to security restrictions in the browser.');
  }
}

// Function to update app content
async function updateAppContent() {
  await loadPositions(); // Load per-folder positions
  await populateImageList();
  setupMapMarkers();
  
  if (imageFiles.length > 0) {
    const indexToLoad = Math.min(currentMarkerIndex, imageFiles.length - 1);
    loadImage(imageFiles[indexToLoad]);
  }
}

// Function to load positions for the current folder
async function loadPositions() {
  try {
    const timestamp = new Date().getTime();
    const url = `/${CONFIG.basePath}/positions.json?v=${timestamp}`;
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      CURRENT_MARKER_POSITIONS = data;
      console.log('Loaded folder-specific positions');
    } else {
      // Fallback to defaults
      CURRENT_MARKER_POSITIONS = JSON.parse(JSON.stringify(MARKER_POSITIONS));
      console.log('Using default marker positions');
    }
  } catch (error) {
    CURRENT_MARKER_POSITIONS = JSON.parse(JSON.stringify(MARKER_POSITIONS));
  }
}

// Function to save positions for the current folder
async function savePositions() {
  console.log('--- Start savePositions ---');
  if (!currentImageFile) {
    console.error('No current image file loaded');
    return;
  }

  const currentFolder = CONFIG.basePath.split('/').pop();
  const currentFileName = currentImageFile.split('/').pop();
  
  // Show visual feedback on the header
  const mapHeader = document.getElementById('map-header');
  const mapTitle = document.getElementById('map-title');
  const originalTitle = mapTitle ? mapTitle.textContent : 'Mini Map';
  
  if (mapHeader) mapHeader.classList.add('saving');
  if (mapTitle) mapTitle.textContent = 'SAVING...';

  console.log(`Saving for Folder: ${currentFolder}, File: ${currentFileName}`);

  try {
    // 2. Capture and prepare data INSIDE try-catch to prevent permanent "SAVING" state
    const activeScene = currentScene || viewer.scene();
    if (activeScene) {
      const view = activeScene.view();
      // Get all parameters at once for consistency
      const params = view.parameters ? view.parameters() : {};
      
      if (!CURRENT_MARKER_POSITIONS[currentFileName]) {
        CURRENT_MARKER_POSITIONS[currentFileName] = { x: 50, y: 50 };
      }
      
      // Update values from current view state
      CURRENT_MARKER_POSITIONS[currentFileName].yaw = Number((view.yaw ? view.yaw() : (params.yaw || 0)).toFixed(4));
      CURRENT_MARKER_POSITIONS[currentFileName].pitch = Number((view.pitch ? view.pitch() : (params.pitch || 0)).toFixed(4));
      
      // Capture Zoom (vfov/fov)
      let currentZoom = params.vfov || (typeof view.vfov === 'function' ? view.vfov() : (typeof view.fov === 'function' ? view.fov() : Math.PI / 2));
      CURRENT_MARKER_POSITIONS[currentFileName].vfov = Number(currentZoom.toFixed(4));
      
      console.log(`Captured state for ${currentFileName}:`, CURRENT_MARKER_POSITIONS[currentFileName]);
    }

    const url = '/api/save-positions';
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        folder: currentFolder,
        positions: CURRENT_MARKER_POSITIONS
      })
    });
    
    const result = await response.json();
    if (result.success) {
      if (mapTitle) mapTitle.textContent = 'SAVED ✓';
      console.log('Save successful');
    } else {
      throw new Error(result.error || 'Server rejected the save');
    }
  } catch (error) {
    console.error('Save error details:', error);
    alert('บันทึกไม่สำเร็จ: ' + error.message);
    if (mapTitle) mapTitle.textContent = originalTitle;
  } finally {
    setTimeout(() => {
      if (mapHeader) mapHeader.classList.remove('saving');
      if (mapTitle && (mapTitle.textContent === 'SAVED ✓' || mapTitle.textContent === 'SAVING...')) {
        mapTitle.textContent = originalTitle;
      }
    }, 2000);
  }
}

// Function to fetch the dynamic catalog of image folders
async function loadCatalog() {
  try {
    const timestamp = new Date().getTime(); // Cache busting
    console.log('Fetching image catalog...');

    // Try API first (dev), then fallback to static JSON (prod)
    let response = await fetch(`/api/image-catalog?v=${timestamp}`);
    
    // Check if we got JSON, NOT HTML (Vite fallback)
    const contentType = response.headers.get('content-type');
    if (!response.ok || !contentType || !contentType.includes('application/json')) {
      console.warn('API /api/image-catalog failed or returned non-JSON, trying static file...');
      response = await fetch(`/image-catalog.json?v=${timestamp}`);
    }
    
    if (response.ok) {
      const data = await response.json();
      if (data.folders && data.folders.length > 0) {
        DATE_FOLDERS = data.folders;
        console.log('Successfully loaded dynamic folders:', DATE_FOLDERS);
      } else {
        console.warn('Catalog loaded but folders list is empty');
      }
    } else {
      console.error('Failed to load both API and static catalog file');
    }
  } catch (error) {
    console.error('Error in loadCatalog:', error);
  }
  
  // Final fallback if both fail
  if (DATE_FOLDERS.length === 0) {
    console.warn('Using default fallback DATE_FOLDERS');
    DATE_FOLDERS = ['690116', '690120', '690225', '690310']; // Original default set
  }
}

// Function to fetch and populate image list
async function populateImageList() {
  try {
    const timestamp = new Date().getTime(); // Cache busting
    const url = CONFIG.basePath ? `/${CONFIG.basePath}/image-list.json?v=${timestamp}` : `/image-list.json?v=${timestamp}`;
    const response = await fetch(url);
    if (response.ok) {
      const imageNames = await response.json();
      imageFiles = imageNames.map(name => {
        return CONFIG.basePath ? `${CONFIG.basePath}/${name}` : name;
      });
    } else {
      // If image-list.json is missing, try a different approach or fallback
      console.warn(`Could not find image-list.json in ${CONFIG.basePath}, attempting fallback...`);
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
    const fileName = file.split('/').pop();
    // Get position or use a default center position if it doesn't exist
    let pos = CURRENT_MARKER_POSITIONS[fileName];
    
    if (!pos) {
      // Provide default position so user can see and drag the marker
      pos = { x: 50, y: 50 };
      CURRENT_MARKER_POSITIONS[fileName] = pos;
    }

    const marker = document.createElement('div');
    marker.className = 'map-marker';
    marker.style.left = `${pos.x}%`;
    marker.style.top = `${pos.y}%`;
    marker.title = fileName;
    marker.dataset.file = file;
    marker.textContent = index + 1;

      // Click to switch image
      marker.addEventListener('click', (e) => {
        if (marker.classList.contains('dragging')) return;
        if (currentImageFile !== file) {
          loadImage(file);
        }
      });

      // Simple drag-to-move support
      marker.addEventListener('mousedown', (e) => {
        if (!e.altKey) return; 
        
        const markerContainer = document.getElementById('map-markers');
        const mDown = (moveEvent) => {
          const rect = markerContainer.getBoundingClientRect();
          let x = ((moveEvent.clientX - rect.left) / rect.width) * 100;
          let y = ((moveEvent.clientY - rect.top) / rect.height) * 100;
          x = Math.max(0, Math.min(100, x));
          y = Math.max(0, Math.min(100, y));

          marker.style.left = `${x}%`;
          marker.style.top = `${y}%`;
          marker.classList.add('dragging');

          CURRENT_MARKER_POSITIONS[fileName] = { 
            ...CURRENT_MARKER_POSITIONS[fileName],
            x: x.toFixed(1), 
            y: y.toFixed(1) 
          };
        };

        const mUp = () => {
          marker.classList.remove('dragging');
          document.removeEventListener('mousemove', mDown);
          document.removeEventListener('mouseup', mUp);
        };

        document.addEventListener('mousemove', mDown);
        document.addEventListener('mouseup', mUp);
        e.stopPropagation();
      });

      markerContainer.appendChild(marker);
  });

  // Re-highlight active
  updateActiveMarker(currentImageFile);
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
  // Zoom controls (now inside the map panel)
  const zoomInBtn = document.getElementById('zoom-in');
  const zoomOutBtn = document.getElementById('zoom-out');
  const resetBtn = document.getElementById('reset-view');

  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => {
      if (currentScene) {
        const view = currentScene.view();
        view.setVfov(Math.max(view.vfov() * 0.75, 0.1));
      }
    });
  }

  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => {
      if (currentScene) {
        const view = currentScene.view();
        view.setVfov(Math.min(view.vfov() * 1.25, Math.PI));
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (currentScene) {
        const fileName = currentImageFile.split('/').pop();
        const savedPos = CURRENT_MARKER_POSITIONS[fileName] || {};
        
        const targetYaw = savedPos.yaw !== undefined ? savedPos.yaw : 0;
        const targetPitch = savedPos.pitch !== undefined ? savedPos.pitch : 0;
        const targetVfov = savedPos.vfov !== undefined ? savedPos.vfov : Math.PI / 2;

        currentScene.view().setYaw(targetYaw);
        currentScene.view().setPitch(targetPitch);
        currentScene.view().setVfov(targetVfov);
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

  // Admin: Double click map header to save positions
  const mapHeader = document.getElementById('map-header');
  if (mapHeader) {
    mapHeader.style.cursor = 'pointer';
    mapHeader.title = 'Double-click to save all points and views';
    
    // Use a clearer interaction
    mapHeader.addEventListener('dblclick', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await savePositions();
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
      case '+': case '=': view.setVfov(Math.max(view.vfov() * 0.9, 0.01)); break;
      case '-': view.setVfov(Math.min(view.vfov() * 1.1, Math.PI)); break;
      case '0':
        const fileName = currentImageFile.split('/').pop();
        const savedPos = CURRENT_MARKER_POSITIONS[fileName] || {};
        const targetYaw = savedPos.yaw !== undefined ? savedPos.yaw : 0;
        const targetPitch = savedPos.pitch !== undefined ? savedPos.pitch : 0;
        const targetVfov = savedPos.vfov !== undefined ? savedPos.vfov : Math.PI / 2;
        
        view.setYaw(targetYaw);
        view.setPitch(targetPitch);
        view.setVfov(targetVfov);
        break;
    }
  });
}

// Function to load a new image
function loadImage(imageFile) {
  if (currentImageFile === imageFile) return;
  currentImageFile = imageFile;

  const fileName = imageFile.split('/').pop();
  const savedPos = CURRENT_MARKER_POSITIONS[fileName] || {};

  // Update map UI immediately for better feedback
  updateActiveMarker(imageFile);

  // Create source from image with cache busting if needed
  const timestamp = new Date().getTime();
  currentSource = Marzipano.ImageUrlSource.fromString(
    `/${imageFile}?v=${timestamp}`,
    { width: 4000, height: 2000 }
  );

  const geometry = new Marzipano.EquirectGeometry([{ width: 4000 }]);
  
  // Setup FOV (Zoom) Limits
  const limiter = Marzipano.RectilinearView.limit.vfov(Math.PI / 18, Math.PI / 1.8);
  
  // Use saved view parameters or defaults
  const initialView = {
    yaw: savedPos.yaw !== undefined ? savedPos.yaw : 0,
    pitch: savedPos.pitch !== undefined ? savedPos.pitch : 0,
    vfov: savedPos.vfov !== undefined ? savedPos.vfov : Math.PI / 2
  };
  
  console.log(`Loading image ${fileName} with view:`, initialView);
  const view = new Marzipano.RectilinearView(initialView, limiter);

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
