// test 1
// Global variables
let imageFiles = [];
let currentSource = null;
let currentScene = null;
let viewer = null;

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
});

// Main initialization function
async function initializeApp() {
  // Wait for Marzipano to be loaded before initializing
  if (typeof Marzipano === 'undefined') {
    console.error('Marzipano library failed to load');
    // Wait a bit and try again
    setTimeout(initializeApp, 100);
    return;
  }

  // Initialize Marzipano viewer
  const viewerContainer = document.getElementById('pano-container');
  
  // Create viewer instance
  viewer = new Marzipano.Viewer(viewerContainer);

  // Populate the image list and set up the viewer
  await populateImageList();
  setupEventListeners();
}

// Function to fetch and populate image list
async function populateImageList() {
  try {
    // Fetch the image list from the JSON file
    const response = await fetch('/p/260116/image-list.json');
    if (response.ok) {
      const imageNames = await response.json();
      // Convert image names to full paths
      imageFiles = imageNames.map(name => `p/260116/${name}`);
    } else {
      // Fallback to hardcoded list if JSON file is not available
      imageFiles = [
        'p/260116/CAM_20260126163812_0095_D.JPG',
        'p/260116/CAM_20260126163825_0096_D.JPG',
        'p/260116/CAM_20260126163836_0097_D.JPG',
        'p/260116/CAM_20260126163847_0098_D.JPG',
        'p/260116/CAM_20260126163858_0099_D.JPG',
        'p/260116/CAM_20260126163909_0100_D.JPG',
        'p/260116/CAM_20260126163922_0101_D.JPG',
        'p/260116/CAM_20260126163934_0102_D.JPG',
        'p/260116/CAM_20260126163945_0103_D.JPG',
        'p/260116/CAM_20260126163958_0104_D.JPG',
        'p/260116/CAM_20260126164009_0105_D.JPG',
        'p/260116/CAM_20260126164019_0106_D.JPG',
        'p/260116/CAM_20260126164029_0107_D.JPG',
        'p/260116/CAM_20260126164042_0108_D.JPG',
        'p/260116/CAM_20260126164053_0109_D.JPG',
        'p/260116/CAM_20260126164106_0110_D.JPG',
        'p/260116/CAM_20260126164118_0111_D.JPG',
        'p/260116/CAM_20260126164127_0112_D.JPG',
        'p/260116/CAM_20260126164146_0113_D.JPG',
        'p/260116/CAM_20260126164157_0114_D.JPG',
        'p/260116/CAM_20260126164210_0115_D.JPG',
        'p/260116/CAM_20260126164238_0116_D.JPG',
        'p/260116/CAM_20260126164317_0117_D.JPG'
      ];
    }
  } catch (error) {
    // Fallback to hardcoded list if fetch fails
    imageFiles = [
      'p/260116/CAM_20260126163812_0095_D.JPG',
      'p/260116/CAM_20260126163825_0096_D.JPG',
      'p/260116/CAM_20260126163836_0097_D.JPG',
      'p/260116/CAM_20260126163847_0098_D.JPG',
      'p/260116/CAM_20260126163858_0099_D.JPG',
      'p/260116/CAM_20260126163909_0100_D.JPG',
      'p/260116/CAM_20260126163922_0101_D.JPG',
      'p/260116/CAM_20260126163934_0102_D.JPG',
      'p/260116/CAM_20260126163945_0103_D.JPG',
      'p/260116/CAM_20260126163958_0104_D.JPG',
      'p/260116/CAM_20260126164009_0105_D.JPG',
      'p/260116/CAM_20260126164019_0106_D.JPG',
      'p/260116/CAM_20260126164029_0107_D.JPG',
      'p/260116/CAM_20260126164042_0108_D.JPG',
      'p/260116/CAM_20260126164053_0109_D.JPG',
      'p/260116/CAM_20260126164106_0110_D.JPG',
      'p/260116/CAM_20260126164118_0111_D.JPG',
      'p/260116/CAM_20260126164127_0112_D.JPG',
      'p/260116/CAM_20260126164146_0113_D.JPG',
      'p/260116/CAM_20260126164157_0114_D.JPG',
      'p/260116/CAM_20260126164210_0115_D.JPG',
      'p/260116/CAM_20260126164238_0116_D.JPG',
      'p/260116/CAM_20260126164317_0117_D.JPG'
    ];
  }
  
  // Populate the image selector dropdown
  const imageSelect = document.getElementById('image-select');
  if (imageSelect) {
    // Clear existing options
    imageSelect.innerHTML = '';
    imageFiles.forEach((file, index) => {
      const option = document.createElement('option');
      option.value = file;
      option.textContent = `View ${index + 1}`; // Show as View 1, View 2, etc.
      imageSelect.appendChild(option);
    });
  }
}

// Function to set up event listeners
function setupEventListeners() {
  // Load the first image by default
  if (imageFiles.length > 0) {
    loadImage(imageFiles[0]);
  }
  
  // Set up event listeners for controls
  document.getElementById('zoom-in').addEventListener('click', () => {
    if (currentScene) {
      const view = currentScene.view();
      const currentFov = view.fov();
      // Decrease FOV to zoom in (smaller FOV = more zoom)
      view.setFov(Math.max(currentFov * 0.75, 0.1));
    }
  });
  
  document.getElementById('zoom-out').addEventListener('click', () => {
    if (currentScene) {
      const view = currentScene.view();
      const currentFov = view.fov();
      // Increase FOV to zoom out (larger FOV = less zoom)
      view.setFov(Math.min(currentFov * 1.25, Math.PI));
    }
  });
  
  document.getElementById('reset-view').addEventListener('click', () => {
    if (currentScene) {
      // Reset view parameters to default
      currentScene.view().setFov(Math.PI / 2);
      currentScene.view().setYaw(0);
      currentScene.view().setPitch(0);
    }
  });
  
  // Handle image selection change
  const imageSelect = document.getElementById('image-select');
  if (imageSelect) {
    // Prevent rapid switching by disabling the select temporarily
    imageSelect.addEventListener('change', (event) => {
      imageSelect.disabled = true;
      loadImage(event.target.value);
      // Re-enable after a short delay
      setTimeout(() => {
        imageSelect.disabled = false;
      }, 500);
    });
  }
  
  // Add keyboard controls
  document.addEventListener('keydown', (event) => {
    if (!currentScene) return;
    
    const view = currentScene.view();
    const currentYaw = view.yaw();
    const currentPitch = view.pitch();
    const currentFov = view.fov();
    
    switch(event.key) {
      case 'ArrowLeft':
        view.setYaw(currentYaw - 0.1);
        break;
      case 'ArrowRight':
        view.setYaw(currentYaw + 0.1);
        break;
      case 'ArrowUp':
        view.setPitch(Math.max(currentPitch - 0.1, -Math.PI/2));
        break;
      case 'ArrowDown':
        view.setPitch(Math.min(currentPitch + 0.1, Math.PI/2));
        break;
      case '+':
      case '=':
        view.setFov(Math.max(currentFov * 0.9, 0.01));
        break;
      case '-':
        view.setFov(Math.min(currentFov * 1.1, Math.PI));
        break;
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
  // Store the new scene to be loaded
  let newScene = null;
  
  // Create source from image
  currentSource = Marzipano.ImageUrlSource.fromString(
    `/${imageFile}`, 
    { width: 4000, height: 2000 } // Assuming equirectangular projection
  );
  
  // Create geometry (assuming equirectangular)
  const geometry = new Marzipano.EquirectGeometry([{ width: 4000 }]);
  
  // Create view
  const view = new Marzipano.RectilinearView();
  
  // Create the new scene
  newScene = viewer.createScene({
    source: currentSource,
    geometry: geometry,
    view: view,
    pinFirstLevel: true
  });
  
  // Since switchTo doesn't return a Promise, use a timeout to ensure proper sequencing
  setTimeout(() => {
    // Switch to the new scene
    newScene.switchTo({ transitionDuration: 1000 });
    
    // Destroy the old scene after a delay to ensure transition is complete
    setTimeout(() => {
      if (currentScene && currentScene !== newScene) {
        currentScene.destroy();
      }
      // Update the current scene reference
      currentScene = newScene;
    }, 1200); // Slightly longer than transition duration
  }, 100);
}