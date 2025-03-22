class Game {
  constructor() {
    // Game states
    this.states = {
      LOADING: "loading",
      READY: "ready",
      PLAYING: "playing",
      GAMEOVER: "gameover",
    };
    this.currentState = this.states.LOADING;

    // Basic game variables
    this.score = 0;
    this.gameSpeed = 0.2;
    this.maxSpeed = 1.5;
    this.acceleration = 0.0005;
    this.tiltAngle = 0; // tilt angle for left/right movement

    // Setup Three.js
    this.initThree();
    this.initScene();
    this.initUI();
    this.loadAssets();

    // Handle resizing
    window.addEventListener("resize", () => this.onWindowResize());
  }

  initThree() {
    this.scene = new THREE.Scene();

    // CAMERA: behind the player, looking forward (+Z)
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 6, -15);
    this.camera.lookAt(0, 0, 0);

    // RENDERER
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x87ceeb); // sky color
    this.renderer.shadowMap.enabled = true;
    document.body.appendChild(this.renderer.domElement);
  }

  initScene() {
    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, -10);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);

    // Arrays for objects
    this.roadSections = [];
    this.obstacles = [];
    this.coins = [];
    this.buildings = [];

    // Create initial road sections in the +Z direction
    for (let i = 0; i < 5; i++) {
      this.createRoadSection(i * 50);
    }

    // Create the player
    this.initPlayer();
    // Controls
    this.initControls();
  }

  loadAssets() {
    // Simulate asset loading
    setTimeout(() => {
      this.currentState = this.states.READY;
      document.getElementById("preloader").style.display = "none";
    }, 1000);
  }

  initPlayer() {
    // Simple upright figure as the player
    const group = new THREE.Group();

    // Body
    const bodyGeom = new THREE.BoxGeometry(1, 2, 1);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.castShadow = true;
    body.position.set(0, 1, 0);
    group.add(body);

    // Head
    const headGeom = new THREE.SphereGeometry(0.5, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffcc99 });
    const head = new THREE.Mesh(headGeom, headMat);
    head.castShadow = true;
    head.position.set(0, 2.5, 0);
    group.add(head);

    // Add the group as player
    this.player = group;
    this.player.position.set(0, 0, 0);
    this.scene.add(this.player);

    // Player physics variables
    this.playerVelocity = new THREE.Vector3();
    this.isJumping = false;
  }

  initControls() {
    document.addEventListener("keydown", (e) => {
      if (this.currentState !== this.states.PLAYING) return;

      switch (e.key) {
        case "ArrowLeft":
          // Move left and set tilt angle negative
          this.player.position.x = Math.max(-4, this.player.position.x - 4);
          this.tiltAngle = -0.2;
          break;
        case "ArrowRight":
          // Move right and set tilt angle positive
          this.player.position.x = Math.min(4, this.player.position.x + 4);
          this.tiltAngle = 0.2;
          break;
        case "ArrowUp":
          // Jump if not already jumping
          if (!this.isJumping) this.jump();
          break;
      }
    });
  }

  initUI() {
    document.getElementById("startButton").addEventListener("click", () => {
      if (
        this.currentState === this.states.READY ||
        this.currentState === this.states.GAMEOVER
      ) {
        this.startGame();
      }
    });
  }

  createRoadSection(zPos) {
    // Create a road plane
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 50),
      new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, zPos);
    road.receiveShadow = true;
    this.scene.add(road);
    this.roadSections.push(road);

    // Create random buildings along the road
    for (let i = 0; i < 8; i++) {
      const building = this.createBuilding();
      building.position.x =
        (Math.random() < 0.5 ? -1 : 1) * (8 + Math.random() * 8);
      building.position.z = zPos + Math.random() * 50;
      this.scene.add(building);
      this.buildings.push(building);
    }

    // Add obstacles and coins
    this.spawnObstacles(zPos);
    this.spawnCoins(zPos);
  }

  createBuilding() {
    const height = 10 + Math.random() * 30;
    const building = new THREE.Mesh(
      new THREE.BoxGeometry(5, height, 5),
      new THREE.MeshStandardMaterial({ color: 0x808080 })
    );
    building.position.y = height / 2;
    building.castShadow = true;
    return building;
  }

  spawnObstacles(zPos) {
    for (let i = 0; i < 4; i++) {
      const size = 2 + Math.random() * 2;
      const obstacle = new THREE.Mesh(
        new THREE.BoxGeometry(size, size, size),
        new THREE.MeshStandardMaterial({ color: 0xff0000 })
      );
      obstacle.position.set(
        (Math.random() < 0.5 ? -1 : 1) * 3.5,
        size / 2,
        zPos + Math.random() * 50
      );
      obstacle.castShadow = true;
      this.scene.add(obstacle);
      this.obstacles.push(obstacle);
    }
  }

  spawnCoins(zPos) {
    for (let i = 0; i < 6; i++) {
      const coin = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 16, 16),
        new THREE.MeshStandardMaterial({
          color: 0xffd700,
          metalness: 0.8,
          roughness: 0.2,
        })
      );
      coin.position.set(
        (Math.random() < 0.5 ? -1 : 1) * 3,
        1,
        zPos + Math.random() * 50
      );
      coin.castShadow = true;
      this.scene.add(coin);
      this.coins.push(coin);
    }
  }

  jump() {
    this.isJumping = true;
    // Add upward velocity for jump
    this.playerVelocity.y = 0.15;
  }

  startGame() {
    this.currentState = this.states.PLAYING;
    this.score = 0;
    this.gameSpeed = 0.2;
    document.getElementById("startButton").style.display = "none";
    document.getElementById("gameOver").style.display = "none";
  }

  endGame() {
    this.currentState = this.states.GAMEOVER;
    document.getElementById("startButton").style.display = "block";
    document.getElementById("gameOver").style.display = "block";
    document.getElementById("finalScore").textContent = Math.floor(
      this.score / 10
    );
  }

  updateWorld() {
    // Recycle road sections
    this.roadSections.forEach((road) => {
      road.position.z -= this.gameSpeed;
      if (road.position.z < -50) {
        road.position.z += this.roadSections.length * 50;
        this.spawnObstacles(road.position.z);
        this.spawnCoins(road.position.z);
      }
    });

    // Update obstacles and coins
    this.updateObjects(this.obstacles);
    this.updateObjects(this.coins);
    this.updateObjects(this.buildings, true);
  }

  updateObjects(objects, skipCollision = false) {
    for (let i = objects.length - 1; i >= 0; i--) {
      objects[i].position.z -= this.gameSpeed;

      if (!skipCollision) {
        if (objects[i].position.distanceTo(this.player.position) < 1.5) {
          // Coin: check for gold color
          if (objects[i].material.color.getHex() === 0xffd700) {
            this.score += 10;
            this.scene.remove(objects[i]);
            objects.splice(i, 1);
          } else {
            // Collision with obstacle ends game
            this.endGame();
          }
        }
      }
      if (objects[i] && objects[i].position.z < -50) {
        this.scene.remove(objects[i]);
        objects.splice(i, 1);
      }
    }
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    if (this.currentState === this.states.PLAYING) {
      // Increase game speed gradually
      this.gameSpeed = Math.min(
        this.gameSpeed + this.acceleration,
        this.maxSpeed
      );
      this.updateWorld();

      // Update player physics (gravity)
      this.player.position.add(this.playerVelocity);
      this.playerVelocity.y -= 0.01;
      if (this.player.position.y < 0) {
        this.player.position.y = 0;
        this.playerVelocity.y = 0;
        this.isJumping = false;
      }

      // Apply smooth tilt effect on player for left/right movement
      this.player.rotation.z = THREE.MathUtils.lerp(
        this.player.rotation.z,
        this.tiltAngle,
        0.1
      );
      this.tiltAngle = THREE.MathUtils.lerp(this.tiltAngle, 0, 0.05);

      // Update score display
      document.getElementById("score").textContent = `Score: ${Math.floor(
        this.score / 10
      )}`;
      this.score++;
    }

    this.renderer.render(this.scene, this.camera);
  }
}

// Initialize game when the page loads
window.addEventListener("load", () => {
  const game = new Game();
  game.initUI();
  game.animate();
});
