//Integration testing to test extension as a whole because video behaviour in browsers is random and weird

//Import packages
const puppeteer = require("puppeteer");
const path = require("path");

//Global constants
//const TEST_VIDEO_URL = "https://samplelib.com/lib/preview/mp4/sample-5s.mp4"; //Provide the direct link to a test .mp4 video file //TODO: Upload the sample .mp4 to GitHub to alleviate stress for the video host
const TEST_VIDEO_URL = `file:${path.join(__dirname, "sample.mp4")}`; //Default to tests/sample.mp4. Can also use a full URL
//If using URL, server must return Accept-Ranges. Otherwise Chrome breaks seeking and currentTime may fail
const EXTENSION_PATH = "./";
const LOOP_TOLERANCE = 0.1; //The tolerance for checking start/end loop points, as well as the time to wait for ___
const TEST_LOOP_START = 1; //Has to be non-zero for loop tests
const TEST_LOOP_END = 3;

let browser;

beforeAll(async () => {
    browser = await puppeteer.launch({
        headless: true,
        args: [
            `--disable-extensions-except=${EXTENSION_PATH}`,
            `--load-extension=${EXTENSION_PATH}`,
            `--no-sandbox` //If running locally, remove this flag. Puppeteer reuires this for GitHub Actions
        ],
    });
});

let page;
let videoController;
let video;

//Helper functions
function convertSecToMin(timeInSecs) {
    let tempDate = new Date(null);
    tempDate.setSeconds(Math.round(timeInSecs));

    return timeInSecs >= 3600
        ? tempDate.toISOString().substring(11, 19) //If over 1 hour, display hours in string
        : tempDate.toISOString().substring(14, 19);
}

function escapeStringRegExp(str) {
    let matchOperatorsRe = /[|\\{}()[\]^$+*?.]/g;
    return str.replace(matchOperatorsRe, "\\$&");
}

//Ensure that video is fully loaded before using
async function setVideoCurrentTime(page, targetTime) {
    await page.evaluate((targetTime) => {
        console.log("Setting current time to: ", targetTime);
        const video = document.querySelector("video");

        video.play();
        video.currentTime = targetTime;
        video.pause();
    }, targetTime);
}

describe("Testing extension video controller", () => {
    test("Video controller should load", async () => {
        //TODO: Chrome.storage.sync mocks to check if VSL is enabled or disabled

        page = await browser.newPage();
        await page.goto(`${TEST_VIDEO_URL}`, { waitUntil: "networkidle0" }); //Wait for page (i.e. the video) to fully load

        //await page.waitForSelector(".vsl-controller");

        videoController = await page.waitForSelector(".vsl-controller", {
            timeout: 10000,
        }); //Video controller exists and visible
        expect(videoController).toBeTruthy();

        await page.waitForSelector("video");

        let videoConnected = await page.evaluate(() => {
            console.log("Checking if video controller loaded");
            const videoElement = document.querySelector("video");
            let videoController = document.querySelector(".vsl-controller");
            let shadowRoot = videoController.shadowRoot; //Check shadow root is attached
            return (
                !(typeof videoElement.vsl !== "undefined") &&
                typeof shadowRoot !== "undefined"
            ); //For boolean
        });

        expect(videoConnected).toBeTruthy(); //Actual video element should have vsl attribute connecting video to controller
    });
});

//Test that the actual buttons work and change, loop functionality tested later
describe("Testing controller buttons", () => {
    let setLoopInterval = async function (loopType, targetTime) {
        setVideoCurrentTime(page, targetTime);
        //Click button
        await page.evaluate((loopType) => {
            console.log("Clicking set loop button for ", loopType);
            const videoControllerShadow =
                document.querySelector(".vsl-controller").shadowRoot;
            const targetButton =
                loopType === "start"
                    ? videoControllerShadow.querySelector("#start-indicator")
                    : videoControllerShadow.querySelector("#end-indicator");
            targetButton.click();
        }, loopType);
    };

    test("Click set loop start", async () => {
        setLoopInterval("start", TEST_LOOP_START);

        //Check that it sets the button correctly
        const returnedStartTime = await page.evaluate(() => {
            //Returns time in format 00:00
            const videoController = document.querySelector(".vsl-controller");
            const startButton =
                videoController.shadowRoot.querySelector("#start-indicator");
            return startButton.textContent;
        });

        expect(returnedStartTime).toBe(convertSecToMin(TEST_LOOP_START));
    });

    test("Click set loop end", async () => {
        setLoopInterval("end", TEST_LOOP_END);
        const returnedEndTime = await page.evaluate(() => {
            //Returns time in format 00:00
            const videoController = document.querySelector(".vsl-controller");
            const endButton = videoController.shadowRoot.querySelector("#end-indicator");
            return endButton.textContent;
        });
        expect(returnedEndTime).toBe(convertSecToMin(TEST_LOOP_END));
    });

    test("Click toggle loop", async () => {
        //Get current state
        let originalState = await page.evaluate(() => {
            const videoController = document.querySelector(".vsl-controller");
            return videoController.shadowRoot
                .querySelector("#toggle-indicator")
                .textContent.trim();
        });

        //Click toggle button
        let newState = await page.evaluate(() => {
            const videoController = document.querySelector(".vsl-controller");
            const toggleButton =
                videoController.shadowRoot.querySelector("#toggle-indicator");
            toggleButton.click();
            return toggleButton.textContent.trim();
        });

        let expectedState = originalState === "OFF" ? "ON" : "OFF";
        expect(newState).toBe(expectedState);
    });

    test("Click the hide button", async () => {
        const isHidden = await page.evaluate(() => {
            const videoController = document.querySelector(".vsl-controller");
            const hideButton =
                videoController.shadowRoot.querySelector("#hide-indicator");
            hideButton.click();

            return (
                videoController.classList.contains("vsl-hidden") &&
                videoController.style.display === "none"
            );
        });
    });
});

//Because video timing is tricky, just check if a paused video that is set to an invalid time returns to within the loop
describe("Testing loop functionality", () => {
    let waitForValidLoop = async function () {
        //Wait until video is in a valid time
        await page.waitForFunction(
            (startTime, endTime, tolerance) => {
                const video = document.querySelector("video");

                //Waits until current time is set between loop tolerance interval
                return (
                    video.currentTime >= startTime - tolerance &&
                    video.currentTime <= endTime + tolerance
                );
            },
            { timeout: 5000 },
            TEST_LOOP_START,
            TEST_LOOP_END,
            LOOP_TOLERANCE
        );
    };

    test("Loop restarts if time set to before loopStart", async () => {
        setVideoCurrentTime(page, TEST_LOOP_START - 1);
        expect(waitForValidLoop()).toBeTruthy;
    });

    test("Loop restarts if time set to after loopEnd", async () => {
        setVideoCurrentTime(page, TEST_LOOP_END + 1);
        expect(waitForValidLoop()).toBeTruthy;
    });

    test("Loop doesn't restart if loop is disabled", async () => {
        setVideoCurrentTime(page, TEST_LOOP_END + 1);
        let passedLoop = await page.waitForFunction(
            (startTime, endTime, tolerance) => {
                const video = document.querySelector("video");

                //Waits until current time is set between loop tolerance interval
                return (
                    video.currentTime <= startTime + tolerance ||
                    video.currentTime >= endTime - tolerance
                );
            },
            { timeout: (TEST_LOOP_END - TEST_LOOP_START) * 1000 }, //Wait at least the length of the loop
            TEST_LOOP_START,
            TEST_LOOP_END,
            LOOP_TOLERANCE
        );

        expect(passedLoop).toBeTruthy();
    });
});

//Test with default shortcuts
describe("Testing keyboard shortcuts", () => {
    let setLoopIntervalByKey = async function (loopType, targetKey) {
        //Click button
        let returnedTime = await page.evaluate(
            (loopType, targetKey) => {
                const video = document.querySelector("video");
                const videoController = document.querySelector(".vsl-controller");

                video.dispatchEvent(new KeyboardEvent("keyup", { key: targetKey }));

                const videoControllerShadow = videoController.shadowRoot;

                const targetButton =
                    loopType === "start"
                        ? videoControllerShadow.querySelector("#start-indicator")
                        : videoControllerShadow.querySelector("#end-indicator");

                console.log(videoControllerShadow);
                console.log(targetButton);
                console.log(targetButton.textContent);
                return targetButton.textContent;
            },
            loopType,
            targetKey
        );

        return returnedTime;
    };

    //As the video controller should be hidden, first unhide
    test("Video controller show/hide toggle, H key", async () => {
        const isHidden = await page.evaluate(() => {
            const video = document.querySelector("video");
            const videoController = document.querySelector(".vsl-controller");

            //Simulate keypress
            video.dispatchEvent(new KeyboardEvent("keyup", { key: "h" }));

            return (
                videoController.classList.contains("vsl-hidden") &&
                videoController.style.display === "none"
            );
        });

        expect(isHidden).toBeFalsy();
    });

    test("Loop start, Q key", async () => {
        await setVideoCurrentTime(page, TEST_LOOP_START);
        const returnedStartTime = await setLoopIntervalByKey(
            "start",
            TEST_LOOP_START,
            "q"
        );
        expect(returnedStartTime).toBe(convertSecToMin(TEST_LOOP_START));
    });

    test("Loop end, E key", async () => {
        await setVideoCurrentTime(page, TEST_LOOP_END);
        const returnedEndTime = await setLoopIntervalByKey("end", TEST_LOOP_END, "e");
        expect(returnedEndTime).toBe(convertSecToMin(TEST_LOOP_END));
    });

    test("Loop toggle, T key", async () => {
        //Get current state
        let originalState = await page.evaluate(() => {
            const videoController = document.querySelector(".vsl-controller");
            return videoController.shadowRoot
                .querySelector("#toggle-indicator")
                .textContent.trim();
        });

        //Trigger keyup
        await page.evaluate(() => {
            const videoController = document.querySelector(".vsl-controller");
            const toggleButton =
                videoController.shadowRoot.querySelector("#toggle-indicator");
            const video = document.querySelector("video");

            video.dispatchEvent(new KeyboardEvent("keyup", { key: "t" }));
        });

        let newState = await page.evaluate(() => {
            const videoController = document.querySelector(".vsl-controller");
            return videoController.shadowRoot
                .querySelector("#toggle-indicator")
                .textContent.trim();
        });

        let expectedState = originalState === "OFF" ? "ON" : "OFF";
        expect(newState).toBe(expectedState);
    });
});

afterAll(async () => {
    await browser.close();
    browser = undefined;
});
