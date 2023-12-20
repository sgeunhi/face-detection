import "./App.css";
import * as THREE from "three";
import React, { useEffect } from "react";
import {
  FaceLandmarker,
  FilesetResolver,
  FaceLandmarkerOptions,
  Classifications,
} from "@mediapipe/tasks-vision";
import NewAvatar from "./class/NewAvatar";
import BasicScene from "./class/BasicScene";

let faceLandmarker: FaceLandmarker;
let video: HTMLVideoElement;
let scene: BasicScene | null;
let avatar: NewAvatar | null;

const options: FaceLandmarkerOptions = {
  baseOptions: {
    modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
    delegate: "GPU",
  },
  numFaces: 1,
  runningMode: "VIDEO",
  outputFaceBlendshapes: true,
  outputFacialTransformationMatrixes: true,
};

function App() {
  const url = "https://assets.codepen.io/9177687/raccoon_head.glb";

  useEffect(() => {
    video = document.getElementById("video") as HTMLVideoElement;

    if (video) {
      scene = new BasicScene(video);
      avatar = new NewAvatar(url, scene.scene);
    }
    createFaceLandmarker();
    streamWebcamThroughFaceLandmarker();
  }, []);

  function detectFaceLandmarks(time: DOMHighResTimeStamp) {
    if (!faceLandmarker) {
      return;
    }

    const landmarks = faceLandmarker.detectForVideo(video, time);

    // Apply transformation
    const transformationMatrices = landmarks.facialTransformationMatrixes;

    if (transformationMatrices && transformationMatrices.length > 0) {
      let matrix = new THREE.Matrix4().fromArray(
        transformationMatrices[0].data
      );
      // Example of applying matrix directly to the avatar
      if (avatar) {
        avatar.applyMatrix(matrix, { scale: 40 });
      }
    }

    // Apply Blendshapes
    const blendshapes = landmarks.faceBlendshapes;

    if (blendshapes && blendshapes.length > 0) {
      const coefsMap = retarget(blendshapes);
      avatar?.updateBlendshapes(coefsMap);
    }
  }

  function retarget(blendshapes: Classifications[]) {
    const categories = blendshapes[0].categories;
    let coefsMap = new Map<string, number>();
    for (let i = 0; i < categories.length; ++i) {
      const blendshape = categories[i];
      switch (blendshape.categoryName) {
        case "browOuterUpLeft":
          blendshape.score *= 1.2;
          break;
        case "browOuterUpRight":
          blendshape.score *= 1.2;
          break;
        case "eyeBlinkLeft":
          blendshape.score *= 1.2;
          break;
        case "eyeBlinkRight":
          blendshape.score *= 1.2;
          break;
        default:
      }
      coefsMap.set(categories[i].categoryName, categories[i].score);
    }
    return coefsMap;
  }

  function onVideoFrame(time: DOMHighResTimeStamp) {
    detectFaceLandmarks(time);
    video.requestVideoFrameCallback(onVideoFrame);
  }

  async function streamWebcamThroughFaceLandmarker() {
    // video = document.getElementById("video") as HTMLVideoElement;

    function onAcquiredUserMedia(stream: MediaStream) {
      video.srcObject = stream;
      video.onloadedmetadata = () => {
        video.play();
      };
    }

    try {
      const constraints = {
        video: true,
        audio: false,
      };
      navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
        onAcquiredUserMedia(stream);
      });
      video.requestVideoFrameCallback(onVideoFrame);
    } catch (e: unknown) {
      console.error(`Failed to acquire camera feed: ${e}`);
    }
  }

  // 모델 로드
  const createFaceLandmarker = async () => {
    const filesetResolver = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    faceLandmarker = await FaceLandmarker.createFromOptions(
      filesetResolver,
      options
    );
  };

  return (
    <div className="App">
      <div className="content">
        <div className="contentWrapper">
          <div className="cameraWrapper">
            <video className="video" id="video" autoPlay playsInline></video>
            <canvas id="mesh_output_canvas" className="mesh_canvas canvas" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
