window.sessionStorage.cameraStarted = false;

import { ObjectDetector, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2";
const vision = await FilesetResolver.forVisionTasks(
    // path/to/wasm/root
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
);
const objectDetector = await ObjectDetector.createFromOptions(vision, {
    baseOptions: {
        //modelAssetPath: `https://storage.googleapis.com/mediapipe-tasks/object_detector/efficientdet_lite0_uint8.tflite`,
        modelAssetPath: `/model` //custom model
    },
    scoreThreshold: 0.45,
    runningMode: "VIDEO",
});

const enableWebcamButton = document.getElementById("webcamButton");
enableWebcamButton.addEventListener("click", enableCam);

let video = document.getElementById("webcam");
function enableCam(e) {
    if (!objectDetector) {
        alert("Wait! objectDetector not loaded yet.");
        return;
    }

    // getUsermedia parameters
    const constraints = {
        video: {
            facingMode: "environment",
        },
    };

    // Activate the webcam stream.
    navigator.mediaDevices
        .getUserMedia(constraints)
        .then(function (stream) {
            video.srcObject = stream;
            video.addEventListener("loadeddata", predictWebcam);
        })
        .catch((err) => {
            console.error(err);
            /* handle the error */
        });
}

let lastVideoTime = -1;
let previousFrameContainedCars = false;
function predictWebcam() {
    // if image mode is initialized, create a new classifier with video runningMode.
    let startTimeMs = performance.now();

    // Detect objects using detectForVideo.
    if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        const detections = objectDetector.detectForVideo(video, startTimeMs);

        displayDetections(detections);

        const distanceToCars = calculateDistanceFromDetections(detections);
        const containsConditionMatchingCars = containsDangerouslyCloseCars(distanceToCars, currentSpeed);
        if(containsConditionMatchingCars){
            sendBrake();
        }
        //displayVideoDetections(detections);
    }
    // Call this function again to keep predicting when the browser is ready.
    window.requestAnimationFrame(predictWebcam);
}

function calculateDistanceFromDetections(detections){
    const result = [];
    for(let detection of detections){
        let category = detection.categories[0].categoryName;
        if(category != "car"){
            continue;
        }
        //contains car
        let distanceToCar = calculateDistanceFromPixelHeight(detection.boundingBox.height);
        result.push(distanceToCar);
    }
    return result;
}

function containsDangerouslyCloseCars(distances, speed){
    const currentBrakeDistance = calculateBrakingDistanceFromSpeed(speed);
    const distanceToSpare = 5 //change accordingly
    const filtered = distances.filter(distance => distance < currentBrakeDistance + distanceToSpare);
    return filtered.length;
}

function calculateBrakingDistanceFromSpeed(speed){
    return 0.275 * speed + 0.008 * Math.pow(speed, 2)
}

function calculateDistanceFromPixelHeight(pixelHeight){
    return 918 / pixelHeight - 0.23;
}


function displayDetections(detections){
    let resultText = "";
    for(let detection of detections){
        let category = detection.categories[0].categoryName;
        if(category != "car"){
            continue;
        }
        resultText += `car: ${Math.round(parseFloat(detection.categories[0].score) * 100)}<br>`;
    }
}

function displayVideoDetections(detections) {
    try{
        for(let detection of detections.detections){
            let category = detection.categories[0].categoryName;
            
        }

    } catch (err){
        console.error(err);
        alert(err);
    }
    //console.log("displayVideoDetections called");
    try {
        const detectedDistances = [];
        if (!window.sessionStorage.cameraStarted) {
            return;
        }
        let strToShow = "";
        let containsCar = false;
        //console.log("enterting detection loop");
        for (let detection of detections.detections) {
            if (detection.categories[0].categoryName == "car") {
                containsCar = true;
            } else {
                continue;
            }
            //console.log(detection);
            let estimatedDistance = 918 / detection.boundingBox.height - 0.23;
            console.log(`estimatedDistance: ${estimatedDistance}`);
            console.log(`Detected height: ${detection.boundingBox.height}`);
            detectedDistances.push(estimatedDistance);
            strToShow += `${detection.categories[0].categoryName} ${Math.round(parseFloat(detection.categories[0].score) * 100)}<br>`;
        }
        document.querySelector("#detection").innerHTML = strToShow;

        //check if braking conditions match here
        for (let distance of detectedDistances) {
            //old: 0.393+0.142x + 0.0105x^2
            //new: 0 + 0.275 + 0.008x^2
            let currentBrakeDistance = 0.275 * currentSpeed + 0.008 * Math.pow(currentSpeed, 2);
            let realValue = parseFloat(distanceToSpareField.value) + currentBrakeDistance;
            console.log(`realValue: ${realValue}`);
            console.log(`currentBrakeDistance: ${currentBrakeDistance}`);
            console.log(`speed: ${currentSpeed}`);
            console.log(`distance: ${distance}`);
            console.log("--------------");
            if (distance < realValue) {
                sendBrake(distance, currentSpeed, realValue);
                console.log("braking");
                break;
            }
        }
    } catch (err) {
        console.error(err);
    }
}
async function sendBrake(distance, speed, brakeDistance) {
    const formattedDateString = await getCurrentTimeInString();
    //writeToPort("on");
    ws.send("brake");
    console.log(`brake sent at: ${formattedDateString}`);
    ws.send(`brake sent at: ${formattedDateString}`);
    ws.send(`estimatedDistance: ${distance}m`);
    ws.send(`speed: ${speed}km/h`);
    ws.send(`estimatedBrakingDistance: ${brakeDistance}m`);

    //ws.send("disconnect");
    ws.send("----------");
}

async function getCurrentTimeInString() {
    const time = await (await fetch("/time")).json();
    const date = new Date(time.now);
    const hour = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    const milliseconds = date.getMilliseconds();
    const formattedDateString = `${hour}:${minutes}:${seconds + milliseconds / 1000}`;
    return formattedDateString;
}

const startDetectionButton = document.querySelector("#startDetectionButton");
startDetectionButton.addEventListener("click", () => {
    ws.send("startcam");
});