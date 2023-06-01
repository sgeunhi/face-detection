import React, { useEffect, useState, useRef } from "react";
import "./App.css";
import {
  PoseLandmarker,
  DrawingUtils,
  FilesetResolver,
  NormalizedLandmark,
} from "@mediapipe/tasks-vision";
import Webcam from "react-webcam";
import { Alert, Button } from "@mui/material";

type RunningMode = "IMAGE" | "VIDEO";
let poseLandmarker: PoseLandmarker;
let video: HTMLVideoElement;
let canvas: HTMLCanvasElement;
let lastVideoTime = -1;
// let pose: string;

function App() {
  // const webCamRef = useRef<Webcam>(null);
  // const canvasRef = useRef<HTMLCanvasElement>(null);
  const [runningMode, setRunningMode] = useState<RunningMode>("IMAGE");
  const [enableWebcamButtonText, setEnableWebcamButtonText] =
    useState<String>("자세 인식 시작하기");
  const [webCamRunning, setWebCamRunning] = useState<Boolean>(false);
  const [poseText, setPoseText] = useState<String>("정면");
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
  const enableWebCam = async () => {
    if (!poseLandmarker) {
      console.log("아직 모델이 로드되지 않았습니다.");
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
          poseEstimation(landmark);
          // if (pose === "오른쪽") {
          //   alert("오른쪽을 바라보고 있습니다");
          // } else if (pose === "왼쪽") {
          //   alert("왼쪽을 바라보고 있습니다");
          // }
          canvasCtx.restore();
        }
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

  const poseEstimation = (landmark: NormalizedLandmark[]) => {
    // 양쪽 어깨 곱이 음수이면 오른쪽 혹은 왼쪽을 바라보고 있는 것
    if (Math.sign(landmark[11].z * landmark[12].z) < 0) {
      if (landmark[11].z > landmark[12].z) {
        console.log("왼쪽");
        setPoseText("왼쪽");
      } else {
        console.log("오른쪽");
        setPoseText("오른쪽");
      }
    }
    // 양수이면 정면 혹은 후면을 바라보고 있는 것
    else {
      if (landmark[11].x > landmark[12].x) {
        console.log("정면");
        setPoseText("정면");
      } else {
        console.log("후면");
        setPoseText("후면");
      }
    }
    // if (
    //   // landmark[0].z < landmark[7].z &&
    //   landmark[7].x - landmark[8].x < 0.1 &&
    //   landmark[8].z > landmark[7].z &&
    //   landmark[11].z < landmark[12].z
    // ) {
    //   console.log("오른쪽");
    //   setPoseText("오른쪽");
    //   // return "오른쪽";
    // } else if (
    //   // landmark[0].z < landmark[7].z &&
    //   landmark[7].x - landmark[8].x < 0.1 &&
    //   landmark[8].z < landmark[7].z &&
    //   landmark[11].z > landmark[12].z
    // ) {
    //   console.log("왼쪽");
    //   setPoseText("왼쪽");
    //   return "왼쪽";
    // } else if (
    //   landmark[7].x < landmark[8].x &&
    //   landmark[11].x < landmark[12].x
    // ) {
    //   console.log("후면");
    //   setPoseText("후면");
    //   return "후면";
    // }
    // console.log("정면");
    // setPoseText("정면");
    // return "정면";
  };

  useEffect(() => {
    createPoseLandmarker();
  }, []);

  return (
    <div className="App">
      <div className="header">
        <h2>기술 트렌드와 사업기회 분석</h2>
        <div style={{ fontWeight: "bold" }}>
          MediaPipe PoseLandemarker task를 활용한 Pose detection
        </div>
      </div>
      <div className="body">
        <div className="left">
          <div
            className="left-header"
            style={{ fontWeight: "bold", fontSize: "20px", marginTop: "10px" }}
          >
            사용 방법
          </div>
          <div className="left-body">
            <p>
              1. 자세 인식 시작하기 버튼을 누르면 카메라가 작동합니다. <br />
              2. 카메라가 작동하면 자세를 취해주세요. <br />
              3. 자세를 취하면 자세가 인식됩니다. <br />
            </p>
          </div>
        </div>
      </div>
      <div className="content">
        <Button
          variant="contained"
          onClick={enableWebCam}
          style={{ marginBottom: "10px" }}
        >
          {enableWebcamButtonText}
        </Button>
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
          <div
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
              fontSize: "50px",
              fontWeight: "bold",
              color: "#0055ff",
            }}
          >
            {poseText}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
