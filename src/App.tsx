import React, { useEffect, useState, useRef } from "react";
import "./App.css";
import {
  PoseLandmarker,
  DrawingUtils,
  FilesetResolver,
} from "@mediapipe/tasks-vision";
import Webcam from "react-webcam";
import { Alert, Button } from "@mui/material";

type RunningMode = "IMAGE" | "VIDEO";
let poseLandmarker: PoseLandmarker;
let video: HTMLVideoElement;
let canvas: HTMLCanvasElement;
let lastVideoTime = -1;

function App() {
  // const webCamRef = useRef<Webcam>(null);
  // const canvasRef = useRef<HTMLCanvasElement>(null);
  const [runningMode, setRunningMode] = useState<RunningMode>("IMAGE");
  // const [enableWebcamButtonText, setEnableWebcamButtonText] =
  //   useState<String>("자세 인식 시작하기");
  // const [webCamRunning, setWebCamRunning] = useState<Boolean>(false);

  // 모델 로드
  const createPoseLandmarker = async () => {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
    );

    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
        delegate: "CPU",
      },
      runningMode: runningMode,
      numPoses: 1,
    });

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
  // const enableWebCam = async () => {
  //   if (!poseLandmarker) {
  //     console.log("아직 모델이 로드되지 않았습니다.");
  //   }
  //   if (webCamRunning) {
  //     setWebCamRunning(false);
  //     setEnableWebcamButtonText("자세 인식 시작하기");
  //   } else {
  //     setWebCamRunning(true);
  //     setEnableWebcamButtonText("자세 인식 멈추기");
  //   }
  // };

  const predictWebCam = async () => {
    console.log("predictWebCam");

    const startTimeMs = Date.now();
    canvas = document.getElementById("canvas") as HTMLCanvasElement;
    const canvasCtx = canvas.getContext("2d");

    if (runningMode === "IMAGE") {
      await poseLandmarker.setOptions({ runningMode: "VIDEO" });
    }

    if (canvasCtx && lastVideoTime !== video.currentTime) {
      lastVideoTime = video.currentTime;
      poseLandmarker.detectForVideo(video, startTimeMs, (result) => {
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
        const drawingUtils = new DrawingUtils(canvasCtx);
        for (const landmark of result.landmarks) {
          const color = randomColor();
          drawingUtils.drawLandmarks(landmark, {
            radius: 2,
            lineWidth: 0.5,
            // 점들마다 색 다르게
            color: color,
          });
          console.log("landmark", landmark);
          drawingUtils.drawConnectors(
            landmark,
            PoseLandmarker.POSE_CONNECTIONS,
            {
              lineWidth: 1,
            }
          );
        }
        canvasCtx.restore();
      });
    }

    window.requestAnimationFrame(predictWebCam);
  };

  const randomColor = () => {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };

  useEffect(() => {
    createPoseLandmarker();
  }, []);

  return (
    <div className="App">
      <div style={{ position: "relative" }}>
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
            width: 640,
            height: 480,
          }}
          autoPlay
          playsInline
        ></video>
        {/* <Webcam
            ref={webCamRef}
            style={{
              position: "absolute",
              marginLeft: "auto",
              marginRight: "auto",
              left: 0,
              right: 0,
              textAlign: "center",
              zIndex: 9,
              width: 640,
              height: 480,
            }}
          /> */}
        <canvas
          // ref={canvasRef}
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
            width: 640,
            height: 480,
          }}
        />
      </div>
      {/* <Button
        variant="contained"
        onClick={enableWebCam}
        style={{
          position: "absolute",
          marginLeft: "auto",
          marginRight: "auto",
          top: 0,
          left: 0,
          textAlign: "center",
          zIndex: 9,
        }}
      >
        {enableWebcamButtonText}
      </Button> */}
    </div>
  );
}

export default App;
