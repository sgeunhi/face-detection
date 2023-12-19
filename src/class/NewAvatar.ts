import * as THREE from "three";
import { GLTFLoader, GLTF } from "three/examples/jsm/loaders/GLTFLoader";

interface MatrixRetargetOptions {
  decompose?: boolean;
  scale?: number;
}

class NewAvatar {
  scene: THREE.Scene;
  loader: GLTFLoader = new GLTFLoader();
  gltf: GLTF | undefined;
  root: THREE.Bone | undefined;
  morphTargetMeshes: THREE.Mesh[] = [];
  url: string;

  constructor(url: string, scene: THREE.Scene) {
    this.url = url;
    this.scene = scene;
    this.loadModel(this.url);
  }

  loadModel(url: string) {
    this.url = url;
    this.loader.load(
      // URL of the model you want to load
      url,
      // Callback when the resource is loaded
      (gltf) => {
        if (this.gltf) {
          // Reset GLTF and morphTargetMeshes if a previous model was loaded.
          this.gltf.scene.remove();
          this.morphTargetMeshes = [];
        }
        this.gltf = gltf;
        console.log();
        this.scene.add(gltf.scene);
        this.init(gltf);
      },

      // Called while loading is progressing
      (progress) =>
        console.log(
          "Loading model...",
          100.0 * (progress.loaded / progress.total),
          "%"
        ),
      // Called when loading has errors
      (error) => console.error(error)
    );
  }

  init(gltf: GLTF) {
    gltf.scene.traverse((object) => {
      // Register first bone found as the root
      if ((object as THREE.Bone).isBone && !this.root) {
        this.root = object as THREE.Bone;
        console.log(object);
      }
      // Return early if no mesh is found.
      if (!(object as THREE.Mesh).isMesh) {
        // console.warn(`No mesh found`);
        return;
      }

      const mesh = object as THREE.Mesh;
      // Reduce clipping when model is close to camera.
      mesh.frustumCulled = false;

      // Return early if mesh doesn't include morphable targets
      if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) {
        // console.warn(`Mesh ${mesh.name} does not have morphable targets`);
        return;
      }
      this.morphTargetMeshes.push(mesh);
    });
  }

  updateBlendshapes(blendshapes: Map<string, number>) {
    for (const mesh of this.morphTargetMeshes) {
      if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) {
        // console.warn(`Mesh ${mesh.name} does not have morphable targets`);
        continue;
      }
      const entries = Array.from(blendshapes.entries());
      for (const [key, value] of entries) {
        if (!Object.keys(mesh.morphTargetDictionary).includes(key)) {
          // console.warn(`Model morphable target ${name} not found`);
          continue;
        }

        const idx = mesh.morphTargetDictionary[key];
        mesh.morphTargetInfluences[idx] = value;
      }
    }
  }
  applyMatrix(
    matrix: THREE.Matrix4,
    matrixRetargetOptions?: MatrixRetargetOptions
  ): void {
    const { decompose = false, scale = 1 } = matrixRetargetOptions || {};
    if (!this.gltf) {
      return;
    }
    // Three.js will update the object matrix when it render the page
    // according the object position, scale, rotation.
    // To manually set the object matrix, you have to set autoupdate to false.
    matrix.scale(new THREE.Vector3(scale, scale, scale));
    this.gltf.scene.matrixAutoUpdate = false;
    // Set new position and rotation from matrix
    this.gltf.scene.matrix.copy(matrix);
  }

  /**
   * Takes the root object in the avatar and offsets its position for retargetting.
   * @param offset
   * @param rotation
   */
  offsetRoot(offset: THREE.Vector3, rotation?: THREE.Vector3): void {
    if (this.root) {
      this.root.position.copy(offset);
      if (rotation) {
        let offsetQuat = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(rotation.x, rotation.y, rotation.z)
        );
        this.root.quaternion.copy(offsetQuat);
      }
    }
  }
}

export default NewAvatar;
