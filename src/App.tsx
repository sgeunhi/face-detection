import React, { useEffect, useState } from "react";
import "./App.css";
import {
  PoseLandmarker,
  DrawingUtils,
  FilesetResolver,
  NormalizedLandmark,
} from "@mediapipe/tasks-vision";
import { Button } from "@mui/material";

type RunningMode = "IMAGE" | "VIDEO";
let poseLandmarker: PoseLandmarker;
let video: HTMLVideoElement;
let canvas: HTMLCanvasElement;
let lastVideoTime = -1;

function App() {
  const [runningMode, setRunningMode] = useState<RunningMode>("IMAGE");
  const [enableWebcamButtonText, setEnableWebcamButtonText] =
    useState<String>("자세 인식 시작하기");
  const [webCamRunning, setWebCamRunning] = useState<Boolean>(false);
  const [poseText, setPoseText] = useState<String>("정면");
  const [angle, setAngle] = useState<number>(0);
  const [angleText, setAngleText] = useState<String>("왼쪽 다리를 뻗어주세요");

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
          const angle = getAngle(landmark);
          if (angle < 100) {
            setAngleText("왼쪽 다리를 뻗어주세요");
          } else if (angle > 120 && angle < 130) {
            setAngleText("왼쪽 다리를 더 뻗어주세요");
          } else if (angle > 130) {
            setAngleText("자세를 4초간 유지해주세요");
            setTimeout(() => {
              setAngleText("다리를 내려주세요");
            }, 4000);
          }

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
    // 양쪽 어깨 z 좌표 곱이 음수이면 오른쪽 혹은 왼쪽을 바라보고 있는 것
    if (Math.sign(landmark[11].z * landmark[12].z) < 0) {
      // 왼쪽 어깨 z 좌표가 더 크면 왼쪽을 바라보고 있는 것
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
      // 왼쪽 어깨 x 좌표가 더 크면 정면을 바라보고 있는 것
      if (landmark[11].x > landmark[12].x) {
        console.log("정면");
        setPoseText("정면");
      } else {
        console.log("후면");
        setPoseText("후면");
      }
    }
  };

  const getAngle = (landmark: NormalizedLandmark[]) => {
    const rightHip = landmark[23];
    const rightKnee = landmark[25];
    const rightAnkle = landmark[27];

    // 두 점 사이의 벡터 계산
    const vector1 = {
      x: rightHip.x - rightKnee.x,
      y: rightHip.y - rightKnee.y,
    };
    const vector2 = {
      x: rightAnkle.x - rightKnee.x,
      y: rightAnkle.y - rightKnee.y,
    };

    // 각 벡터의 크기 계산
    const magnitude1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
    const magnitude2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);

    // 두 벡터의 내적 계산
    const dotProduct = vector1.x * vector2.x + vector1.y * vector2.y;

    // 각도 계산 (라디안 값을 도 단위로 변환)
    const angleRad = Math.acos(dotProduct / (magnitude1 * magnitude2));
    const angleDeg = angleRad * (180 / Math.PI);
    setAngle(Math.round(angleDeg));
    console.log("각도", Math.round(angleDeg));
    return angleDeg;
  };

  useEffect(() => {
    createPoseLandmarker();
  }, []);

  return (
    <div className="App">
      {/* <div className="header">
        <h2>벤처창업론</h2>
        <div style={{ fontWeight: "bold" }}>
          MediaPipe PoseLandemarker task를 활용한 Pose detection
        </div>
      </div> */}
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
          style={{
            marginBottom: "10px",
            color: "ffffff",
            backgroundColor: "#000000",
          }}
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
              width: 640,
              height: 480,
            }}
          />
          {/* <div
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
              color:
                angleText === "왼쪽 다리를 더 뻗어주세요" ? "red" : "black",
            }}
          >
            {angleText}
          </div> */}
        </div>
      </div>
    </div>
  );
}

export default App;
