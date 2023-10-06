import React, { useEffect, useState } from "react";
import "./App.css";
// import { Matrix4, Euler } from "three";
import {
  FaceLandmarker,
  DrawingUtils,
  FilesetResolver,
  // NormalizedLandmark,
  FaceLandmarkerOptions,
  // FaceLandmarkerResult,
} from "@mediapipe/tasks-vision";
// import { Button } from "@mui/material";

let faceLandmarker: FaceLandmarker;
let video: HTMLVideoElement;
let faceLandmarks: any[] = [];
let canvas: HTMLCanvasElement;
let lastVideoTime = -1;
// let blendshapes: any[] = [];
// let rotation: Euler;

const options: FaceLandmarkerOptions = {
  baseOptions: {
    modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
    delegate: "GPU",
  },
  numFaces: 1,
  runningMode: "VIDEO",
  outputFaceBlendshapes: true,
};

function App() {
  const [enableWebcamButtonText, setEnableWebcamButtonText] =
    useState<String>("얼굴 인식 시작하기");
  const [webCamRunning, setWebCamRunning] = useState<Boolean>(false);

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
    };
    navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
      video.srcObject = stream;
      video.addEventListener("loadeddata", predictWebCam);
    });
  };

  // 카메라 작동
  const enableWebCam = async () => {
    if (!faceLandmarker) {
      console.log("아직 모델이 로드되지 않았습니다.");
      return;
    }
    if (webCamRunning) {
      setWebCamRunning(false);
      setEnableWebcamButtonText("자세 인식 시작하기");
    } else {
      setWebCamRunning(true);
      setEnableWebcamButtonText("자세 인식 멈추기");
    }
  };

  const predictWebCam = async () => {
    const startTimeMs = Date.now();

    canvas = document.getElementById("canvas") as HTMLCanvasElement;
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
        // blendshapes = faceLandmarkerResult.faceBlendshapes[0].categories;
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
        }
      }
      console.log(faceLandmarkerResult);
    }
    window.requestAnimationFrame(predictWebCam);
  };

  useEffect(() => {
    createFaceLandmarker();
  }, []);

  return (
    <div className="App">
      <div className="content">
        <div
          style={{
            position: "relative",
          }}
        >
          <video
            className="video"
            id="video"
            style={{
              position: "absolute",
              marginLeft: "auto",
              marginRight: "auto",
              textAlign: "center",
              left: 0,
              right: 0,
              zIndex: 9,
              width: 1000,
              height: 800,
            }}
            autoPlay
            playsInline
          ></video>
          <canvas
            id="canvas"
            className="output_canvas"
            style={{
              position: "absolute",
              marginLeft: "auto",
              marginRight: "auto",
              left: 0,
              right: 0,
              textAlign: "center",
              zIndex: 9,
              width: 1000,
              height: 800,
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
