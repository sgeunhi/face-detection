import "./App.css";

import React, { useEffect, useState } from "react";
import { Color, Euler, Matrix4 } from 'three';
import { Canvas, useFrame, useGraph } from '@react-three/fiber';
import { FaceLandmarker, DrawingUtils, FilesetResolver, FaceLandmarkerOptions } from "@mediapipe/tasks-vision";
import { useGLTF } from '@react-three/drei';

let faceLandmarker: FaceLandmarker;
let video: HTMLVideoElement;
let faceLandmarks: any[] = [];
let canvas: HTMLCanvasElement;
let lastVideoTime = -1;
let blendshapes: any[] = [];
let rotation: Euler;
let headMesh: any[] = [];

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

function Avatar({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const { nodes } = useGraph(scene);

  useEffect(() => {
    if (nodes.Wolf3D_Head) headMesh.push(nodes.Wolf3D_Head);
    if (nodes.Wolf3D_Teeth) headMesh.push(nodes.Wolf3D_Teeth);
    if (nodes.Wolf3D_Beard) headMesh.push(nodes.Wolf3D_Beard);
    if (nodes.Wolf3D_Avatar) headMesh.push(nodes.Wolf3D_Avatar);
    if (nodes.Wolf3D_Head_Custom) headMesh.push(nodes.Wolf3D_Head_Custom);
  }, [nodes, url]);

  useFrame(() => {
    if (blendshapes.length > 0) {
      blendshapes.forEach(element => {
        headMesh.forEach(mesh => {
          let index = mesh.morphTargetDictionary[element.categoryName];
          if (index >= 0) {
            mesh.morphTargetInfluences[index] = element.score;
          }
        });
      });

      nodes.Head.rotation.set(rotation.x, rotation.y, rotation.z);
      nodes.Neck.rotation.set(rotation.x / 5 + 0.3, rotation.y / 5, rotation.z / 5);
      nodes.Spine2.rotation.set(rotation.x / 10, rotation.y / 10, rotation.z / 10);
    }
  });

  return <primitive object={scene} position={[0, -1.75, 3]} />
}

function App() {
  const [enableWebcamButtonText, setEnableWebcamButtonText] =
    useState<String>("얼굴 인식 시작하기");
  const [webCamRunning, setWebCamRunning] = useState<Boolean>(false);
  const [url, setUrl] = useState<string>("https://models.readyplayer.me/6526bcd92537ec63d9a03068.glb?morphTargets=ARKit&textureAtlas=1024");

  // 모델 로드
  const createFaceLandmarker = async () => {
    const filesetResolver = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    faceLandmarker = await FaceLandmarker.createFromOptions(
      filesetResolver,
      options
    );

    video = document.getElementById("video") as HTMLVideoElement;
    const constraints = {
      video: true,
      audio: false,
    };
    navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
      video.srcObject = stream;
      video.addEventListener("loadeddata", predictWebCam);

      // To seperate the logic of the drawing head mesh and the logic of the updating avatar,
      // Uncomment the following line and comment the same part in the predictWebCam function.

      // video.addEventListener("loadeddata", predict);
    });
  };

  // Avatar update function which is called every frame.
  // But for not, integrate this function with the predictWebCam function for the simplicity and performance.
  const predict = async () => {
    let nowInMs = Date.now();
    console.log(nowInMs);
    if (lastVideoTime !== video.currentTime) {
      lastVideoTime = video.currentTime;
      const faceLandmarkerResult = faceLandmarker.detectForVideo(video, nowInMs);

      if (faceLandmarkerResult.faceBlendshapes && faceLandmarkerResult.faceBlendshapes.length > 0 && faceLandmarkerResult.faceBlendshapes[0].categories) {
        blendshapes = faceLandmarkerResult.faceBlendshapes[0].categories;

        const matrix = new Matrix4().fromArray(faceLandmarkerResult.facialTransformationMatrixes![0].data);
        rotation = new Euler().setFromRotationMatrix(matrix);
      }
    }
    window.requestAnimationFrame(predict);
  }

  // 카메라 작동
  const enableWebCam = async () => {
    if (!faceLandmarker) {
      console.log("아직 모델이 로드되지 않았습니다.");
      return;
    }
    if (webCamRunning) {
      setWebCamRunning(false);
      setEnableWebcamButtonText("얼굴 인식 시작하기");
    } else {
      setWebCamRunning(true);
      setEnableWebcamButtonText("얼굴 인식 멈추기");
    }
  };

  // predictWebCam is a function which is called every frame.
  // It draws the face mesh on the canvas along with updating the avatar.
  // We may seperate those two logics in the future.
  const predictWebCam = async () => {
    const startTimeMs = Date.now();

    canvas = document.getElementById("mesh_output_canvas") as HTMLCanvasElement;
    const canvasCtx = canvas.getContext("2d");

    if (canvasCtx && lastVideoTime !== video.currentTime) {
      lastVideoTime = video.currentTime;

      const faceLandmarkerResult = faceLandmarker.detectForVideo(
        video,
        startTimeMs
      );
      const drawingUtils = new DrawingUtils(canvasCtx);

      if (
        faceLandmarkerResult.faceBlendshapes &&
        faceLandmarkerResult.faceBlendshapes.length > 0 &&
        faceLandmarkerResult.faceBlendshapes[0].categories
      ) {
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

        faceLandmarks = faceLandmarkerResult.faceLandmarks;
        for (const landmarks of faceLandmarks) {
          drawingUtils.drawConnectors(
            landmarks,
            FaceLandmarker.FACE_LANDMARKS_TESSELATION,
            { color: "#C0C0C070", lineWidth: 0.5 }
          );
          drawingUtils.drawConnectors(
            landmarks,
            FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
            { color: "#FF3030", lineWidth: 0.5 }
          );
          drawingUtils.drawConnectors(
            landmarks,
            FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW,
            { color: "#FF3030", lineWidth: 0.5 }
          );
          drawingUtils.drawConnectors(
            landmarks,
            FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
            { color: "#30FF30", lineWidth: 0.5 }
          );
          drawingUtils.drawConnectors(
            landmarks,
            FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,
            { color: "#30FF30", lineWidth: 0.5 }
          );
          drawingUtils.drawConnectors(
            landmarks,
            FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
            { color: "#E0E0E0", lineWidth: 0.1 }
          );
          drawingUtils.drawConnectors(
            landmarks,
            FaceLandmarker.FACE_LANDMARKS_LIPS,
            { color: "#E0E0E0", lineWidth: 0.1 }
          );
          drawingUtils.drawConnectors(
            landmarks,
            FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS,
            { color: "#FF3030", lineWidth: 0.1 }
          );
          drawingUtils.drawConnectors(
            landmarks,
            FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS,
            { color: "#30FF30", lineWidth: 0.1 }
          );

          canvasCtx.restore();

          // Update Avatar
          // We may put this logic seperately from the head mesh drawing logic (This function).
          // But for now, we put it here to make it simple.
          blendshapes = faceLandmarkerResult.faceBlendshapes[0].categories;

          const matrix = new Matrix4().fromArray(faceLandmarkerResult.facialTransformationMatrixes![0].data);
          rotation = new Euler().setFromRotationMatrix(matrix);
        }
      }
    }
    window.requestAnimationFrame(predictWebCam);
  };

  useEffect(() => {
    createFaceLandmarker();
  }, []);

  return (
    <div className="App">
      <div className="content">
        <div className="contentWrapper">
          <div className="cameraWrapper">
            <video
              className="video"
              id="video"
              autoPlay
              playsInline
            ></video>
            <canvas
              id="mesh_output_canvas"
              className="mesh_canvas canvas"
            />
          </div>
        </div>
        <div className="contentWrapper">
          <div className="canvasWrapper">
            <div className="output_canvas canvas">
              <Canvas style={{ height: '100%' }} camera={{ fov: 18 }} shadows>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} color={new Color(1, 1, 0)} intensity={0.5} castShadow />
                <pointLight position={[-10, 0, 10]} color={new Color(1, 0, 0)} intensity={0.5} castShadow />
                <pointLight position={[0, 0, 10]} intensity={0.5} castShadow />
                <Avatar url={url} />
              </Canvas>
            </div>
          </div>
        </div>
      </div>
      <div className="controller">
        control plain<br />
        {/* Dummy button for now */}
        <button onClick={enableWebCam}>{enableWebcamButtonText}</button>
      </div>
    </div>
  );
}

export default App;
